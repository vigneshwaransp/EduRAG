import json
import uuid
from typing import List, Optional, Dict, Any
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from app.models.document import Document, DocumentChunk
from app.models.flashcard import Flashcard
from app.rag.prompts import FLASHCARD_PROMPT_TEMPLATE
from app.rag.llm import llm_service

class FlashcardService:
    """Generates and manages interactive spaced-repetition flashcards from documents."""

    async def generate_flashcards(
        self,
        user_id: str,
        document_ids: List[str],
        card_count: int,
        topic_focus: Optional[str],
        db: AsyncSession
    ) -> List[Flashcard]:
        res = await db.execute(
            select(Document).where(Document.id.in_(document_ids), Document.user_id == user_id)
        )
        docs = res.scalars().all()
        if not docs:
            raise HTTPException(status_code=404, detail="No documents found for flashcard generation.")

        chunks_res = await db.execute(
            select(DocumentChunk)
            .where(DocumentChunk.document_id.in_(document_ids))
            .order_by(DocumentChunk.page_number.asc())
        )
        chunks = chunks_res.scalars().all()
        if not chunks:
            raise HTTPException(status_code=400, detail="Selected documents contain no chunks.")

        stride = max(1, len(chunks) // (card_count * 2))
        sampled = chunks[::stride][:15]
        context_text = "\n\n---\n\n".join([
            f"[Page {c.page_number} - {c.section_title}]:\n{c.text_content[:400]}"
            for c in sampled
        ])

        prompt = FLASHCARD_PROMPT_TEMPLATE.format(
            context=context_text,
            card_count=card_count
        )

        deck_title = f"{docs[0].subject} Core Mastery"

        def fallback_flashcards():
            cards = []
            for i in range(min(card_count, len(chunks))):
                c = chunks[i % len(chunks)]
                first_sent = c.text_content.split(".")[0].strip()
                cards.append({
                    "front": f"What is the definition and significance of {c.section_title}?",
                    "back": f"{first_sent}. {c.text_content[len(first_sent):len(first_sent)+150].strip()}...",
                    "source_page": c.page_number,
                    "topic": c.section_title
                })
            return {
                "deck_name": deck_title,
                "cards": cards
            }

        data = await llm_service.generate_json(prompt, fallback_flashcards)
        actual_deck_name = data.get("deck_name", deck_title)

        flashcards = []
        for item in data.get("cards", []):
            fc = Flashcard(
                id=str(uuid.uuid4()),
                user_id=user_id,
                document_id=docs[0].id if docs else None,
                deck_name=actual_deck_name,
                front=item.get("front", "Concept"),
                back=item.get("back", "Definition"),
                source_page=int(item.get("source_page", 1)),
                topic=item.get("topic", "General"),
                mastery_level=0,
                review_count=0
            )
            flashcards.append(fc)

        db.add_all(flashcards)
        await db.commit()
        return flashcards

    async def get_user_flashcards(
        self,
        user_id: str,
        deck_name: Optional[str],
        db: AsyncSession
    ) -> List[Flashcard]:
        query = select(Flashcard).where(Flashcard.user_id == user_id)
        if deck_name:
            query = query.where(Flashcard.deck_name == deck_name)
        query = query.order_by(Flashcard.created_at.desc())
        res = await db.execute(query)
        return list(res.scalars().all())

    async def update_mastery(
        self,
        card_id: str,
        user_id: str,
        mastery_level: int,
        db: AsyncSession
    ) -> Flashcard:
        res = await db.execute(
            select(Flashcard).where(Flashcard.id == card_id, Flashcard.user_id == user_id)
        )
        card = res.scalar_one_or_none()
        if not card:
            raise HTTPException(status_code=404, detail="Flashcard not found.")

        card.mastery_level = mastery_level
        card.review_count += 1
        await db.commit()
        await db.refresh(card)
        return card

flashcard_service = FlashcardService()
