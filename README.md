# MUSISDA: 풀스택 쇼핑몰 플랫폼

## 📌 프로젝트 소개
MUSISDA는 FastAPI와 바닐라 JavaScript를 활용한 현대적인 풀스택 쇼핑몰 플랫폼입니다.
사용자 친화적인 인터페이스와 안정적인 백엔드 시스템을 통해 완전한 이커머스 경험을 제공합니다.

## 🎯 주요 기능
- **회원 관리**: 일반 로그인, Google OAuth 로그인, 관리자 로그인
- **상품 관리**: 상품 등록/수정/삭제, 이미지 업로드, 재고 관리
- **장바구니**: 실시간 수량 조절, 재고 확인, 선택 삭제
- **주문/결제**: 부트페이 연동 결제, 주문 내역 관리
- **위시리스트**: 찜하기 기능, 개인 맞춤 상품 관리
- **고객 지원**: Q&A 게시판, 비공개 문의, 관리자 답변
- **후기 시스템**: 구매 후기 작성, 평점 시스템

## 🛠️ 기술 스택

| 영역 | 기술 |
|------|------|
| 언어 | Python 3.9+ |
| 프레임워크 | FastAPI 0.104+ |
| 프론트엔드 | Vanilla JavaScript (ES6+), HTML5, CSS3 |
| ORM | SQLModel (SQLAlchemy 기반) |
| 데이터베이스 | MySQL 5.7+ |
| 인증 | JWT, OAuth2 (Google) |
| 배포 | Docker, Docker Compose, Nginx |
| 결제 | 부트페이 (Bootpay) API |
| 외부 연동 API | Google OAuth 2.0, 카카오 주소 검색 |
| 개발 환경 | Vagrant (Rocky Linux 9) |
| 형상 관리 | GitHub |


## 🏗️ 아키텍처
![아키텍처 (1)](https://github.com/user-attachments/assets/f692a1e7-e3f4-404c-b0bc-135b8a97b541)

```
External APIs:
- Google OAuth 2.0
- 부트페이 결제
- 카카오 주소 검색
```

## 🚀 빠른 시작

### 필수 조건
- Docker & Docker Compose
- Git

### 설치 및 실행
```bash
# 저장소 클론
git clone <repository-url>
cd shopping-mall

# Docker로 전체 서비스 실행
docker-compose up -d

# 접속 확인
- nginx 서버: http://localhost:8080 or 192.168.56.20:8080(vm ip)
- 프론트엔드: http://localhost:3000 or 192.168.56.20:3000(vm ip)
- 백엔드 API: http://localhost:8000 or 192.168.56.20:8000(vm ip)
- MySQL: localhost:3306 or 192.168.56.20:3306(vm ip)
```

### 개발 환경 (Vagrant)
```bash
# Vagrant 환경 시작
vagrant up shopping-mall

# VM 접속
vagrant ssh shopping-mall

# 프로젝트 디렉토리로 이동
cd /home/vagrant/shopping-mall

# 서비스 시작
docker-compose up -d
```

## 📁 프로젝트 구조
```
shopping-mall/
├── backend/                 # FastAPI 백엔드
│   ├── app/
│   │   ├── models/         # 데이터 모델
│   │   ├── routes/         # API 라우터
│   │   ├── auth/           # 인증 관련
│   │   └── database/       # DB 연결
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/                # 바닐라 JS 프론트엔드
│   ├── js/
│   │   ├── components/     # UI 컴포넌트
│   │   └── utils/          # 유틸리티
│   ├── css/
│   ├── index.html
│   └── Dockerfile
├── docker-compose.yml       # 전체 서비스 구성
└── nginx.conf              # 리버스 프록시 설정
```

## 🔧 주요 기술 구현

### JWT 인증 시스템
```python
# 토큰 생성 및 검증
def create_access_token(user: EmailStr, exp: int):
    payload = {"user": user, "expires": exp}
    token = jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")
    return token
```

### 실시간 재고 관리
- 장바구니 담기 시 실시간 재고 확인
- 주문 완료 시 재고 자동 차감
- 동시성 제어로 재고 부족 방지

### 결제 시스템 통합
- 부트페이 API 연동
- 결제 검증 및 완료 처리
- 주문 상태 실시간 업데이트

## 🔒 보안 기능
- JWT 토큰 기반 인증
- 비밀번호 해싱 (SHA-256)
- CORS 정책 적용
- SQL Injection 방지 (SQLModel ORM)
- XSS 방지 (HTML 이스케이핑)



### 환경 변수
```env
# Database
MYSQL_ROOT_PASSWORD=your_password
MYSQL_DATABASE=shopping_mall

# JWT
SECRET_KEY=your_secret_key

# OAuth
GOOGLE_AUTH_CLIENT_ID=your_google_client_id

# Payment
BOOTPAY_APPLICATION_ID=your_bootpay_id
BOOTPAY_PRIVATE_KEY=your_bootpay_key
```

## 🐛 문제 해결

### 자주 발생하는 문제
1. **MySQL 연결 실패**
   ```bash
   # 컨테이너 로그 확인
   docker-compose logs mysql
   ```

2. **CORS 오류**
   - `main.py`에서 CORS 설정 확인
   - API_URL 환경변수 확인

3. **Google 로그인 실패**
   - `GOOGLE_AUTH_CLIENT_ID` 확인
   - 도메인 허용 목록 확인

## 🔄 향후 개발 계획
- [ ] Redis 캐싱 시스템
- [ ] 상품 검색 및 필터링
- [ ] 실시간 알림 시스템
- [ ] 모바일 반응형 디자인
- [ ] 관리자 대시보드 강화
- [ ] 배송 추적 시스템


## 👥 개발
- **Backend**: FastAPI, MySQL, 인증 시스템
- **Frontend**: Vanilla JS, UI/UX 디자인
- **DevOps**: Docker, 배포 환경 구성


## 👥 팀원 소개

|           이충민           |           정혜인           |           이채은           |           강병훈           |
| :--------------------------------------------------------------: | :--------------------------------------------------------------: | :--------------------------------------------------------------: | :--------------------------------------------------------------: |
|     <img src="https://github.com/user-attachments/assets/baa1e756-2962-4b99-9cd7-5ad1f2944437" width="120px;" alt=""/>      |      <img src="https://github.com/user-attachments/assets/profile2" width="120px;" alt=""/>      |      <img src="https://github.com/user-attachments/assets/profile3" width="120px;" alt=""/>      |      <img src="https://github.com/user-attachments/assets/profile4" width="120px;" alt=""/>      |
|                            BE / 백엔드 개발                           |                            FE / 프론트엔드 개발                         |                            FE / 프론트엔드 개발                         |                            BE / 백엔드 개발                           |
