from typing import Optional, List
from pydantic import BaseModel, Field

class SummaryRequest(BaseModel):
    document_ids: List[str] = Field(..., min_length=1)
    mode: str = "Exam Revision"  # "Quick Summary", "Detailed Summary", "Exam Revision", "Bullet Points", "Key Concepts"
    topic_focus: Optional[str] = None

class SectionContent(BaseModel):
    title: str
    content: str
    page_references: List[int] = []

class SummaryResponse(BaseModel):
    mode: str
    title: str
    document_titles: List[str]
    summary_markdown: str
    sections: List[SectionContent] = []
    key_takeaways: List[str] = []
    generated_at: str
