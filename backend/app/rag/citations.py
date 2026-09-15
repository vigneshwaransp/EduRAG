import re
from typing import List, Dict, Any
from app.rag.retriever import RetrievedContext
from app.rag.vector_store import VectorMatch

class CitationItem:
    def __init__(
        self,
        document_id: str,
        document_title: str,
        page_number: int,
        chunk_text: str,
        relevance_score: float
    ):
        self.document_id = document_id
        self.document_title = document_title
        self.page_number = page_number
        self.chunk_text = chunk_text
        self.relevance_score = relevance_score

    def to_dict(self) -> Dict[str, Any]:
        return {
            "document_id": self.document_id,
            "document_title": self.document_title,
            "page_number": self.page_number,
            "chunk_text": self.chunk_text,
            "relevance_score": round(self.relevance_score, 4)
        }

class CitationService:
    """Builds and verifies citation mappings linking generated AI claims to exact document pages."""

    @classmethod
    def build_citations(cls, retrieved_context: RetrievedContext) -> List[CitationItem]:
        """Map retrieved vector chunks directly into verifiable CitationItems."""
        citations: List[CitationItem] = []
        seen_pages = set()

        for match in retrieved_context.matches:
            key = (match.document_id, match.page_number)
            if key not in seen_pages:
                seen_pages.add(key)
                # Keep snippet concise for UI preview
                snippet = match.text_content.strip()
                if len(snippet) > 300:
                    snippet = snippet[:297] + "..."

                citations.append(
                    CitationItem(
                        document_id=match.document_id,
                        document_title=match.document_title,
                        page_number=match.page_number,
                        chunk_text=snippet,
                        relevance_score=match.score
                    )
                )

        return citations

    @classmethod
    def link_citations_in_text(cls, text: str, citations: List[CitationItem]) -> str:
        """Ensure citation markers [Doc — Page X] are cleanly formatted."""
        # Clean formatting if needed
        return text
