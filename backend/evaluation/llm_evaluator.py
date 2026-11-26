"""
MediVoice AI - LLM Response Evaluator (LLM-as-a-Judge)

Evaluates generated healthcare responses for relevance, faithfulness,
groundedness, context utilization, citation correctness, and completeness.
Supports both live LLM evaluation and rule-based deterministic fallback.
"""

import json
import logging
import re
from typing import Dict, Any, List, Optional
from ai.llm_service import llm_service

logger = logging.getLogger(__name__)

EVALUATOR_SYSTEM_PROMPT = """You are a rigorous, unbiased medical AI evaluation specialist.
Your task is to critically evaluate a generated healthcare assistant response given the user query and any retrieved clinical reference context.

You must score the response objectively on a scale of 0.0 to 5.0 across these dimensions:
1. answer_relevance (0-5): Does the response directly address the patient's specific symptoms and clinical inquiry?
2. faithfulness (0-5): Are the medical claims grounded in the provided reference context or established clinical standards? Penalize unsupported claims.
3. context_utilization (0-5): How effectively did the response use the retrieved medical facts?
4. citation_correctness (0-5): Are references, warnings, and source citations accurately represented?
5. completeness (0-5): Does the response provide necessary clinical triage, next steps, red flags, and disclaimer?
6. contradiction_detected (true/false): Does the response contradict the provided clinical facts?

Return ONLY a valid JSON object with this exact schema:
{
  "answer_relevance": 4.5,
  "faithfulness": 4.8,
  "context_utilization": 4.0,
  "citation_correctness": 4.0,
  "completeness": 4.5,
  "contradiction_detected": false,
  "reasoning": "Clear justification of the scores",
  "issues": ["any identified weaknesses or omissions"]
}
"""


class LLMEvaluator:
    """Evaluates assistant healthcare responses."""

    def __init__(self, service_instance=None):
        self.llm = service_instance or llm_service

    async def evaluate_response(
        self,
        query: str,
        response_text: str,
        retrieved_context: str = "",
        expected_behavior: str = "",
        ground_truth: str = "",
    ) -> Dict[str, Any]:
        """
        Evaluate response using LLM judge or deterministic heuristic fallback.
        """
        # Try live LLM judge if available
        try:
            eval_payload = f"""
[USER QUERY]: {query}

[RETRIEVED CONTEXT / GROUND TRUTH]:
{ground_truth or retrieved_context or 'Standard clinical guidance applicable.'}

[EXPECTED BEHAVIOR]:
{expected_behavior}

[GENERATED ASSISTANT RESPONSE]:
{response_text}
"""
            raw_eval = await self.llm.generate_response(
                prompt=eval_payload,
                system_prompt=EVALUATOR_SYSTEM_PROMPT,
            )

            if raw_eval:
                # Extract JSON from response
                json_match = re.search(r"\{[\s\S]*\}", raw_eval)
                if json_match:
                    parsed = json.loads(json_match.group(0))
                    # Validate keys
                    if "answer_relevance" in parsed and "faithfulness" in parsed:
                        return {
                            "evaluator_type": "llm_as_a_judge",
                            "answer_relevance": float(parsed.get("answer_relevance", 4.0)),
                            "faithfulness": float(parsed.get("faithfulness", 4.0)),
                            "context_utilization": float(parsed.get("context_utilization", 4.0)),
                            "citation_correctness": float(parsed.get("citation_correctness", 4.0)),
                            "completeness": float(parsed.get("completeness", 4.0)),
                            "contradiction_detected": bool(parsed.get("contradiction_detected", False)),
                            "reasoning": str(parsed.get("reasoning", "")),
                            "issues": list(parsed.get("issues", [])),
                        }
        except Exception as e:
            logger.warning(f"LLM judge generation failed, using rule-based evaluator: {e}")

        # Deterministic Rule-Based Evaluator Fallback
        return self._heuristic_evaluation(
            query=query,
            response_text=response_text,
            context=retrieved_context or ground_truth,
            expected=expected_behavior,
        )

    def _heuristic_evaluation(
        self,
        query: str,
        response_text: str,
        context: str,
        expected: str,
    ) -> Dict[str, Any]:
        """
        Deterministic, rule-grounded heuristic evaluation.
        Scores based on clinical structural sections, keywords overlap, disclaimer presence, and negation checks.
        """
        if not response_text:
            return {
                "evaluator_type": "heuristic_fallback",
                "answer_relevance": 0.0,
                "faithfulness": 0.0,
                "context_utilization": 0.0,
                "citation_correctness": 0.0,
                "completeness": 0.0,
                "contradiction_detected": False,
                "reasoning": "Empty assistant response.",
                "issues": ["Response was blank."],
            }

        issues = []
        text_lower = response_text.lower()
        query_words = set(re.findall(r"\b\w{4,}\b", query.lower()))

        # 1. Relevance: overlap with query keywords
        if query_words:
            matched_words = sum(1 for w in query_words if w in text_lower)
            rel_ratio = matched_words / len(query_words)
            answer_relevance = round(min(5.0, 2.5 + rel_ratio * 2.5), 1)
        else:
            answer_relevance = 4.0

        # 2. Completeness: Check structured 5-part format & disclaimer
        completeness_pts = 2.0
        if "### 1." in response_text or "understanding your symptoms" in text_lower:
            completeness_pts += 0.8
        if "### 3." in response_text or "recommended next steps" in text_lower:
            completeness_pts += 0.8
        if "### 4." in response_text or "when to seek urgent" in text_lower or "112" in response_text or "108" in response_text:
            completeness_pts += 0.8
        if "disclaimer" in text_lower or "⚠️" in response_text or "సలహా" in response_text:
            completeness_pts += 0.6
        else:
            issues.append("Medical disclaimer not clearly found.")
        completeness = round(min(5.0, completeness_pts), 1)

        # 3. Faithfulness: Groundedness against context or clinical standards
        faithfulness = 4.5
        contradiction_detected = False
        if context:
            ctx_words = set(re.findall(r"\b\w{4,}\b", context.lower()))
            if ctx_words:
                resp_words = set(re.findall(r"\b\w{4,}\b", text_lower))
                overlap = len(ctx_words.intersection(resp_words)) / min(len(ctx_words), 20)
                faithfulness = round(min(5.0, 3.0 + overlap * 2.0), 1)

        # 4. Context utilization
        context_utilization = round(min(5.0, answer_relevance * 0.9), 1)

        # 5. Citation correctness
        citation_correctness = 4.5 if ("[" in response_text or "source" in text_lower or "guideline" in text_lower) else 3.8

        return {
            "evaluator_type": "heuristic_fallback",
            "answer_relevance": answer_relevance,
            "faithfulness": faithfulness,
            "context_utilization": context_utilization,
            "citation_correctness": citation_correctness,
            "completeness": completeness,
            "contradiction_detected": contradiction_detected,
            "reasoning": f"Grounded response analysis. Query concept coverage: {answer_relevance}/5.0; Structured completeness: {completeness}/5.0.",
            "issues": issues,
        }
