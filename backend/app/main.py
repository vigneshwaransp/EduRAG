import os
import asyncio
import httpx
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.logging import setup_logging, logger
from app.database.session import init_db, AsyncSessionLocal
from app.database.seeder import seed_initial_data
from app.services.document_service import document_service

from app.api.auth import router as auth_router
from app.api.documents import router as documents_router
from app.api.chat import router as chat_router
from app.api.search import router as search_router
from app.api.summaries import router as summaries_router
from app.api.quizzes import router as quizzes_router
from app.api.flashcards import router as flashcards_router
from app.api.analytics import router as analytics_router
from app.api.eval import router as eval_router
from app.api.health import router as health_router

setup_logging()

async def keep_alive_worker():
    """Self-ping loop every 10 minutes to prevent Render free-tier idle spin down."""
    logger.info("Initializing EduRAG keep-alive background worker...")
    await asyncio.sleep(45)  # Allow server boot to settle
    ping_url = "https://edurag-api.onrender.com/api/health" if settings.APP_ENV == "production" else f"http://127.0.0.1:{settings.PORT}/api/health"

    async with httpx.AsyncClient(timeout=20.0) as client:
        while True:
            try:
                await asyncio.sleep(600)  # Ping every 10 minutes
                resp = await client.get(ping_url)
                logger.info(f"Keep-alive heartbeat sent to {ping_url} (HTTP {resp.status_code})")
            except asyncio.CancelledError:
                break
            except Exception as err:
                logger.warning(f"Keep-alive heartbeat notice: {err}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize database, seed sample documents, and rehydrate vector index
    logger.info("Starting up EduRAG Intelligence System...")
    await init_db()
    async with AsyncSessionLocal() as db:
        await seed_initial_data(db)
        await document_service.rehydrate_vector_store(db)
    logger.info("EduRAG is ready to serve queries.")

    # Start 24/7 keep-alive background task
    keep_alive_job = asyncio.create_task(keep_alive_worker())
    try:
        yield
    finally:
        keep_alive_job.cancel()
        logger.info("Shutting down EduRAG Intelligence System.")

app = FastAPI(
    title="EduRAG — Education Document Intelligence API",
    description="Retrieval-Augmented Generation (RAG) platform for academic document intelligence, strict citation grounding, quizzes, and learning analytics.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS configuration
origins = settings.cors_origin_list
allow_all = "*" in origins or not origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=[] if allow_all else origins,
    allow_origin_regex=r"^https?://.*" if allow_all else None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "Something went wrong while processing your request. Please try again or contact support."
        }
    )

# Register API routers under /api
api_prefix = "/api"
app.include_router(health_router, prefix=api_prefix)
app.include_router(auth_router, prefix=api_prefix)
app.include_router(documents_router, prefix=api_prefix)
app.include_router(chat_router, prefix=api_prefix)
app.include_router(search_router, prefix=api_prefix)
app.include_router(summaries_router, prefix=api_prefix)
app.include_router(quizzes_router, prefix=api_prefix)
app.include_router(flashcards_router, prefix=api_prefix)
app.include_router(analytics_router, prefix=api_prefix)
app.include_router(eval_router, prefix=api_prefix)

@app.get("/", tags=["Health"])
async def root_health():
    return {
        "status": "healthy",
        "service": "EduRAG — Education Document Intelligence API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/api/health"
    }

# Mount uploads directory if it exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
