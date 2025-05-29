from datetime import datetime, timedelta
from fastapi import HTTPException, status
from jose import JWTError, jwt
from pydantic import EmailStr
from ..database.connection import Settings

# Settings 클래스를 인스턴스화 해서 .env 값을 가져온다.
settings = Settings()

# 토큰을 생성하는 함수
def create_access_token(user: EmailStr, exp: int):
	try:
		# 토큰을 생성할 때 user 이메일과 exp(만료시간)을 받아온다
		# 받아온 정보를 기반으로 payload를 작성한다.
		payload = {
			"user": user,
			"expires": exp
		}
		
		# SECRET_KEY가 설정되어 있는지 확인
		if not settings.SECRET_KEY:
			raise ValueError("SECRET_KEY is not set in .env file")
		
		# 작성된 payload와 secrets키, 암호화 알고리즘을 지정해준다.
		token = jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")
		
		print(f"Token created successfully for user: {user}")
		return token
		
	except Exception as e:
		print(f"Error creating token: {str(e)}")
		raise HTTPException(
			status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
			detail=f"Failed to create access token: {str(e)}"
		)

# 토큰을 검증하는 함수
def verify_access_token(token: str):
	try:
		# SECRET_KEY가 설정되어 있는지 확인
		if not settings.SECRET_KEY:
			raise ValueError("SECRET_KEY is not set")
			
		# 토큰을 decode한 값을 data에 저장한다.
		data = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
		
		# 만료 시간 체크
		expires = data.get("expires")
		if expires is None:
			raise HTTPException(
				status_code=status.HTTP_400_BAD_REQUEST,
				detail="No access token supplied"
			)
		if datetime.utcnow() > datetime.utcfromtimestamp(expires):
			raise HTTPException(
				status_code=status.HTTP_403_FORBIDDEN,
				detail="Token expired!"
			)
		
		# 정상 토큰이라면 사용자 데이터를 리턴한다.
		return data
		
	except JWTError as e:
		print(f"JWT verification error: {str(e)}")
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="Invalid token"
		)