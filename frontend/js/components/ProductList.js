// 상품 목록 컴포넌트
function renderProductList(products) {
    const container = document.getElementById('product-list-container');
    
    if (!products || products.length === 0) {
        container.innerHTML = '<p class="loading">등록된 상품이 없습니다.</p>';
        return;
    }
    
    let html = '<h2>상품 관리</h2><div class="product-grid">';
    
    products.forEach(product => {
        // 현재 장바구니에 있는 상품인지 확인
        const cartItem = window.cartData?.find(item => item.product_id === product.id);
        const cartQuantity = cartItem ? cartItem.quantity : 0;
        const availableStock = product.stock - cartQuantity;
        const isOutOfStock = availableStock <= 0;
        
        html += `
            <div class="product-card">
                <div class="product-image" onclick="showProductDetail(${product.id})">
                    ${product.image_url ? 
                        `<img src="${escapeHtml(product.image_url)}" alt="${escapeHtml(product.name)}">` : 
                        '<div class="no-image"></div>'
                    }
                </div>
                <div class="product-info">
                    <h3>${escapeHtml(product.name)}</h3>
                    <div class="product-price">₩${product.price.toLocaleString()}</div>
                    <div class="product-stock">
                        재고: ${product.stock}개
                        ${cartQuantity > 0 ? `(장바구니: ${cartQuantity}개)` : ''}
                    </div>
                    <div class="product-actions">
                        ${window.currentUser ? `
                            <button class="btn-cart" 
                                    onclick="addToCart(${product.id})" 
                                    ${isOutOfStock ? 'disabled' : ''}
                                    title="${isOutOfStock ? '재고가 부족합니다' : '장바구니에 추가'}">
                                <span>${isOutOfStock ? '재고부족' : '장바구니'}</span>
                            </button>
                            <button class="wishlist-heart ${window.wishedProducts?.includes(product.id) ? 'active' : ''}" 
                                    onclick="handleWishlistClick(${product.id})" 
                                    title="위시리스트">
                                ${window.wishedProducts?.includes(product.id) ? '❤️' : '🤍'}
                            </button>
                        ` : ''}
                        ${window.currentUser?.is_admin ? `
                            <button class="btn-edit" onclick="editProduct(${product.id})">수정</button>
                            <button class="btn-delete" onclick="deleteProduct(${product.id})">삭제</button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    
    // 관리자인 경우 상품 추가 버튼 표시
    if (window.currentUser?.is_admin) {
        html += `
            <div class="admin-actions">
                <button class="btn-primary" onclick="showView('admin')">새 상품 추가</button>
            </div>
        `;
    }
    
    container.innerHTML = html;
}

async function addToCart(productId) {
    const token = getToken();
    if (!token) {
        alert('로그인이 필요합니다.');
        return;
    }
    
    // 버튼 비활성화 (중복 클릭 방지)
    const button = event.target.closest('.btn-cart');
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
        if (product.stock <= cartQuantity) {
            throw new Error('재고가 부족합니다.');
        }
        
        const api = createAuthenticatedRequest(token.access_token);
        const response = await api.post('/cart/', {
            product_id: productId,
            quantity: 1
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || '장바구니 추가 실패');
        }
        
        showMessage('장바구니에 추가되었습니다.', 'success');
        
        // 장바구니 데이터 새로고침
        await loadCartData();
        updateCartCount();
        
        // 상품 목록 다시 렌더링 (재고 상태 업데이트)
        renderProductList(window.productData);
        
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

// 장바구니 데이터만 로드하는 함수
async function loadCartData() {
    const token = getToken();
    if (!token) return;
    
    try {
        const api = createAuthenticatedRequest(token.access_token);
        const response = await api.get('/cart/');
        
        if (response.ok) {
            window.cartData = await response.json();
        }
    } catch (error) {
        console.error('장바구니 데이터 로드 오류:', error);
    }
}

function editProduct(productId) {
    const product = window.productData.find(p => p.id === productId);
    if (product) {
        showView('admin');
        // 약간의 지연 후 폼 채우기 (DOM 렌더링 대기)
        setTimeout(() => populateProductForm(product), 100);
    }
}

async function deleteProduct(productId) {
    if (!confirm('정말로 이 상품을 삭제하시겠습니까?')) {
        return;
    }
    
    const token = getToken();
    if (!token) {
        alert('로그인이 필요합니다.');
        return;
    }
    
    try {
        const api = createAuthenticatedRequest(token.access_token);
        const response = await api.delete(`/products/${productId}`);
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || '삭제 요청 실패');
        }
        
        showMessage('상품이 성공적으로 삭제되었습니다.', 'success');
        loadProducts();
        
    } catch (error) {
        console.error('삭제 오류:', error);
        showMessage(error.message || '상품 삭제 중 오류가 발생했습니다.', 'error');
    }
}

async function handleWishlistClick(productId) {
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
                if (!window.wishedProducts.includes(productId)) {
                    window.wishedProducts.push(productId);
                }
            } else {
                window.wishedProducts = window.wishedProducts.filter(id => id !== productId);
            }
            
            // 상품 목록 다시 렌더링
            renderProductList(window.productData);
        }
    } catch (error) {
        console.error('위시리스트 오류:', error);
        showMessage('위시리스트 처리 중 오류가 발생했습니다.', 'error');
    }
}

// 전역 함수로 노출
window.renderProductList = renderProductList;
window.addToCart = addToCart;
window.loadCartData = loadCartData;
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.handleWishlistClick = handleWishlistClick;