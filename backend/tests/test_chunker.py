import pytest
from app.rag.extractor import PageContent
from app.rag.chunker import SemanticChunker

def test_semantic_chunker_preserves_pages():
    pages = [
        PageContent(page_number=1, text="Operating systems coordinate hardware resources. Concurrency enables multiple processes to execute.", section_title="Introduction"),
        PageContent(page_number=2, text="Deadlocks occur when four conditions are met: Mutual Exclusion, Hold and Wait, No Preemption, Circular Wait.", section_title="Deadlocks")
    ]
    chunker = SemanticChunker(chunk_size=100, chunk_overlap=20)
    chunks = chunker.chunk_pages(pages)

    assert len(chunks) >= 2
    assert chunks[0].page_number == 1
    assert chunks[-1].page_number == 2
    assert any("Deadlocks" in c.text_content for c in chunks)
    assert any("Circular Wait" in c.text_content for c in chunks)
