import os
import json
from typing import List, Dict, Any, Optional
import numpy as np
from app.core.config import settings
from app.core.logging import logger

class VectorMatch:
    def __init__(
        self,
        chunk_id: str,
        document_id: str,
        document_title: str,
        page_number: int,
        section_title: str,
        text_content: str,
        score: float
    ):
        self.chunk_id = chunk_id
        self.document_id = document_id
        self.document_title = document_title
        self.page_number = page_number
        self.section_title = section_title
        self.text_content = text_content
        self.score = score

    def to_dict(self) -> Dict[str, Any]:
        return {
            "chunk_id": self.chunk_id,
            "document_id": self.document_id,
            "document_title": self.document_title,
            "page_number": self.page_number,
            "section_title": self.section_title,
            "text_content": self.text_content,
            "score": round(self.score, 4)
        }

class ChromaVectorStore:
    """ChromaDB-backed vector store with automatic fallback to high-speed in-memory cosine store."""

    def __init__(self, persist_dir: str = settings.CHROMA_PERSIST_DIR):
        self.persist_dir = persist_dir
        os.makedirs(self.persist_dir, exist_ok=True)
        self.client = None
        self.collection = None
        # In-memory store fallback structures
        self._memory_vectors: Dict[str, np.ndarray] = {}  # chunk_id -> np.ndarray
        self._memory_metadata: Dict[str, Dict[str, Any]] = {}  # chunk_id -> metadata
        self._memory_docs: Dict[str, str] = {}  # chunk_id -> text
        self._init_chroma()

    def _init_chroma(self):
        try:
            import chromadb
            from chromadb.config import Settings as ChromaSettings
            self.client = chromadb.PersistentClient(
                path=self.persist_dir,
                settings=ChromaSettings(anonymized_telemetry=False)
            )
            self.collection = self.client.get_or_create_collection(
                name="edurag_documents",
                metadata={"hnsw:space": "cosine"}
            )
            logger.info(f"ChromaDB initialized with collection 'edurag_documents' at {self.persist_dir}")
        except Exception as e:
            logger.warning(f"ChromaDB initialization encountered issue ({e}). Using optimized in-memory cosine vector store.")
            self.client = None
            self.collection = None

    def add_chunks(
        self,
        chunk_ids: List[str],
        embeddings: List[List[float]],
        documents: List[str],
        metadatas: List[Dict[str, Any]]
    ):
        """Add vectors and chunk metadata to the store."""
        if not chunk_ids:
            return

        # Always update memory cache
        for cid, emb, doc, meta in zip(chunk_ids, embeddings, documents, metadatas):
            arr = np.array(emb, dtype=np.float32)
            norm = np.linalg.norm(arr)
            if norm > 0:
                arr = arr / norm
            self._memory_vectors[cid] = arr
            self._memory_metadata[cid] = meta
            self._memory_docs[cid] = doc

        # Update Chroma if available
        if self.collection:
            try:
                self.collection.upsert(
                    ids=chunk_ids,
                    embeddings=embeddings,
                    documents=documents,
                    metadatas=metadatas
                )
                logger.info(f"Successfully upserted {len(chunk_ids)} chunks into ChromaDB.")
            except Exception as e:
                logger.error(f"Error upserting into ChromaDB: {e}. In-memory fallback retained.")

    def search(
        self,
        query_embedding: List[float],
        top_k: int = settings.TOP_K,
        document_ids: Optional[List[str]] = None,
        similarity_threshold: float = settings.SIMILARITY_THRESHOLD
    ) -> List[VectorMatch]:
        """Perform cosine similarity search with document filtering and thresholding."""
        matches: List[VectorMatch] = []

        # Try ChromaDB query first
        if self.collection:
            try:
                where_clause = None
                if document_ids and len(document_ids) == 1:
                    where_clause = {"document_id": document_ids[0]}
                elif document_ids and len(document_ids) > 1:
                    where_clause = {"document_id": {"$in": document_ids}}

                results = self.collection.query(
                    query_embeddings=[query_embedding],
                    n_results=min(top_k * 2, max(1, self.collection.count())),
                    where=where_clause
                )

                if results and results.get("ids") and results["ids"][0]:
                    ids = results["ids"][0]
                    distances = results["distances"][0] if "distances" in results else [0.0] * len(ids)
                    metadatas = results["metadatas"][0] if "metadatas" in results else [{}] * len(ids)
                    docs = results["documents"][0] if "documents" in results else [""] * len(ids)

                    all_candidates: List[VectorMatch] = []
                    for cid, dist, meta, doc in zip(ids, distances, metadatas, docs):
                        # For cosine distance, similarity = 1 - distance
                        score = max(0.0, 1.0 - dist)
                        match_item = VectorMatch(
                            chunk_id=cid,
                            document_id=meta.get("document_id", ""),
                            document_title=meta.get("document_title", "Unknown Document"),
                            page_number=int(meta.get("page_number", 1)),
                            section_title=meta.get("section_title", "General"),
                            text_content=doc,
                            score=score
                        )
                        all_candidates.append(match_item)
                        if score >= similarity_threshold:
                            matches.append(match_item)

                    # Dynamic fallback: if threshold was slightly high, retain top candidates
                    if not matches and all_candidates:
                        all_candidates.sort(key=lambda m: m.score, reverse=True)
                        matches = all_candidates[:top_k]

                    # Return sorted by score descending
                    matches.sort(key=lambda m: m.score, reverse=True)
                    return matches[:top_k]
            except Exception as e:
                logger.warning(f"Chroma query failed ({e}). Falling back to in-memory cosine search.")

        # Fallback memory search
        q_arr = np.array(query_embedding, dtype=np.float32)
        q_norm = np.linalg.norm(q_arr)
        if q_norm > 0:
            q_arr = q_arr / q_norm

        scores = []
        for cid, v_arr in self._memory_vectors.items():
            meta = self._memory_metadata.get(cid, {})
            doc_id = meta.get("document_id", "")
            if document_ids and doc_id not in document_ids:
                continue

            # Cosine similarity between normalized vectors is dot product
            sim = float(np.dot(q_arr, v_arr))
            if sim >= similarity_threshold:
                scores.append((cid, sim))

        scores.sort(key=lambda x: x[1], reverse=True)
        for cid, sim in scores[:top_k]:
            meta = self._memory_metadata.get(cid, {})
            doc = self._memory_docs.get(cid, "")
            matches.append(
                VectorMatch(
                    chunk_id=cid,
                    document_id=meta.get("document_id", ""),
                    document_title=meta.get("document_title", "Unknown Document"),
                    page_number=int(meta.get("page_number", 1)),
                    section_title=meta.get("section_title", "General"),
                    text_content=doc,
                    score=sim
                )
            )

        return matches

    def delete_document(self, document_id: str):
        """Remove all chunks associated with a document."""
        # Clean memory store
        keys_to_del = [
            cid for cid, meta in self._memory_metadata.items()
            if meta.get("document_id") == document_id
        ]
        for k in keys_to_del:
            self._memory_vectors.pop(k, None)
            self._memory_metadata.pop(k, None)
            self._memory_docs.pop(k, None)

        if self.collection:
            try:
                self.collection.delete(where={"document_id": document_id})
                logger.info(f"Deleted chunks for document {document_id} from ChromaDB.")
            except Exception as e:
                logger.error(f"Error deleting document from ChromaDB: {e}")

# Global vector store instance
vector_store = ChromaVectorStore()
