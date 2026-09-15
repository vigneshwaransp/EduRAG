from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

class CitationResponse(BaseModel):
    id: Optional[str] = None
    document_id: str
    document_title: str
    page_number: int
    chunk_text: str
    relevance_score: float

    model_config = ConfigDict(from_attributes=True)

class MessageResponse(BaseModel):
    id: str
    role: str
    content: str
    latency_ms: int = 0
    created_at: datetime
    citations: List[CitationResponse] = []

    model_config = ConfigDict(from_attributes=True)

class ConversationCreate(BaseModel):
    title: Optional[str] = "New Study Session"
    selected_document_ids: List[str] = []

class ConversationResponse(BaseModel):
    id: str
    title: str
    selected_document_ids: List[str] = []
    created_at: datetime
    updated_at: datetime
    messages: List[MessageResponse] = []

    model_config = ConfigDict(from_attributes=True)

class ChatRequest(BaseModel):
    conversation_id: Optional[str] = None
    message: str = Field(..., min_length=1)
    selected_document_ids: List[str] = []  # Empty means all user documents
    top_k: Optional[int] = None
    similarity_threshold: Optional[float] = None
    stream: bool = False

class ChatResponse(BaseModel):
    conversation_id: str
    message_id: str
    answer: str
    citations: List[CitationResponse] = []
    latency_ms: int
    grounded: bool = True
    documents_referenced: List[str] = []
