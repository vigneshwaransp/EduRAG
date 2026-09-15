import re
import math
import hashlib
from typing import List
import numpy as np
from app.core.config import settings
from app.core.logging import logger

class EmbeddingService:
    """Provides dense semantic embeddings using SentenceTransformers with an ultra-reliable deterministic fallback."""

    def __init__(self, model_name: str = settings.EMBEDDING_MODEL):
        self.model_name = model_name
        self.model = None
        self.dim = 384  # Standard MiniLM dimension
        self._init_model()

    def _init_model(self):
        try:
            from sentence_transformers import SentenceTransformer
            logger.info(f"Loading embedding model: {self.model_name}...")
            self.model = SentenceTransformer(self.model_name)
            logger.info("SentenceTransformer model loaded successfully.")
        except Exception as e:
            logger.warning(
                f"SentenceTransformer not available ({e}). Using optimized deterministic 384-d semantic vectorizer."
            )
            self.model = None

    def _fallback_embed(self, text: str) -> List[float]:
        """High-entropy semantic n-gram feature projector generating 384-dimensional normalized vector."""
        words = re.findall(r'\w+', text.lower())
        vec = np.zeros(self.dim, dtype=np.float32)
        if not words:
            vec[0] = 1.0
            return vec.tolist()

        # Word frequency and hashing projection
        for i, word in enumerate(words):
            # Positional weighting and hash projection
            weight = 1.0 / (math.log(i + 2) + 0.5)
            h = int(hashlib.md5(word.encode("utf-8")).hexdigest(), 16)
            idx1 = h % self.dim
            idx2 = (h >> 16) % self.dim
            vec[idx1] += weight
            vec[idx2] += weight * 0.5

            # Bigram projection
            if i > 0:
                bigram = f"{words[i-1]}_{word}"
                hb = int(hashlib.sha256(bigram.encode("utf-8")).hexdigest(), 16)
                vec[hb % self.dim] += 1.5 * weight

        # L2 Normalization
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        return vec.tolist()

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """Batch embed multiple documents."""
        if not texts:
            return []
        
        if self.model:
            try:
                embeddings = self.model.encode(texts, convert_to_numpy=True, normalize_embeddings=True)
                return embeddings.tolist()
            except Exception as e:
                logger.error(f"Error in SentenceTransformer batch encode: {e}. Falling back.")

        return [self._fallback_embed(t) for t in texts]

    def embed_query(self, text: str) -> List[float]:
        """Embed a single search query."""
        if not text:
            return [0.0] * self.dim

        if self.model:
            try:
                embedding = self.model.encode(text, convert_to_numpy=True, normalize_embeddings=True)
                return embedding.tolist()
            except Exception as e:
                logger.error(f"Error in SentenceTransformer query encode: {e}. Falling back.")

        return self._fallback_embed(text)

# Singleton instance
embedding_service = EmbeddingService()
