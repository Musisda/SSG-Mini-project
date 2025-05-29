// Google 로그인 버튼 컴포넌트

function initializeGoogleLogin() {
    const container = document.getElementById('google-login-btn');
    
    try {
        // Google OAuth 초기화
        window.google.accounts.id.initialize({
            client_id: window.ENV.GOOGLE_AUTH_CLIENT_ID,
            callback: handleGoogleLogin,
            auto_select: false,
            cancel_on_tap_outside: true
        });
        
        // 로그인 버튼 렌더링
        window.google.accounts.id.renderButton(container, {
            theme: 'outline',
            size: 'large',
            width: 300,
            text: 'signin_with',
            shape: 'rectangular'
        });
        
        console.log('Google 로그인 버튼 초기화 성공');
    } catch (error) {
        console.error('Google 로그인 초기화 오류:', error);
        container.innerHTML = '<p style="color: red;">Google 로그인을 초기화할 수 없습니다.</p>';
    }
}

function handleGoogleLogin(response) {
    console.log('Google 로그인 응답 받음');
    
    try {
        const decodedToken = parseJwt(response.credential);
        
        if (!decodedToken) {
            console.error('토큰 파싱 실패');
            alert('로그인 처리 중 오류가 발생했습니다.');
            return;
        }
        
        console.log('디코딩된 토큰:', {
            email: decodedToken.email,
            name: decodedToken.name
        });
        
        // FastAPI 서버로 보낼 데이터
        const loginData = {
            email: decodedToken.email,
            username: decodedToken.name || decodedToken.email.split('@')[0],
            exp: decodedToken.exp
        };
        
        // 로그인 요청 전송
        const apiUrl = window.ENV.API_URL;
        console.log('API URL:', apiUrl);
        
        fetch(`${apiUrl}/user/google-login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(loginData)
        })
        .then(response => {
            console.log('서버 응답 상태:', response.status);
            if (!response.ok) {
                throw new Error(`로그인 요청 실패: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('로그인 성공:', data);
            
            // 토큰을 localStorage에 저장
            const myToken = {
                token: data,
                expire: Date.now() + 60 * 60 * 1000 // 1시간 후 만료
            };
            
            localStorage.setItem('token', JSON.stringify(myToken));
            
            // 페이지 새로고침
            window.location.reload();
        })
        .catch(error => {
            console.error('로그인 오류:', error);
            alert('로그인 중 오류가 발생했습니다. 콘솔을 확인해주세요.');
        });
        
    } catch (error) {
        console.error('로그인 처리 오류:', error);
        alert('로그인 처리 중 오류가 발생했습니다.');
    }
}

function renderGoogleLoginButton() {
    const container = document.getElementById('google-login-btn');
    container.innerHTML = '<div>Google 로그인 로딩 중...</div>';
    
    // Google API가 로드된 후 초기화
    if (window.google && window.google.accounts) {
        initializeGoogleLogin();
    } else {
        // Google API 로드 대기
        let attempts = 0;
        const maxAttempts = 50; // 5초 대기
        
        const checkGoogleAPI = setInterval(() => {
            attempts++;
            
            if (window.google && window.google.accounts) {
                clearInterval(checkGoogleAPI);
                initializeGoogleLogin();
            } else if (attempts >= maxAttempts) {
                clearInterval(checkGoogleAPI);
                console.error('Google API 로드 실패');
                container.innerHTML = '<p style="color: red;">Google 로그인을 로드할 수 없습니다.</p>';
            }
        }, 100);
    }
}

// JWT 디코딩 함수 (간단한 버전)
function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error('JWT parsing error:', error);
        return null;
    }
}