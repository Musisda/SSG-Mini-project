from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import select
from typing import Optional
from datetime import datetime  # 추가된 import
from ..auth.authenticate import authenticate
from ..database.connection import get_session
from ..models.users import QnA, QnABase, QnAAnswer, QnAAnswerBase, User

qna_router = APIRouter(
    tags=["QnA"],
)

# Q&A 목록 조회
@qna_router.get("/")
async def get_qna_list(
    page: int = 1,
    limit: int = 10,
    session=Depends(get_session),
    user: Optional[str] = None
):
    offset = (page - 1) * limit
    
    # 전체 Q&A 조회 (비공개글은 작성자와 관리자만)
    query = select(QnA).order_by(QnA.created_at.desc())
    qnas = session.exec(query.offset(offset).limit(limit)).all()
    
    # 총 개수
    total = len(session.exec(select(QnA)).all())
    
    result = []
    for qna in qnas:
        # 비공개글 처리
        if qna.is_private and user != qna.user_email:
            user_obj = session.get(User, user) if user else None
            if not user_obj or not user_obj.is_admin:
                continue
        
        qna_dict = qna.dict()
        qna_dict["user_name"] = session.get(User, qna.user_email).username
        qna_dict["has_answer"] = qna.answer is not None
        result.append(qna_dict)
    
    return {
        "items": result,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }

# Q&A 상세 조회
@qna_router.get("/{qna_id}")
async def get_qna_detail(
    qna_id: int,
    session=Depends(get_session),
    user: Optional[str] = None
):
    qna = session.get(QnA, qna_id)
    if not qna:
        raise HTTPException(status_code=404, detail="Q&A not found")
    
    # 비공개글 권한 체크
    if qna.is_private:
        if not user:
            raise HTTPException(status_code=403, detail="Login required")
        
        user_obj = session.get(User, user)
        if user != qna.user_email and (not user_obj or not user_obj.is_admin):
            raise HTTPException(status_code=403, detail="Access denied")
    
    result = qna.dict()
    result["user_name"] = session.get(User, qna.user_email).username
    
    # 답변 포함
    if qna.answer:
        result["answer"] = qna.answer.dict()
        result["answer"]["admin_name"] = session.get(User, qna.answer.admin_email).username
    
    return result

# Q&A 작성
@qna_router.post("/")
async def create_qna(
    body: QnABase,
    session=Depends(get_session),
    user: str = Depends(authenticate)
):
    new_qna = QnA(**body.dict(), user_email=user)
    session.add(new_qna)
    session.commit()
    session.refresh(new_qna)
    
    return {"message": "Q&A created successfully", "id": new_qna.id}

# Q&A 수정
@qna_router.put("/{qna_id}")
async def update_qna(
    qna_id: int,
    body: QnABase,
    session=Depends(get_session),
    user: str = Depends(authenticate)
):
    qna = session.get(QnA, qna_id)
    if not qna:
        raise HTTPException(status_code=404, detail="Q&A not found")
    
    if qna.user_email != user:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # 답변이 있으면 수정 불가
    if qna.answer:
        raise HTTPException(status_code=400, detail="Cannot edit answered Q&A")
    
    # 필드 업데이트
    qna.title = body.title
    qna.content = body.content
    qna.is_private = body.is_private
    qna.updated_at = datetime.utcnow()
    
    session.add(qna)
    session.commit()
    
    return {"message": "Q&A updated successfully"}

# Q&A 삭제
@qna_router.delete("/{qna_id}")
async def delete_qna(
    qna_id: int,
    session=Depends(get_session),
    user: str = Depends(authenticate)
):
    qna = session.get(QnA, qna_id)
    if not qna:
        raise HTTPException(status_code=404, detail="Q&A not found")
    
    user_obj = session.get(User, user)
    if qna.user_email != user and not user_obj.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # 답변도 함께 삭제
    if qna.answer:
        session.delete(qna.answer)
    
    session.delete(qna)
    session.commit()
    
    return {"message": "Q&A deleted successfully"}

# 답변 작성 (관리자만)
@qna_router.post("/{qna_id}/answer")
async def create_answer(
    qna_id: int,
    body: QnAAnswerBase,
    session=Depends(get_session),
    user: str = Depends(authenticate)
):
    user_obj = session.get(User, user)
    if not user_obj.is_admin:
        raise HTTPException(status_code=403, detail="Admin only")
    
    qna = session.get(QnA, qna_id)
    if not qna:
        raise HTTPException(status_code=404, detail="Q&A not found")
    
    if qna.answer:
        raise HTTPException(status_code=400, detail="Already answered")
    
    new_answer = QnAAnswer(
        **body.dict(),
        qna_id=qna_id,
        admin_email=user
    )
    session.add(new_answer)
    
    # Q&A 상태 업데이트
    qna.is_answered = True
    session.add(qna)
    
    session.commit()
    
    return {"message": "Answer created successfully"}

# 답변 수정 (관리자만)
@qna_router.put("/{qna_id}/answer")
async def update_answer(
    qna_id: int,
    body: QnAAnswerBase,
    session=Depends(get_session),
    user: str = Depends(authenticate)
):
    user_obj = session.get(User, user)
    if not user_obj.is_admin:
        raise HTTPException(status_code=403, detail="Admin only")
    
    qna = session.get(QnA, qna_id)
    if not qna or not qna.answer:
        raise HTTPException(status_code=404, detail="Answer not found")
    
    qna.answer.content = body.content
    session.add(qna.answer)
    session.commit()
    
    return {"message": "Answer updated successfully"}