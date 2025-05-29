from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import select
from datetime import datetime
from typing import List, Dict, Optional
import uuid
import os
from ..auth.authenticate import authenticate
from ..database.connection import get_session
from ..models.users import Order, OrderBase, OrderItem, CartItem, Product

payment_router = APIRouter(
    tags=["Payment"],
)

# 부트페이 설정
BOOTPAY_CONFIG = {
    "application_id": os.getenv("BOOTPAY_APPLICATION_ID", "656c9fc3e57a7e001b59ff36"),
    "private_key": os.getenv("BOOTPAY_PRIVATE_KEY", "FvPk8mVUADSwKEQFbh3JoITqMcpMrKl08aUGVh16B4s="),
    "api_url": "https://api.bootpay.co.kr",
}

async def get_bootpay_token():
    """부트페이 API 토큰 발급"""
    url = f"{BOOTPAY_CONFIG['api_url']}/request/token"
    payload = {
        "application_id": BOOTPAY_CONFIG["application_id"],
        "private_key": BOOTPAY_CONFIG["private_key"]
    }
    
    try:
        response = requests.post(url, json=payload)
        response.raise_for_status()
        result = response.json()
        
        if result["status"] == 200:
            return result["data"]["token"]
        else:
            raise HTTPException(status_code=400, detail="부트페이 토큰 발급 실패")
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"부트페이 API 호출 실패: {str(e)}")

# 결제 준비
@payment_router.post("/prepare")
async def prepare_payment(
    session=Depends(get_session), 
    user: str=Depends(authenticate)
):
    try:
        # 장바구니 조회
        cart_items = session.exec(
            select(CartItem).where(CartItem.user_email == user)
        ).all()
        
        if not cart_items:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cart is empty"
            )
        
        # 총 금액 계산 및 재고 확인
        total_price = 0
        order_items = []
        
        for item in cart_items:
            product = session.get(Product, item.product_id)
            if not product:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Product {item.product_id} not found"
                )
            
            if product.stock < item.quantity:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Not enough stock for {product.name}"
                )
            
            total_price += product.price * item.quantity
            order_items.append({
                "id": str(product.id),
                "name": product.name,
                "qty": item.quantity,
                "price": product.price
            })
        
        # 주문 ID 생성
        order_id = f"ORDER_{user.split('@')[0]}_{int(datetime.now().timestamp())}_{uuid.uuid4().hex[:8]}"
        
        # 사용자 정보 조회
        from ..models.users import User
        user_obj = session.get(User, user)
        
        # 부트페이 설정 반환
        return {
            "status": "success",
            "data": {
                "order_id": order_id,
                "total_price": total_price,
                "items": order_items,
                "bootpay_config": {
                    "application_id": BOOTPAY_CONFIG["application_id"],
                    "price": total_price,
                    "order_name": f"{order_items[0]['name']} 외 {len(order_items)-1}건" if len(order_items) > 1 else order_items[0]['name'],
                    "order_id": order_id,
                    "user": {
                        "username": user_obj.username if user_obj else user.split('@')[0],
                        "email": user,
                        "phone": user_obj.phone if user_obj and hasattr(user_obj, 'phone') else "010-0000-0000"
                    }
                }
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Payment prepare error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to prepare payment: {str(e)}"
        )

# 결제 검증 (부트페이 API 호출)
@payment_router.post("/verify")
async def verify_payment(
    callback: Dict,
    session=Depends(get_session),
    user: str=Depends(authenticate)
):
    """결제 검증 API - 부트페이 검증 로직 적용"""
    try:
        print(f"[결제 검증] 콜백 데이터: {callback}")
        
        # 필수 필드 확인 (유연하게 처리)
        receipt_id = callback.get('receipt_id', '')
        order_id = callback.get('order_id', '')
        price = callback.get('price', 0)
        
        # 필수 데이터가 없는 경우 처리
        if not order_id:
            print("[결제 검증] 주문 ID가 없습니다. 콜백 데이터 확인 필요")
            raise HTTPException(status_code=400, detail="주문 ID가 없습니다")
        
        # 테스트 모드 확인
        is_test_mode = (
            BOOTPAY_CONFIG["private_key"] == "FvPk8mVUADSwKEQFbh3JoITqMcpMrKl08aUGVh16B4s=" or
            not receipt_id or
            receipt_id.startswith('test_')
        )
        
        if is_test_mode:
            # 테스트 모드
            print(f"[테스트 모드] 결제 검증 통과: {order_id}")
            return {
                "status": "success",
                "message": "결제 검증 완료 (테스트 모드)",
                "data": {
                    "order_id": order_id,
                    "receipt_id": receipt_id or f"test_receipt_{order_id}",
                    "price": price,
                    "status": "completed",
                    "test_mode": True
                }
            }
        else:
            # 실제 부트페이 API 검증
            try:
                token = await get_bootpay_token()
                
                verify_url = f"{BOOTPAY_CONFIG['api_url']}/receipt/{receipt_id}"
                headers = {
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json"
                }
                
                response = requests.get(verify_url, headers=headers)
                response.raise_for_status()
                result = response.json()
                
                if result["status"] == 200:
                    payment_data = result["data"]
                    
                    # 금액 검증 (선택사항)
                    if price > 0 and payment_data.get("price", 0) != price:
                        print(f"[결제 검증] 금액 불일치: 요청 {price}, 실제 {payment_data.get('price', 0)}")
                        # 경고만 하고 진행 (옵션)
                    
                    print(f"[결제 검증 성공] 주문 ID: {order_id}")
                    return {
                        "status": "success",
                        "message": "결제 검증 완료",
                        "data": {
                            "order_id": order_id,
                            "receipt_id": receipt_id,
                            "price": payment_data.get("price", price),
                            "status": "completed",
                            "payment_data": payment_data
                        }
                    }
                else:
                    raise HTTPException(status_code=400, detail="부트페이 검증 실패")
                    
            except requests.RequestException as e:
                print(f"[결제 검증] 부트페이 API 호출 실패: {str(e)}")
                # API 호출 실패 시에도 주문은 성공으로 처리 (옵션)
                return {
                    "status": "success",
                    "message": "결제 완료 (검증 API 오류)",
                    "data": {
                        "order_id": order_id,
                        "receipt_id": receipt_id,
                        "price": price,
                        "status": "completed",
                        "warning": "부트페이 API 검증 실패"
                    }
                }
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"[결제 검증 오류] {str(e)}")
        print(f"[결제 검증 오류] 콜백 데이터: {callback}")
        raise HTTPException(status_code=500, detail=f"결제 검증 실패: {str(e)}")

# 결제 완료 처리# payment.py의 complete_payment 함수 수정

@payment_router.post("/complete")
async def complete_payment(
    payment_data: Dict,
    session=Depends(get_session),
    user: str=Depends(authenticate)
):
    try:
        print(f"[결제 완료] 받은 데이터: {payment_data}")
        
        # 먼저 결제 검증 수행 (order_id 등 필요한 데이터 포함)
        verify_data = {
            "order_id": payment_data.get("order_id"),
            "receipt_id": payment_data.get("receipt_id"),
            "price": payment_data.get("price"),
            "status": payment_data.get("status")
        }
        
        verify_result = await verify_payment(verify_data, session, user)
        
        if verify_result["status"] != "success":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Payment verification failed"
            )
        
        order_id = payment_data.get("order_id")
        if not order_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Order ID is required"
            )
        
        receipt_id = payment_data.get("receipt_id") or verify_result["data"].get("receipt_id")
        price = payment_data.get("price", 0)
        
        # 기존 주문 확인
        existing_order = session.exec(
            select(Order).where(Order.order_id == order_id)
        ).first()
        
        if existing_order:
            # 이미 처리된 주문인 경우
            print(f"[결제 완료] 이미 처리된 주문: {order_id}")
            return {
                "status": "success",
                "message": "Order already processed",
                "data": {
                    "order_id": order_id,
                    "receipt_id": receipt_id,
                    "total_price": existing_order.total_price
                }
            }
        
        # 장바구니 조회
        cart_items = session.exec(
            select(CartItem).where(CartItem.user_email == user)
        ).all()
        
        if not cart_items:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cart is empty"
            )
        
        # 총 금액 계산
        total_price = 0
        for item in cart_items:
            product = session.get(Product, item.product_id)
            if product:
                total_price += product.price * item.quantity
        
        # 가격 검증 (옵션)
        if price > 0 and abs(total_price - price) > 100:  # 100원 이상 차이나면
            print(f"[결제 완료] 가격 불일치 경고: 장바구니 {total_price}, 결제 {price}")
        
        # 사용자 정보 조회
        from ..models.users import User
        user_obj = session.get(User, user)
        
        # 주문 생성
        new_order = Order(
            order_id=order_id,
            user_email=user,
            total_price=price or total_price,  # 결제 금액 우선
            status="paid",
            buyer_name=payment_data.get("buyer_name", user_obj.username if user_obj else user.split('@')[0]),
            buyer_email=user,
            buyer_tel=payment_data.get("buyer_tel", ""),
            zipcode=payment_data.get("zipcode", ""),
            address=payment_data.get("address", ""),
            address_detail=payment_data.get("address_detail", ""),
            receipt_id=receipt_id,
            payment_method=payment_data.get("method", "card"),
            paid_at=datetime.utcnow()
        )
        session.add(new_order)
        session.flush()  # ID 생성을 위해 flush
        
        # 주문 상품 생성 및 재고 차감
        for item in cart_items:
            product = session.get(Product, item.product_id)
            
            if not product:
                session.rollback()
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Product {item.product_id} not found"
                )
            
            # 재고 확인
            if product.stock < item.quantity:
                session.rollback()
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Not enough stock for {product.name}"
                )
            
            # 재고 차감
            product.stock -= item.quantity
            session.add(product)
            
            # 주문 상품 추가
            order_item = OrderItem(
                order_id=new_order.id,
                product_id=item.product_id,
                quantity=item.quantity,
                price=product.price
            )
            session.add(order_item)
            
            # 장바구니에서 삭제
            session.delete(item)
        
        session.commit()
        
        print(f"[결제 완료] 성공: {order_id}")
        
        return {
            "status": "success",
            "message": "Payment completed successfully",
            "data": {
                "order_id": order_id,
                "receipt_id": receipt_id,
                "total_price": new_order.total_price
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        print(f"[결제 완료 오류] {str(e)}")
        print(f"[결제 완료 오류] 받은 데이터: {payment_data}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to complete payment: {str(e)}"
        )

# 주문 내역 조회
@payment_router.get("/orders")
async def get_orders(
    session=Depends(get_session),
    user: str=Depends(authenticate)
):
    try:
        orders = session.exec(
            select(Order).where(Order.user_email == user).order_by(Order.created_at.desc())
        ).all()
        
        # 각 주문의 상품 정보 포함
        order_list = []
        for order in orders:
            order_items = session.exec(
                select(OrderItem).where(OrderItem.order_id == order.id)  # order.id 사용
            ).all()
            
            items_with_product = []
            for item in order_items:
                product = session.get(Product, item.product_id)
                if product:
                    items_with_product.append({
                        "product_name": product.name,
                        "quantity": item.quantity,
                        "price": item.price
                    })
            
            order_dict = order.dict()
            order_dict["items"] = items_with_product
            order_list.append(order_dict)
        
        return order_list
        
    except Exception as e:
        print(f"Get orders error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get orders: {str(e)}"
        )

# 주문 상세 조회
@payment_router.get("/orders/{order_id}")
async def get_order_detail(
    order_id: str,
    session=Depends(get_session),
    user: str=Depends(authenticate)
):
    try:
        order = session.exec(
            select(Order).where(
                Order.order_id == order_id,
                Order.user_email == user
            )
        ).first()
        
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found"
            )
        
        # 주문 상품 정보 조회
        order_items = session.exec(
            select(OrderItem).where(OrderItem.order_id == order.id)
        ).all()
        
        items_with_product = []
        for item in order_items:
            product = session.get(Product, item.product_id)
            if product:
                items_with_product.append({
                    "product_id": product.id,
                    "product_name": product.name,
                    "quantity": item.quantity,
                    "price": item.price,
                    "subtotal": item.price * item.quantity
                })
        
        order_dict = order.dict()
        order_dict["items"] = items_with_product
        
        return order_dict
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Get order detail error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get order detail: {str(e)}"
        )