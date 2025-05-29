#!/bin/bash

echo "🚀 Rocky Linux 9 쇼핑몰 서버 설치 시작..."

# SELinux 설정 (개발용으로 permissive 모드)
sudo setenforce 0
sudo sed -i 's/^SELINUX=.*/SELINUX=permissive/g' /etc/selinux/config

# 시스템 업데이트
echo "📦 시스템 업데이트 중..."
sudo dnf update -y

# EPEL 저장소 설치
sudo dnf install -y epel-release

# 필수 패키지 설치
echo "🔧 필수 패키지 설치 중..."
sudo dnf install -y \
    wget \
    curl \
    git \
    vim \
    htop \
    net-tools \
    firewalld \
    yum-utils \
    device-mapper-persistent-data \
    lvm2

# 방화벽 설정
echo "🔥 방화벽 설정 중..."
sudo systemctl start firewalld
sudo systemctl enable firewalld
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --permanent --add-port=8000/tcp
sudo firewall-cmd --permanent --add-port=3306/tcp
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --reload

# Docker 저장소 추가
echo "🐳 Docker 저장소 추가 중..."
sudo dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo

# Docker 설치
echo "🐳 Docker 설치 중..."
sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Docker 서비스 시작
sudo systemctl start docker
sudo systemctl enable docker

# vagrant 사용자를 docker 그룹에 추가
sudo usermod -aG docker vagrant

# Docker Compose 설치
echo "🐙 Docker Compose 설치 중..."
DOCKER_COMPOSE_VERSION="2.21.0"
sudo curl -L "https://github.com/docker/compose/releases/download/v${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
sudo ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose

# Node.js 설치 (프론트엔드 빌드용)
echo "📦 Node.js 설치 중..."
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo dnf install -y nodejs

# Python 및 개발 도구 설치
echo "🐍 Python 및 개발 도구 설치 중..."
sudo dnf install -y python3 python3-pip python3-devel gcc mysql-devel

# 디렉토리 권한 설정
sudo chown -R vagrant:vagrant /home/vagrant

# Docker 서비스 상태 확인
echo "🔍 설치 상태 확인 중..."
sudo systemctl status docker --no-pager -l

# 설치 완료 메시지
echo ""
echo "✅ Rocky Linux 9 쇼핑몰 서버 설치 완료!"
echo ""
echo "📝 다음 단계:"
echo "1. 'vagrant reload shopping-mall' - VM 재시작 (Docker 그룹 권한 적용)"
echo "2. 'vagrant ssh shopping-mall' - VM에 접속"
echo "3. 'cd /home/vagrant/shopping-mall' - 프로젝트 디렉토리로 이동"
echo "4. 'docker-compose up -d' - 모든 서비스 시작"
echo ""
echo "🌐 접속 주소:"
echo "- 메인 사이트: http://192.168.56.20 또는 http://localhost:8080"
echo "- 프론트엔드: http://localhost:3000"
echo "- 백엔드 API: http://localhost:8000"
echo ""