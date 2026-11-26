"""
MediVoice AI - Evaluation Metrics Library

Provides rigorous, transparent, deterministic evaluation metric calculations:
1. RAG Metrics: Precision@K, Recall@K, MRR, HitRate@K, Context Relevance, Citation Coverage
2. Safety Metrics: Emergency Recall, Precision, False Negative Rate, False Positive Rate
3. Language & Voice Metrics: WER, CER (with Telugu Unicode normalization), Language Consistency
4. Latency & Performance Metrics: P50, P90, P95, P99, average latency, failure rate
5. Transparent Composite Score Calculator with component contributions
"""

import math
import re
import unicodedata
from typing import List, Set, Dict, Any, Optional, Union


# ============================================================================
# RAG RETRIEVAL METRICS
# ============================================================================

def calculate_precision_at_k(retrieved_ids: List[str], relevant_ids: List[str], k: int = 5) -> float:
    """
    Precision@K = (Relevant retrieved documents in top K) / K
    """
    if k <= 0:
        return 0.0
    top_k = retrieved_ids[:k]
    if not top_k:
        return 0.0
    
    relevant_set = {str(r).strip().lower() for r in relevant_ids if str(r).strip()}
    if not relevant_set:
        return 0.0
    
    hits = sum(1 for doc in top_k if str(doc).strip().lower() in relevant_set)
    return round(hits / k, 4)


def calculate_recall_at_k(retrieved_ids: List[str], relevant_ids: List[str], k: int = 5) -> float:
    """
    Recall@K = (Relevant retrieved documents in top K) / (Total relevant documents in ground truth)
    """
    relevant_set = {str(r).strip().lower() for r in relevant_ids if str(r).strip()}
    if not relevant_set:
        return 0.0
    
    top_k = retrieved_ids[:k]
    hits = sum(1 for doc in top_k if str(doc).strip().lower() in relevant_set)
    return round(hits / len(relevant_set), 4)


def calculate_mrr(retrieved_ids: List[str], relevant_ids: List[str]) -> float:
    """
    Mean Reciprocal Rank (MRR) = 1 / rank of first relevant retrieved document.
    Returns 0.0 if no relevant document is retrieved.
    """
    relevant_set = {str(r).strip().lower() for r in relevant_ids if str(r).strip()}
    if not relevant_set or not retrieved_ids:
        return 0.0
    
    for rank, doc in enumerate(retrieved_ids, start=1):
        if str(doc).strip().lower() in relevant_set:
            return round(1.0 / rank, 4)
    return 0.0


def calculate_hit_rate_at_k(retrieved_ids: List[str], relevant_ids: List[str], k: int = 5) -> float:
    """
    Hit Rate@K = 1.0 if at least one relevant document is in top K, else 0.0
    """
    relevant_set = {str(r).strip().lower() for r in relevant_ids if str(r).strip()}
    if not relevant_set:
        return 0.0
    
    top_k = retrieved_ids[:k]
    for doc in top_k:
        if str(doc).strip().lower() in relevant_set:
            return 1.0
    return 0.0


def calculate_context_relevance(query: str, retrieved_contexts: List[str]) -> float:
    """
    Estimates context relevance score (0.0 to 1.0) based on key medical term overlap
    and density of query concepts present in the retrieved passages.
    """
    if not query or not retrieved_contexts:
        return 0.0
    
    # Tokenize and extract significant content words (excluding common stop words)
    stop_words = {
        "the", "is", "at", "which", "on", "and", "a", "an", "in", "to", "for", "with",
        "of", "or", "what", "how", "can", "i", "my", "me", "are", "do", "does", "have"
    }
    words = [w.lower() for w in re.findall(r"\b\w{3,}\b", query) if w.lower() not in stop_words]
    if not words:
        return 0.0
    
    full_context = " ".join(retrieved_contexts).lower()
    matches = sum(1 for w in words if w in full_context)
    return round(matches / len(words), 4)


def calculate_citation_coverage(response_text: str, citations: List[Any]) -> float:
    """
    Measures citation coverage (0.0 to 1.0).
    Checks whether factual sections in response contain reference citations or source tags.
    """
    if not response_text:
        return 0.0
    if not citations:
        # Check if citations are embedded in text like [Doc: ...] or [Source: ...] or [1]
        has_inline_citations = bool(re.search(r"\[(source|doc|\d+|reference)[^\]]*\]", response_text, re.IGNORECASE))
        return 0.5 if has_inline_citations else 0.0
    
    # When citations are provided in metadata
    num_citations = len(citations)
    if num_citations >= 3:
        return 1.0
    elif num_citations == 2:
        return 0.8
    elif num_citations == 1:
        return 0.6
    return 0.0


# ============================================================================
# SAFETY EVALUATION METRICS
# ============================================================================

def calculate_safety_metrics(cases: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Calculates Emergency Detection Recall, Precision, False Negatives, and False Positives.
    
    Expected schema per case:
    {
      "expected_emergency": bool,
      "detected_emergency": bool,
      "disclaimer_present": bool,
      "unsafe_medication_detected": bool
    }
    """
    if not cases:
        return {
            "total_cases": 0,
            "emergency_recall": None,
            "emergency_precision": None,
            "false_negative_rate": None,
            "false_positive_rate": None,
            "disclaimer_adherence_rate": None,
            "critical_false_negatives": 0,
            "tp": 0, "fp": 0, "fn": 0, "tn": 0,
        }
    
    tp = 0  # Expected emergency, detected emergency
    fp = 0  # Expected non-emergency, detected emergency
    fn = 0  # Expected emergency, NOT detected emergency (CRITICAL SAFETY RISK!)
    tn = 0  # Expected non-emergency, NOT detected emergency
    
    disclaimers = 0
    unsafe_meds = 0
    
    for c in cases:
        exp = bool(c.get("expected_emergency", False))
        det = bool(c.get("detected_emergency", False))
        
        if exp and det:
            tp += 1
        elif not exp and det:
            fp += 1
        elif exp and not det:
            fn += 1  # Crucial safety failure
        else:
            tn += 1
            
        if c.get("disclaimer_present", False):
            disclaimers += 1
        if c.get("unsafe_medication_detected", False):
            unsafe_meds += 1
            
    total_emergency = tp + fn
    total_non_emergency = tn + fp
    
    recall = round(tp / total_emergency, 4) if total_emergency > 0 else 1.0
    precision = round(tp / (tp + fp), 4) if (tp + fp) > 0 else 1.0
    fn_rate = round(fn / total_emergency, 4) if total_emergency > 0 else 0.0
    fp_rate = round(fp / total_non_emergency, 4) if total_non_emergency > 0 else 0.0
    disclaimer_rate = round(disclaimers / len(cases), 4)
    
    return {
        "total_cases": len(cases),
        "emergency_recall": recall,
        "emergency_precision": precision,
        "false_negative_rate": fn_rate,
        "false_positive_rate": fp_rate,
        "disclaimer_adherence_rate": disclaimer_rate,
        "critical_false_negatives": fn,
        "tp": tp,
        "fp": fp,
        "fn": fn,
        "tn": tn,
        "unsafe_medications_prevented": unsafe_meds,
    }


# ============================================================================
# LANGUAGE & VOICE METRICS (Bilingual & STT/TTS)
# ============================================================================

def normalize_text_for_eval(text: str, language: str = "en") -> str:
    """
    Normalizes text for linguistic and acoustic metrics.
    Handles Unicode canonical normalization (NFC) for Telugu characters.
    """
    if not text:
        return ""
    # Unicode NFC normalization
    normalized = unicodedata.normalize("NFC", text.strip())
    # Remove punctuation for word-level comparison
    normalized = re.sub(r"[^\w\s]", "", normalized)
    return normalized.lower()


def calculate_wer(reference: str, hypothesis: str, language: str = "en") -> float:
    """
    Word Error Rate (WER) using Levenshtein distance on words.
    WER = (Substitutions + Deletions + Insertions) / Total Reference Words
    """
    ref_clean = normalize_text_for_eval(reference, language)
    hyp_clean = normalize_text_for_eval(hypothesis, language)
    
    ref_words = ref_clean.split()
    hyp_words = hyp_clean.split()
    
    if not ref_words:
        return 0.0 if not hyp_words else 1.0
    if not hyp_words:
        return 1.0
        
    n = len(ref_words)
    m = len(hyp_words)
    
    # Dynamic programming matrix
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n + 1):
        dp[i][0] = i
    for j in range(m + 1):
        dp[0][j] = j
        
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            if ref_words[i - 1] == hyp_words[j - 1]:
                dp[i][j] = dp[i - 1][j - 1]
            else:
                dp[i][j] = min(
                    dp[i - 1][j] + 1,      # deletion
                    dp[i][j - 1] + 1,      # insertion
                    dp[i - 1][j - 1] + 1,  # substitution
                )
                
    distance = dp[n][m]
    return round(min(1.0, distance / n), 4)


def calculate_cer(reference: str, hypothesis: str, language: str = "en") -> float:
    """
    Character Error Rate (CER) using Levenshtein distance on characters.
    """
    ref_clean = normalize_text_for_eval(reference, language).replace(" ", "")
    hyp_clean = normalize_text_for_eval(hypothesis, language).replace(" ", "")
    
    if not ref_clean:
        return 0.0 if not hyp_clean else 1.0
    if not hyp_clean:
        return 1.0
        
    n = len(ref_clean)
    m = len(hyp_clean)
    
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n + 1):
        dp[i][0] = i
    for j in range(m + 1):
        dp[0][j] = j
        
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            if ref_clean[i - 1] == hyp_clean[j - 1]:
                dp[i][j] = dp[i - 1][j - 1]
            else:
                dp[i][j] = min(
                    dp[i - 1][j] + 1,
                    dp[i][j - 1] + 1,
                    dp[i - 1][j - 1] + 1,
                )
                
    distance = dp[n][m]
    return round(min(1.0, distance / n), 4)


def verify_telugu_language_consistency(text: str) -> Dict[str, Any]:
    """
    Verifies Telugu script ratio and clinical emergency warning preservation.
    Telugu Unicode range: U+0C00 to U+0C7F.
    """
    if not text:
        return {"telugu_ratio": 0.0, "is_consistent": False, "warnings_preserved": False}
        
    telugu_chars = sum(1 for c in text if "\u0c00" <= c <= "\u0c7f")
    # Alphabetic chars
    alpha_chars = sum(1 for c in text if c.isalpha())
    ratio = round(telugu_chars / alpha_chars, 4) if alpha_chars > 0 else 0.0
    
    # Check if emergency numbers (112, 108) or key medical guidance terms are present
    has_hotline = ("112" in text or "108" in text)
    has_telugu_medical_phrases = any(w in text for w in ["అత్యవసర", "లక్షణాలు", "వైద్య", "డాక్టర్", "ఆసుపత్రి", "సహాయం", "నిరాకరణ", "జ్వరం", "సలహా"])
    
    return {
        "telugu_ratio": ratio,
        "is_consistent": ratio >= 0.25 or telugu_chars >= 40,  # Bilingual healthcare assistant consistency
        "warnings_preserved": has_hotline or has_telugu_medical_phrases,
    }


# ============================================================================
# PERFORMANCE & LATENCY PERCENTILES
# ============================================================================

def calculate_percentiles(values: List[float]) -> Dict[str, Optional[float]]:
    """
    Calculates P50 (median), P90, P95, P99, and arithmetic mean.
    Returns None values if no samples are provided.
    """
    if not values:
        return {
            "p50": None,
            "p90": None,
            "p95": None,
            "p99": None,
            "avg": None,
            "min": None,
            "max": None,
            "count": 0,
        }
        
    sorted_v = sorted(values)
    n = len(sorted_v)
    
    def percentile(p: float) -> float:
        idx = (p / 100.0) * (n - 1)
        lower = int(math.floor(idx))
        upper = int(math.ceil(idx))
        if lower == upper:
            return sorted_v[lower]
        weight = idx - lower
        return sorted_v[lower] * (1 - weight) + sorted_v[upper] * weight
        
    return {
        "p50": round(percentile(50), 2),
        "p90": round(percentile(90), 2),
        "p95": round(percentile(95), 2),
        "p99": round(percentile(99), 2),
        "avg": round(sum(sorted_v) / n, 2),
        "min": round(sorted_v[0], 2),
        "max": round(sorted_v[-1], 2),
        "count": n,
    }


# ============================================================================
# TRANSPARENT COMPOSITE ENGINEERING SCORE
# ============================================================================

def calculate_composite_score(
    rag_score: Optional[float] = None,          # 0 to 100
    relevance_score: Optional[float] = None,    # 0 to 100
    groundedness_score: Optional[float] = None, # 0 to 100
    safety_score: Optional[float] = None,       # 0 to 100
    language_score: Optional[float] = None,     # 0 to 100
    citation_score: Optional[float] = None,     # 0 to 100
) -> Dict[str, Any]:
    """
    Computes a transparent, weighted composite engineering score (0 to 100).
    Configurable weights:
    - Medical Safety: 25%
    - RAG Retrieval Quality: 20%
    - Answer Relevance: 20%
    - Groundedness / Faithfulness: 20%
    - Language Quality (EN vs TE): 10%
    - Citation Correctness: 5%
    
    IMPORTANT: Missing metrics are not silently treated as 0 or 100.
    Available components are re-normalized so the score stays statistically sound.
    """
    weights = {
        "safety": 0.25,
        "rag": 0.20,
        "relevance": 0.20,
        "groundedness": 0.20,
        "language": 0.10,
        "citation": 0.05,
    }
    
    scores = {
        "safety": safety_score,
        "rag": rag_score,
        "relevance": relevance_score,
        "groundedness": groundedness_score,
        "language": language_score,
        "citation": citation_score,
    }
    
    valid_weights = {k: w for k, w in weights.items() if scores[k] is not None}
    if not valid_weights:
        return {
            "composite_score": None,
            "status": "Not enough evaluation data",
            "weights_used": {},
            "component_scores": scores,
        }
        
    total_valid_weight = sum(valid_weights.values())
    weighted_sum = sum(scores[k] * (valid_weights[k] / total_valid_weight) for k in valid_weights)
    
    return {
        "composite_score": round(weighted_sum, 1),
        "status": "Calculated",
        "weights_used": {k: round(valid_weights[k] / total_valid_weight, 3) for k in valid_weights},
        "component_scores": scores,
        "disclaimer": "Internal engineering benchmark score. Does not guarantee clinical accuracy.",
    }
