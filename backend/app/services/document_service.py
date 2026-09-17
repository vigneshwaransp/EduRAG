import os
import uuid
import json
import asyncio
from typing import List, Optional
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import UploadFile, HTTPException

from app.core.config import settings
from app.core.logging import logger
from app.models.document import Document, DocumentChunk
from app.rag.extractor import DocumentExtractor
from app.rag.chunker import SemanticChunker
from app.rag.embeddings import embedding_service
from app.rag.vector_store import vector_store

class DocumentService:
    """Manages document upload, asynchronous RAG ingestion pipeline, status tracking, and deletion."""

    def __init__(self):
        self.upload_dir = settings.UPLOAD_DIR
        os.makedirs(self.upload_dir, exist_ok=True)
        self.chunker = SemanticChunker(
            chunk_size=settings.CHUNK_SIZE,
            chunk_overlap=settings.CHUNK_OVERLAP
        )

    async def save_uploaded_file(self, file: UploadFile, user_id: str) -> str:
        """Save uploaded file securely to disk."""
        filename = file.filename or "uploaded_document.pdf"
        file_ext = os.path.splitext(filename)[1].lower()
        if file_ext not in [".pdf", ".docx", ".doc", ".txt", ".md"]:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type '{file_ext}'. Allowed formats: PDF, DOCX, TXT, MD."
            )

        unique_name = f"{user_id}_{uuid.uuid4().hex[:8]}_{filename}"
        file_path = os.path.join(self.upload_dir, unique_name)

        content = await file.read()
        max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
        if len(content) > max_bytes:
            raise HTTPException(
                status_code=400,
                detail=f"File exceeds maximum allowed size of {settings.MAX_FILE_SIZE_MB}MB."
            )

        with open(file_path, "wb") as f:
            f.write(content)

        return file_path

    async def process_document_pipeline(self, document_id: str, db: AsyncSession):
        """Asynchronously executes all stages of document ingestion."""
        # Fetch document
        result = await db.execute(select(Document).where(Document.id == document_id))
        doc = result.scalar_one_or_none()
        if not doc:
            logger.error(f"Document {document_id} not found for pipeline processing.")
            return

        try:
            # Stage 1: Extracting
            doc.status = "extracting"
            await db.commit()
            logger.info(f"[{doc.title}] Stage 1: Extracting text from {doc.file_path}")
            pages = DocumentExtractor.extract(doc.file_path, doc.file_type)
            doc.page_count = len(pages)
            doc.full_text = "\n\n".join([p.text for p in pages])
            await asyncio.sleep(0.1)

            # Stage 2: Chunking
            doc.status = "chunking"
            await db.commit()
            logger.info(f"[{doc.title}] Stage 2: Chunking text across {len(pages)} pages")
            chunks = self.chunker.chunk_pages(pages)
            doc.chunk_count = len(chunks)
            await asyncio.sleep(0.1)

            # Stage 3: Embedding
            doc.status = "embedding"
            await db.commit()
            logger.info(f"[{doc.title}] Stage 3: Generating dense embeddings for {len(chunks)} chunks")
            texts = [c.text_content for c in chunks]
            embeddings = embedding_service.embed_documents(texts)
            await asyncio.sleep(0.1)

            # Stage 4: Indexing
            doc.status = "indexing"
            await db.commit()
            logger.info(f"[{doc.title}] Stage 4: Storing vectors in vector store")

            chunk_ids = []
            db_chunks = []
            metadatas = []

            for c, emb in zip(chunks, embeddings):
                chunk_id = str(uuid.uuid4())
                chunk_ids.append(chunk_id)
                emb_list = emb.tolist() if hasattr(emb, "tolist") else emb

                db_chunk = DocumentChunk(
                    id=chunk_id,
                    document_id=doc.id,
                    chunk_index=c.chunk_index,
                    page_number=c.page_number,
                    section_title=c.section_title,
                    text_content=c.text_content,
                    embedding_json=json.dumps(emb_list),
                    token_count=c.token_count
                )
                db_chunks.append(db_chunk)

                metadatas.append({
                    "document_id": doc.id,
                    "document_title": doc.title,
                    "page_number": c.page_number,
                    "section_title": c.section_title,
                    "chunk_index": c.chunk_index
                })

            # Store in DB
            db.add_all(db_chunks)

            # Store in Vector DB
            vector_store.add_chunks(
                chunk_ids=chunk_ids,
                embeddings=embeddings,
                documents=texts,
                metadatas=metadatas
            )

            # Stage 5: Ready
            doc.status = "ready"
            doc.error_message = None
            await db.commit()
            logger.info(f"[{doc.title}] Pipeline complete! Document is ready to chat.")

        except Exception as e:
            logger.error(f"Pipeline error for document {document_id}: {e}", exc_info=True)
            doc.status = "failed"
            doc.error_message = f"Processing error: {str(e)}"
            await db.commit()

    async def rehydrate_vector_store(self, db: AsyncSession):
        """Scans all ready documents from database and hydrates active vector store upon server startup."""
        try:
            logger.info("Checking persistent database to rehydrate vector store...")
            result = await db.execute(select(Document).where(Document.status == "ready"))
            docs = list(result.scalars().all())
            if not docs:
                logger.info("No ready documents in database to rehydrate.")
                return

            total_chunks = 0
            for doc in docs:
                chunk_res = await db.execute(
                    select(DocumentChunk)
                    .where(DocumentChunk.document_id == doc.id)
                    .order_by(DocumentChunk.chunk_index.asc())
                )
                db_chunks = list(chunk_res.scalars().all())
                if not db_chunks:
                    continue

                chunk_ids = []
                embeddings = []
                documents_texts = []
                metadatas = []
                need_embed = []
                need_embed_indices = []

                for idx, c in enumerate(db_chunks):
                    chunk_ids.append(c.id)
                    documents_texts.append(c.text_content)
                    metadatas.append({
                        "document_id": doc.id,
                        "document_title": doc.title,
                        "page_number": c.page_number,
                        "section_title": c.section_title,
                        "chunk_index": c.chunk_index
                    })
                    if c.embedding_json:
                        try:
                            embeddings.append(json.loads(c.embedding_json))
                        except Exception:
                            need_embed.append(c.text_content)
                            need_embed_indices.append(idx)
                            embeddings.append([])
                    else:
                        need_embed.append(c.text_content)
                        need_embed_indices.append(idx)
                        embeddings.append([])

                if need_embed:
                    fresh_embeddings = embedding_service.embed_documents(need_embed)
                    for emb_idx, fresh_emb in zip(need_embed_indices, fresh_embeddings):
                        embeddings[emb_idx] = fresh_emb
                        db_chunks[emb_idx].embedding_json = json.dumps(fresh_emb)
                    await db.commit()

                vector_store.add_chunks(
                    chunk_ids=chunk_ids,
                    embeddings=embeddings,
                    documents=documents_texts,
                    metadatas=metadatas
                )
                total_chunks += len(chunk_ids)

            logger.info(f"Vector store rehydration complete! Successfully loaded {total_chunks} chunks across {len(docs)} documents.")
        except Exception as e:
            logger.error(f"Failed to rehydrate vector store: {e}", exc_info=True)

    async def get_user_documents(self, user_id: str, db: AsyncSession) -> List[Document]:
        result = await db.execute(
            select(Document).where(Document.user_id == user_id).order_by(Document.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_document_by_id(self, document_id: str, user_id: str, db: AsyncSession) -> Optional[Document]:
        result = await db.execute(
            select(Document).where(Document.id == document_id, Document.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def get_document_chunks(self, document_id: str, db: AsyncSession) -> List[DocumentChunk]:
        result = await db.execute(
            select(DocumentChunk)
            .where(DocumentChunk.document_id == document_id)
            .order_by(DocumentChunk.page_number.asc(), DocumentChunk.chunk_index.asc())
        )
        return list(result.scalars().all())

    async def delete_document(self, document_id: str, user_id: str, db: AsyncSession) -> bool:
        doc = await self.get_document_by_id(document_id, user_id, db)
        if not doc:
            return False

        # Remove vector store chunks
        vector_store.delete_document(document_id)

        # Delete physical file if exists
        if doc.file_path and os.path.exists(doc.file_path):
            try:
                os.remove(doc.file_path)
            except Exception as e:
                logger.warning(f"Failed to remove physical file {doc.file_path}: {e}")

        # Delete DB entity
        await db.delete(doc)
        await db.commit()
        return True

document_service = DocumentService()
