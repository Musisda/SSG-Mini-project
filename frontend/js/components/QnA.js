// QnA.js 파일 맨 위에 추가
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Q&A 게시판 컴포넌트

let currentPage = 1;
let currentQnAId = null;
let currentQnAData = null;

// Q&A 목록 로드
async function loadQnAList(page = 1) {
    currentPage = page;
    const container = document.getElementById('qna-container');
    container.innerHTML = '<p class="loading">Q&A를 불러오는 중...</p>';
    
    try {
        const token = getToken();
        const headers = token ? {
            'Authorization': `Bearer ${token.access_token}`
        } : {};
        
        const response = await fetch(`${window.ENV.API_URL}/qna/?page=${page}&limit=10`, {
            headers: headers
        });
        
        if (!response.ok) throw new Error('Q&A 로드 실패');
        
        const data = await response.json();
        renderQnAList(data);
        
    } catch (error) {
        console.error('Q&A 로드 오류:', error);
        container.innerHTML = '<p class="error-message">Q&A를 불러올 수 없습니다.</p>';
    }
}

// Q&A 목록 렌더링
function renderQnAList(data) {
    const container = document.getElementById('qna-container');

    let html = `
        <div class="qna-container">
            <div class="qna-header">
                <h2>문의하기</h2>
                ${window.currentUser ?
                    '<button class="btn-primary" onclick="showQnAForm()">문의하기</button>' :
                    ''
                }
            </div>

            <div class="qna-list">
    `;

    if (data.items.length === 0) {
        html += '<p class="empty-state">등록된 문의가 없습니다.</p>';
    } else {
        data.items.forEach((item, index) => {
            const num = data.total - ((currentPage - 1) * 10) - index;
            const date = new Date(item.created_at).toLocaleDateString('ko-KR');

            // escapeHtml 대신 직접 이스케이프 처리
            const safeTitle = item.title ? item.title.replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
            const safeName = item.user_name ? item.user_name.replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';

            html += `
                <div class="qna-item" data-qna-id="${item.id}">
                    <div class="qna-header-row">
                        <span class="qna-number">${num}</span>
                        <h3 class="qna-title">
                            ${item.is_private ? '🔒 ' : ''}${safeTitle}
                        </h3>
                        <span class="qna-status ${item.is_answered ? 'status-answered' : 'status-pending'}">
                            ${item.is_answered ? '답변완료' : '답변대기'}
                        </span>
                    </div>
                    <div class="qna-meta">
                        <span>작성자: ${safeName}</span>
                        <span>작성일: ${date}</span>
                    </div>
                </div>
            `;
        });
    }

    html += `
            </div>

            <div class="pagination">
    `;

    for (let i = 1; i <= data.pages; i++) {
        html += `<button class="${i === currentPage ? 'active' : ''}"
                         onclick="loadQnAList(${i})">${i}</button>`;
    }

    html += `
            </div>
        </div>

        <div id="qna-form-modal" class="modal" style="display: none;">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>문의하기</h3>
                    <button class="modal-close" onclick="hideQnAForm()">×</button>
                </div>
                <form onsubmit="submitQnA(event)">
                    <div class="form-group">
                        <label>제목</label>
                        <input type="text" id="qna-title" placeholder="제목을 입력해주세요" required>
                    </div>
                    <div class="form-group">
                        <label>상세 내용</label>
                        <textarea id="qna-content" placeholder="문의 내용을 입력해주세요" required></textarea>
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="qna-private"> 비밀글로 문의하기
                        </label>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn-primary">문의 등록</button>
                    </div>
                </form>
            </div>
        </div>

        <div id="qna-detail-modal" class="modal" style="display: none;">
            <div class="modal-content" id="qna-detail-content">
            </div>
        </div>
    `;

    container.innerHTML = html;

    // Q&A 아이템 클릭 이벤트 리스너 추가
    document.querySelectorAll('.qna-item').forEach(item => {
        item.addEventListener('click', function() {
            const qnaId = parseInt(this.dataset.qnaId);
            viewQnA(qnaId);
        });
    });

    setupModalEvents();
}

// Q&A 상세 보기
async function viewQnA(qnaId) {
    currentQnAId = qnaId;

    try {
        const token = getToken();
        const headers = {
            'Content-Type': 'application/json'
        };

        // 토큰이 있으면 Authorization 헤더 추가
        if (token) {
            headers['Authorization'] = `Bearer ${token.access_token}`;
        }

        console.log('Q&A 상세 요청:', qnaId);

        const response = await fetch(`${window.ENV.API_URL}/qna/${qnaId}`, {
            method: 'GET',
            headers: headers
        });

        console.log('응답 상태:', response.status);

        if (!response.ok) {
            if (response.status === 403) {
                alert('비공개 문의이거나 권한이 없습니다.');
                return;
            }
            if (response.status === 404) {
                alert('존재하지 않는 문의입니다.');
                return;
            }
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `서버 오류 (${response.status})`);
        }

        const qna = await response.json();
        console.log('Q&A 데이터:', qna);
        currentQnAData = qna;
        renderQnADetail(qna);

    } catch (error) {
        console.error('Q&A 상세 로드 오류:', error);
        alert(`문의를 불러올 수 없습니다: ${error.message}`);
    }
}

// Q&A 상세 렌더링
function renderQnADetail(qna) {
    const modal = document.getElementById('qna-detail-modal');
    const content = document.getElementById('qna-detail-content');

    const date = new Date(qna.created_at).toLocaleString('ko-KR');
    const isOwner = window.currentUser && window.currentUser.email === qna.user_email;
    const isAdmin = window.currentUser && window.currentUser.is_admin;

    let html = `
        <div class="qna-detail">
            <h3>${qna.is_private ? '🔒 ' : ''}${escapeHtml(qna.title || '')}</h3>
            <div class="qna-meta">
                <span>작성자: ${escapeHtml(qna.user_name || '')}</span>
                <span>작성일: ${date}</span>
            </div>
            <div class="qna-body">
                <p>${escapeHtml(qna.content || '').replace(/\n/g, '<br>')}</p>
            </div>
    `;
    
    // 답변 표시
    if (qna.answer) {
        const answerDate = new Date(qna.answer.created_at).toLocaleString('ko-KR');
        html += `
            <div class="qna-answer">
                <h4>답변</h4>
                <div class="answer-meta">
                    <span>답변자: ${escapeHtml(qna.answer.admin_name)}</span>
                    <span>답변일: ${answerDate}</span>
                </div>
                <div class="answer-body">
                    <p>${escapeHtml(qna.answer.content).replace(/\n/g, '<br>')}</p>
                </div>
            </div>
        `;
    } else if (isAdmin) {
        // 관리자인 경우 답변 폼 표시
        html += `
            <div class="answer-form">
                <h4>답변 작성</h4>
                <textarea id="answer-content" placeholder="답변 내용" rows="4"></textarea>
                <button class="btn-primary" onclick="submitAnswer()">답변 등록</button>
            </div>
        `;
    }
    
    // 여기서 오타 수정: hhtml -> html
    html += `
        <div class="qna-actions">
            ${isOwner && !qna.answer ?
                `<button class="btn-warning qna-edit-btn">수정</button>` : ''}
            ${(isOwner || isAdmin) ?
                `<button class="btn-danger qna-delete-btn">삭제</button>` : ''}
            ${isAdmin && !qna.answer ?
                `<button class="btn-primary answer-submit-btn">답변 등록</button>` : ''}
            <button class="btn-secondary qna-close-btn">닫기</button>
        </div>
    `;

    content.innerHTML = html;
    modal.style.display = 'block';

    // 이벤트 리스너 설정
    setupQnADetailEventListeners(qna);
}

function setupQnADetailEventListeners(qna) {
    // 수정 버튼
    const editBtn = document.querySelector('.qna-edit-btn');
    if (editBtn) {
        editBtn.addEventListener('click', () => editQnA(qna.id));
    }

    // 삭제 버튼
    const deleteBtn = document.querySelector('.qna-delete-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => deleteQnA(qna.id));
    }

    // 답변 등록 버튼
    const answerBtn = document.querySelector('.answer-submit-btn');
    if (answerBtn) {
        answerBtn.addEventListener('click', () => submitAnswer());
    }

    // 닫기 버튼
    const closeBtn = document.querySelector('.qna-close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => hideQnADetail());
    }
}

// Q&A 작성 폼 표시
function showQnAForm() {
    document.getElementById('qna-form-modal').style.display = 'block';
}

function hideQnAForm() {
    document.getElementById('qna-form-modal').style.display = 'none';
    document.getElementById('qna-title').value = '';
    document.getElementById('qna-content').value = '';
    document.getElementById('qna-private').checked = false;
}

// Q&A 상세 모달 닫기
function hideQnADetail() {
    document.getElementById('qna-detail-modal').style.display = 'none';
}

// Q&A 등록
async function submitQnA(event) {
    event.preventDefault();
    
    const token = getToken();
    if (!token) return;
    
    const data = {
        title: document.getElementById('qna-title').value.trim(),
        content: document.getElementById('qna-content').value.trim(),
        is_private: document.getElementById('qna-private').checked
    };
    
    try {
        const api = createAuthenticatedRequest(token.access_token);
        const response = await api.post('/qna/', data);
        
        if (response.ok) {
            showMessage('문의가 등록되었습니다.', 'success');
            hideQnAForm();
            loadQnAList(1);
        } else {
            throw new Error('등록 실패');
        }
    } catch (error) {
        console.error('Q&A 등록 오류:', error);
        showMessage('문의 등록 중 오류가 발생했습니다.', 'error');
    }
}

// 답변 등록 (관리자)
async function submitAnswer() {
    const token = getToken();
    if (!token || !currentQnAId) return;
    
    const content = document.getElementById('answer-content').value.trim();
    if (!content) {
        alert('답변 내용을 입력하세요.');
        return;
    }
    
    try {
        const api = createAuthenticatedRequest(token.access_token);
        const response = await api.post(`/qna/${currentQnAId}/answer`, { content });
        
        if (response.ok) {
            showMessage('답변이 등록되었습니다.', 'success');
            hideQnADetail();
            loadQnAList(currentPage);
        } else {
            throw new Error('답변 등록 실패');
        }
    } catch (error) {
        console.error('답변 등록 오류:', error);
        showMessage('답변 등록 중 오류가 발생했습니다.', 'error');
    }
}

// Q&A 삭제
async function deleteQnA(qnaId) {
    if (!confirm('정말로 삭제하시겠습니까?')) return;
    
    const token = getToken();
    if (!token) return;
    
    try {
        const api = createAuthenticatedRequest(token.access_token);
        const response = await api.delete(`/qna/${qnaId}`);
        
        if (response.ok) {
            showMessage('삭제되었습니다.', 'success');
            hideQnADetail();
            loadQnAList(currentPage);
        } else {
            throw new Error('삭제 실패');
        }
    } catch (error) {
        console.error('Q&A 삭제 오류:', error);
        showMessage('삭제 중 오류가 발생했습니다.', 'error');
    }
}

function setupModalEvents() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
}

function editQnA(qnaId) {
    hideQnADetail();

    // 기존 데이터로 폼 채우기
    const qna = currentQnAData; // 현재 보고 있는 Q&A 데이터
    if (qna) {
        document.getElementById('qna-title').value = qna.title;
        document.getElementById('qna-content').value = qna.content;
        document.getElementById('qna-private').checked = qna.is_private;

        showQnAForm();

        // 폼을 수정 모드로 변경
        const form = document.querySelector('#qna-form-modal form');
        form.onsubmit = function(e) {
            e.preventDefault();
            updateQnA(qnaId);
        };
    }
}

// updateQnA 함수 추가
async function updateQnA(qnaId) {
    const token = getToken();
    if (!token) return;

    const data = {
        title: document.getElementById('qna-title').value.trim(),
        content: document.getElementById('qna-content').value.trim(),
        is_private: document.getElementById('qna-private').checked
    };

    try {
        const api = createAuthenticatedRequest(token.access_token);
        const response = await api.put(`/qna/${qnaId}`, data);

        if (response.ok) {
            showMessage('문의가 수정되었습니다.', 'success');
            hideQnAForm();
            loadQnAList(currentPage);
        } else {
            throw new Error('수정 실패');
        }
    } catch (error) {
        console.error('Q&A 수정 오류:', error);
        showMessage('문의 수정 중 오류가 발생했습니다.', 'error');
    }
}

// 전역 함수로 노출
window.loadQnAList = loadQnAList;
window.viewQnA = viewQnA;
window.showQnAForm = showQnAForm;
window.hideQnAForm = hideQnAForm;
window.hideQnADetail = hideQnADetail;
window.submitQnA = submitQnA;
window.submitAnswer = submitAnswer;
window.deleteQnA = deleteQnA;
window.setupModalEvents = setupModalEvents;
window.editQnA = editQnA;
window.updateQnA = updateQnA;
window.setupQnADetailEventListeners = setupQnADetailEventListeners;