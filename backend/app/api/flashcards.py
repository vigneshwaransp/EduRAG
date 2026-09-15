from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.models.user import User
from app.schemas.flashcard import (
    FlashcardGenerateRequest,
    FlashcardReviewRequest,
    FlashcardResponse,
    DeckSummaryResponse
)
from app.api.deps import get_current_user
from app.services.flashcard_service import flashcard_service

router = APIRouter(prefix="/flashcards", tags=["Flashcards"])

@router.post("/generate", response_model=List[FlashcardResponse])
async def generate_flashcards(
    request: FlashcardGenerateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    cards = await flashcard_service.generate_flashcards(
        user_id=user.id,
        document_ids=request.document_ids,
        card_count=request.card_count,
        topic_focus=request.topic_focus,
        db=db
    )
    return [FlashcardResponse.model_validate(c) for c in cards]

@router.get("", response_model=List[FlashcardResponse])
async def list_flashcards(
    deck_name: Optional[str] = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    cards = await flashcard_service.get_user_flashcards(user.id, deck_name, db)
    return [FlashcardResponse.model_validate(c) for c in cards]

@router.put("/{card_id}/review", response_model=FlashcardResponse)
async def review_card(
    card_id: str,
    request: FlashcardReviewRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    updated = await flashcard_service.update_mastery(card_id, user.id, request.mastery_level, db)
    return FlashcardResponse.model_validate(updated)
