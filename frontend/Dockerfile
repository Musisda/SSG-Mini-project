FROM node:18-alpine

WORKDIR /app

# 환경변수 설정
ARG API_URL=http://192.168.56.20/api
ARG GOOGLE_AUTH_CLIENT_ID=648253380231-u9r6ak5ui2mve6sl4eu5qf48v1dp03l9.apps.googleusercontent.com

# 소스 코드 복사 (필요한 파일만)
COPY css/ ./css/
COPY js/ ./js/
COPY index.html ./

# js/config.js 파일 생성 (환경변수로)
RUN mkdir -p js && \
    echo "// 자동 생성된 환경설정 파일" > js/config.js && \
    echo "window.ENV = {" >> js/config.js && \
    echo "    GOOGLE_AUTH_CLIENT_ID: \"${GOOGLE_AUTH_CLIENT_ID}\"," >> js/config.js && \
    echo "    API_URL: \"${API_URL}\"" >> js/config.js && \
    echo "};" >> js/config.js && \
    echo "console.log('🔧 환경변수 로드됨:', window.ENV);" >> js/config.js

# http-server 설치
RUN npm install -g http-server

# 포트 노출
EXPOSE 3000

# 서버 실행
CMD ["http-server", ".", "-p", "3000", "-a", "0.0.0.0", "--cors"]