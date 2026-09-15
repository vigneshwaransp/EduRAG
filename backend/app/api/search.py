from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.models.user import User
from app.api.deps import get_current_user
from app.rag.retriever import RAGRetriever

router = APIRouter(prefix="/search", tags=["Semantic Search"])

class SearchRequest(BaseModel):
    query: str
    document_ids: Optional[List[str]] = None
    top_k: int = 10

class SearchResultItem(BaseModel):
    chunk_id: str
    document_id: str
    document_title: str
    page_number: int
    section_title: str
    snippet: str
    score: float

@router.post("", response_model=List[SearchResultItem])
async def semantic_search(
    request: SearchRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    retrieved = RAGRetriever.retrieve(
        query=request.query,
        document_ids=request.document_ids,
        top_k=request.top_k,
        similarity_threshold=0.20
    )

    results = []
    for m in retrieved.matches:
        results.append(
            SearchResultItem(
                chunk_id=m.chunk_id,
                document_id=m.document_id,
                document_title=m.document_title,
                page_number=m.page_number,
                section_title=m.section_title,
                snippet=m.text_content,
                score=round(m.score, 3)
            )
        )
    return results
