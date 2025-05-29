// 토큰 관리 유틸리티 함수들

function getToken() {
    const tokenStr = localStorage.getItem('token');
    if (!tokenStr) return null;
    
    const myToken = JSON.parse(tokenStr);
    if (myToken.expire <= Date.now()) {
        localStorage.removeItem('token');
        return null;
    }
    return myToken.token;
}

function logout() {
    localStorage.removeItem('token');
    window.location.reload();
}

// API 요청을 위한 HTTP 클라이언트 생성
function createAuthenticatedRequest(token) {
    const baseURL = window.ENV.API_URL;
    
    return {
        get: function(endpoint) {
            return fetch(`${baseURL}${endpoint}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
        },
        
        post: function(endpoint, data) {
            return fetch(`${baseURL}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data)
            });
        },
        
        put: function(endpoint, data) {
            return fetch(`${baseURL}${endpoint}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data)
            });
        },
        
        delete: function(endpoint) {
            return fetch(`${baseURL}${endpoint}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
        }
    };
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