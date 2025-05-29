from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import select
from typing import List, Optional
from datetime import datetime
from ..auth.authenticate import authenticate
from ..database.connection import get_session
from ..models.users import User, Product, Order, OrderItem, Review, ReviewBase
from pydantic import BaseModel

review_router = APIRouter(
    tags=["Reviews"],
)

# 응답 모델만 여기서 정의
class ReviewResponse(BaseModel):
    id: int
    user_name: str
    rating: int
    content: str
    created_at: datetime

# 상품별 후기 조회
@review_router.get("/product/{product_id}", response_model=List[ReviewResponse])
async def get_product_reviews(product_id: int, session=Depends(get_session)):
    """특정 상품의 모든 후기 조회"""
    try:
        # 상품 존재 확인
        product = session.get(Product, product_id)
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        
        # 후기 조회
        reviews = session.exec(
            select(Review).where(Review.product_id == product_id)
            .order_by(Review.created_at.desc())
        ).all()
        
        # 응답 데이터 구성
        review_responses = []
        for review in reviews:
            user = session.get(User, review.user_email)
            user_name = user.username if user else "Unknown"
            
            # 이름 마스킹 (첫 글자만 보이고 나머지는 *)
            if len(user_name) > 1:
                masked_name = user_name[0] + "*" * (len(user_name) - 1)
            else:
                masked_name = user_name
                
            review_responses.append(ReviewResponse(
                id=review.id,
                user_name=masked_name,
                rating=review.rating,
                content=review.content,
                created_at=review.created_at
            ))
        
        return review_responses
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Get reviews error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get reviews"
        )

# 후기 작성
@review_router.post("/")
async def create_review(
    review_data: ReviewBase,
    session=Depends(get_session),
    user: str = Depends(authenticate)
):
    """후기 작성 (구매한 상품에 대해서만)"""
    try:
        # 상품 존재 확인
        product = session.get(Product, review_data.product_id)
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        
        # 구매 이력 확인
        user_orders = session.exec(
            select(Order).where(
                Order.user_email == user,
                Order.status == "paid"
            )
        ).all()
        
        purchased = False
        for order in user_orders:
            order_items = session.exec(
                select(OrderItem).where(
                    OrderItem.order_id == order.id,
                    OrderItem.product_id == review_data.product_id
                )
            ).first()
            if order_items:
                purchased = True
                break
        
        if not purchased:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="구매한 상품에 대해서만 후기를 작성할 수 있습니다."
            )
        
        # 기존 후기 확인 (중복 방지)
        existing_review = session.exec(
            select(Review).where(
                Review.user_email == user,
                Review.product_id == review_data.product_id
            )
        ).first()
        
        if existing_review:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="이미 해당 상품에 대한 후기를 작성하셨습니다."
            )
        
        # 새 후기 생성
        new_review = Review(
            **review_data.dict(),
            user_email=user
        )
        
        session.add(new_review)
        session.commit()
        session.refresh(new_review)
        
        return {"message": "Review created successfully", "id": new_review.id}
        
    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        print(f"Create review error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create review"
        )

# 내 후기 조회
@review_router.get("/my")
async def get_my_reviews(
    session=Depends(get_session),
    user: str = Depends(authenticate)
):
    """내가 작성한 후기 목록"""
    try:
        reviews = session.exec(
            select(Review).where(Review.user_email == user)
            .order_by(Review.created_at.desc())
        ).all()
        
        review_list = []
        for review in reviews:
            product = session.get(Product, review.product_id)
            product_name = product.name if product else "Unknown Product"
            
            review_list.append({
                "id": review.id,
                "product_id": review.product_id,
                "product_name": product_name,
                "rating": review.rating,
                "content": review.content,
                "created_at": review.created_at,
                "updated_at": review.updated_at
            })
        
        return review_list
        
    except Exception as e:
        print(f"Get my reviews error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get reviews"
        )

# 후기 수정
@review_router.put("/{review_id}")
async def update_review(
    review_id: int,
    review_data: ReviewBase,
    session=Depends(get_session),
    user: str = Depends(authenticate)
):
    """후기 수정"""
    try:
        review = session.get(Review, review_id)
        if not review:
            raise HTTPException(status_code=404, detail="Review not found")
        
        if review.user_email != user:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="자신의 후기만 수정할 수 있습니다."
            )
        
        # 후기 업데이트
        review.rating = review_data.rating
        review.content = review_data.content
        review.updated_at = datetime.utcnow()
        
        session.add(review)
        session.commit()
        
        return {"message": "Review updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        print(f"Update review error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update review"
        )

# 후기 삭제
@review_router.delete("/{review_id}")
async def delete_review(
    review_id: int,
    session=Depends(get_session),
    user: str = Depends(authenticate)
):
    """후기 삭제"""
    try:
        review = session.get(Review, review_id)
        if not review:
            raise HTTPException(status_code=404, detail="Review not found")
        
        # 관리자이거나 작성자인 경우만 삭제 가능
        user_obj = session.get(User, user)
        if review.user_email != user and not (user_obj and user_obj.is_admin):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="권한이 없습니다."
            )
        
        session.delete(review)
        session.commit()
        
        return {"message": "Review deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        print(f"Delete review error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete review"
        )

# 상품 평점 통계
@review_router.get("/stats/{product_id}")
async def get_review_stats(product_id: int, session=Depends(get_session)):
    """상품의 후기 통계 (평균 평점, 후기 수 등)"""
    try:
        product = session.get(Product, product_id)
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        
        reviews = session.exec(
            select(Review).where(Review.product_id == product_id)
        ).all()
        
        if not reviews:
            return {
                "product_id": product_id,
                "total_reviews": 0,
                "average_rating": 0,
                "rating_distribution": {
                    "5": 0, "4": 0, "3": 0, "2": 0, "1": 0
                }
            }
        
        total_reviews = len(reviews)
        total_rating = sum(review.rating for review in reviews)
        average_rating = round(total_rating / total_reviews, 1)
        
        # 평점 분포
        rating_distribution = {"5": 0, "4": 0, "3": 0, "2": 0, "1": 0}
        for review in reviews:
            rating_distribution[str(review.rating)] += 1
        
        return {
            "product_id": product_id,
            "total_reviews": total_reviews,
            "average_rating": average_rating,
            "rating_distribution": rating_distribution
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Get review stats error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get review stats"
        )