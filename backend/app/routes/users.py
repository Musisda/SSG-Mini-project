from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import select, Session
from ..auth.jwt import create_access_token
from ..database.connection import get_session
from ..auth.authenticate import authenticate
from ..models.users import GoogleSignup, UserSignup, UserLogin, TokenResponse, User, Order, Wishlist
import hashlib
import re

user_router = APIRouter(
	tags=["User"],
)

# 비밀번호 해싱 함수
def hash_password(password: str) -> str:
	return hashlib.sha256(password.encode()).hexdigest()

# 비밀번호 검증 함수
def verify_password(plain_password: str, hashed_password: str) -> bool:
	return hash_password(plain_password) == hashed_password

# 일반 회원가입
# 일반 회원가입
@user_router.post("/signup")
async def signup(body: UserSignup, session=Depends(get_session)):
	try:
		# 이메일 형식 검증
		email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
		if not re.match(email_pattern, body.email):
			raise HTTPException(
				status_code=status.HTTP_400_BAD_REQUEST,
				detail="Invalid email format"
			)
		
		# 비밀번호 검증 (최소 6자)
		if len(body.password) < 6:
			raise HTTPException(
				status_code=status.HTTP_400_BAD_REQUEST,
				detail="Password must be at least 6 characters long"
			)
		
		# 사용자명 검증 (최소 2자)
		if len(body.username.strip()) < 2:
			raise HTTPException(
				status_code=status.HTTP_400_BAD_REQUEST,
				detail="Username must be at least 2 characters long"
			)
		
		# 기존 사용자 확인
		existing_user = session.get(User, body.email)
		if existing_user:
			raise HTTPException(
				status_code=status.HTTP_409_CONFLICT,
				detail="User already exists"
			)
		
		# 새 사용자 생성
		new_user = User(
			email=body.email,
			username=body.username.strip(),
			password=hash_password(body.password),
			is_admin=False  # 일반 회원가입은 항상 일반 사용자
		)
		
		session.add(new_user)
		session.commit()
		
		return {"message": "User created successfully"}
		
	except HTTPException:
		raise
	except Exception as e:
		print(f"Signup error: {str(e)}")
		session.rollback()
		raise HTTPException(
			status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
			detail="Failed to create user"
		)

# 일반 로그인
@user_router.post("/signin", response_model=TokenResponse)
async def signin(body: UserLogin, session=Depends(get_session)):
	try:
		# 사용자 확인
		user = session.get(User, body.email)
		if not user:
			raise HTTPException(
				status_code=status.HTTP_401_UNAUTHORIZED,
				detail="Invalid email or password"
			)
		
		# 비밀번호가 없는 경우 (Google 로그인 사용자)
		if not user.password:
			raise HTTPException(
				status_code=status.HTTP_401_UNAUTHORIZED,
				detail="Please use Google login for this account"
			)
		
		# 비밀번호 확인
		if not verify_password(body.password, user.password):
			raise HTTPException(
				status_code=status.HTTP_401_UNAUTHORIZED,
				detail="Invalid email or password"
			)
		
		# 토큰 생성 (1시간 만료)
		import time
		exp = int(time.time()) + 3600
		access_token = create_access_token(user.email, exp)
		
		return {
			"access_token": access_token,
			"token_type": "Bearer",
			"is_admin": user.is_admin,


			"username": user.username
		}
		
	except HTTPException:
		raise
	except Exception as e:
		print(f"Signin error: {str(e)}")
		raise HTTPException(
			status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
			detail="Login failed"
		)

# Google 로그인 (기존 코드 수정)
@user_router.post("/google-login", response_model=TokenResponse)
async def google_login(body: GoogleSignup, session=Depends(get_session)) -> dict:
	try:
		# 기존 사용자 확인
		existing_user = session.get(User, body.email)
		
		if existing_user:
			# 기존 사용자 로그인
			print(f"Existing user login: {body.email}")
			access_token = create_access_token(body.email, body.exp)
			is_admin = existing_user.is_admin
			username = existing_user.username
		else:
			# 새 사용자 생성
			print(f"Creating new user: {body.email}")
			
			# 첫 번째 사용자인지 확인
			all_users = session.exec(select(User)).all()
			is_admin = len(all_users) == 0
			
			# 새 사용자 생성 (Google 로그인은 비밀번호 없음)
			new_user = User(
				email=body.email, 
				username=body.username,
				password=None,
				is_admin=is_admin
			)
			session.add(new_user)
			session.commit()
			session.refresh(new_user)
			
			print(f"New user created: {body.email}, admin: {is_admin}")
			access_token = create_access_token(body.email, body.exp)
			username = body.username
		
		return {
			"access_token": access_token,
			"token_type": "Bearer",
			"is_admin": is_admin,
			"username": username
		}
	except Exception as e:
		print(f"Google login error: {str(e)}")
		session.rollback()
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail=f"Login failed: {str(e)}"
		)

# 현재 사용자 정보 조회
@user_router.get("/me")
async def get_me(session=Depends(get_session), user: str=Depends(authenticate)):
	user_obj = session.get(User, user)
	if not user_obj:
		raise HTTPException(status_code=404, detail="User not found")
	return {
		"email": user_obj.email,
		"username": user_obj.username,
		"is_admin": user_obj.is_admin
	}

# 관리자 로그인 (별도 엔드포인트)
@user_router.post("/admin-signin", response_model=TokenResponse)
async def admin_signin(body: UserLogin, session=Depends(get_session)):
	try:
		# 사용자 확인
		user = session.get(User, body.email)
		if not user:
			raise HTTPException(
				status_code=status.HTTP_401_UNAUTHORIZED,
				detail="Invalid email or password"
			)
		
		# 관리자 권한 확인
		if not user.is_admin:
			raise HTTPException(
				status_code=status.HTTP_403_FORBIDDEN,
				detail="Admin access only"
			)
		
		# 비밀번호가 없는 경우 (Google 로그인 사용자)
		if not user.password:
			raise HTTPException(
				status_code=status.HTTP_401_UNAUTHORIZED,
				detail="Please use Google login for this account"
			)
		
		# 비밀번호 확인
		if not verify_password(body.password, user.password):
			raise HTTPException(
				status_code=status.HTTP_401_UNAUTHORIZED,
				detail="Invalid email or password"
			)
		
		# 토큰 생성 (1시간 만료)
		import time
		exp = int(time.time()) + 3600
		access_token = create_access_token(user.email, exp)
		
		return {
			"access_token": access_token,
			"token_type": "Bearer",
			"is_admin": user.is_admin,
			"username": user.username
		}
		
	except HTTPException:
		raise
	except Exception as e:
		print(f"Admin signin error: {str(e)}")
		raise HTTPException(
			status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
			detail="Login failed"
		)
@user_router.post("/create-admin")
async def create_admin(email: str, username: str, password: str, session=Depends(get_session)):
	try:
		# 기존 사용자 확인
		existing_user = session.get(User, email)
		if existing_user:
			raise HTTPException(
				status_code=status.HTTP_409_CONFLICT,
				detail="User already exists"
			)
		
		# 관리자 생성
		admin_user = User(
			email=email,
			username=body.username.strip(),
			password=hash_password(password),
			is_admin=True
		)
		
		session.add(admin_user)
		session.commit()
		
		return {"message": "Admin user created successfully"}
		
	except HTTPException:
		raise
	except Exception as e:
		session.rollback()
		raise HTTPException(
			status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
			detail=f"Failed to create admin: {str(e)}"
		)
	
@user_router.get("/mypage")
async def get_mypage(session=Depends(get_session), user: str=Depends(authenticate)):
	user_obj = session.get(User, user)
	if not user_obj:
		raise HTTPException(status_code=404, detail="User not found")
	
	# 최근 주문 5개
	recent_orders = session.exec(
		select(Order).where(Order.user_email == user)
		.order_by(Order.created_at.desc())
		.limit(5)
	).all()
	
	# 위시리스트 개수
	wishlist_count = session.exec(
		select(Wishlist).where(Wishlist.user_email == user)
	).all()
	
	return {
		"user": {
			"email": user_obj.email,
			"username": user_obj.username,
			"is_admin": user_obj.is_admin
		},
		"recent_orders": recent_orders,
		"wishlist_count": len(wishlist_count)
	}