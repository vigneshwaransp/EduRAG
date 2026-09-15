from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class DocumentBase(BaseModel):
    title: str
    subject: Optional[str] = "General"

class DocumentChunkResponse(BaseModel):
    id: str
    chunk_index: int
    page_number: int
    section_title: str
    text_content: str
    token_count: int

    model_config = ConfigDict(from_attributes=True)

class DocumentResponse(BaseModel):
    id: str
    title: str
    filename: str
    file_type: str
    file_size: int
    subject: str
    status: str
    error_message: Optional[str] = None
    page_count: int
    chunk_count: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class DocumentDetailResponse(DocumentResponse):
    chunks: List[DocumentChunkResponse] = []

class DocumentStatusResponse(BaseModel):
    id: str
    status: str
    error_message: Optional[str] = None
    page_count: int
    chunk_count: int
    progress_percentage: int = 0
    current_step: str = ""
