// 메인 애플리케이션 스크립트

// 전역 변수
window.currentUser = null;
window.productData = [];
window.cartData = [];
window.wishedProducts = [];

// 초기화
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 애플리케이션 초기화 시작');
    
    // 환경변수 확인
    if (!window.ENV) {
        console.error('❌ 환경변수가 로드되지 않았습니다.');
        return;
    }
    
    console.log('✅ 환경변수 로드 완료:', window.ENV);
    
    // 인증 상태 확인
    checkAuth();
    
    // 이벤트 리스너 설정
    setupEventListeners();
});

// 인증 상태 확인
async function checkAuth() {
    const token = getToken();
    
    if (!token) {
        showLoginContainer();
        return;
    }
    
    try {
        // 사용자 정보 가져오기
        const api = createAuthenticatedRequest(token.access_token);
        const response = await api.get('/user/me');
        
        if (!response.ok) {
            throw new Error('인증 실패');
        }
        
        const userData = await response.json();
        window.currentUser = userData;
        
        showMainContainer();
        
        // 데이터 로드
        await Promise.all([
            loadProducts(),
            loadCartData(), // 장바구니 데이터 먼저 로드
            loadWishedProducts()
        ]);
        
        updateCartCount();
        
    } catch (error) {
        console.error('인증 확인 오류:', error);
        localStorage.removeItem('token');
        showLoginContainer();
    }
}

// 장바구니 데이터만 로드하는 함수
async function loadCartData() {
    const token = getToken();
    if (!token) return;
    
    try {
        const api = createAuthenticatedRequest(token.access_token);
        const response = await api.get('/cart/');
        
        if (response.ok) {
            window.cartData = await response.json();
            console.log('장바구니 데이터 로드됨:', window.cartData.length, '개 상품');
        }
    } catch (error) {
        console.error('장바구니 데이터 로드 오류:', error);
        window.cartData = [];
    }
}

// 로그인 컨테이너 표시
function showLoginContainer() {
    document.getElementById('login-container').style.display = 'flex';
    document.getElementById('main-container').style.display = 'none';
}

// 메인 컨테이너 표시
function showMainContainer() {
    const loginContainer = document.getElementById('login-container');
    const mainContainer = document.getElementById('main-container');
    const userInfo = document.getElementById('user-info');
    const adminBtn = document.getElementById('admin-btn');

    if (!loginContainer || !mainContainer || !userInfo) {
        console.warn('[showMainContainer] 필수 DOM 요소가 누락되었습니다.');
        return;
    }

    loginContainer.style.display = 'none';
    mainContainer.style.display = 'block';
    userInfo.textContent = `안녕하세요, ${window.currentUser?.username ?? ''}님!`;

    if (adminBtn) {
        adminBtn.style.display = window.currentUser?.is_admin ? 'inline-block' : 'none';
    }
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 헤더 버튼들
    const cartBtn = document.getElementById('cart-btn');
    const mypageBtn = document.getElementById('mypage-btn');
    const orderBtn = document.getElementById('order-btn');
    const qnaBtn = document.getElementById('qna-btn');
    const adminBtn = document.getElementById('admin-btn');
    const logoutBtn = document.getElementById('logout-btn');
    
    if (cartBtn) cartBtn.addEventListener('click', (e) => {
        e.preventDefault();
        showView('cart');
    });
    if (mypageBtn) mypageBtn.addEventListener('click', (e) => {
        e.preventDefault();
        showView('mypage');
    });
    if (orderBtn) orderBtn.addEventListener('click', () => showView('orders'));
    if (qnaBtn) qnaBtn.addEventListener('click', (e) => {
        e.preventDefault();
        showView('qna');
    });
    if (adminBtn) adminBtn.addEventListener('click', () => showView('admin'));
    if (logoutBtn) logoutBtn.addEventListener('click', logout);
}

// 뷰 전환 함수
function showView(viewName) {
    // 모든 컨테이너 숨기기
    const containers = [
        'product-list-container',
        'product-detail-container',
        'product-form-container',
        'cart-container',
        'checkout-container',
        'order-list-container',
        'mypage-container',
        'wishlist-container',
        'qna-container'
    ];
    
    containers.forEach(containerId => {
        const container = document.getElementById(containerId);
        if (container) {
            container.style.display = 'none';
        }
    });
    
    // 선택된 뷰 표시
    let targetContainer;
    
    switch(viewName) {
        case 'products':
            targetContainer = document.getElementById('product-list-container');
            loadProducts();
            break;
            
        case 'product-detail':
            targetContainer = document.getElementById('product-detail-container');
            if (!targetContainer) {
                console.error('product-detail-container not found');
                return;
            }
            break;
            
        case 'admin':
            targetContainer = document.getElementById('product-form-container');
            if (window.currentUser?.is_admin) {
                renderProductForm();
            } else {
                showMessage('관리자 권한이 필요합니다.', 'error');
                return showView('products');
            }
            break;
            
        case 'cart':
            targetContainer = document.getElementById('cart-container');
            loadCart();
            break;
            
        case 'checkout':
            targetContainer = document.getElementById('checkout-container');
            showCheckout();
            break;
            
        case 'orders':
            targetContainer = document.getElementById('order-list-container');
            loadOrders();
            break;
            
        case 'mypage':
            targetContainer = document.getElementById('mypage-container');
            loadMyPage();
            break;
            
        case 'wishlist':
            targetContainer = document.getElementById('wishlist-container');
            loadWishlist();
            break;
            
        case 'qna':
            targetContainer = document.getElementById('qna-container');
            loadQnAList();
            break;
            
        default:
            console.error('알 수 없는 뷰:', viewName);
            return;
    }
    
    if (targetContainer) {
        targetContainer.style.display = 'block';
    }
}

// 상품 목록 로드
async function loadProducts() {
    try {
        const container = document.getElementById('product-list-container');
        container.innerHTML = '<p class="loading">상품을 불러오는 중...</p>';
        
        const response = await fetch(`${window.ENV.API_URL}/products/`);
        if (!response.ok) throw new Error('상품 로딩 실패');
        
        const products = await response.json();
        window.productData = products;
        
        // 장바구니 데이터도 함께 로드하여 재고 상태 정확히 표시
        await loadCartData();
        
        renderProductList(products);
        
    } catch (error) {
        console.error('상품 로딩 오류:', error);
        const container = document.getElementById('product-list-container');
        container.innerHTML = '<p class="error-message">상품을 불러오는 중 오류가 발생했습니다.</p>';
    }
}

// 장바구니 개수 업데이트
async function updateCartCount() {
    const token = getToken();
    if (!token) return;
    
    try {
        // window.cartData를 사용하여 개수 계산
        if (window.cartData) {
            const totalItems = window.cartData.reduce((sum, item) => sum + item.quantity, 0);
            
            const cartCountSpan = document.getElementById('cart-count');
            if (cartCountSpan) {
                cartCountSpan.textContent = totalItems;
            }
            
            // 헤더의 장바구니 버튼 텍스트 업데이트
            const cartBtn = document.getElementById('cart-btn');
            if (cartBtn && totalItems > 0) {
                cartBtn.textContent = `장바구니 (${totalItems})`;
            } else if (cartBtn) {
                cartBtn.textContent = '장바구니';
            }
        }
    } catch (error) {
        console.error('장바구니 개수 업데이트 오류:', error);
    }
}

// 위시리스트 상품 로드
async function loadWishedProducts() {
    const token = getToken();
    if (!token) return;
    
    try {
        const api = createAuthenticatedRequest(token.access_token);
        const response = await api.get('/wishlist/');
        
        if (response.ok) {
            const wishlist = await response.json();
            window.wishedProducts = wishlist.map(item => item.id);
        }
    } catch (error) {
        console.error('위시리스트 로드 오류:', error);
    }
}

// 위시리스트 토글
async function toggleWishlist(productId) {
    const token = getToken();
    if (!token) {
        alert('로그인이 필요합니다.');
        return;
    }
    
    try {
        const api = createAuthenticatedRequest(token.access_token);
        const response = await api.post(`/wishlist/${productId}`, {});
        
        if (response.ok) {
            const result = await response.json();
            showMessage(result.message, 'success');
            
            // 위시리스트 상태 업데이트
            if (result.status === 'added') {
                window.wishedProducts = window.wishedProducts || [];
                window.wishedProducts.push(productId);
            } else {
                window.wishedProducts = window.wishedProducts.filter(id => id !== productId);
            }
            
            // 현재 뷰가 상품 목록이면 다시 렌더링
            if (document.getElementById('product-list-container').style.display !== 'none') {
                renderProductList(window.productData);
            }
        }
    } catch (error) {
        console.error('위시리스트 오류:', error);
        showMessage('위시리스트 처리 중 오류가 발생했습니다.', 'error');
    }
}

// 장바구니에 상품 추가 (전역 함수)
async function addToCart(productId, quantity = 1) {
    const token = getToken();
    if (!token) {
        alert('로그인이 필요합니다.');
        return;
    }
    
    // 버튼 비활성화 (중복 클릭 방지)
    const button = event?.target?.closest('.btn-cart');
    if (button) {
        button.disabled = true;
        button.textContent = '추가중...';
    }
    
    try {
        // 현재 상품 정보 확인
        const product = window.productData.find(p => p.id === productId);
        if (!product) {
            throw new Error('상품을 찾을 수 없습니다.');
        }
        
        // 현재 장바구니에 있는 수량 확인
        const cartItem = window.cartData?.find(item => item.product_id === productId);
        const cartQuantity = cartItem ? cartItem.quantity : 0;
        
        // 재고 확인
        if (product.stock < cartQuantity + quantity) {
            throw new Error('재고가 부족합니다.');
        }
        
        const api = createAuthenticatedRequest(token.access_token);
        const response = await api.post('/cart/', {
            product_id: productId,
            quantity: quantity
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || '장바구니 추가 실패');
        }
        
        showMessage(`${quantity}개가 장바구니에 추가되었습니다.`, 'success');
        
        // 장바구니 데이터 새로고침
        await loadCartData();
        updateCartCount();
        
        // 상품 목록 다시 렌더링 (재고 상태 업데이트)
        if (window.productData && document.getElementById('product-list-container').style.display !== 'none') {
            renderProductList(window.productData);
        }
        
    } catch (error) {
        console.error('장바구니 추가 오류:', error);
        showMessage(error.message || '장바구니 추가 중 오류가 발생했습니다.', 'error');
    } finally {
        // 버튼 복원
        if (button) {
            button.disabled = false;
            button.textContent = '장바구니';
        }
    }
}

// 메시지 표시 함수
function showMessage(message, type = 'info', duration = 3000) {
    // 기존 메시지 제거
    const existingMessage = document.querySelector('.toast-message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    // 새 메시지 생성
    const messageDiv = document.createElement('div');
    messageDiv.className = `toast-message toast-${type}`;
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        color: white;
        font-weight: 600;
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
        max-width: 400px;
        word-wrap: break-word;
    `;
    
    // 타입별 색상 설정
    switch(type) {
        case 'success':
            messageDiv.style.backgroundColor = '#28a745';
            break;
        case 'error':
            messageDiv.style.backgroundColor = '#dc3545';
            break;
        case 'warning':
            messageDiv.style.backgroundColor = '#ffc107';
            messageDiv.style.color = '#212529';
            break;
        default:
            messageDiv.style.backgroundColor = '#17a2b8';
    }
    
    document.body.appendChild(messageDiv);
    
    // 자동 제거
    setTimeout(() => {
        messageDiv.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 300);
    }, duration);
}

// CSS 애니메이션 추가
if (!document.querySelector('#toast-animations')) {
    const style = document.createElement('style');
    style.id = 'toast-animations';
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
}

// HTML 이스케이핑 함수
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 로그아웃 함수
function logout() {
    if (confirm('로그아웃 하시겠습니까?')) {
        localStorage.removeItem('token');
        window.location.reload();
    }
}

// 전역 함수로 노출
window.showView = showView;
window.loadProducts = loadProducts;
window.loadCartData = loadCartData;
window.updateCartCount = updateCartCount;
window.toggleWishlist = toggleWishlist;
window.showMessage = showMessage;
window.escapeHtml = escapeHtml;
window.addToCart = addToCart;
window.logout = logout;