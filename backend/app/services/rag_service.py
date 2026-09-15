import json
import time
import uuid
from typing import List, Optional, AsyncGenerator, Dict, Any
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from app.core.config import settings
from app.core.logging import logger
from app.models.conversation import Conversation, Message, Citation
from app.rag.retriever import RAGRetriever
from app.rag.prompts import SYSTEM_GROUNDING_PROMPT, RAG_USER_PROMPT_TEMPLATE
from app.rag.llm import llm_service
from app.rag.citations import CitationService

class RAGService:
    """Orchestrates end-to-end question answering, citation mapping, and conversation persistence."""

    async def get_or_create_conversation(
        self,
        conversation_id: Optional[str],
        user_id: str,
        selected_document_ids: List[str],
        first_message: str,
        db: AsyncSession
    ) -> Conversation:
        if conversation_id:
            res = await db.execute(
                select(Conversation).where(Conversation.id == conversation_id, Conversation.user_id == user_id)
            )
            conv = res.scalar_one_or_none()
            if conv:
                if selected_document_ids:
                    conv.selected_document_ids = json.dumps(selected_document_ids)
                    await db.commit()
                return conv

        # Create new conversation
        title = first_message[:45] + ("..." if len(first_message) > 45 else "")
        new_conv = Conversation(
            id=str(uuid.uuid4()),
            user_id=user_id,
            title=title,
            selected_document_ids=json.dumps(selected_document_ids)
        )
        db.add(new_conv)
        await db.commit()
        await db.refresh(new_conv)
        return new_conv

    async def get_conversation_history(self, conversation_id: str, db: AsyncSession) -> List[Dict[str, str]]:
        res = await db.execute(
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.asc())
        )
        msgs = res.scalars().all()
        history = []
        for m in msgs:
            history.append({"role": m.role, "content": m.content})
        return history

    async def answer_question(
        self,
        user_id: str,
        message_text: str,
        selected_document_ids: List[str],
        conversation_id: Optional[str],
        top_k: Optional[int],
        similarity_threshold: Optional[float],
        db: AsyncSession
    ) -> Dict[str, Any]:
        start_time = time.time()
        k = top_k or settings.TOP_K
        threshold = similarity_threshold or settings.SIMILARITY_THRESHOLD

        # 1. Retrieve Context
        retrieved = RAGRetriever.retrieve(
            query=message_text,
            document_ids=selected_document_ids if selected_document_ids else None,
            top_k=k,
            similarity_threshold=threshold
        )

        # 2. Conversation & History
        conv = await self.get_or_create_conversation(
            conversation_id=conversation_id,
            user_id=user_id,
            selected_document_ids=selected_document_ids,
            first_message=message_text,
            db=db
        )
        history = await self.get_conversation_history(conv.id, db)

        # Save user message
        user_msg = Message(
            id=str(uuid.uuid4()),
            conversation_id=conv.id,
            role="user",
            content=message_text,
            latency_ms=0
        )
        db.add(user_msg)
        await db.commit()

        # 3. Format Grounded Prompt & Generate LLM Answer
        history_formatted = "\n".join([f"{h['role'].capitalize()}: {h['content']}" for h in history[-4:]]) if history else "None"
        user_prompt = RAG_USER_PROMPT_TEMPLATE.format(
            context=retrieved.format_context_for_llm(),
            history=history_formatted,
            question=message_text
        )

        answer = await llm_service.generate_rag_answer(
            system_prompt=SYSTEM_GROUNDING_PROMPT,
            user_prompt=user_prompt,
            question=message_text,
            retrieved_context=retrieved,
            history=history
        )

        latency_ms = int((time.time() - start_time) * 1000)

        # 4. Save Assistant Message
        assistant_msg = Message(
            id=str(uuid.uuid4()),
            conversation_id=conv.id,
            role="assistant",
            content=answer,
            latency_ms=latency_ms
        )
        db.add(assistant_msg)
        await db.commit()

        # 5. Extract and Save Citations
        citations = CitationService.build_citations(retrieved)
        citation_responses = []
        for c in citations:
            cit_entity = Citation(
                id=str(uuid.uuid4()),
                message_id=assistant_msg.id,
                document_id=c.document_id,
                document_title=c.document_title,
                page_number=c.page_number,
                chunk_text=c.chunk_text,
                relevance_score=c.relevance_score
            )
            db.add(cit_entity)
            citation_responses.append(c.to_dict())

        await db.commit()

        doc_titles = list({c["document_title"] for c in citation_responses})

        return {
            "conversation_id": conv.id,
            "message_id": assistant_msg.id,
            "answer": answer,
            "citations": citation_responses,
            "latency_ms": latency_ms,
            "grounded": retrieved.has_content,
            "documents_referenced": doc_titles
        }

    async def stream_question(
        self,
        user_id: str,
        message_text: str,
        selected_document_ids: List[str],
        conversation_id: Optional[str],
        db: AsyncSession
    ) -> AsyncGenerator[str, None]:
        """Stream response via Server-Sent Events (SSE) format with progress indicators."""
        start_time = time.time()

        # Step 1: Searching
        yield f"data: {json.dumps({'type': 'status', 'content': 'Searching your documents...'})}\n\n"

        retrieved = RAGRetriever.retrieve(
            query=message_text,
            document_ids=selected_document_ids if selected_document_ids else None
        )

        # Step 2: Reading
        yield f"data: {json.dumps({'type': 'status', 'content': f'Reading {len(retrieved.matches)} relevant sections...'})}\n\n"

        conv = await self.get_or_create_conversation(
            conversation_id=conversation_id,
            user_id=user_id,
            selected_document_ids=selected_document_ids,
            first_message=message_text,
            db=db
        )
        history = await self.get_conversation_history(conv.id, db)

        user_msg = Message(
            id=str(uuid.uuid4()),
            conversation_id=conv.id,
            role="user",
            content=message_text
        )
        db.add(user_msg)
        await db.commit()

        citations = CitationService.build_citations(retrieved)

        # Send citation metadata early to the client
        yield f"data: {json.dumps({'type': 'citations', 'citations': [c.to_dict() for c in citations]})}\n\n"

        # Step 3: Generating Answer
        yield f"data: {json.dumps({'type': 'status', 'content': 'Synthesizing grounded answer...'})}\n\n"

        history_formatted = "\n".join([f"{h['role'].capitalize()}: {h['content']}" for h in history[-4:]]) if history else "None"
        user_prompt = RAG_USER_PROMPT_TEMPLATE.format(
            context=retrieved.format_context_for_llm(),
            history=history_formatted,
            question=message_text
        )

        full_content = []
        async for token in llm_service.stream_rag_answer(
            system_prompt=SYSTEM_GROUNDING_PROMPT,
            user_prompt=user_prompt,
            question=message_text,
            retrieved_context=retrieved,
            history=history
        ):
            full_content.append(token)
            yield f"data: {json.dumps({'type': 'token', 'token': token})}\n\n"

        if not full_content:
            fallback_ans = llm_service._grounded_local_synthesis(message_text, retrieved)
            full_content.append(fallback_ans)
            yield f"data: {json.dumps({'type': 'token', 'token': fallback_ans})}\n\n"

        complete_answer = "".join(full_content)
        latency_ms = int((time.time() - start_time) * 1000)

        # Save assistant message
        assistant_msg = Message(
            id=str(uuid.uuid4()),
            conversation_id=conv.id,
            role="assistant",
            content=complete_answer,
            latency_ms=latency_ms
        )
        db.add(assistant_msg)
        await db.commit()

        # Save citations
        for c in citations:
            cit_entity = Citation(
                id=str(uuid.uuid4()),
                message_id=assistant_msg.id,
                document_id=c.document_id,
                document_title=c.document_title,
                page_number=c.page_number,
                chunk_text=c.chunk_text,
                relevance_score=c.relevance_score
            )
            db.add(cit_entity)
        await db.commit()

        yield f"data: {json.dumps({'type': 'done', 'conversation_id': conv.id, 'message_id': assistant_msg.id, 'latency_ms': latency_ms})}\n\n"

rag_service = RAGService()
