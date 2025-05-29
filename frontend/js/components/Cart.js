// 장바구니 컴포넌트

async function loadCart() {
    const token = getToken();
    if (!token) {
        document.getElementById('cart-container').innerHTML = '<p>로그인이 필요합니다.</p>';
        return;
    }
    
    try {
        const container = document.getElementById('cart-container');
        container.innerHTML = '<p class="loading">장바구니를 불러오는 중...</p>';
        
        const api = createAuthenticatedRequest(token.access_token);
        const response = await api.get('/cart/');
        
        if (!response.ok) throw new Error('장바구니 로딩 실패');
        
        const cartItems = await response.json();
        window.cartData = cartItems;
        
        renderCart(cartItems);
        
    } catch (error) {
        console.error('장바구니 로딩 오류:', error);
        document.getElementById('cart-container').innerHTML = 
            '<p class="error-message">장바구니를 불러오는 중 오류가 발생했습니다.</p>';
    }
}

function renderCart(cartItems) {
    const container = document.getElementById('cart-container');
    
    if (!cartItems || cartItems.length === 0) {
        container.innerHTML = `
            <div class="empty-cart">
                <p>장바구니가 비어있습니다.</p>
                <button class="btn-primary" onclick="showView('products')">쇼핑 계속하기</button>
            </div>
        `;
        return;
    }
    
    let totalPrice = 0;
    let itemsHtml = '';
    
    cartItems.forEach(item => {
        const subtotal = item.product.price * item.quantity;
        totalPrice += subtotal;
        
        // 재고 확인
        const maxQuantity = item.product.stock;
        const canIncrease = item.quantity < maxQuantity;
        const canDecrease = item.quantity > 1;
        
        itemsHtml += `
            <div class="cart-item">
                <input type="checkbox" class="cart-checkbox" checked>
                <div class="cart-item-image">
                    ${item.product.image_url ? 
                        `<img src="${escapeHtml(item.product.image_url)}" alt="${escapeHtml(item.product.name)}">` : 
                        '<div class="no-image">이미지 없음</div>'
                    }
                </div>
                <div class="cart-item-info">
                    <h3 class="cart-item-title">${escapeHtml(item.product.name)}</h3>
                    <p class="cart-item-price">₩${item.product.price.toLocaleString()}</p>
                    <p class="cart-item-stock">재고: ${item.product.stock}개</p>
                </div>
                <div class="quantity-controls">
                    <button class="qty-minus" 
                            onclick="updateQuantity(${item.id}, ${item.quantity - 1})"
                            ${!canDecrease ? 'disabled' : ''}
                            title="${!canDecrease ? '최소 수량입니다' : '수량 감소'}">-</button>
                    <span class="quantity-display">${item.quantity}</span>
                    <button class="qty-plus" 
                            onclick="updateQuantity(${item.id}, ${item.quantity + 1})"
                            ${!canIncrease ? 'disabled' : ''}
                            title="${!canIncrease ? '재고가 부족합니다' : '수량 증가'}">+</button>
                </div>
                <div class="cart-item-total">
                    ₩${subtotal.toLocaleString()}
                </div>
                <button class="btn-remove" onclick="removeFromCart(${item.id})">삭제</button>
            </div>
        `;
    });
    
    const html = `
        <div class="cart-container">
            <div class="cart-header">
                <h2>장바구니</h2>
                <div class="cart-actions">
                    <label class="select-all">
                        <input type="checkbox" checked> 전체 선택
                    </label>
                    <button class="btn-secondary" onclick="clearCart()">전체 삭제</button>
                </div>
            </div>
            
            <div class="cart-content">
                ${itemsHtml}
            </div>
            
            <div class="cart-summary">
                <div class="cart-total">
                    <span>총 결제 금액</span>
                    <span>₩${totalPrice.toLocaleString()}</span>
                </div>
                <button class="btn-checkout" onclick="checkout()" ${cartItems.length === 0 ? 'disabled' : ''}>
                    결제하기
                </button>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

async function updateQuantity(itemId, newQuantity) {
    // 수량 검증
    if (newQuantity < 1) {
        if (confirm('수량이 0이 되면 상품이 삭제됩니다. 계속하시겠습니까?')) {
            removeFromCart(itemId);
        }
        return;
    }
    
    const token = getToken();
    if (!token) return;
    
    // 버튼 비활성화 (중복 클릭 방지)
    const buttons = document.querySelectorAll(`[onclick*="${itemId}"]`);
    buttons.forEach(btn => btn.disabled = true);
    
    try {
        // 현재 장바구니 아이템 찾기
        const cartItem = window.cartData.find(item => item.id === itemId);
        if (!cartItem) {
            throw new Error('장바구니 아이템을 찾을 수 없습니다.');
        }
        
        // 재고 확인
        if (newQuantity > cartItem.product.stock) {
            throw new Error(`재고가 부족합니다. (재고: ${cartItem.product.stock}개)`);
        }
        
        const api = createAuthenticatedRequest(token.access_token);
        const response = await fetch(`${window.ENV.API_URL}/cart/${itemId}?quantity=${newQuantity}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token.access_token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || '수량 업데이트 실패');
        }

        showMessage('수량이 업데이트되었습니다.', 'success');
        loadCart();
        updateCartCount();
        
        // 상품 목록도 업데이트 (재고 상태 반영)
        if (window.productData) {
            await loadCartData();
            renderProductList(window.productData);
        }
        
    } catch (error) {
        console.error('수량 업데이트 오류:', error);
        showMessage(error.message || '수량 업데이트 중 오류가 발생했습니다.', 'error');
    } finally {
        // 버튼 활성화
        buttons.forEach(btn => btn.disabled = false);
    }
}

async function removeFromCart(itemId) {
    if (!confirm('이 상품을 장바구니에서 삭제하시겠습니까?')) return;
    
    const token = getToken();
    if (!token) return;
    
    try {
        const api = createAuthenticatedRequest(token.access_token);
        const response = await api.delete(`/cart/${itemId}`);
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || '삭제 실패');
        }
        
        showMessage('상품이 장바구니에서 삭제되었습니다.', 'success');
        loadCart();
        updateCartCount();
        
        // 상품 목록도 업데이트
        if (window.productData) {
            await loadCartData();
            renderProductList(window.productData);
        }
        
    } catch (error) {
        console.error('장바구니 삭제 오류:', error);
        showMessage(error.message || '삭제 중 오류가 발생했습니다.', 'error');
    }
}

async function clearCart() {
    if (!confirm('장바구니를 비우시겠습니까?')) return;
    
    const token = getToken();
    if (!token) return;
    
    try {
        const api = createAuthenticatedRequest(token.access_token);
        const response = await api.delete('/cart/');
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || '장바구니 비우기 실패');
        }
        
        showMessage('장바구니가 비워졌습니다.', 'success');
        loadCart();
        updateCartCount();
        
        // 상품 목록도 업데이트
        if (window.productData) {
            await loadCartData();
            renderProductList(window.productData);
        }
        
    } catch (error) {
        console.error('장바구니 비우기 오류:', error);
        showMessage(error.message || '장바구니 비우기 중 오류가 발생했습니다.', 'error');
    }
}

function checkout() {
    if (!window.cartData || window.cartData.length === 0) {
        showMessage('장바구니가 비어있습니다.', 'warning');
        return;
    }
    
    // showCheckout이 정의되어 있는지 확인
    if (typeof showCheckout === 'function') {
        showCheckout();
    } else {
        console.error('showCheckout 함수를 찾을 수 없습니다');
        // 직접 view 변경
        showView('checkout');
    }
}

// 전역 함수로 노출
window.loadCart = loadCart;
window.updateQuantity = updateQuantity;
window.removeFromCart = removeFromCart;
window.clearCart = clearCart;
window.checkout = checkout;