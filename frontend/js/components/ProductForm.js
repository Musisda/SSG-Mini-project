// 상품 폼 컴포넌트

let isEditingMode = false;
let editingProductId = null;

function renderProductForm() {
    const container = document.getElementById('product-form-container');
    
    const formHTML = `
        <div class="product-form">
            <h3 id="form-title">${isEditingMode ? '상품 수정' : '새 상품 등록'}</h3>
            
            <form id="product-form">
                <div class="form-group">
                    <label for="product-name">상품명:</label>
                    <input type="text" id="product-name" name="name" required>
                </div>
                
                <div class="form-group">
                    <label for="product-description">설명:</label>
                    <textarea id="product-description" name="description" rows="3"></textarea>
                </div>
                
                <div class="form-group">
                    <label for="product-price">가격:</label>
                    <input type="number" id="product-price" name="price" min="0" step="100" required>
                </div>
                
                <div class="form-group">
                    <label for="product-stock">재고:</label>
                    <input type="number" id="product-stock" name="stock" min="0" required>
                </div>
                
                <div class="form-group">
                    <label for="product-image">이미지 URL:</label>
                    <input type="url" id="product-image" name="image_url" placeholder="https://example.com/image.jpg">
                </div>
                
                <div class="form-actions">
                    <button type="submit" class="btn-primary" id="submit-btn">
                        ${isEditingMode ? '수정하기' : '등록하기'}
                    </button>
                    <button type="button" class="btn-secondary" onclick="cancelProductEdit()">
                        목록으로
                    </button>
                </div>
            </form>
        </div>
    `;
    
    container.innerHTML = formHTML;
    
    // 폼 이벤트 리스너 추가
    const form = document.getElementById('product-form');
    form.addEventListener('submit', handleProductFormSubmit);
    
    // 입력 필드 변화 감지
    const inputs = form.querySelectorAll('input, textarea');
    inputs.forEach(input => {
        input.addEventListener('input', validateProductForm);
    });
    
    validateProductForm(); // 초기 검증
}

async function handleProductFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const productData = {
        name: formData.get('name').trim(),
        description: formData.get('description').trim(),
        price: parseFloat(formData.get('price')),
        stock: parseInt(formData.get('stock')),
        image_url: formData.get('image_url').trim() || null
    };
    
    // 빈 값 검증
    if (!productData.name || productData.price < 0 || productData.stock < 0) {
        showMessage('모든 필수 필드를 올바르게 입력해주세요.', 'error');
        return;
    }
    
    const token = getToken();
    if (!token) {
        alert('로그인이 필요합니다.');
        return;
    }
    
    const api = createAuthenticatedRequest(token.access_token);
    const submitBtn = document.getElementById('submit-btn');
    
    // 버튼 비활성화
    submitBtn.disabled = true;
    submitBtn.textContent = isEditingMode ? '수정 중...' : '등록 중...';
    
    try {
        const request = isEditingMode 
            ? api.put(`/products/${editingProductId}`, productData)
            : api.post('/products/', productData);
        
        const response = await request;
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || '요청 실패');
        }
        
        const message = isEditingMode ? '상품이 성공적으로 수정되었습니다.' : '상품이 성공적으로 등록되었습니다.';
        showMessage(message, 'success');
        
        // 목록으로 돌아가기
        showView('products');
        
        // 편집 모드 해제
        if (isEditingMode) {
            cancelProductEdit();
        }
        
    } catch (error) {
        console.error('폼 제출 오류:', error);
        showMessage(error.message || '작업 중 오류가 발생했습니다.', 'error');
    } finally {
        // 버튼 활성화
        submitBtn.disabled = false;
        submitBtn.textContent = isEditingMode ? '수정하기' : '등록하기';
    }
}

function populateProductForm(product) {
    isEditingMode = true;
    editingProductId = product.id;
    
    // 폼 다시 렌더링
    renderProductForm();
    
    // 폼에 데이터 채우기
    document.getElementById('product-name').value = product.name;
    document.getElementById('product-description').value = product.description || '';
    document.getElementById('product-price').value = product.price;
    document.getElementById('product-stock').value = product.stock;
    document.getElementById('product-image').value = product.image_url || '';
    
    validateProductForm();
}

function cancelProductEdit() {
    isEditingMode = false;
    editingProductId = null;
    showView('products');
}

function validateProductForm() {
    const form = document.getElementById('product-form');
    const submitBtn = document.getElementById('submit-btn');
    
    if (!form || !submitBtn) return;
    
    const name = document.getElementById('product-name').value.trim();
    const price = document.getElementById('product-price').value;
    const stock = document.getElementById('product-stock').value;
    
    const isValid = name && price >= 0 && stock >= 0;
    submitBtn.disabled = !isValid;
}

// 전역 함수로 노출
window.renderProductForm = renderProductForm;
window.populateProductForm = populateProductForm;
window.cancelProductEdit = cancelProductEdit;