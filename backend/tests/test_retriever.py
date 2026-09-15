import pytest
from app.rag.retriever import RAGRetriever
from app.rag.vector_store import vector_store

def test_retriever_query_preprocessing():
    q = "   What are deadlocks???   "
    clean = RAGRetriever.preprocess_query(q)
    assert clean == "What are deadlocks?"

def test_retriever_empty_query():
    retrieved = RAGRetriever.retrieve("")
    assert not retrieved.has_content
    assert retrieved.format_context_for_llm() == "No relevant context found in the uploaded documents."
