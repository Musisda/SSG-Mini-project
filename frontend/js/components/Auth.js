// 인증 관련 함수들


function showLoginOptions() {
    document.getElementById('login-options').style.display = 'none';
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('signup-form').style.display = 'none';
    document.getElementById('admin-login-form').style.display = 'none';
    document.getElementById('google-login-container').style.display = 'none';
}

function showLoginForm() {
    document.getElementById('login-options').style.display = 'none';
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('signup-form').style.display = 'none';
    document.getElementById('admin-login-form').style.display = 'none';
    document.getElementById('google-login-container').style.display = 'none';
}

function showSignupForm() {
    document.getElementById('login-options').style.display = 'none';
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('signup-form').style.display = 'block';
    document.getElementById('admin-login-form').style.display = 'none';
    document.getElementById('google-login-container').style.display = 'none';
}

function showAdminLoginForm() {
    document.getElementById('login-options').style.display = 'none';
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('signup-form').style.display = 'none';
    document.getElementById('admin-login-form').style.display = 'block';
    document.getElementById('google-login-container').style.display = 'none';
}

function showGoogleLogin() {
    document.getElementById('login-options').style.display = 'none';
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('signup-form').style.display = 'none';
    document.getElementById('admin-login-form').style.display = 'none';
    document.getElementById('google-login-container').style.display = 'block';
    
    // Google 로그인 버튼 렌더링
    renderGoogleLoginButton();
}

// 일반 로그인 처리
async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    try {
        const response = await fetch(`${window.ENV.API_URL}/user/signin`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || '로그인 실패');
        }
        
        const data = await response.json();
        
        // 토큰 저장
        const myToken = {
            token: data,
            expire: Date.now() + 60 * 60 * 1000 // 1시간 후 만료
        };
        
        localStorage.setItem('token', JSON.stringify(myToken));
        
        // 사용자 정보 저장
        window.currentUser = {
            username: data.username,
            is_admin: data.is_admin
        };
        
        // 페이지 새로고침
        //window.location.reload();
         // 로그인 폼 숨기고 메인 컨테이너 표시
        showMainContainer(); // 또는 showView('main')
        loadProducts();
        updateCartCount();
        loadWishedProducts();

        
    } catch (error) {
        console.error('로그인 오류:', error);
        alert(error.message || '로그인 중 오류가 발생했습니다.');
    }
}

// 회원가입 처리
async function handleSignup(event) {
    event.preventDefault();
    
    const email = document.getElementById('signup-email').value;
    const username = document.getElementById('signup-username').value;
    const password = document.getElementById('signup-password').value;
    
    // 클라이언트 측 검증
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailPattern.test(email)) {
        alert('올바른 이메일 형식이 아닙니다.');
        return;
    }
    
    if (username.trim().length < 2) {
        alert('사용자명은 최소 2자 이상이어야 합니다.');
        return;
    }
    
    if (password.length < 6) {
        alert('비밀번호는 최소 6자 이상이어야 합니다.');
        return;
    }
    
    try {
        const response = await fetch(`${window.ENV.API_URL}/user/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, username, password })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || '회원가입 실패');
        }
        
        alert('회원가입이 완료되었습니다. 로그인해주세요.');
        showLoginForm();
        
        // 폼 초기화
        document.getElementById('signup-email').value = '';
        document.getElementById('signup-username').value = '';
        document.getElementById('signup-password').value = '';
        
    } catch (error) {
        console.error('회원가입 오류:', error);
        alert(error.message || '회원가입 중 오류가 발생했습니다.');
    }
}

// 관리자 로그인 처리
async function handleAdminLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('admin-email').value;
    const password = document.getElementById('admin-password').value;
    
    try {
        const response = await fetch(`${window.ENV.API_URL}/user/admin-signin`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || '관리자 로그인 실패');
        }
        
        const data = await response.json();
        
        // 토큰 저장
        const myToken = {
            token: data,
            expire: Date.now() + 60 * 60 * 1000 // 1시간 후 만료
        };
        
        localStorage.setItem('token', JSON.stringify(myToken));
        
        // 사용자 정보 저장
        window.currentUser = {
            username: data.username,
            is_admin: data.is_admin
        };
        
        // 페이지 새로고침
        window.location.reload();
        
    } catch (error) {
        console.error('관리자 로그인 오류:', error);
        alert(error.message || '관리자 로그인 중 오류가 발생했습니다.');
    }
}

// 전역 함수로 노출
window.showLoginOptions = showLoginOptions;
window.showLoginForm = showLoginForm;
window.showSignupForm = showSignupForm;
window.showAdminLoginForm = showAdminLoginForm;
window.showGoogleLogin = showGoogleLogin;
window.handleLogin = handleLogin;
window.handleSignup = handleSignup;
window.handleAdminLogin = handleAdminLogin;