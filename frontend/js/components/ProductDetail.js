// 상품 상세페이지 컴포넌트

let currentProductId = null;
let currentProductData = null;

// 상품 상세페이지 표시
async function showProductDetail(productId) {
    console.log('상품 상세페이지 로드:', productId);
    currentProductId = productId;
    
    // 먼저 뷰 변경
    showView('product-detail');
    
    // DOM이 준비될 때까지 대기
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const container = document.getElementById('product-detail-container');
    if (!container) {
        console.error('product-detail-container를 찾을 수 없습니다');
        alert('페이지 로딩 중 오류가 발생했습니다.');
        return;
    }
    
    container.innerHTML = '<p class="loading">상품 정보를 불러오는 중...</p>';
    
    try {
        // 캐시된 상품 데이터에서 먼저 찾기
        let product = window.productData?.find(p => p.id === parseInt(productId));
        
        if (!product) {
            console.log('캐시에서 상품을 찾을 수 없어 API 호출');
            const response = await fetch(`${window.ENV.API_URL}/products/${productId}`);
            if (!response.ok) {
                throw new Error(`상품을 찾을 수 없습니다 (${response.status})`);
            }
            product = await response.json();
        }
        
        currentProductData = product;
        console.log('상품 데이터:', product);
        
        // 위시리스트 상태 확인
        let isWished = false;
        if (window.currentUser && window.wishedProducts) {
            isWished = window.wishedProducts.includes(parseInt(productId));
        }
        
        // 상품 상세페이지 렌더링
        renderProductDetail(product, isWished);
        
    } catch (error) {
        console.error('상품 상세페이지 로드 오류:', error);
        container.innerHTML = `
            <div class="error-container">
                <p class="error-message">상품 정보를 불러올 수 없습니다.</p>
                <p>오류: ${error.message}</p>
                <button class="btn-secondary" onclick="goBack()">목록으로 돌아가기</button>
            </div>
        `;
    }
}

// 상품 상세페이지 렌더링
function renderProductDetail(product, isWished = false) {
    const container = document.getElementById('product-detail-container');
    
    const html = `
        <div class="product-detail">
            <div class="product-detail-header">
                <button class="btn-secondary" onclick="goBack()">← 뒤로가기</button>
            </div>
            
            <div class="product-detail-content">
                <div class="product-detail-image">
                    ${product.image_url ? 
                        `<img src="${escapeHtml(product.image_url)}" alt="${escapeHtml(product.name)}">` : 
                        '<div class="no-image">No Image</div>'
                    }
                </div>
                
                <div class="product-detail-info">
                    <h1 class="product-title">${escapeHtml(product.name)}</h1>
                    <div class="product-price">₩${product.price.toLocaleString()}</div>
                    <div class="product-stock">현재 재고: ${product.stock}개</div>
                    
                    <div class="product-description">
                        <h3>상품 설명</h3>
                        <p>${escapeHtml(product.description || '상품 설명이 없습니다.')}</p>
                    </div>
                    
                    ${window.currentUser ? `
                        <div class="product-actions">
                            <button class="btn-wishlist ${isWished ? 'active' : ''}" 
                                    onclick="toggleProductWishlist(${product.id})">
                                <span class="heart-icon">${isWished ? '❤️' : '🤍'}</span>
                                위시리스트
                            </button>
                            
                            <div class="quantity-selector">
                                <label>수량:</label>
                                <div class="quantity-controls">
                                    <button type="button" onclick="changeQuantity(-1)">-</button>
                                    <input type="number" id="product-quantity" value="1" min="1" max="${product.stock}">
                                    <button type="button" onclick="changeQuantity(1)">+</button>
                                </div>
                            </div>
                            
                            <button class="btn-primary btn-large" onclick="addToCartFromDetail()" 
                                ${product.stock === 0 ? 'disabled' : ''}>
                                ${product.stock === 0 ? '품절' : '장바구니에 담기'}
                            </button>
                        </div>
                    ` : '<p class="login-notice">로그인 후 구매하실 수 있습니다.</p>'}
                </div>
            </div>
            
            <div class="product-reviews-section">
                <div class="reviews-header">
                    <h3>구매후기</h3>
                    ${window.currentUser ? 
                        '<button class="btn-primary" onclick="showReviewForm()">후기 작성</button>' : 
                        ''
                    }
                </div>
                
                <div id="reviews-container">
                    <p class="loading">후기를 불러오는 중...</p>
                </div>
                
                ${window.currentUser ? `
                    <div id="review-form-modal" class="modal" style="display: none;">
                        <div class="modal-content">
                            <h3>구매후기 작성</h3>
                            <form onsubmit="submitReview(event)">
                                <div class="form-group">
                                    <label>평점</label>
                                    <div class="rating-input">
                                        <input type="radio" name="rating" value="5" id="star5" required>
                                        <label for="star5">⭐⭐⭐⭐⭐</label>
                                        <input type="radio" name="rating" value="4" id="star4">
                                        <label for="star4">⭐⭐⭐⭐</label>
                                        <input type="radio" name="rating" value="3" id="star3">
                                        <label for="star3">⭐⭐⭐</label>
                                        <input type="radio" name="rating" value="2" id="star2">
                                        <label for="star2">⭐⭐</label>
                                        <input type="radio" name="rating" value="1" id="star1">
                                        <label for="star1">⭐</label>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label>후기 내용</label>
                                    <textarea id="review-content" placeholder="구매하신 상품은 어떠셨나요?" rows="4" required></textarea>
                                </div>
                                <div class="form-actions">
                                    <button type="submit" class="btn-primary">후기 등록</button>
                                    <button type="button" class="btn-secondary" onclick="hideReviewForm()">취소</button>
                                </div>
                            </form>
                        </div>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
    
    container.innerHTML = html;
    
    // 후기 로드
    setTimeout(() => {
        loadProductReviews(product.id);
    }, 100);
}

// 구매후기 로드 (더미 데이터)
function loadProductReviews(productId) {
    const container = document.getElementById('reviews-container');
    if (!container) {
        console.log('reviews-container를 찾을 수 없음');
        return;
    }
    
    const dummyReviews = [
        {
            id: 1,
            user_name: "김**",
            rating: 5,
            content: "정말 좋은 상품이에요! 배송도 빠르고 품질도 만족스럽습니다.",
            created_at: "2024-05-20T10:30:00Z"
        },
        {
            id: 2,
            user_name: "이**",
            rating: 4,
            content: "가격 대비 좋은 것 같아요. 추천합니다.",
            created_at: "2024-05-18T15:20:00Z"
        },
        {
            id: 3,
            user_name: "박**",
            rating: 5,
            content: "재구매 의사 있습니다. 매우 만족해요!",
            created_at: "2024-05-15T09:45:00Z"
        }
    ];
    
    renderProductReviews(dummyReviews);
}

// 구매후기 렌더링
function renderProductReviews(reviews) {
    const container = document.getElementById('reviews-container');
    if (!container) return;
    
    if (!reviews || reviews.length === 0) {
        container.innerHTML = '<p class="empty-message">아직 작성된 후기가 없습니다.</p>';
        return;
    }
    
    const avgRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
    
    let html = `
        <div class="reviews-summary">
            <div class="avg-rating">
                <span class="rating-score">${avgRating.toFixed(1)}</span>
                <span class="rating-stars">${'⭐'.repeat(Math.round(avgRating))}</span>
                <span class="review-count">(${reviews.length}개 후기)</span>
            </div>
        </div>
        
        <div class="reviews-list">
    `;
    
    reviews.forEach(review => {
        const date = new Date(review.created_at).toLocaleDateString('ko-KR');
        html += `
            <div class="review-item">
                <div class="review-header">
                    <span class="reviewer-name">${escapeHtml(review.user_name)}</span>
                    <span class="review-rating">${'⭐'.repeat(review.rating)}</span>
                    <span class="review-date">${date}</span>
                </div>
                <div class="review-content">
                    ${escapeHtml(review.content)}
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

// 수량 변경
function changeQuantity(delta) {
    const input = document.getElementById('product-quantity');
    if (!input) return;
    
    const currentValue = parseInt(input.value) || 1;
    const newValue = currentValue + delta;
    const maxStock = parseInt(input.max) || 999;
    
    if (newValue >= 1 && newValue <= maxStock) {
        input.value = newValue;
    }
}

// 상세페이지에서 장바구니에 추가
async function addToCartFromDetail() {
    const quantityInput = document.getElementById('product-quantity');
    const quantity = quantityInput ? parseInt(quantityInput.value) || 1 : 1;
    
    if (quantity < 1) {
        alert('수량을 확인해주세요.');
        return;
    }
    
    const token = getToken();
    if (!token) {
        alert('로그인이 필요합니다.');
        return;
    }
    
    try {
        const api = createAuthenticatedRequest(token.access_token);
        const response = await api.post('/cart/', {
            product_id: currentProductId,
            quantity: quantity
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || '장바구니 추가 실패');
        }
        
        showMessage(`${quantity}개가 장바구니에 추가되었습니다.`, 'success');
        updateCartCount();
        
    } catch (error) {
        console.error('장바구니 추가 오류:', error);
        showMessage(error.message || '장바구니 추가 중 오류가 발생했습니다.', 'error');
    }
}

// 위시리스트 토글
async function toggleProductWishlist(productId) {
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
            
            // 버튼 상태 업데이트
            const wishBtn = document.querySelector('.btn-wishlist');
            const heartIcon = wishBtn.querySelector('.heart-icon');
            
            if (result.status === 'added') {
                wishBtn.classList.add('active');
                heartIcon.textContent = '❤️';
                window.wishedProducts = window.wishedProducts || [];
                if (!window.wishedProducts.includes(productId)) {
                    window.wishedProducts.push(productId);
                }
            } else {
                wishBtn.classList.remove('active');
                heartIcon.textContent = '🤍';
                window.wishedProducts = window.wishedProducts.filter(id => id !== productId);
            }
        }
    } catch (error) {
        console.error('위시리스트 오류:', error);
        showMessage('위시리스트 처리 중 오류가 발생했습니다.', 'error');
    }
}

// 후기 작성 폼 표시
function showReviewForm() {
    const modal = document.getElementById('review-form-modal');
    if (modal) modal.style.display = 'block';
}

// 후기 작성 폼 숨기기
function hideReviewForm() {
    const modal = document.getElementById('review-form-modal');
    if (modal) modal.style.display = 'none';
    
    const contentTextarea = document.getElementById('review-content');
    if (contentTextarea) contentTextarea.value = '';
    
    const ratingInputs = document.querySelectorAll('input[name="rating"]');
    ratingInputs.forEach(input => input.checked = false);
}

// 후기 제출
async function submitReview(event) {
    event.preventDefault();
    
    const ratingInput = document.querySelector('input[name="rating"]:checked');
    const contentInput = document.getElementById('review-content');
    
    if (!ratingInput || !contentInput) {
        alert('평점과 후기 내용을 모두 입력해주세요.');
        return;
    }
    
    const rating = parseInt(ratingInput.value);
    const content = contentInput.value.trim();
    
    if (!content) {
        alert('후기 내용을 입력해주세요.');
        return;
    }
    
    try {
        // 실제 API 호출 대신 성공 시뮬레이션
        showMessage('후기가 등록되었습니다.', 'success');
        hideReviewForm();
        
        // 후기 목록에 새 후기 추가하여 다시 렌더링
        const newReview = {
            id: Date.now(),
            user_name: window.currentUser.username.substring(0, 1) + '**',
            rating: rating,
            content: content,
            created_at: new Date().toISOString()
        };
        
        // 기존 후기 데이터 가져오기
        const reviewsContainer = document.getElementById('reviews-container');
        if (reviewsContainer) {
            // 새 후기를 포함한 더미 데이터로 다시 렌더링
            const existingReviews = [
                newReview,
                {
                    id: 1,
                    user_name: "김**",
                    rating: 5,
                    content: "정말 좋은 상품이에요! 배송도 빠르고 품질도 만족스럽습니다.",
                    created_at: "2024-05-20T10:30:00Z"
                },
                {
                    id: 2,
                    user_name: "이**",
                    rating: 4,
                    content: "가격 대비 좋은 것 같아요. 추천합니다.",
                    created_at: "2024-05-18T15:20:00Z"
                }
            ];
            
            renderProductReviews(existingReviews);
        }
        
    } catch (error) {
        console.error('후기 등록 오류:', error);
        showMessage('후기 등록 중 오류가 발생했습니다.', 'error');
    }
}

// 뒤로가기
function goBack() {
    showView('products');
}

// 전역 함수로 노출
window.showProductDetail = showProductDetail;
window.changeQuantity = changeQuantity;
window.addToCartFromDetail = addToCartFromDetail;
window.toggleProductWishlist = toggleProductWishlist;
window.showReviewForm = showReviewForm;
window.hideReviewForm = hideReviewForm;
window.submitReview = submitReview;
window.goBack = goBack;