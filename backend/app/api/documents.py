import os
import uuid
import asyncio
from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, BackgroundTasks, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db, AsyncSessionLocal
from app.models.user import User
from app.models.document import Document
from app.schemas.document import DocumentResponse, DocumentChunkResponse, DocumentStatusResponse
from app.api.deps import get_current_user
from app.services.document_service import document_service
from app.database.seeder import seed_initial_data
from app.rag.extractor import DocumentExtractor

router = APIRouter(prefix="/documents", tags=["Documents"])

async def background_ingest(document_id: str):
    """Background task to run RAG ingestion pipeline asynchronously."""
    async with AsyncSessionLocal() as db:
        await document_service.process_document_pipeline(document_id, db)

@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    subject: Optional[str] = Form("General"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Save file
    file_path = await document_service.save_uploaded_file(file, user.id)
    doc_title = title.strip() if title else file.filename.rsplit(".", 1)[0].replace("_", " ")
    ext = os.path.splitext(file.filename)[1].lstrip(".").lower() or "pdf"
    file_size = os.path.getsize(file_path)

    doc_id = str(uuid.uuid4())
    doc = Document(
        id=doc_id,
        user_id=user.id,
        title=doc_title,
        filename=file.filename,
        file_type=ext,
        file_size=file_size,
        subject=subject or "General",
        status="uploading",
        file_path=file_path
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    # Launch background extraction and vector indexing
    background_tasks.add_task(background_ingest, doc_id)

    return DocumentResponse.model_validate(doc)

@router.get("", response_model=List[DocumentResponse])
async def list_documents(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    docs = await document_service.get_user_documents(user.id, db)
    return [DocumentResponse.model_validate(d) for d in docs]

@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    doc = await document_service.get_document_by_id(document_id, user.id, db)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    return DocumentResponse.model_validate(doc)

@router.get("/{document_id}/status", response_model=DocumentStatusResponse)
async def get_document_status(
    document_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    doc = await document_service.get_document_by_id(document_id, user.id, db)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    progress_map = {
        "uploading": 15,
        "extracting": 35,
        "chunking": 60,
        "embedding": 80,
        "indexing": 95,
        "ready": 100,
        "failed": 0
    }
    step_map = {
        "uploading": "Document uploaded to secure store",
        "extracting": "Extracting text and preserving page coordinates",
        "chunking": "Segmenting semantic chunks with page metadata",
        "embedding": "Computing dense semantic embeddings",
        "indexing": "Creating vector space index in vector store",
        "ready": "Ready to chat",
        "failed": "Processing failed"
    }

    return DocumentStatusResponse(
        id=doc.id,
        status=doc.status,
        error_message=doc.error_message,
        page_count=doc.page_count,
        chunk_count=doc.chunk_count,
        progress_percentage=progress_map.get(doc.status, 0),
        current_step=step_map.get(doc.status, "Processing")
    )

@router.get("/{document_id}/chunks", response_model=List[DocumentChunkResponse])
async def get_chunks(
    document_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    doc = await document_service.get_document_by_id(document_id, user.id, db)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    chunks = await document_service.get_document_chunks(document_id, db)
    return [DocumentChunkResponse.model_validate(c) for c in chunks]

@router.get("/{document_id}/pages")
async def get_document_pages(
    document_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Returns page-by-page textual content for in-app document viewer and citation navigation."""
    doc = await document_service.get_document_by_id(document_id, user.id, db)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    if not doc.file_path or not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="Original document file not found.")

    pages = DocumentExtractor.extract(doc.file_path, doc.file_type)
    return {
        "document_id": doc.id,
        "title": doc.title,
        "total_pages": len(pages),
        "pages": [
            {
                "page_number": p.page_number,
                "section_title": p.section_title,
                "text": p.text
            }
            for p in pages
        ]
    }

@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    success = await document_service.delete_document(document_id, user.id, db)
    if not success:
        raise HTTPException(status_code=404, detail="Document not found.")
    return None

@router.post("/seed-sample")
async def seed_samples(
    db: AsyncSession = Depends(get_db)
):
    """Seed or reload sample educational documents."""
    await seed_initial_data(db)
    return {"message": "Sample educational documents loaded successfully."}
