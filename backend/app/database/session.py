import os
from typing import AsyncGenerator
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.core.config import settings
from app.core.logging import logger
from app.models import Base

# Database engine initialization
database_url = settings.DATABASE_URL
if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql+asyncpg://", 1)
elif database_url.startswith("postgresql://") and not database_url.startswith("postgresql+asyncpg://"):
    database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)

# Clean up sslmode for asyncpg compatibility
if "sslmode=require" in database_url:
    database_url = database_url.replace("sslmode=require", "ssl=require")

if database_url.startswith("sqlite"):
    # Ensure directory exists for sqlite file
    db_file_path = database_url.replace("sqlite+aiosqlite:///", "")
    db_dir = os.path.dirname(db_file_path)
    if db_dir and not os.path.exists(db_dir):
        os.makedirs(db_dir, exist_ok=True)
    engine = create_async_engine(
        database_url,
        echo=False,
        connect_args={"check_same_thread": False}
    )
else:
    engine = create_async_engine(
        database_url,
        echo=False,
        pool_pre_ping=True
    )

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False
)

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for obtaining an async database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

async def init_db():
    """Create all database tables and perform lightweight schema migrations."""
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

            # Safe schema migrations for new columns
            if database_url.startswith("sqlite"):
                try:
                    await conn.execute(text("ALTER TABLE documents ADD COLUMN full_text TEXT"))
                except Exception:
                    pass
                try:
                    await conn.execute(text("ALTER TABLE document_chunks ADD COLUMN embedding_json TEXT"))
                except Exception:
                    pass
            else:
                try:
                    await conn.execute(text("ALTER TABLE documents ADD COLUMN IF NOT EXISTS full_text TEXT"))
                except Exception:
                    pass
                try:
                    await conn.execute(text("ALTER TABLE document_chunks ADD COLUMN IF NOT EXISTS embedding_json TEXT"))
                except Exception:
                    pass

        logger.info("Database schema initialized and verified successfully.")
    except Exception as e:
        logger.error(f"Error initializing database schema: {e}")
        raise
