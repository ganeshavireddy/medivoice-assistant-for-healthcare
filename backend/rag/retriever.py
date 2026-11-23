"""
MediVoice AI - RAG Retriever Module

Handles query embedding generation and retrieval from ChromaDB vector store.
"""

import logging
import numpy as np
from typing import List, Dict, Any, Optional

from config import CHROMA_DB_PATH, CHROMA_COLLECTION_NAME
import chromadb

logger = logging.getLogger(__name__)

# Initialize ChromaDB client
try:
    chroma_client = chromadb.PersistentClient(path=CHROMA_DB_PATH)
    collection = chroma_client.get_or_create_collection(name=CHROMA_COLLECTION_NAME)
    logger.info("ChromaDB initialized successfully")
except Exception as e:
    logger.warning(f"ChromaDB initialization issue: {e}")
    chroma_client = None
    collection = None


class Retriever:
    """Handles medical knowledge retrieval from vector store."""
    
    def __init__(self):
        self.collection = collection
        self.embedding_model = None
    
    async def retrieve(
        self,
        query: str,
        user_id: int,
        language: str = "en",
        top_k: int = 5,
    ) -> Dict[str, Any]:
        """
        Retrieve relevant medical chunks for a user query.
        
        Args:
            user_query: The user's question
            user_id: ID of the authenticated user
            language: Language code
            top_k: Number of top results to return
            
        Returns:
            Dict with context, citations, and similarity scores
        """
        if not self.collection:
            return self._fallback_retrieval(query, top_k)
        
        try:
            # Generate query embedding
            query_embedding = await self._generate_embedding(query)
            
            # Search ChromaDB
            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=top_k,
                include=["documents", "metadatas", "distances"],
            )
            
            # Process results
            context_parts = []
            citations = []
            similarity_scores = []
            
            for i in range(len(results["ids"][0])):
                document = results["documents"][0][i]
                metadata = results["metadatas"][0][i]
                distance = results["distances"][0][i]
                similarity = 1 - distance  # Convert distance to similarity
                
                context_parts.append(document)
                similarity_scores.append(similarity)
                
                # Build citation
                citation = {
                    "content": document[:200] + "..." if len(document) > 200 else document,
                    "source": metadata.get("source", "unknown"),
                    "page": metadata.get("page", "unknown"),
                    "similarity_score": round(similarity, 4),
                }
                citations.append(citation)
            
            # Construct grounded context
            context = "\n\n".join(context_parts) if context_parts else ""
            
            return {
                "context": context,
                "citations": citations,
                "similarity_scores": similarity_scores,
                "top_k": top_k,
                "retrieval_successful": True,
            }
            
        except Exception as e:
            logger.error(f"Retrieval error: {e}")
            return self._fallback_retrieval(query, top_k)
    
    async def _generate_embedding(self, text: str) -> List[float]:
        """Generate embedding for the query text."""
        try:
            # In production, use sentence-transformers
            # For now, return a simple hash-based embedding
            # Actually, we'd import and use: sentence-transformers.SentenceTransformer
            # For this placeholder, we'll return a dummy embedding
            import hashlib
            hash_val = int(hashlib.md5(text.encode()).hexdigest()[:8], 16)
            embedding = [float(((hash_val >> ((i % 4) * 8)) & 0xFF) / 255.0) for i in range(768)]
            return embedding
        except Exception as e:
            logger.error(f"Embedding generation error: {e}")
            return [0.0] * 768
    
    def _fallback_retrieval(self, query: str, top_k: int) -> Dict[str, Any]:
        """Fallback retrieval when vector store is unavailable."""
        return {
            "context": "No medical knowledge base available. Please consult a healthcare professional.",
            "citations": [],
            "similarity_scores": [],
            "top_k": top_k,
            "retrieval_successful": False,
            "fallback": True,
        }
