import json
import uuid
import re
from typing import List, Optional, Dict, Any
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from app.models.document import Document, DocumentChunk
from app.models.quiz import QuizSession, QuizQuestion
from app.rag.prompts import QUIZ_PROMPT_TEMPLATE
from app.rag.llm import llm_service

class QuizService:
    """Generates grounded educational assessments, grades user responses, and diagnoses weak concepts."""

    async def generate_quiz(
        self,
        user_id: str,
        document_ids: List[str],
        difficulty: str,
        question_count: int,
        question_types: List[str],
        topic_focus: Optional[str],
        db: AsyncSession
    ) -> QuizSession:
        # 1. Fetch chunks
        res = await db.execute(
            select(Document).where(Document.id.in_(document_ids), Document.user_id == user_id)
        )
        docs = res.scalars().all()
        if not docs:
            raise HTTPException(status_code=404, detail="No documents found for quiz generation.")

        chunks_res = await db.execute(
            select(DocumentChunk)
            .where(DocumentChunk.document_id.in_(document_ids))
            .order_by(DocumentChunk.page_number.asc())
        )
        chunks = chunks_res.scalars().all()
        if not chunks:
            raise HTTPException(status_code=400, detail="Selected documents have no extracted chunks.")

        # Build sample context
        stride = max(1, len(chunks) // (question_count * 2))
        sampled = chunks[::stride][:20]
        context_text = "\n\n---\n\n".join([
            f"[Page {c.page_number} - {c.section_title}]:\n{c.text_content[:600]}"
            for c in sampled
        ])

        prompt = QUIZ_PROMPT_TEMPLATE.format(
            context=context_text,
            question_count=question_count,
            difficulty=difficulty,
            question_types=", ".join(question_types)
        )

        def fallback_quiz():
            questions = []
            for i in range(min(question_count, len(chunks))):
                c = chunks[i % len(chunks)]
                first_sent = c.text_content.split(".")[0].strip()
                words = first_sent.split()
                key_phrase = " ".join(words[:4]) if len(words) >= 4 else "This principle"

                questions.append({
                    "question_text": f"Regarding {c.section_title}, which of the following is true according to page {c.page_number}?",
                    "question_type": "MCQ",
                    "options": [
                        f"{first_sent}.",
                        f"{key_phrase} is never applicable in modern systems.",
                        f"{key_phrase} operates with unbounded negative latency.",
                        f"{key_phrase} was deprecated in early theoretical foundations."
                    ],
                    "correct_answer": f"{first_sent}.",
                    "explanation": f"According to page {c.page_number} in your notes, {c.text_content[:180]}...",
                    "source_page": c.page_number,
                    "topic": c.section_title
                })
            return {
                "title": f"{difficulty} Assessment on {docs[0].title}",
                "questions": questions
            }

        quiz_data = await llm_service.generate_json(prompt, fallback_quiz)

        # Create QuizSession in DB
        session_id = str(uuid.uuid4())
        session = QuizSession(
            id=session_id,
            user_id=user_id,
            document_id=docs[0].id if docs else None,
            title=quiz_data.get("title", f"{difficulty} Quiz: {docs[0].title}"),
            difficulty=difficulty,
            total_questions=len(quiz_data.get("questions", [])),
            score=0,
            percentage=0.0,
            completed=False
        )
        db.add(session)

        # Create QuizQuestions in DB
        db_questions = []
        for q in quiz_data.get("questions", []):
            qq = QuizQuestion(
                id=str(uuid.uuid4()),
                quiz_id=session_id,
                question_text=q.get("question_text", "Question"),
                question_type=q.get("question_type", "MCQ"),
                options=json.dumps(q.get("options", [])),
                correct_answer=q.get("correct_answer", ""),
                explanation=q.get("explanation", ""),
                source_page=int(q.get("source_page", 1)),
                topic=q.get("topic", "General")
            )
            db_questions.append(qq)

        db.add_all(db_questions)
        await db.commit()
        await db.refresh(session)
        return session

    @staticmethod
    def _is_answer_matching(user_ans: str, correct_ans: str, options: List[str]) -> bool:
        u = user_ans.strip().lower()
        c = correct_ans.strip().lower()
        if not u or not c:
            return False
        if u == c:
            return True
        # Strip common prefixes like "a)", "a.", "1.", "a: ", "(a)"
        u_clean = re.sub(r'^[a-d0-9][\.\)\-\:\s]+\s*', '', u).strip()
        c_clean = re.sub(r'^[a-d0-9][\.\)\-\:\s]+\s*', '', c).strip()
        if u_clean and c_clean and u_clean == c_clean:
            return True
        # Check if correct_ans is a letter identifier (e.g. 'a', 'b', 'c', 'd')
        if len(c) == 1 and c in "abcd":
            idx = ord(c) - ord('a')
            if 0 <= idx < len(options):
                opt = options[idx].strip().lower()
                opt_clean = re.sub(r'^[a-d0-9][\.\)\-\:\s]+\s*', '', opt).strip()
                if u == opt or u_clean == opt_clean or u == c:
                    return True
        # Check if user_ans is a letter identifier
        if len(u) == 1 and u in "abcd":
            idx = ord(u) - ord('a')
            if 0 <= idx < len(options):
                opt = options[idx].strip().lower()
                opt_clean = re.sub(r'^[a-d0-9][\.\)\-\:\s]+\s*', '', opt).strip()
                if c == opt or c_clean == opt_clean or c == u:
                    return True
        return False

    async def submit_quiz(
        self,
        quiz_id: str,
        user_id: str,
        answers: List[Dict[str, str]],
        db: AsyncSession
    ) -> Dict[str, Any]:
        res = await db.execute(
            select(QuizSession).where(QuizSession.id == quiz_id)
        )
        session = res.scalar_one_or_none()
        if not session:
            raise HTTPException(status_code=404, detail="Quiz session not found.")

        q_res = await db.execute(
            select(QuizQuestion).where(QuizQuestion.quiz_id == quiz_id)
        )
        questions = q_res.scalars().all()
        q_map = {q.id: q for q in questions}

        ans_dict = {a.get("question_id"): a.get("user_answer", "").strip() for a in answers}
        correct_count = 0
        weak_topics = []

        for q in questions:
            user_ans = ans_dict.get(q.id, "")
            q.user_answer = user_ans
            opts = json.loads(q.options) if q.options else []
            is_correct = self._is_answer_matching(user_ans, q.correct_answer, opts)
            q.is_correct = is_correct

            if is_correct:
                correct_count += 1
            else:
                if q.topic:
                    weak_topics.append(q.topic)

        total_q = max(1, len(questions))
        pct = round((correct_count / total_q) * 100, 1)
        session.score = correct_count
        session.percentage = pct
        session.completed = True
        await db.commit()

        # Compute academic grade
        if pct >= 90:
            grade = "A+"
            grade_desc = "Distinction — Comprehensive Theoretical Mastery"
        elif pct >= 80:
            grade = "A"
            grade_desc = "Proficient — Strong Conceptual Grounding"
        elif pct >= 70:
            grade = "B"
            grade_desc = "Competent — Satisfactory Core Recall"
        elif pct >= 60:
            grade = "C"
            grade_desc = "Marginal — Revision of Weak Topics Recommended"
        else:
            grade = "F"
            grade_desc = "Unsatisfactory — Critical Gaps in Material"

        incorrect_count = sum(1 for q in questions if q.user_answer and not q.is_correct)
        unanswered_count = sum(1 for q in questions if not q.user_answer)

        # Format questions response
        q_details = []
        for q in questions:
            q_details.append({
                "id": q.id,
                "question_text": q.question_text,
                "question_type": q.question_type,
                "options": json.loads(q.options) if q.options else [],
                "user_answer": q.user_answer,
                "correct_answer": q.correct_answer,
                "is_correct": q.is_correct,
                "explanation": q.explanation,
                "source_page": q.source_page,
                "topic": q.topic
            })

        return {
            "id": session.id,
            "title": session.title,
            "difficulty": session.difficulty,
            "total_questions": len(questions),
            "score": correct_count,
            "percentage": pct,
            "grade": grade,
            "grade_description": grade_desc,
            "incorrect_count": incorrect_count,
            "unanswered_count": unanswered_count,
            "completed": True,
            "created_at": session.created_at,
            "questions": q_details,
            "weak_topics": list(set(weak_topics))
        }

quiz_service = QuizService()
