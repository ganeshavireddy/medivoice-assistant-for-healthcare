"""
MediVoice AI - Evaluation Pydantic Schemas

Defines request and response data models for the evaluation dashboard APIs.
"""

from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class TestCaseBase(BaseModel):
    test_id: str
    category: str
    language: str = "en"
    query: str
    expected_behavior: str
    expected_label: Optional[str] = None
    expected_sources: Optional[str] = None
    severity: str = "medium"
    ground_truth_context: Optional[str] = None
    enabled: bool = True
    is_reviewed: bool = True


class TestCaseCreate(TestCaseBase):
    pass


class TestCaseUpdate(BaseModel):
    category: Optional[str] = None
    language: Optional[str] = None
    query: Optional[str] = None
    expected_behavior: Optional[str] = None
    expected_label: Optional[str] = None
    expected_sources: Optional[str] = None
    severity: Optional[str] = None
    ground_truth_context: Optional[str] = None
    enabled: Optional[bool] = None
    is_reviewed: Optional[bool] = None


class TestCaseResponse(TestCaseBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class EvaluationRunTrigger(BaseModel):
    category: Optional[str] = None
    test_id: Optional[str] = None
    trigger_type: str = "manual"


class EvaluationRunResponse(BaseModel):
    id: int
    run_id: str
    trigger_type: str
    category: Optional[str] = None
    status: str
    total_cases: int
    passed_cases: int
    failed_cases: int
    skipped_cases: int = 0
    composite_score: Optional[float] = None
    rag_score: Optional[float] = None
    relevance_score: Optional[float] = None
    groundedness_score: Optional[float] = None
    safety_score: Optional[float] = None
    language_score: Optional[float] = None
    latency_p50: Optional[float] = None
    latency_p95: Optional[float] = None
    latency_avg: Optional[float] = None
    error_rate: Optional[float] = None
    started_at: datetime
    completed_at: Optional[datetime] = None
    duration_seconds: Optional[float] = None

    class Config:
        from_attributes = True


class EvaluationResultItem(BaseModel):
    id: int
    run_id: str
    test_case_id: str
    category: str
    language: str
    query: str
    actual_response: Optional[str] = None
    passed: bool
    metrics: Optional[Dict[str, Any]] = None
    evaluator_reasoning: Optional[str] = None
    issues: Optional[List[str]] = None
    created_at: datetime


class EvaluationOverviewResponse(BaseModel):
    status: str  # "operational" or "no_data"
    total_runs: int
    total_evaluated_queries: int
    composite_score: Optional[float] = None
    rag_quality_score: Optional[float] = None
    answer_relevance_score: Optional[float] = None
    groundedness_score: Optional[float] = None
    safety_evaluation_score: Optional[float] = None
    language_consistency_score: Optional[float] = None
    average_latency_ms: Optional[float] = None
    api_failure_rate: Optional[float] = None
    critical_safety_alerts: int = 0
    last_evaluated_at: Optional[datetime] = None
    recent_runs: List[EvaluationRunResponse] = []
    category_distribution: Dict[str, int] = {}


class EvaluationFeedbackCreate(BaseModel):
    result_id: int
    reviewer_name: str = "clinical_reviewer"
    rating: int = Field(ge=1, le=5)
    corrected_label: Optional[str] = None
    comments: Optional[str] = None
