// 결제 컴포넌트

// 카카오 주소 검색
function searchAddress() {
    new daum.Postcode({
        oncomplete: function(data) {
            document.getElementById('checkout-zipcode').value = data.zonecode;
            document.getElementById('checkout-address').value = data.roadAddress;
            document.getElementById('checkout-address-detail').focus();
        }
    }).open();
}
// 결제 페이지 표시
async function showCheckout() {
    const token = getToken();
    if (!token) {
        alert('로그인이 필요합니다.');
        return;
    }
    
    showView('checkout');
    
    const container = document.getElementById('checkout-container');
    
    // 현재 장바구니 정보와 사용자 정보 가져오기
    const cartItems = window.cartData || [];
    const user = window.currentUser;
    
    if (cartItems.length === 0) {
        container.innerHTML = '<p class="error-message">장바구니가 비어있습니다.</p>';
        return;
    }
    
    let totalPrice = 0;
    let itemsHtml = '';
    
    cartItems.forEach(item => {
        const subtotal = item.product.price * item.quantity;
        totalPrice += subtotal;
        
        itemsHtml += `
            <div class="order-item">
                <div class="order-item-info">
                    <span>${escapeHtml(item.product.name)}</span>
                    <span>${item.quantity}개</span>
                </div>
                <span>₩${subtotal.toLocaleString()}</span>
            </div>
        `;
    });
    
    const html = `
        <div class="order-container">
            <h2>주문 내역</h2>
            
            <div class="order-form">
                <div class="form-section">
                    <h3>배송지 정보</h3>
                    <form id="checkout-form">
                        <div class="form-group">
                            <label>받는 사람</label>
                            <input type="text" id="checkout-name" value="${user?.username || ''}" placeholder="받는 사람 이름을 입력해주세요" required>
                        </div>
                        
                        <div class="form-group">
                            <label>배송 주소</label>
                            <div class="address-search">
                                <input type="text" id="checkout-address" placeholder="주소를 입력해주세요" readonly required>
                                <button type="button" onclick="searchAddress()">주소 검색</button>
                            </div>
                            <input type="hidden" id="checkout-zipcode">
                            <input type="text" id="checkout-address-detail" placeholder="상세 주소를 입력해주세요" style="margin-top: 8px;">
                        </div>
                        
                        <div class="form-group">
                            <label>연락처</label>
                            <input type="tel" id="checkout-tel" placeholder="연락처를 입력해주세요" required>
                        </div>
                    </form>
                </div>
                
                <div class="form-section">
                    <h3>결제 정보</h3>
                    <div class="order-summary">
                        ${itemsHtml}
                        <div class="order-total">
                            <span>총 결제 금액</span>
                            <span>₩${totalPrice.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
                
                <div class="checkout-actions">
                    <button class="btn-secondary" onclick="showView('cart')">이전으로</button>
                    <button class="btn-primary" onclick="processPayment(${totalPrice})">
                        결제하기
                    </button>
                </div>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}
// 부트페이 결제 처리
async function processPayment(totalPrice) {
    const token = getToken();
    if (!token) return;
    
    // 부트페이 SDK 확인
    if (typeof Bootpay === 'undefined') {
        alert('결제 모듈이 로드되지 않았습니다. 페이지를 새로고침해주세요.');
        return;
    }
    
    // 배송 정보 가져오기
    const buyerName = document.getElementById('checkout-name').value.trim();
    const buyerTel = document.getElementById('checkout-tel').value.trim();
    const zipcode = document.getElementById('checkout-zipcode').value.trim();
    const address = document.getElementById('checkout-address').value.trim();
    const addressDetail = document.getElementById('checkout-address-detail').value.trim();
    
    // 유효성 검사
    if (!buyerName || !buyerTel || !zipcode || !address) {
        alert('모든 필수 정보를 입력해주세요.');
        return;
    }
    
    try {
        showMessage('결제를 준비하고 있습니다...', 'info', 3000);
        // 백엔드에 결제 준비 요청
        const api = createAuthenticatedRequest(token.access_token);
        const response = await api.post('/payment/prepare', {});
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || '결제 준비 실패');
        }
        
        const prepareData = await response.json();
        const bootpayConfig = prepareData.data.bootpay_config;
        
        // 부트페이 결제창 호출
        Bootpay.requestPayment({
            application_id: bootpayConfig.application_id,
            price: bootpayConfig.price,
            order_name: bootpayConfig.order_name,
            order_id: bootpayConfig.order_id,
            pg: '나이스페이',
            tax_free: 0,
            user: {
                id: window.currentUser?.email || 'guest_' + Date.now(),
                username: buyerName,
                phone: buyerTel,
                email: window.currentUser?.email || 'guest@example.com',
                addr: address + ' ' + addressDetail
            },
            items: prepareData.data.items,
            extra: {
                open_type: 'iframe',
                card_quota: '0,2,3',
                escrow: false
            }
        })
        // processPayment 함수에서 부트페이 결제 성공 부분만 수정

        .then(async function(data) {
            // 결제 성공
            console.log('결제 성공:', data);
            
            // 백엔드에 결제 완료 처리 - 부트페이 응답 데이터 포함
            const completeData = {
                // 부트페이 응답에서 받은 데이터
                order_id: data.order_id || bootpayConfig.order_id,  // 부트페이 응답 또는 준비 단계의 order_id
                receipt_id: data.receipt_id || data.receiptId || 'test_' + Date.now(),
                status: data.status || 'done',
                price: data.price || bootpayConfig.price,
                method: data.method || data.method_name || 'card',
                
                // 구매자 정보
                buyer_name: buyerName,
                buyer_tel: buyerTel,
                zipcode: zipcode,
                address: address,
                address_detail: addressDetail,
                
                // 부트페이 추가 데이터 (있는 경우)
                pg: data.pg || '',
                purchased_at: data.purchased_at || new Date().toISOString()
            };
            
            console.log('결제 완료 요청 데이터:', completeData);
            
            const completeResponse = await api.post('/payment/complete', completeData);
            
            if (completeResponse.ok) {
                const result = await completeResponse.json();
                showMessage('결제가 완료되었습니다!', 'success');
                
                // 장바구니 초기화
                window.cartData = [];
                updateCartCount();
                
                // 주문 내역으로 이동
                setTimeout(() => {
                    showView('orders');
                }, 1500);
            } else {
                const error = await completeResponse.json();
                throw new Error(error.detail || '결제 완료 처리 실패');
            }
        })
        .catch(function(error) {
            // 결제 실패/취소
            console.log('결제 실패/취소:', error);
            
            if (error.event === 'cancel') {
                showMessage('결제가 취소되었습니다.', 'error');
            } else {
                showMessage('결제 중 오류가 발생했습니다.', 'error');
            }
        });
        
    } catch (error) {
        console.error('결제 처리 오류:', error);
        showMessage(error.message || '결제 처리 중 오류가 발생했습니다.', 'error');
    }
}

// 주문 내역 조회
async function loadOrders() {
    const token = getToken();
    if (!token) return;
    
    try {
        const container = document.getElementById('order-list-container');
        container.innerHTML = '<p class="loading">주문 내역을 불러오는 중...</p>';
        
        const api = createAuthenticatedRequest(token.access_token);
        const response = await api.get('/payment/orders');
        
        if (!response.ok) throw new Error('주문 내역 로딩 실패');
        
        const orders = await response.json();
        
        if (orders.length === 0) {
            container.innerHTML = '<p class="empty-message">주문 내역이 없습니다.</p>';
            return;
        }
        
        let html = '<div class="orders-content"><h2>주문 내역</h2>';
        
        orders.forEach(order => {
            const orderDate = new Date(order.created_at).toLocaleDateString('ko-KR');
            const statusText = {
                'pending': '결제대기',
                'paid': '결제완료',
                'shipped': '배송중',
                'delivered': '배송완료',
                'cancelled': '취소됨'
            }[order.status] || order.status;
            
            html += `
                <div class="order-card">
                    <div class="order-header">
                        <h3>주문번호: ${order.order_id}</h3>
                        <span class="order-date">${orderDate}</span>
                    </div>
                    <div class="order-status">상태: ${statusText}</div>
                    <div class="order-items">
            `;
            
            order.items.forEach(item => {
                html += `
                    <div class="order-item">
                        ${item.product_name} x ${item.quantity} = ₩${(item.price * item.quantity).toLocaleString()}
                    </div>
                `;
            });
            
            html += `
                    </div>
                    <div class="order-total">총 결제금액: ₩${order.total_price.toLocaleString()}</div>
                    <div class="order-address">배송지: ${order.address} ${order.address_detail}</div>
                </div>
            `;
        });
        
        html += '</div>';
        container.innerHTML = html;
        
    } catch (error) {
        console.error('주문 내역 로딩 오류:', error);
        document.getElementById('order-list-container').innerHTML = 
            '<p class="error-message">주문 내역을 불러오는 중 오류가 발생했습니다.</p>';
    }
}

// 전역 함수로 노출
window.searchAddress = searchAddress;
window.showCheckout = showCheckout;
window.processPayment = processPayment;
window.loadOrders = loadOrders;