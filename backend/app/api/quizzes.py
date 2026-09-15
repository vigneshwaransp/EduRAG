import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.models.user import User
from app.models.quiz import QuizSession, QuizQuestion
from app.schemas.quiz import (
    QuizGenerateRequest,
    QuizSubmitRequest,
    QuizSessionResponse,
    QuizQuestionResponse
)
from app.api.deps import get_current_user
from app.services.quiz_service import quiz_service

router = APIRouter(prefix="/quizzes", tags=["Quizzes"])

@router.post("/generate", response_model=QuizSessionResponse)
async def generate_quiz(
    request: QuizGenerateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    session = await quiz_service.generate_quiz(
        user_id=user.id,
        document_ids=request.document_ids,
        difficulty=request.difficulty,
        question_count=request.question_count,
        question_types=request.question_types,
        topic_focus=request.topic_focus,
        db=db
    )

    q_res = await db.execute(select(QuizQuestion).where(QuizQuestion.quiz_id == session.id))
    questions = q_res.scalars().all()

    q_list = []
    for q in questions:
        q_list.append(
            QuizQuestionResponse(
                id=q.id,
                question_text=q.question_text,
                question_type=q.question_type,
                options=json.loads(q.options) if q.options else [],
                user_answer=q.user_answer,
                is_correct=q.is_correct,
                explanation=q.explanation,
                source_page=q.source_page,
                topic=q.topic
            )
        )

    return QuizSessionResponse(
        id=session.id,
        title=session.title,
        difficulty=session.difficulty,
        total_questions=session.total_questions,
        score=session.score,
        percentage=session.percentage,
        completed=session.completed,
        created_at=session.created_at,
        questions=q_list,
        weak_topics=[]
    )

@router.post("/{quiz_id}/submit", response_model=QuizSessionResponse)
async def submit_quiz(
    quiz_id: str,
    request: QuizSubmitRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    answers_dicts = [a.model_dump() for a in request.answers]
    result = await quiz_service.submit_quiz(quiz_id, user.id, answers_dicts, db)
    return QuizSessionResponse.model_validate(result)

@router.get("", response_model=List[QuizSessionResponse])
async def list_quizzes(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(QuizSession).where(QuizSession.user_id == user.id).order_by(QuizSession.created_at.desc())
    )
    quizzes = res.scalars().all()
    output = []
    for q in quizzes:
        output.append(
            QuizSessionResponse(
                id=q.id,
                title=q.title,
                difficulty=q.difficulty,
                total_questions=q.total_questions,
                score=q.score,
                percentage=q.percentage,
                completed=q.completed,
                created_at=q.created_at,
                questions=[],
                weak_topics=[]
            )
        )
    return output

@router.get("/{quiz_id}", response_model=QuizSessionResponse)
async def get_quiz(
    quiz_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(QuizSession).where(QuizSession.id == quiz_id, QuizSession.user_id == user.id)
    )
    session = res.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Quiz not found.")

    q_res = await db.execute(select(QuizQuestion).where(QuizQuestion.quiz_id == session.id))
    questions = q_res.scalars().all()

    q_list = []
    weak_topics = []
    for q in questions:
        if q.is_correct is False:
            weak_topics.append(q.topic)
        q_list.append(
            QuizQuestionResponse(
                id=q.id,
                question_text=q.question_text,
                question_type=q.question_type,
                options=json.loads(q.options) if q.options else [],
                user_answer=q.user_answer,
                correct_answer=q.correct_answer if session.completed else None,
                is_correct=q.is_correct,
                explanation=q.explanation,
                source_page=q.source_page,
                topic=q.topic
            )
        )

    return QuizSessionResponse(
        id=session.id,
        title=session.title,
        difficulty=session.difficulty,
        total_questions=session.total_questions,
        score=session.score,
        percentage=session.percentage,
        completed=session.completed,
        created_at=session.created_at,
        questions=q_list,
        weak_topics=list(set(weak_topics))
    )
