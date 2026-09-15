import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.logging import setup_logging, logger
from app.database.session import init_db, AsyncSessionLocal
from app.database.seeder import seed_initial_data

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

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize database and seed sample documents
    logger.info("Starting up EduRAG Intelligence System...")
    await init_db()
    async with AsyncSessionLocal() as db:
        await seed_initial_data(db)
    logger.info("EduRAG is ready to serve queries.")
    yield
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

# Mount uploads directory if it exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
