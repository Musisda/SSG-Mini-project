VAGRANTFILE_API_VERSION = "2"

Vagrant.configure(VAGRANTFILE_API_VERSION) do |config|
  config.vm.box = "rockylinux/9"
  config.vm.boot_timeout = 1200
  config.vm.synced_folder "./", "/vagrant", disabled: true
  
  # VirtualBox Guest Additions 자동 업데이트 비활성화
  config.vbguest.auto_update = false if Vagrant.has_plugin?("vagrant-vbguest")
  
  # 디스크 사이즈 설정
  if Vagrant.has_plugin?("vagrant-disksize")
    config.disksize.size = "50GB"
  end

  # 올인원 쇼핑몰 서버
  config.vm.define "shopping-mall" do |vm|
    vm.vm.hostname = "shopping-mall"
    vm.vm.network "private_network", ip: "192.168.56.20"
    
    # 포트 포워딩 설정
    vm.vm.network "forwarded_port", guest: 80, host: 8080     # Nginx (메인 접속)
    vm.vm.network "forwarded_port", guest: 3000, host: 3000   # Frontend 직접 접속
    vm.vm.network "forwarded_port", guest: 8000, host: 8000   # Backend API 직접 접속
    vm.vm.network "forwarded_port", guest: 3306, host: 3306   # MySQL 직접 접속
    
    # 프로젝트 폴더 동기화
    vm.vm.synced_folder "./project", "/home/vagrant/shopping-mall", create: true
    
    vm.vm.provider :virtualbox do |vb|
      vb.name = "shopping-mall-server"
      vb.memory = 4096    # 모든 서비스를 위해 4GB
      vb.cpus = 2
      vb.customize ["modifyvm", :id, "--natdnshostresolver1", "on"]
    end
    
    # 프로비저닝 스크립트 실행
    vm.vm.provision "shell", path: "scripts/setup.sh"
  end
end