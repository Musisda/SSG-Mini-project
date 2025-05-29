from sqlmodel import SQLModel, create_engine, Session
from typing import Optional
from pydantic import BaseSettings
import os
import time
from dotenv import load_dotenv

# .env 파일 로드
load_dotenv()

# .env 파일에서 MySQL 설정 값 가져오기
MYSQL_ROOT_PASSWORD = os.environ.get("MYSQL_ROOT_PASSWORD")  # MySQL root 비밀번호
MYSQL_DATABASE = os.environ.get("MYSQL_DATABASE")            # 사용할 데이터베이스 이름

# 필수 환경변수가 설정되었는지 확인
if not MYSQL_ROOT_PASSWORD or not MYSQL_DATABASE:
    # 환경변수가 없으면 오류 발생
    raise ValueError("MYSQL_ROOT_PASSWORD and MYSQL_DATABASE must be set in .env file")


# Docker 환경인지 확인하여 데이터베이스 연결 URL 설정
if os.path.exists('/.dockerenv'):
    # Docker 환경일 경우 - MySQL 대기 로직 추가
    print("Docker environment detected. Waiting for MySQL...")
    
    # MySQL이 준비될 때까지 대기 (60초)
    for i in range(30):
        try:
            import socket
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(2)
            result = sock.connect_ex(('mysql', 3306))
            sock.close()
            if result == 0:
                print("MySQL is ready!")
                break
        except:
            pass
        print(f"Waiting for MySQL... ({i+1}/30)")
        time.sleep(2)
    
    # 컨테이너 이름 'mysql'로 연결, 포트 3306 사용 - UTF-8 인코딩 추가
    database_connetion_string = f'mysql+pymysql://root:{MYSQL_ROOT_PASSWORD}@mysql:3306/{MYSQL_DATABASE}?charset=utf8mb4'
else:
    # 로컬 환경일 경우 - UTF-8 인코딩 추가
    # localhost의 3306 포트로 연결
    database_connetion_string = f'mysql+pymysql://root:{MYSQL_ROOT_PASSWORD}@localhost:3306/{MYSQL_DATABASE}?charset=utf8mb4'
# 연결할 데이터베이스 이름 출력
print(f"Connecting to database: {MYSQL_DATABASE}")

engine_url = create_engine(database_connetion_string, echo=True)

# Setting config load
class Settings(BaseSettings):
	SECRET_KEY: Optional[str] = None
	DATABASE_URL: Optional[str] = None
	class Config:
		env_file = ".env"

# 데이터베이스 테이블 생성하는 함수
def conn():
	SQLModel.metadata.create_all(engine_url)

# Session 사용 후 자동으로 종료
def get_session():
	with Session(engine_url) as session:
		yield session