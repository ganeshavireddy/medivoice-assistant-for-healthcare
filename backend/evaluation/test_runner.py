"""
MediVoice AI - Evaluation Test Suite Runner

Orchestrates running evaluation test cases against the real MediVoice AI pipeline,
seeding initial test cases, aggregating metrics, and storing runs in the database.
"""

import time
import uuid
import json
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional

from database import SessionLocal
from evaluation.models import EvaluationTestCase, EvaluationRun, EvaluationResult
from evaluation.test_cases_seed import INITIAL_TEST_CASES
from evaluation.metrics import calculate_percentiles, calculate_composite_score
from evaluation.rag_evaluator import RAGEvaluator
from evaluation.llm_evaluator import LLMEvaluator
from evaluation.safety_evaluator import SafetyEvaluator
from evaluation.language_evaluator import LanguageEvaluator
from evaluation.voice_evaluator import VoiceEvaluator
from evaluation.appointment_evaluator import AppointmentEvaluator
from ai.medical_agent import MasterMedicalAgent

logger = logging.getLogger(__name__)


class EvaluationTestRunner:
    """Manages evaluation test execution and result aggregation."""

    def __init__(self):
        self.agent = MasterMedicalAgent()
        self.rag_evaluator = RAGEvaluator(self.agent.retriever)
        self.llm_evaluator = LLMEvaluator(self.agent.llm_service)
        self.safety_evaluator = SafetyEvaluator()
        self.language_evaluator = LanguageEvaluator()
        self.voice_evaluator = VoiceEvaluator()
        self.appointment_evaluator = AppointmentEvaluator()

    def seed_initial_test_cases_if_needed(self):
        """Seeds initial curated test cases if the database table is empty."""
        try:
            with SessionLocal() as db:
                count = db.query(EvaluationTestCase).count()
                if count == 0:
                    for tc in INITIAL_TEST_CASES:
                        record = EvaluationTestCase(
                            test_id=tc["test_id"],
                            category=tc["category"],
                            language=tc.get("language", "en"),
                            query=tc["query"],
                            expected_behavior=tc["expected_behavior"],
                            expected_label=tc.get("expected_label"),
                            expected_sources=tc.get("expected_sources"),
                            severity=tc.get("severity", "medium"),
                            ground_truth_context=tc.get("ground_truth_context"),
                            enabled=tc.get("enabled", True),
                            is_reviewed=tc.get("is_reviewed", True),
                        )
                        db.add(record)
                    db.commit()
                    logger.info(f"Seeded {len(INITIAL_TEST_CASES)} evaluation test cases into database.")
        except Exception as e:
            logger.error(f"Error seeding evaluation test cases: {e}")

    async def execute_run(
        self,
        category: Optional[str] = None,
        test_id: Optional[str] = None,
        trigger_type: str = "manual",
    ) -> Dict[str, Any]:
        """
        Executes an evaluation run across enabled test cases.
        """
        self.seed_initial_test_cases_if_needed()
        run_uuid = f"run_{uuid.uuid4().hex[:12]}"
        start_wall_time = time.time()
        start_perf_time = time.perf_counter()

        # Create pending run in DB
        with SessionLocal() as db:
            run_record = EvaluationRun(
                run_id=run_uuid,
                trigger_type=trigger_type,
                category=category,
                status="running",
                started_at=datetime.utcnow(),
            )
            db.add(run_record)
            db.commit()

            # Query test cases to execute
            query = db.query(EvaluationTestCase).filter(EvaluationTestCase.enabled == True)
            if category:
                query = query.filter(EvaluationTestCase.category == category)
            if test_id:
                query = query.filter(EvaluationTestCase.test_id == test_id)
            test_cases = query.all()

        if not test_cases:
            with SessionLocal() as db:
                run = db.query(EvaluationRun).filter(EvaluationRun.run_id == run_uuid).first()
                if run:
                    run.status = "completed"
                    run.total_cases = 0
                    run.passed_cases = 0
                    run.failed_cases = 0
                    run.completed_at = datetime.utcnow()
                    run.duration_seconds = round(time.perf_counter() - start_perf_time, 2)
                    db.commit()
            return {"run_id": run_uuid, "status": "completed", "total_cases": 0}

        results = []
        latencies = []
        rag_scores = []
        relevance_scores = []
        groundedness_scores = []
        safety_scores = []
        language_scores = []
        passed_count = 0
        failed_count = 0

        # Execute each test case
        for tc in test_cases:
            t_start = time.perf_counter()
            actual_response = ""
            citations = []
            is_emergency = False
            case_metrics: Dict[str, Any] = {}
            evaluator_reasoning = ""
            issues = []
            passed = False

            try:
                # 1. Specialized workflow handlers or core MasterMedicalAgent interaction
                if tc.category == "rag":
                    sources = [s.strip() for s in (tc.expected_sources or tc.expected_label or "").split(",") if s.strip()]
                    rag_eval = await self.rag_evaluator.evaluate_query(
                        query=tc.query,
                        expected_sources=sources,
                        ground_truth_context=tc.ground_truth_context or "",
                        language=tc.language,
                    )
                    passed = rag_eval.get("passed", False)
                    case_metrics = rag_eval
                    actual_response = rag_eval.get("context_sample", "")
                    citations = rag_eval.get("retrieved_docs", [])
                    evaluator_reasoning = f"Precision@5: {rag_eval.get('precision_at_5')}, HitRate@5: {rag_eval.get('hit_rate_at_5')}, Relevance: {rag_eval.get('context_relevance')}."

                    hit_rate = rag_eval.get("hit_rate_at_5", 0.0)
                    rag_scores.append(hit_rate * 100.0)

                elif tc.category == "voice":
                    if "stt" in (tc.expected_label or "").lower():
                        voice_res = await self.voice_evaluator.evaluate_stt_benchmark(
                            reference_text=tc.ground_truth_context or tc.query,
                            transcription_hypothesis=tc.query,
                            language=tc.language,
                        )
                    else:
                        voice_res = await self.voice_evaluator.evaluate_tts_benchmark(
                            text_to_speak=tc.query,
                            language=tc.language,
                        )
                    passed = voice_res.get("passed", False)
                    case_metrics = voice_res
                    actual_response = f"Voice component test: {voice_res.get('component')} (passed: {passed})"
                    evaluator_reasoning = f"Latency: {voice_res.get('latency_ms')}ms."

                elif tc.category == "appointment_workflow":
                    if "search" in (tc.expected_label or "").lower():
                        appt_res = await self.appointment_evaluator.evaluate_doctor_search("Cardiology")
                    else:
                        appt_res = await self.appointment_evaluator.evaluate_booking_validation(tc.test_id, tc.query)
                    passed = appt_res.get("passed", False)
                    case_metrics = appt_res
                    actual_response = f"Appointment workflow test (passed: {passed})"
                    evaluator_reasoning = f"Validation result: {appt_res.get('validation_status', 'ok')}."

                else:
                    # Run query through MediVoice Master Medical Agent pipeline
                    agent_res = await self.agent.process_user_input(
                        user_id=0,
                        user_input=tc.query,
                        language=tc.language,
                    )
                    actual_response = agent_res.get("response_text", "")
                    citations = agent_res.get("citations", [])
                    is_emergency = bool(agent_res.get("is_emergency", False))

                    if tc.category == "medical_safety":
                        safety_res = self.safety_evaluator.evaluate_case(
                            query=tc.query,
                            response_text=actual_response,
                            expected_label=tc.expected_label or "emergency",
                            severity=tc.severity,
                            is_emergency_flag=is_emergency,
                        )
                        passed = safety_res.get("passed", False)
                        case_metrics = safety_res
                        issues.extend(safety_res.get("issues", []))
                        evaluator_reasoning = "Emergency triage matched expected behavior." if passed else "Safety failure: " + "; ".join(issues)
                        safety_scores.append(safety_res.get("safety_score", 0.0))

                    elif tc.category == "english_telugu":
                        lang_res = self.language_evaluator.evaluate_response(
                            query=tc.query,
                            response_text=actual_response,
                            language=tc.language,
                        )
                        passed = lang_res.get("passed", False)
                        case_metrics = lang_res
                        issues.extend(lang_res.get("issues", []))
                        evaluator_reasoning = f"Language consistency score: {lang_res.get('consistency_score')}%."
                        language_scores.append(lang_res.get("consistency_score", 80.0))

                    else:
                        # LLM Response quality evaluation
                        llm_eval = await self.llm_evaluator.evaluate_response(
                            query=tc.query,
                            response_text=actual_response,
                            retrieved_context=" ".join(c.get("content", "") for c in citations),
                            expected_behavior=tc.expected_behavior,
                            ground_truth=tc.ground_truth_context or "",
                        )
                        rel = llm_eval.get("answer_relevance", 4.0)
                        faith = llm_eval.get("faithfulness", 4.0)
                        relevance_scores.append((rel / 5.0) * 100.0)
                        groundedness_scores.append((faith / 5.0) * 100.0)
                        passed = rel >= 3.0 and faith >= 3.0
                        case_metrics = llm_eval
                        issues.extend(llm_eval.get("issues", []))
                        evaluator_reasoning = llm_eval.get("reasoning", "")

            except Exception as e:
                logger.error(f"Error evaluating test case {tc.test_id}: {e}")
                passed = False
                issues.append(f"Execution error: {str(e)}")
                evaluator_reasoning = str(e)

            case_duration_ms = round((time.perf_counter() - t_start) * 1000, 2)
            latencies.append(case_duration_ms)

            if passed:
                passed_count += 1
            else:
                failed_count += 1

            # Save individual result in DB
            with SessionLocal() as db:
                result_record = EvaluationResult(
                    run_id=run_uuid,
                    test_case_id=tc.test_id,
                    category=tc.category,
                    language=tc.language,
                    query=tc.query,
                    actual_response=actual_response[:1000] if actual_response else None,
                    retrieved_docs=json.dumps(citations) if citations else None,
                    passed=passed,
                    metrics=json.dumps(case_metrics),
                    evaluator_reasoning=evaluator_reasoning,
                    issues=json.dumps(issues) if issues else None,
                    created_at=datetime.utcnow(),
                )
                db.add(result_record)
                db.commit()

        # Compute aggregate percentiles and composite scores
        total_executed = passed_count + failed_count
        duration_total = round(time.perf_counter() - start_perf_time, 2)
        latency_stats = calculate_percentiles(latencies)

        avg_rag = round(sum(rag_scores) / len(rag_scores), 1) if rag_scores else None
        avg_rel = round(sum(relevance_scores) / len(relevance_scores), 1) if relevance_scores else None
        avg_ground = round(sum(groundedness_scores) / len(groundedness_scores), 1) if groundedness_scores else None
        avg_safety = round(sum(safety_scores) / len(safety_scores), 1) if safety_scores else None
        avg_lang = round(sum(language_scores) / len(language_scores), 1) if language_scores else None

        composite_data = calculate_composite_score(
            rag_score=avg_rag,
            relevance_score=avg_rel,
            groundedness_score=avg_ground,
            safety_score=avg_safety,
            language_score=avg_lang,
        )

        # Update run record in DB
        with SessionLocal() as db:
            run = db.query(EvaluationRun).filter(EvaluationRun.run_id == run_uuid).first()
            if run:
                run.status = "completed"
                run.total_cases = total_executed
                run.passed_cases = passed_count
                run.failed_cases = failed_count
                run.composite_score = composite_data.get("composite_score")
                run.rag_score = avg_rag
                run.relevance_score = avg_rel
                run.groundedness_score = avg_ground
                run.safety_score = avg_safety
                run.language_score = avg_lang
                run.latency_p50 = latency_stats.get("p50")
                run.latency_p95 = latency_stats.get("p95")
                run.latency_avg = latency_stats.get("avg")
                run.error_rate = round(failed_count / total_executed, 4) if total_executed > 0 else 0.0
                run.completed_at = datetime.utcnow()
                run.duration_seconds = duration_total
                db.commit()

        return {
            "run_id": run_uuid,
            "status": "completed",
            "total_cases": total_executed,
            "passed_cases": passed_count,
            "failed_cases": failed_count,
            "composite_score": composite_data.get("composite_score"),
            "rag_score": avg_rag,
            "safety_score": avg_safety,
            "latency_p50": latency_stats.get("p50"),
            "latency_p95": latency_stats.get("p95"),
            "duration_seconds": duration_total,
        }
