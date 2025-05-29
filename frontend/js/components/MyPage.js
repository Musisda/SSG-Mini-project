// 마이페이지 컴포넌트

async function loadMyPage() {
    const token = getToken();
    if (!token) return;

    const container = document.getElementById('mypage-container');
    container.innerHTML = '<p class="loading">마이페이지를 불러오는 중...</p>';

    try {
        const api = createAuthenticatedRequest(token.access_token);
        const response = await api.get('/user/mypage');
        if (!response.ok) throw new Error('마이페이지 로드 실패');
        const data = await response.json();

        const html = `
            <div class="mypage-content" style="max-width: 800px; margin: auto; padding: 1rem; box-sizing: border-box;">
                <h2 style="font-size: 1.5rem; margin-bottom: 1rem;">마이페이지</h2>
                <div class="user-info-section" style="border: 1px solid #ccc; border-radius: 8px; padding: 1rem; margin-bottom: 1.5rem; background-color: #fafafa;">
                    <h3 style="margin-bottom: 0.5rem;">👤 회원 정보</h3>
                    <p><strong>이름:</strong> ${data.user.username}</p>
                    <p><strong>이메일:</strong> ${data.user.email}</p>
                    <p><strong>회원 등급:</strong> ${data.user.is_admin ? '관리자' : '일반회원'}</p>
                </div>

                <div class="mypage-menu" style="display: flex; flex-direction: column; gap: 0.75rem;">
                    <button onclick="showView('wishlist')" style="padding: 0.75rem; font-size: 1rem; border: 1px solid #ccc; border-radius: 6px; background: white;">❤️ 위시리스트</button>
                    <button onclick="showView('cart')" style="padding: 0.75rem; font-size: 1rem; border: 1px solid #ccc; border-radius: 6px; background: white;">🛒 장바구니</button>
                    <button onclick="showView('orders')" style="padding: 0.75rem; font-size: 1rem; border: 1px solid #ccc; border-radius: 6px; background: white;">📦 구매내역</button>
                    <button onclick="showView('qna')" style="padding: 0.75rem; font-size: 1rem; border: 1px solid #ccc; border-radius: 6px; background: white;">🔍 문의하기</button>
                </div>

                <div class="recent-orders" style="margin-top: 2rem;">
                    <h3 style="margin-bottom: 1rem;">최근 주문</h3>
                    ${data.recent_orders.length > 0 ?
                        data.recent_orders.map(order => `
                            <div class="order-summary" style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #eee;">
                                <span>${order.order_id}</span>
                                <span>₩${order.total_price.toLocaleString()}</span>
                                <span>${new Date(order.created_at).toLocaleDateString()}</span>
                            </div>
                        `).join('') :
                        '<p style="color: #999;">최근 주문 내역이 없습니다.</p>'
                    }
                </div>
            </div>
        `;

        container.innerHTML = html;

    } catch (error) {
        console.error('마이페이지 로드 오류:', error);
        container.innerHTML = '<p class="error-message">마이페이지를 불러올 수 없습니다.</p>';
    }
}


// 위시리스트 페이지
async function loadWishlist() {
    const token = getToken();
    if (!token) return;
    
    const container = document.getElementById('wishlist-container');
    container.innerHTML = '<p class="loading">위시리스트를 불러오는 중...</p>';
    
    try {
        const api = createAuthenticatedRequest(token.access_token);
        const response = await api.get('/wishlist/');
        
        if (!response.ok) throw new Error('위시리스트 로드 실패');
        
        const products = await response.json();
        
        if (products.length === 0) {
            container.innerHTML = `
                <div class="empty-wishlist">
                    <h2>❤️ 위시리스트</h2>
                    <p>아직 찜한 상품이 없습니다.</p>
                    <button class="btn-primary" onclick="showView('products')">쇼핑하러 가기</button>
                </div>
            `;
            return;
        }
        
        let html = '<div class="wishlist-content"><h2>❤️ 위시리스트</h2><div class="product-grid">';
        
        products.forEach(product => {
            html += `
                <div class="product-card">
                    <div class="product-image">
                        ${product.image_url ? 
                            `<img src="${escapeHtml(product.image_url)}" alt="${escapeHtml(product.name)}">` : 
                            '<div class="no-image">No Image</div>'
                        }
                    </div>
                    <div class="product-info">
                        <h3>${escapeHtml(product.name)}</h3>
                        <p class="product-description">${escapeHtml(product.description || '')}</p>
                        <div class="product-price">₩${product.price.toLocaleString()}</div>
                        <div class="product-stock">재고: ${product.stock}개</div>
                        <div class="product-actions">
                            <button class="btn-danger" onclick="removeFromWishlist(${product.wishlist_id}, ${product.id})">
                                ❤️ 제거
                            </button>
                            <button class="btn-primary" onclick="addToCart(${product.id})" 
                                ${product.stock === 0 ? 'disabled' : ''}>
                                장바구니에 담기
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += '</div></div>';
        container.innerHTML = html;
        
    } catch (error) {
        console.error('위시리스트 로드 오류:', error);
        container.innerHTML = '<p class="error-message">위시리스트를 불러올 수 없습니다.</p>';
    }
}

async function removeFromWishlist(wishlistId, productId) {
    await toggleWishlist(productId);
    loadWishlist();
}

// 전역 함수로 노출
window.loadMyPage = loadMyPage;
window.loadWishlist = loadWishlist;
window.removeFromWishlist = removeFromWishlist;