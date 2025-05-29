from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import select
from ..auth.authenticate import authenticate
from ..database.connection import get_session
from ..models.users import Product, ProductBase, CartItem, CartItemBase, User

product_router = APIRouter(
	tags=["Product"],
)

# 모든 상품 조회 (인증 불필요)
@product_router.get("/")
async def get_products(session=Depends(get_session)):
	products = session.exec(select(Product)).all()
	return products

# 상품 상세 조회
@product_router.get("/{product_id}")
async def get_product(product_id: int, session=Depends(get_session)):
	product = session.get(Product, product_id)
	if not product:
		raise HTTPException(status_code=404, detail="Product not found")
	return product

# 상품 등록 (관리자만)
@product_router.post("/")
async def create_product(body: ProductBase, session=Depends(get_session), user: str=Depends(authenticate)):
	# 관리자 권한 확인
	user_obj = session.get(User, user)
	if not user_obj or not user_obj.is_admin:
		raise HTTPException(
			status_code=status.HTTP_403_FORBIDDEN,
			detail="Only admins can create products"
		)
	
	new_product = Product(**body.dict(), user_email=user)
	session.add(new_product)
	session.commit()
	session.refresh(new_product)
	return {"message": "Product created successfully", "product": new_product}

# 상품 수정 (관리자만)
@product_router.put("/{product_id}")
async def update_product(product_id: int, body: ProductBase, session=Depends(get_session), user: str=Depends(authenticate)):
	user_obj = session.get(User, user)
	if not user_obj or not user_obj.is_admin:
		raise HTTPException(
			status_code=status.HTTP_403_FORBIDDEN,
			detail="Only admins can update products"
		)
	
	product = session.get(Product, product_id)
	if not product:
		raise HTTPException(status_code=404, detail="Product not found")
	
	product.name = body.name
	product.description = body.description
	product.price = body.price
	product.stock = body.stock
	product.image_url = body.image_url
	
	session.add(product)
	session.commit()
	session.refresh(product)
	return {"message": "Product updated successfully"}

# 상품 삭제 (관리자만)
@product_router.delete("/{product_id}")
async def delete_product(product_id: int, session=Depends(get_session), user: str=Depends(authenticate)):
	user_obj = session.get(User, user)
	if not user_obj or not user_obj.is_admin:
		raise HTTPException(
			status_code=status.HTTP_403_FORBIDDEN,
			detail="Only admins can delete products"
		)
	
	product = session.get(Product, product_id)
	if not product:
		raise HTTPException(status_code=404, detail="Product not found")
	
	session.delete(product)
	session.commit()
	return {"message": "Product deleted successfully"}