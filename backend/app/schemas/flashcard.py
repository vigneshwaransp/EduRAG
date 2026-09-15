from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

class FlashcardGenerateRequest(BaseModel):
    document_ids: List[str] = Field(..., min_length=1)
    card_count: int = Field(10, ge=1, le=50)
    topic_focus: Optional[str] = None

class FlashcardReviewRequest(BaseModel):
    mastery_level: int = Field(..., ge=0, le=2)  # 0: Again/Hard, 1: Good, 2: Mastered

class FlashcardResponse(BaseModel):
    id: str
    document_id: Optional[str] = None
    deck_name: str
    front: str
    back: str
    source_page: int
    topic: str
    mastery_level: int
    review_count: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class DeckSummaryResponse(BaseModel):
    deck_name: str
    total_cards: int
    mastered_cards: int
    learning_cards: int
    new_cards: int
    cards: List[FlashcardResponse] = []
