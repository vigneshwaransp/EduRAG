import json
import re
import asyncio
from typing import List, Dict, Any, Optional, AsyncGenerator
import httpx
from app.core.config import settings
from app.core.logging import logger
from app.rag.retriever import RetrievedContext

class LLMService:
    """Manages LLM completions via OpenAI-compatible endpoints, Gemini, or Local Grounded Synthesis Engine."""

    def __init__(self):
        self.api_key = settings.LLM_API_KEY
        self.model = settings.LLM_MODEL
        self.base_url = settings.LLM_BASE_URL.rstrip("/")
        self.provider = settings.LLM_PROVIDER

    async def _call_openai_compatible_api(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.2,
        max_tokens: int = 1500
    ) -> Optional[str]:
        """Make async call to OpenAI-compatible API (Mistral, Groq, Together, OpenAI, etc.)."""
        api_key = settings.LLM_API_KEY
        if not api_key or api_key == "your_api_key_here":
            return None

        model = settings.LLM_MODEL
        if not model or model == "auto":
            model = "open-mistral-7b"

        base_url = settings.LLM_BASE_URL.rstrip("/")
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens
        }

        url = f"{base_url}/chat/completions"
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(url, headers=headers, json=payload)
                if response.status_code == 200:
                    data = response.json()
                    content = data["choices"][0]["message"]["content"]
                    logger.info(f"Successfully received completion from LLM API ({model}).")
                    return content
                else:
                    logger.warning(
                        f"LLM API returned status {response.status_code}: {response.text[:200]}"
                    )
        except Exception as e:
            logger.warning(f"Error calling external LLM API: {e}")

        return None

    async def _stream_openai_compatible_api(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.2,
        max_tokens: int = 1500
    ) -> AsyncGenerator[str, None]:
        """Stream tokens directly from OpenAI-compatible API (Mistral, Groq, Together, OpenAI, etc.)."""
        api_key = settings.LLM_API_KEY
        if not api_key or api_key == "your_api_key_here":
            return

        model = settings.LLM_MODEL
        if not model or model == "auto":
            model = "open-mistral-7b"

        base_url = settings.LLM_BASE_URL.rstrip("/")
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": True
        }

        url = f"{base_url}/chat/completions"
        try:
            async with httpx.AsyncClient(timeout=45.0) as client:
                async with client.stream("POST", url, headers=headers, json=payload) as response:
                    if response.status_code != 200:
                        logger.warning(
                            f"LLM streaming API returned status {response.status_code}"
                        )
                        return
                    async for line in response.aiter_lines():
                        line = line.strip()
                        if not line or not line.startswith("data: "):
                            continue
                        data_str = line[6:].strip()
                        if data_str == "[DONE]":
                            break
                        try:
                            chunk = json.loads(data_str)
                            choices = chunk.get("choices", [])
                            if choices:
                                delta = choices[0].get("delta", {})
                                token = delta.get("content", "")
                                if token:
                                    yield token
                        except Exception:
                            continue
        except Exception as e:
            logger.warning(f"Error streaming from LLM API: {e}")

    def _grounded_local_synthesis(
        self,
        question: str,
        retrieved_context: RetrievedContext
    ) -> str:
        """Academic extractive & generative synthesis engine strictly grounded in retrieved chunks."""
        if not retrieved_context.has_content:
            return (
                "I couldn't find sufficient information in your uploaded documents to answer this confidently. "
                "Please ensure the document containing this topic is uploaded and selected."
            )

        matches = retrieved_context.matches
        top_match = matches[0]

        # Extract meaningful query keywords
        stopwords = {
            "what", "when", "where", "which", "who", "whom", "whose", "why", "how",
            "explain", "describe", "define", "does", "doesnt", "about", "tell", "give",
            "list", "show", "help", "with", "from", "that", "this", "these", "those",
            "have", "been", "were", "will", "would", "could", "should", "some", "more",
            "the", "and", "for", "are", "can", "any", "all", "its", "into"
        }
        q_words = {
            w for w in re.findall(r'\b[a-zA-Z]{3,}\b', question.lower())
            if w not in stopwords
        }

        all_text = " ".join([m.text_content for m in matches]).lower()
        all_tokens = set(re.findall(r'\b[a-zA-Z]{3,}\b', all_text))

        # Check direct or sub-word / stem matches (e.g. "deadlock" matches "deadlocks")
        matched_words = [
            w for w in q_words
            if any(w in t or t in w for t in all_tokens)
        ]

        # If significant query keywords have zero matches in the text, refuse strictly
        if q_words and len(matched_words) == 0:
            return (
                "I couldn't find sufficient information in your uploaded documents to answer this question confidently. "
                "The uploaded study material does not appear to discuss this topic."
            )

        # Structure grounded academic response
        answer_parts = []
        doc_refs = list({f"**{m.document_title}** (Page {m.page_number})" for m in matches})

        answer_parts.append(f"Based on your study material in {', '.join(doc_refs[:2])}:\n")

        # Synthesize from matching chunks
        extracted_sections = 0
        for m in matches[:4]:
            sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', m.text_content) if len(s.strip()) > 15]
            if not sentences:
                continue

            # Prioritize sentences containing question keywords or concepts
            relevant_sentences = []
            for s in sentences:
                s_lower = s.lower()
                if any(w in s_lower for w in (matched_words or q_words)):
                    relevant_sentences.append(s)

            # If no sentence matches question keywords, skip this chunk
            if not relevant_sentences and matched_words:
                continue

            selected_content = " ".join(relevant_sentences[:4]) if relevant_sentences else " ".join(sentences[:2])

            if selected_content:
                # Clean up section title
                raw_title = m.section_title or ""
                clean_title = re.sub(r'^[^\w\s]+|[^\w\s]+$', '', raw_title).strip()
                if clean_title and len(clean_title) > 60:
                    clean_title = clean_title[:60].rsplit(' ', 1)[0]
                if not clean_title or len(clean_title) < 4:
                    clean_title = f"{m.document_title} — Page {m.page_number}"

                answer_parts.append(
                    f"### {clean_title}\n"
                    f"{selected_content}\n\n"
                    f"*Source: [{m.document_title} — Page {m.page_number}]*\n"
                )
                extracted_sections += 1

        if extracted_sections == 0:
            # Fallback if specific sentence extraction was too strict
            answer_parts.append(
                f"### Excerpt from {top_match.document_title} (Page {top_match.page_number})\n"
                f"{top_match.text_content[:400].strip()}...\n\n"
                f"*Source: [{top_match.document_title} — Page {top_match.page_number}]*\n"
            )

        answer_parts.append(
            f"\n**Core Academic Takeaway:**\n"
            f"The principles documented above are directly extracted from your uploaded curriculum. "
            f"Refer to page {top_match.page_number} of *{top_match.document_title}* for additional formulas, diagrams, and context."
        )

        return "\n".join(answer_parts)

    async def generate_rag_answer(
        self,
        system_prompt: str,
        user_prompt: str,
        question: str,
        retrieved_context: RetrievedContext,
        history: List[Dict[str, str]] = None
    ) -> str:
        """Generate a grounded answer using the configured provider or local academic synthesis."""
        messages = [{"role": "system", "content": system_prompt}]
        if history:
            messages.extend(history[-4:])  # Include recent turns
        messages.append({"role": "user", "content": user_prompt})

        # Try API first if configured
        api_result = await self._call_openai_compatible_api(messages)
        if api_result:
            return api_result.strip()

        # Fallback to intelligent grounded synthesis
        logger.info("Using built-in Grounded Academic Synthesis Engine for response generation.")
        return self._grounded_local_synthesis(question, retrieved_context)

    async def stream_rag_answer(
        self,
        system_prompt: str,
        user_prompt: str,
        question: str,
        retrieved_context: RetrievedContext,
        history: List[Dict[str, str]] = None
    ) -> AsyncGenerator[str, None]:
        """Stream response chunk by chunk in real time for progressive UX."""
        messages = [{"role": "system", "content": system_prompt}]
        if history:
            messages.extend(history[-4:])
        messages.append({"role": "user", "content": user_prompt})

        has_streamed = False
        try:
            async for token in self._stream_openai_compatible_api(messages):
                has_streamed = True
                yield token
        except Exception as e:
            logger.warning(f"Error during API stream: {e}")

        if not has_streamed:
            logger.info("Using built-in Grounded Academic Synthesis Engine for response streaming.")
            full_answer = self._grounded_local_synthesis(question, retrieved_context)
            words = full_answer.split(" ")
            for i in range(0, len(words), 3):
                chunk = " ".join(words[i:i + 3]) + " "
                yield chunk
                await asyncio.sleep(0.02)  # Natural typing cadence

    async def generate_json(
        self,
        prompt: str,
        fallback_data_generator
    ) -> Dict[str, Any]:
        """Generate structured JSON response (quizzes, flashcards) with fallback."""
        messages = [
            {"role": "system", "content": "You are a specialized JSON data generator. Return ONLY raw JSON without markdown formatting."},
            {"role": "user", "content": prompt}
        ]

        api_result = await self._call_openai_compatible_api(messages, temperature=0.3, max_tokens=2000)
        if api_result:
            try:
                # Clean code blocks if present
                clean_json = re.sub(r'^```(json)?\n', '', api_result.strip())
                clean_json = re.sub(r'\n```$', '', clean_json.strip())
                return json.loads(clean_json)
            except Exception as e:
                logger.warning(f"Failed to parse LLM JSON response: {e}. Using deterministic generator.")

        # Return structured fallback data
        return fallback_data_generator()

llm_service = LLMService()
