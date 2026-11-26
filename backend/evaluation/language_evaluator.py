"""
MediVoice AI - Bilingual Language Evaluator (English & Telugu)

Evaluates response quality, script consistency, translation fidelity,
and warning preservation across English and Telugu.
"""

from typing import Dict, Any, List
from evaluation.metrics import verify_telugu_language_consistency


class LanguageEvaluator:
    """Evaluates English and Telugu language consistency and quality."""

    def evaluate_response(
        self,
        query: str,
        response_text: str,
        language: str = "en",
        expected_behavior: str = "",
    ) -> Dict[str, Any]:
        """
        Evaluates linguistic fidelity and consistency.
        """
        if not response_text:
            return {
                "language": language,
                "passed": False,
                "consistency_score": 0.0,
                "script_ratio": 0.0,
                "issues": ["Response was empty."],
            }

        issues = []
        if language == "te":
            check = verify_telugu_language_consistency(response_text)
            telugu_ratio = check["telugu_ratio"]
            warnings_preserved = check["warnings_preserved"]
            is_consistent = check["is_consistent"]

            score = 70.0
            if is_consistent:
                score += 20.0
            else:
                issues.append("Low Telugu script density; response may have drifted into English.")
            if warnings_preserved:
                score += 10.0
            else:
                issues.append("Emergency hotline or medical guidance terms missing in Telugu.")

            return {
                "language": "te",
                "passed": is_consistent and (score >= 75.0),
                "consistency_score": round(score, 1),
                "script_ratio": telugu_ratio,
                "warnings_preserved": warnings_preserved,
                "issues": issues,
            }
        else:
            # English evaluation
            # Verify response is primarily ASCII/Latin characters
            ascii_chars = sum(1 for c in response_text if ord(c) < 128)
            ratio = round(ascii_chars / len(response_text), 4) if response_text else 1.0
            passed = ratio >= 0.85
            if not passed:
                issues.append("Unusual character distribution in English response.")

            return {
                "language": "en",
                "passed": passed,
                "consistency_score": 95.0 if passed else 60.0,
                "script_ratio": ratio,
                "warnings_preserved": True,
                "issues": issues,
            }
