from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select
from ..auth.authenticate import authenticate
from ..database.connection import get_session
from ..models.users import Wishlist, Product

wishlist_router = APIRouter(
	tags=["Wishlist"],
)

@wishlist_router.get("/")
async def get_wishlist(session=Depends(get_session), user: str=Depends(authenticate)):
	wishlists = session.exec(
		select(Wishlist).where(Wishlist.user_email == user)
	).all()
	
	wishlist_products = []
	for item in wishlists:
		product = session.get(Product, item.product_id)
		if product:
			product_dict = product.dict()
			product_dict["wishlist_id"] = item.id
			wishlist_products.append(product_dict)
	
	return wishlist_products

@wishlist_router.post("/{product_id}")
async def toggle_wishlist(product_id: int, session=Depends(get_session), user: str=Depends(authenticate)):
	# 이미 위시리스트에 있는지 확인
	existing = session.exec(
		select(Wishlist).where(
			Wishlist.user_email == user,
			Wishlist.product_id == product_id
		)
	).first()
	
	if existing:
		session.delete(existing)
		session.commit()
		return {"status": "removed", "message": "위시리스트에서 제거되었습니다"}
	else:
		new_wishlist = Wishlist(user_email=user, product_id=product_id)
		session.add(new_wishlist)
		session.commit()
		return {"status": "added", "message": "위시리스트에 추가되었습니다"}

@wishlist_router.get("/check/{product_id}")
async def check_wishlist(product_id: int, session=Depends(get_session), user: str=Depends(authenticate)):
	existing = session.exec(
		select(Wishlist).where(
			Wishlist.user_email == user,
			Wishlist.product_id == product_id
		)
	).first()
	
	return {"is_wished": existing is not None}