"""
MediVoice AI - RAG Pipeline Evaluator

Evaluates ChromaDB retrieval effectiveness against ground-truth document targets.
Computes Precision@K, Recall@K, MRR, HitRate@K, Context Relevance, and Retrieval Latency.
"""

import time
import json
import logging
from typing import Dict, Any, List
from evaluation.metrics import (
    calculate_precision_at_k,
    calculate_recall_at_k,
    calculate_mrr,
    calculate_hit_rate_at_k,
    calculate_context_relevance,
    calculate_citation_coverage,
)
from rag.retriever import Retriever

logger = logging.getLogger(__name__)


class RAGEvaluator:
    """Evaluates ChromaDB document retrieval performance."""

    def __init__(self, retriever_instance: Retriever = None):
        self.retriever = retriever_instance or Retriever()

    async def evaluate_query(
        self,
        query: str,
        expected_sources: List[str],
        ground_truth_context: str = "",
        language: str = "en",
        top_k: int = 5,
    ) -> Dict[str, Any]:
        """
        Runs retrieval for a query and scores against expected sources.
        """
        start_time = time.perf_counter()
        
        try:
            # Query the real ChromaDB retriever
            rag_result = await self.retriever.retrieve(
                query=query,
                user_id=0,  # Evaluation pseudo-user ID
                language=language,
                top_k=max(top_k, 10),
            )
            latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
        except Exception as e:
            logger.error(f"RAG retrieval error in evaluation: {e}")
            return {
                "passed": False,
                "latency_ms": round((time.perf_counter() - start_time) * 1000, 2),
                "error": str(e),
                "precision_at_3": 0.0,
                "precision_at_5": 0.0,
                "precision_at_10": 0.0,
                "recall_at_5": 0.0,
                "mrr": 0.0,
                "hit_rate_at_5": 0.0,
                "context_relevance": 0.0,
                "retrieved_docs": [],
                "citations": [],
            }

        citations = rag_result.get("citations", [])
        context_text = rag_result.get("context", "")

        # Extract retrieved document IDs or titles
        retrieved_ids = []
        retrieved_passages = []
        for cit in citations:
            source_id = str(cit.get("source", "")).strip().lower()
            if source_id:
                retrieved_ids.append(source_id)
            if cit.get("content"):
                retrieved_passages.append(cit.get("content"))

        # Fallback if source IDs are generic: match on query keywords against retrieved passages
        normalized_expected = [s.strip().lower() for s in expected_sources if s.strip()]

        # If retrieved_ids has items, calculate standard retrieval metrics
        # If expected sources match in retrieved IDs or in the content itself:
        effective_retrieved_ids = list(retrieved_ids)
        if not effective_retrieved_ids and context_text:
            for exp in normalized_expected:
                if exp in context_text.lower():
                    effective_retrieved_ids.append(exp)

        # Metrics calculation
        p_at_3 = calculate_precision_at_k(effective_retrieved_ids, normalized_expected, k=3)
        p_at_5 = calculate_precision_at_k(effective_retrieved_ids, normalized_expected, k=5)
        p_at_10 = calculate_precision_at_k(effective_retrieved_ids, normalized_expected, k=10)
        rec_at_5 = calculate_recall_at_k(effective_retrieved_ids, normalized_expected, k=5)
        mrr = calculate_mrr(effective_retrieved_ids, normalized_expected)
        hit_rate_5 = calculate_hit_rate_at_k(effective_retrieved_ids, normalized_expected, k=5)
        
        ctx_relevance = calculate_context_relevance(
            query=query,
            retrieved_contexts=retrieved_passages if retrieved_passages else ([context_text] if context_text else [])
        )
        citation_cov = calculate_citation_coverage(context_text, citations)

        passed = hit_rate_5 >= 1.0 or ctx_relevance >= 0.35

        return {
            "passed": passed,
            "latency_ms": latency_ms,
            "precision_at_3": p_at_3,
            "precision_at_5": p_at_5,
            "precision_at_10": p_at_10,
            "recall_at_5": rec_at_5,
            "mrr": mrr,
            "hit_rate_at_5": hit_rate_5,
            "context_relevance": ctx_relevance,
            "citation_coverage": citation_cov,
            "retrieved_count": len(effective_retrieved_ids),
            "retrieved_docs": citations,
            "context_sample": context_text[:250] if context_text else "",
        }
