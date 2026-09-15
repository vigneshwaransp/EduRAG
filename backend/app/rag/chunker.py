from typing import List
from app.core.config import settings
from app.rag.extractor import PageContent

class ChunkItem:
    def __init__(
        self,
        chunk_index: int,
        page_number: int,
        section_title: str,
        text_content: str,
        token_count: int
    ):
        self.chunk_index = chunk_index
        self.page_number = page_number
        self.section_title = section_title
        self.text_content = text_content
        self.token_count = token_count

class SemanticChunker:
    """Recursively splits document text into semantically coherent chunks while preserving page & section metadata."""

    def __init__(
        self,
        chunk_size: int = settings.CHUNK_SIZE,
        chunk_overlap: int = settings.CHUNK_OVERLAP
    ):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def estimate_tokens(self, text: str) -> int:
        """Estimate token count: roughly 4 characters per token."""
        return max(1, len(text) // 4)

    def split_page_text(self, text: str) -> List[str]:
        """Split text into chunks using recursive separator hierarchy."""
        if len(text) <= self.chunk_size:
            return [text] if text.strip() else []

        separators = ["\n\n", "\n", ". ", "; ", ", ", " "]
        chunks: List[str] = []
        
        start = 0
        text_len = len(text)

        while start < text_len:
            end = start + self.chunk_size
            if end >= text_len:
                chunk = text[start:].strip()
                if chunk:
                    chunks.append(chunk)
                break

            # Find best split point near the end
            best_split = -1
            search_window = text[max(start, end - 150): min(text_len, end + 50)]
            window_offset = max(start, end - 150)

            for sep in separators:
                pos = search_window.rfind(sep)
                if pos != -1:
                    best_split = window_offset + pos + len(sep)
                    break

            if best_split == -1 or best_split <= start:
                best_split = end

            chunk = text[start:best_split].strip()
            if chunk:
                chunks.append(chunk)

            # Move start forward, accounting for overlap
            start = max(best_split - self.chunk_overlap, start + 1)

        return chunks

    def chunk_pages(self, pages: List[PageContent]) -> List[ChunkItem]:
        """Chunk a list of extracted pages into indexed ChunkItems with preserved metadata."""
        chunk_items: List[ChunkItem] = []
        global_index = 0

        for page in pages:
            if not page.text or not page.text.strip():
                continue
            
            sub_chunks = self.split_page_text(page.text)
            for sub_text in sub_chunks:
                if len(sub_text.strip()) < 20:
                    continue  # Ignore tiny noisy fragments
                
                token_count = self.estimate_tokens(sub_text)
                chunk_items.append(
                    ChunkItem(
                        chunk_index=global_index,
                        page_number=page.page_number,
                        section_title=page.section_title or f"Page {page.page_number}",
                        text_content=sub_text,
                        token_count=token_count
                    )
                )
                global_index += 1

        return chunk_items
