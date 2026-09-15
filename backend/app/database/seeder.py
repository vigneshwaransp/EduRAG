import os
import uuid
import json
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.security import get_password_hash
from app.core.logging import logger
from app.models.user import User
from app.models.document import Document, DocumentChunk
from app.models.quiz import QuizSession, QuizQuestion
from app.models.flashcard import Flashcard
from app.models.analytics import StudySession
from app.rag.extractor import DocumentExtractor
from app.rag.chunker import SemanticChunker
from app.rag.embeddings import embedding_service
from app.rag.vector_store import vector_store

DEMO_USER_EMAIL = "demo@edurag.edu"
DEMO_USER_PASSWORD = "edurag2025"

SAMPLE_DOCS = [
    {
        "filename": "operating_systems.txt",
        "title": "Operating Systems — Concurrency, Deadlocks & Memory Management",
        "subject": "Operating Systems",
        "file_type": "txt"
    },
    {
        "filename": "artificial_intelligence.txt",
        "title": "Artificial Intelligence — Neural Networks & Deep Learning",
        "subject": "Artificial Intelligence",
        "file_type": "txt"
    },
    {
        "filename": "data_structures.txt",
        "title": "Data Structures & Algorithms — Trees, Graphs & Complexity",
        "subject": "Data Structures",
        "file_type": "txt"
    },
    {
        "filename": "computer_networks.txt",
        "title": "Computer Networks — OSI Architecture, TCP/IP & Routing",
        "subject": "Computer Networks",
        "file_type": "txt"
    }
]

async def seed_initial_data(db: AsyncSession):
    """Seed demo user, sample academic documents, vector index, and study history."""
    try:
        # 1. Create or get demo user
        res = await db.execute(select(User).where(User.email == DEMO_USER_EMAIL))
        user = res.scalar_one_or_none()
        if not user:
            user = User(
                id=str(uuid.uuid4()),
                email=DEMO_USER_EMAIL,
                full_name="Alex Mercer (Demo Scholar)",
                hashed_password=get_password_hash(DEMO_USER_PASSWORD)
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
            logger.info(f"Seeded demo user: {DEMO_USER_EMAIL}")

        # 2. Check if documents exist
        doc_res = await db.execute(select(Document).where(Document.user_id == user.id))
        existing_docs = doc_res.scalars().all()

        chunker = SemanticChunker()
        sample_dir = os.path.join(os.path.dirname(__file__), "..", "sample_data")

        if not existing_docs:
            logger.info("Seeding academic sample documents into EduRAG...")
            for s in SAMPLE_DOCS:
                file_path = os.path.join(sample_dir, s["filename"])
                if not os.path.exists(file_path):
                    continue

                doc_id = str(uuid.uuid4())
                file_size = os.path.getsize(file_path)

                pages = DocumentExtractor.extract(file_path, s["file_type"])
                chunks = chunker.chunk_pages(pages)

                doc = Document(
                    id=doc_id,
                    user_id=user.id,
                    title=s["title"],
                    filename=s["filename"],
                    file_type=s["file_type"],
                    file_size=file_size,
                    subject=s["subject"],
                    status="ready",
                    page_count=len(pages),
                    chunk_count=len(chunks),
                    file_path=file_path
                )
                db.add(doc)

                # Embed & store chunks
                chunk_ids = []
                db_chunks = []
                texts = [c.text_content for c in chunks]
                embeddings = embedding_service.embed_documents(texts)
                metadatas = []

                for c, emb in zip(chunks, embeddings):
                    cid = str(uuid.uuid4())
                    chunk_ids.append(cid)
                    db_chunks.append(
                        DocumentChunk(
                            id=cid,
                            document_id=doc_id,
                            chunk_index=c.chunk_index,
                            page_number=c.page_number,
                            section_title=c.section_title,
                            text_content=c.text_content,
                            token_count=c.token_count
                        )
                    )
                    metadatas.append({
                        "document_id": doc_id,
                        "document_title": s["title"],
                        "page_number": c.page_number,
                        "section_title": c.section_title,
                        "chunk_index": c.chunk_index
                    })

                db.add_all(db_chunks)

                # Add to vector store
                vector_store.add_chunks(
                    chunk_ids=chunk_ids,
                    embeddings=embeddings,
                    documents=texts,
                    metadatas=metadatas
                )

            await db.commit()
            logger.info("Sample educational documents indexed and ready!")

            # 3. Seed sample flashcards
            sample_flashcards = [
                Flashcard(
                    id=str(uuid.uuid4()),
                    user_id=user.id,
                    deck_name="Operating Systems Core",
                    front="What are the four necessary Coffman conditions for a deadlock to arise?",
                    back="Mutual Exclusion, Hold and Wait, No Preemption, and Circular Wait.",
                    source_page=2,
                    topic="Deadlocks",
                    mastery_level=2,
                    review_count=3
                ),
                Flashcard(
                    id=str(uuid.uuid4()),
                    user_id=user.id,
                    deck_name="Operating Systems Core",
                    front="What is the purpose of the Translation Lookaside Buffer (TLB)?",
                    back="Acts as a high-speed hardware associative cache for page table lookups, minimizing memory access cycles during logical-to-physical address translation.",
                    source_page=3,
                    topic="Virtual Memory",
                    mastery_level=1,
                    review_count=1
                ),
                Flashcard(
                    id=str(uuid.uuid4()),
                    user_id=user.id,
                    deck_name="Artificial Intelligence Core",
                    front="What is the Scaled Dot-Product Attention formula in Transformers?",
                    back="Attention(Q, K, V) = softmax((Q * K^T) / sqrt(d_k)) * V",
                    source_page=3,
                    topic="Transformers",
                    mastery_level=2,
                    review_count=4
                ),
                Flashcard(
                    id=str(uuid.uuid4()),
                    user_id=user.id,
                    deck_name="Data Structures Core",
                    front="What is the AVL tree balance factor constraint?",
                    back="The balance factor (Height(Left) - Height(Right)) for every node must strictly belong to {-1, 0, +1}.",
                    source_page=2,
                    topic="AVL Trees",
                    mastery_level=1,
                    review_count=2
                )
            ]
            db.add_all(sample_flashcards)
            await db.commit()
            logger.info("Sample flashcards seeded successfully.")

    except Exception as e:
        logger.error(f"Error during initial seeding: {e}", exc_info=True)
