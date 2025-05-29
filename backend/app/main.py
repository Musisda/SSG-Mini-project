from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database.connection import conn
from .routes.users import user_router
from .routes.products import product_router
from .routes.cart import cart_router
from .routes.wishlist import wishlist_router
from .routes.qna import qna_router
from .routes.payment import payment_router
from .routes.reviews import review_router

# FastAPI 앱 생성
app = FastAPI(
    title="Shopping Mall API",
    description="쇼핑몰 백엔드 API",
    version="1.0.0"
)

# CORS 설정 - 더 명시적으로 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 프로덕션에서는 구체적인 도메인 지정
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],  # PUT 메서드 명시적 추가
    allow_headers=["*"],
)

# 라우터 등록
app.include_router(user_router, prefix="/user")
app.include_router(product_router, prefix="/products")
app.include_router(cart_router, prefix="/cart")
app.include_router(wishlist_router, prefix="/wishlist")
app.include_router(qna_router, prefix="/qna")
app.include_router(payment_router, prefix="/payment")
app.include_router(review_router, prefix="/reviews")

# 데이터베이스 테이블 생성
@app.on_event("startup")
async def startup_event():
    print("🚀 서버 시작 중...")
    conn()  # 데이터베이스 테이블 생성
    print("✅ 데이터베이스 연결 완료")

# 루트 엔드포인트
@app.get("/")
async def root():
    return {
        "message": "Shopping Mall API",
        "version": "1.0.0",
        "status": "running"
    }

# 헬스체크 엔드포인트
@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# OPTIONS 요청 처리를 위한 추가 설정
@app.options("/{path:path}")
async def options_handler():
    return {"status": "ok"}