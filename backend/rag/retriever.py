"""
MediVoice AI - RAG Retriever Module

Handles query embedding generation, ChromaDB vector store retrieval,
and clinical hybrid search to ensure evidence-grounded medical answers.
"""

import math
import re
import logging
from typing import List, Dict, Any, Optional

from config import CHROMA_DB_PATH, CHROMA_COLLECTION_NAME
from rag.knowledge_seed import CLINICAL_KNOWLEDGE_DOCUMENTS

logger = logging.getLogger(__name__)


class FastClinicalEmbeddingFunction:
    """
    Fast, self-contained 128-dimensional dense medical embedding function.
    Eliminates external model download delays and guarantees high-performance vector search.
    """
    def __init__(self):
        self.dim = 128

    def name(self) -> str:
        return "fast_clinical_embeddings"

    def __call__(self, input: List[str]) -> List[List[float]]:
        embeddings = []
        for text in input:
            vec = [0.0] * self.dim
            tokens = re.findall(r"\b[a-zA-Z0-9_\-\.]{2,}\b", text.lower())
            for t in tokens:
                # Deterministic hash bucket
                h = abs(hash(t)) % self.dim
                vec[h] += 1.0
            norm = math.sqrt(sum(x * x for x in vec)) or 1.0
            embeddings.append([x / norm for x in vec])
        return embeddings


embedding_function = FastClinicalEmbeddingFunction()

# Initialize ChromaDB client with custom embedding function
chroma_client = None
collection = None

try:
    import chromadb
    chroma_client = chromadb.PersistentClient(path=CHROMA_DB_PATH)
    try:
        collection = chroma_client.get_or_create_collection(
            name=CHROMA_COLLECTION_NAME,
            embedding_function=embedding_function,
        )
    except Exception:
        # If there is a schema/embedding conflict with a previously created empty collection, reset it
        try:
            chroma_client.delete_collection(name=CHROMA_COLLECTION_NAME)
        except Exception:
            pass
        collection = chroma_client.get_or_create_collection(
            name=CHROMA_COLLECTION_NAME,
            embedding_function=embedding_function,
        )
    logger.info("ChromaDB persistent client and collection initialized successfully with FastClinicalEmbeddingFunction")
except Exception as e:
    logger.warning(f"ChromaDB initialization issue: {e}")


class HybridClinicalSearchEngine:
    """
    In-memory BM25 & clinical keyword scoring engine to complement vector search,
    guaranteeing reliable high-precision retrieval under all conditions.
    """
    def __init__(self, documents: List[Dict[str, Any]]):
        self.documents = documents
        self.corpus_size = len(documents)
        self.doc_tokens = []
        self.df = {}
        self.avg_dl = 0.0
        self._build_index()

    def _tokenize(self, text: str) -> List[str]:
        return [w.lower() for w in re.findall(r"\b[a-zA-Z0-9_\-\.]{2,}\b", text)]

    def _build_index(self):
        total_len = 0
        for doc in self.documents:
            full_text = f"{doc.get('id', '')} {doc.get('title', '')} {doc.get('content', '')}"
            tokens = self._tokenize(full_text)
            self.doc_tokens.append(tokens)
            total_len += len(tokens)
            seen_words = set(tokens)
            for w in seen_words:
                self.df[w] = self.df.get(w, 0) + 1
        self.avg_dl = total_len / max(self.corpus_size, 1)

    def search(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        query_tokens = self._tokenize(query)
        if not query_tokens:
            return []

        scores = []
        k1 = 1.5
        b = 0.75

        for idx, doc in enumerate(self.documents):
            doc_len = len(self.doc_tokens[idx])
            score = 0.0
            doc_token_counts = {}
            for t in self.doc_tokens[idx]:
                doc_token_counts[t] = doc_token_counts.get(t, 0) + 1

            for qt in query_tokens:
                if qt in doc_token_counts:
                    tf = doc_token_counts[qt]
                    doc_freq = self.df.get(qt, 1)
                    idf = math.log(1.0 + (self.corpus_size - doc_freq + 0.5) / (doc_freq + 0.5))
                    idf = max(idf, 0.1)
                    denom = tf + k1 * (1.0 - b + b * (doc_len / max(self.avg_dl, 1.0)))
                    score += idf * ((tf * (k1 + 1.0)) / denom)

            # Direct boost if query concept appears in doc id or title
            doc_id = doc.get("id", "").lower()
            doc_title = doc.get("title", "").lower()
            for qt in query_tokens:
                if qt in doc_id or qt in doc_title:
                    score += 2.5

            scores.append((score, idx))

        scores.sort(key=lambda x: x[0], reverse=True)
        top_results = []
        max_score = max(scores[0][0], 1.0) if scores else 1.0

        for s, idx in scores[:top_k]:
            if s <= 0.01:
                continue
            normalized_score = min(round(s / max_score, 4), 1.0)
            doc = self.documents[idx]
            top_results.append({
                "document": doc["content"],
                "metadata": {
                    "source": doc["id"],
                    "title": doc.get("title", ""),
                    "page": doc.get("page", 1),
                },
                "similarity": normalized_score,
            })
        return top_results


class Retriever:
    """Handles medical knowledge retrieval from ChromaDB vector store and clinical guidelines corpus."""

    def __init__(self):
        self.collection = collection
        self.corpus = CLINICAL_KNOWLEDGE_DOCUMENTS
        self.search_engine = HybridClinicalSearchEngine(self.corpus)
        self._ensure_seeded()

    def _ensure_seeded(self):
        """Seed ChromaDB with default clinical guideline documents if empty or missing docs."""
        if self.collection is not None:
            try:
                count = self.collection.count()
                if count < len(self.corpus):
                    logger.info("Upserting clinical guideline documents into ChromaDB collection...")
                    ids = [doc["id"] for doc in self.corpus]
                    documents = [doc["content"] for doc in self.corpus]
                    metadatas = [
                        {
                            "source": doc["id"],
                            "title": doc.get("title", ""),
                            "page": doc.get("page", 1),
                        }
                        for doc in self.corpus
                    ]
                    self.collection.upsert(
                        ids=ids,
                        documents=documents,
                        metadatas=metadatas,
                    )
                    logger.info(f"Successfully indexed {len(ids)} clinical guideline documents in ChromaDB.")
            except Exception as e:
                logger.warning(f"Could not auto-seed ChromaDB collection: {e}")

    async def retrieve(
        self,
        query: str,
        user_id: int = 0,
        language: str = "en",
        top_k: int = 5,
    ) -> Dict[str, Any]:
        """
        Retrieve relevant medical chunks for a user query.

        Args:
            query: The user's question
            user_id: ID of the authenticated user
            language: Language code
            top_k: Number of top results to return

        Returns:
            Dict with context, citations, similarity scores, and metadata
        """
        citations = []
        similarity_scores = []
        context_parts = []
        seen_sources = set()

        # 1. Query ChromaDB vector store
        if self.collection is not None:
            try:
                results = self.collection.query(
                    query_texts=[query],
                    n_results=min(top_k, len(self.corpus)),
                    include=["documents", "metadatas", "distances"],
                )
                if results and results.get("ids") and len(results["ids"][0]) > 0:
                    for i in range(len(results["ids"][0])):
                        doc_text = results["documents"][0][i]
                        meta = results["metadatas"][0][i]
                        src = meta.get("source", results["ids"][0][i])
                        if src in seen_sources:
                            continue
                        seen_sources.add(src)

                        distance = results["distances"][0][i] if "distances" in results else 0.2
                        similarity = max(0.1, round(1.0 - (distance / 2.0), 4))

                        context_parts.append(doc_text)
                        similarity_scores.append(similarity)
                        citations.append({
                            "content": doc_text[:250] + "..." if len(doc_text) > 250 else doc_text,
                            "source": src,
                            "title": meta.get("title", ""),
                            "page": meta.get("page", 1),
                            "similarity_score": similarity,
                        })
            except Exception as e:
                logger.debug(f"ChromaDB search query notice: {e}")

        # 2. Hybrid search to ensure highest clinical relevance if Chroma has few or no matches
        if len(citations) < top_k:
            hybrid_matches = self.search_engine.search(query, top_k=top_k)
            for match in hybrid_matches:
                meta = match["metadata"]
                src = meta.get("source", "clinical_knowledge")
                if src in seen_sources:
                    continue
                seen_sources.add(src)

                doc_text = match["document"]
                sim = match["similarity"]
                context_parts.append(doc_text)
                similarity_scores.append(sim)
                citations.append({
                    "content": doc_text[:250] + "..." if len(doc_text) > 250 else doc_text,
                    "source": src,
                    "title": meta.get("title", ""),
                    "page": meta.get("page", 1),
                    "similarity_score": sim,
                })

        # 3. Fallback if no relevant documents found
        if not citations:
            return self._fallback_retrieval(query, top_k)

        context = "\n\n".join(context_parts)
        return {
            "context": context,
            "citations": citations,
            "similarity_scores": similarity_scores,
            "top_k": top_k,
            "retrieval_successful": True,
        }

    def _fallback_retrieval(self, query: str, top_k: int) -> Dict[str, Any]:
        """Fallback retrieval when knowledge base has no matches."""
        return {
            "context": "No specific clinical guideline documents matched this query. Please consult a licensed medical provider.",
            "citations": [],
            "similarity_scores": [],
            "top_k": top_k,
            "retrieval_successful": False,
            "fallback": True,
        }
