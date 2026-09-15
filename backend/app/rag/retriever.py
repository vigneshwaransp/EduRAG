import re
from typing import List, Optional, Dict, Any
from app.core.config import settings
from app.core.logging import logger
from app.rag.embeddings import embedding_service
from app.rag.vector_store import vector_store, VectorMatch

class RetrievedContext:
    def __init__(self, matches: List[VectorMatch], query: str):
        self.matches = matches
        self.query = query

    @property
    def has_content(self) -> bool:
        return len(self.matches) > 0

    def format_context_for_llm(self) -> str:
        """Format retrieved chunks into a clean, numbered context block with page citations."""
        if not self.matches:
            return "No relevant context found in the uploaded documents."

        blocks = []
        for i, m in enumerate(self.matches, 1):
            block = (
                f"[Source {i}]: Document '{m.document_title}' (Page {m.page_number}, Section: {m.section_title})\n"
                f"Excerpt: \"{m.text_content.strip()}\""
            )
            blocks.append(block)

        return "\n\n---\n\n".join(blocks)

class RAGRetriever:
    """Manages semantic search, query preprocessing, deduplication, and Top-K context retrieval."""

    @classmethod
    def preprocess_query(cls, query: str) -> str:
        """Clean and normalize query string."""
        if not query:
            return ""
        q = query.strip()
        # Remove repeated question marks or exclamation marks
        q = re.sub(r'[\?!]{2,}', '?', q)
        return q

    @classmethod
    def retrieve(
        cls,
        query: str,
        document_ids: Optional[List[str]] = None,
        top_k: int = settings.TOP_K,
        similarity_threshold: float = settings.SIMILARITY_THRESHOLD
    ) -> RetrievedContext:
        """Execute end-to-end retrieval pipeline."""
        clean_q = cls.preprocess_query(query)
        if not clean_q:
            return RetrievedContext([], query)

        # 1. Generate query embedding
        query_vector = embedding_service.embed_query(clean_q)

        # 2. Vector search in vector store
        matches = vector_store.search(
            query_embedding=query_vector,
            top_k=top_k,
            document_ids=document_ids,
            similarity_threshold=similarity_threshold
        )

        # 3. Deduplicate chunks with identical text excerpts
        seen_texts = set()
        deduped_matches: List[VectorMatch] = []
        for m in matches:
            fingerprint = m.text_content[:80].strip().lower()
            if fingerprint not in seen_texts:
                seen_texts.add(fingerprint)
                deduped_matches.append(m)

        logger.info(
            f"Retrieved {len(deduped_matches)} relevant chunks for query: '{clean_q[:40]}...' "
            f"(docs: {document_ids if document_ids else 'all'})"
        )

        return RetrievedContext(deduped_matches, clean_q)
