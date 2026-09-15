import json
import re
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from app.models.document import Document, DocumentChunk
from app.rag.prompts import SUMMARY_PROMPT_TEMPLATE
from app.rag.llm import llm_service

class SummaryService:
    """Generates structured summaries, exam revisions, and concept sheets from document chunks."""

    async def generate_summary(
        self,
        user_id: str,
        document_ids: List[str],
        mode: str,
        topic_focus: Optional[str],
        db: AsyncSession
    ) -> Dict[str, Any]:
        # 1. Fetch chunks from documents
        res = await db.execute(
            select(Document).where(Document.id.in_(document_ids), Document.user_id == user_id)
        )
        docs = res.scalars().all()
        if not docs:
            raise HTTPException(status_code=404, detail="No matching documents found.")

        doc_titles = [d.title for d in docs]

        chunks_res = await db.execute(
            select(DocumentChunk)
            .where(DocumentChunk.document_id.in_(document_ids))
            .order_by(DocumentChunk.page_number.asc(), DocumentChunk.chunk_index.asc())
        )
        chunks = chunks_res.scalars().all()
        if not chunks:
            raise HTTPException(status_code=400, detail="The selected documents have not been processed or contain no text chunks.")

        # Combine representative text from chunks (sample evenly across document)
        stride = max(1, len(chunks) // 12)
        sampled_chunks = chunks[::stride][:15]

        context_blocks = []
        for c in sampled_chunks:
            context_blocks.append(f"[Page {c.page_number} - {c.section_title}]:\n{c.text_content}")

        context_text = "\n\n---\n\n".join(context_blocks)

        prompt = SUMMARY_PROMPT_TEMPLATE.format(
            context=context_text,
            mode=mode,
            topic_focus=topic_focus or "General comprehensive review"
        )

        messages = [
            {"role": "system", "content": "You are a master academic educator and curriculum summarizer."},
            {"role": "user", "content": prompt}
        ]

        summary_md = await llm_service._call_openai_compatible_api(messages, temperature=0.2, max_tokens=2500)

        if not summary_md:
            # Deterministic academic synthesis fallback for zero-API-key mode
            summary_md = self._deterministic_academic_summary(docs, sampled_chunks, mode)

        # Extract structured sections for interactive UI
        sections = self._parse_markdown_sections(summary_md)
        key_takeaways = [s["title"] for s in sections[:4]] if sections else ["Core Principles", "Important Definitions", "Exam Focus"]

        return {
            "mode": mode,
            "title": f"{mode}: {', '.join(doc_titles[:2])}",
            "document_titles": doc_titles,
            "summary_markdown": summary_md,
            "sections": sections,
            "key_takeaways": key_takeaways,
            "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
        }

    def _deterministic_academic_summary(
        self,
        docs: List[Document],
        chunks: List[DocumentChunk],
        mode: str
    ) -> str:
        doc_names = ", ".join([d.title for d in docs])
        sections = []

        sections.append(f"# {mode}: {doc_names}\n")
        sections.append(f"**Source Documents:** {doc_names} ({len(chunks)} sections referenced)\n")

        if mode == "Exam Revision":
            sections.append("## 1. Important Concepts & Theoretical Foundations")
            for i, c in enumerate(chunks[:4], 1):
                sentences = c.text_content.split(".")[:2]
                sections.append(f"- **{c.section_title}** (Page {c.page_number}): {'. '.join(sentences).strip()}.")

            sections.append("\n## 2. Key Definitions & Terminology")
            for c in chunks[4:8]:
                sentences = c.text_content.split(".")[:1]
                sections.append(f"- **{c.section_title}**: {sentences[0].strip()}. *(Source: Page {c.page_number})*")

            sections.append("\n## 3. Important Formulas & Principles")
            sections.append("- Preserved operational rules, state invariants, and runtime equations specified throughout the texts.")
            sections.append("- Pay special attention to edge cases and algorithmic bounds.")

            sections.append("\n## 4. High-Yield Exam Focus & Pitfalls")
            sections.append("- Be prepared to compare and contrast architectural differences and trade-offs.")
            sections.append("- Review step-by-step algorithms and flow diagrams directly on indicated page citations.")

        elif mode == "Key Concepts":
            sections.append("## Essential Concepts Dictionary\n")
            for c in chunks[:8]:
                first_sent = c.text_content.split(".")[0].strip()
                sections.append(f"### {c.section_title} (Page {c.page_number})\n{first_sent}.\n")

        else:
            sections.append("## Executive Overview\n")
            for c in chunks[:6]:
                sections.append(f"### {c.section_title}\n{c.text_content[:250]}...\n*(Reference: Page {c.page_number})*\n")

        return "\n".join(sections)

    def _parse_markdown_sections(self, md: str) -> List[Dict[str, Any]]:
        sections = []
        raw_sections = re.split(r'\n##+ ', md)
        for s in raw_sections[1:]:
            lines = s.strip().split("\n")
            title = lines[0].strip()
            content = "\n".join(lines[1:]).strip()
            pages = [int(p) for p in re.findall(r'Page (\d+)', content)]
            sections.append({
                "title": title,
                "content": content,
                "page_references": list(set(pages))[:3]
            })
        return sections

summary_service = SummaryService()
