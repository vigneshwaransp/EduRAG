from fastapi import APIRouter
from app.rag.evaluator import RAGEvaluator

router = APIRouter(prefix="/eval", tags=["RAG Evaluation"])

@router.get("/benchmark")
async def run_rag_benchmark():
    """Executes automated benchmark measuring precision, recall, faithfulness, citation accuracy, and latency."""
    result = await RAGEvaluator.evaluate_rag_pipeline()
    return result.to_dict()
