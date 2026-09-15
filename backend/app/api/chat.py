import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.models.user import User
from app.models.conversation import Conversation, Message
from app.schemas.chat import ChatRequest, ChatResponse, ConversationResponse, MessageResponse, CitationResponse
from app.api.deps import get_current_user
from app.services.rag_service import rag_service

router = APIRouter(prefix="/chat", tags=["AI Tutor & Chat"])

@router.post("", response_model=ChatResponse)
async def chat_with_tutor(
    request: ChatRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await rag_service.answer_question(
        user_id=user.id,
        message_text=request.message,
        selected_document_ids=request.selected_document_ids,
        conversation_id=request.conversation_id,
        top_k=request.top_k,
        similarity_threshold=request.similarity_threshold,
        db=db
    )
    return ChatResponse(
        conversation_id=result["conversation_id"],
        message_id=result["message_id"],
        answer=result["answer"],
        citations=[CitationResponse.model_validate(c) for c in result["citations"]],
        latency_ms=result["latency_ms"],
        grounded=result["grounded"],
        documents_referenced=result["documents_referenced"]
    )

@router.post("/stream")
async def chat_stream_with_tutor(
    request: ChatRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Real-time token streaming with search, reading, and generation progress indicators."""
    return StreamingResponse(
        rag_service.stream_question(
            user_id=user.id,
            message_text=request.message,
            selected_document_ids=request.selected_document_ids,
            conversation_id=request.conversation_id,
            db=db
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@router.get("/conversations", response_model=List[ConversationResponse])
async def list_conversations(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(Conversation)
        .where(Conversation.user_id == user.id)
        .order_by(Conversation.updated_at.desc())
    )
    convs = res.scalars().all()
    output = []
    for c in convs:
        doc_ids = json.loads(c.selected_document_ids) if c.selected_document_ids else []
        output.append(
            ConversationResponse(
                id=c.id,
                title=c.title,
                selected_document_ids=doc_ids,
                created_at=c.created_at,
                updated_at=c.updated_at,
                messages=[]
            )
        )
    return output

@router.get("/conversations/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(
    conversation_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(Conversation).where(Conversation.id == conversation_id, Conversation.user_id == user.id)
    )
    conv = res.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")

    # Load messages with citations
    m_res = await db.execute(
        select(Message).where(Message.conversation_id == conv.id).order_by(Message.created_at.asc())
    )
    msgs = m_res.scalars().all()

    formatted_msgs = []
    for m in msgs:
        cit_res = []
        if m.role == "assistant":
            # load citations for this message
            c_query = await db.execute(select(Message).where(Message.id == m.id))
            # get citations relationship
            cit_res = [
                CitationResponse(
                    id=c.id,
                    document_id=c.document_id,
                    document_title=c.document_title,
                    page_number=c.page_number,
                    chunk_text=c.chunk_text,
                    relevance_score=c.relevance_score
                )
                for c in m.citations
            ]

        formatted_msgs.append(
            MessageResponse(
                id=m.id,
                role=m.role,
                content=m.content,
                latency_ms=m.latency_ms,
                created_at=m.created_at,
                citations=cit_res
            )
        )

    doc_ids = json.loads(conv.selected_document_ids) if conv.selected_document_ids else []
    return ConversationResponse(
        id=conv.id,
        title=conv.title,
        selected_document_ids=doc_ids,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        messages=formatted_msgs
    )

@router.delete("/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(
    conversation_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(Conversation).where(Conversation.id == conversation_id, Conversation.user_id == user.id)
    )
    conv = res.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")

    await db.delete(conv)
    await db.commit()
    return None
