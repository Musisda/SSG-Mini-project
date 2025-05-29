from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select
from ..auth.authenticate import authenticate
from ..database.connection import get_session
from ..models.users import CartItem, CartItemBase, Product

cart_router = APIRouter(
	tags=["Cart"],
)

# 장바구니 조회
@cart_router.get("/")
async def get_cart(session=Depends(get_session), user: str=Depends(authenticate)):
	cart_items = session.exec(
		select(CartItem).where(CartItem.user_email == user)
	).all()
	
	# 상품 정보와 함께 반환
	cart_with_products = []
	for item in cart_items:
		product = session.get(Product, item.product_id)
		if product:
			cart_with_products.append({
				"id": item.id,
				"product_id": item.product_id,
				"quantity": item.quantity,
				"product": product
			})
	
	return cart_with_products

# 장바구니에 상품 추가
@cart_router.post("/")
async def add_to_cart(body: CartItemBase, session=Depends(get_session), user: str=Depends(authenticate)):
	# 상품 존재 확인
	product = session.get(Product, body.product_id)
	if not product:
		raise HTTPException(status_code=404, detail="Product not found")
	
	# 재고 확인
	if product.stock < body.quantity:
		raise HTTPException(status_code=400, detail="Not enough stock")
	
	# 이미 장바구니에 있는지 확인
	existing_item = session.exec(
		select(CartItem).where(
			CartItem.user_email == user,
			CartItem.product_id == body.product_id
		)
	).first()
	
	if existing_item:
		# 수량 업데이트
		existing_item.quantity += body.quantity
		session.add(existing_item)
	else:
		# 새로 추가
		new_item = CartItem(**body.dict(), user_email=user)
		session.add(new_item)
	
	session.commit()
	return {"message": "Added to cart successfully"}

# 장바구니 아이템 수량 수정
@cart_router.put("/{item_id}")
async def update_cart_item(item_id: int, quantity: int, session=Depends(get_session), user: str=Depends(authenticate)):
	cart_item = session.get(CartItem, item_id)
	if not cart_item or cart_item.user_email != user:
		raise HTTPException(status_code=404, detail="Cart item not found")
	
	# 재고 확인
	product = session.get(Product, cart_item.product_id)
	if product.stock < quantity:
		raise HTTPException(status_code=400, detail="Not enough stock")
	
	cart_item.quantity = quantity
	session.add(cart_item)
	session.commit()
	return {"message": "Cart updated successfully"}

# 장바구니에서 삭제
@cart_router.delete("/{item_id}")
async def remove_from_cart(item_id: int, session=Depends(get_session), user: str=Depends(authenticate)):
	cart_item = session.get(CartItem, item_id)
	if not cart_item or cart_item.user_email != user:
		raise HTTPException(status_code=404, detail="Cart item not found")
	
	session.delete(cart_item)
	session.commit()
	return {"message": "Removed from cart successfully"}

# 장바구니 비우기
@cart_router.delete("/")
async def clear_cart(session=Depends(get_session), user: str=Depends(authenticate)):
	cart_items = session.exec(
		select(CartItem).where(CartItem.user_email == user)
	).all()
	
	for item in cart_items:
		session.delete(item)
	
	session.commit()
	return {"message": "Cart cleared successfully"}