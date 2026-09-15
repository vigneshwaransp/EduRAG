from fastapi import APIRouter
from app.core.config import settings

router = APIRouter(tags=["Health & Status"])

@router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "app_name": settings.APP_NAME,
        "environment": settings.APP_ENV,
        "llm_provider": settings.LLM_PROVIDER,
        "embedding_model": settings.EMBEDDING_MODEL,
        "vector_store": settings.VECTOR_DB_TYPE,
        "version": "1.0.0"
    }
