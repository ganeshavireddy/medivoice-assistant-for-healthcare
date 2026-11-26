"""
MediVoice AI - Evaluation Database Models

Stores evaluation test cases, evaluation runs, results, traces, and metrics.
Kept isolated from production patient data.
"""

from datetime import datetime
from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    Boolean,
    Float,
    Text,
    ForeignKey,
)
from sqlalchemy.orm import relationship
from database import Base


class EvaluationTestCase(Base):
    """
    Evaluation test case definition.
    Each test represents a curated, clinically approved or engineering scenario.
    """
    __tablename__ = "evaluation_test_cases"

    id = Column(Integer, primary_key=True, index=True)
    test_id = Column(String(50), unique=True, nullable=False, index=True)
    category = Column(String(50), nullable=False, index=True)  # medical_safety, rag, llm_response, english_telugu, voice, appointment_workflow, system_performance
    language = Column(String(10), default="en", nullable=False)  # en, te
    query = Column(Text, nullable=False)
    expected_behavior = Column(Text, nullable=False)
    expected_label = Column(String(100), nullable=True)  # emergency, non_emergency, or target doc ID
    expected_sources = Column(Text, nullable=True)  # JSON or comma-separated list of expected doc IDs
    severity = Column(String(20), default="medium")  # critical, high, medium, low
    ground_truth_context = Column(Text, nullable=True)  # verified clinical reference text
    enabled = Column(Boolean, default=True)
    is_reviewed = Column(Boolean, default=True)  # True = clinically/human approved
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class EvaluationRun(Base):
    """
    Execution run of a test suite or category.
    """
    __tablename__ = "evaluation_runs"

    id = Column(Integer, primary_key=True, index=True)
    run_id = Column(String(50), unique=True, nullable=False, index=True)
    trigger_type = Column(String(50), default="manual")  # manual, automated, category_run
    category = Column(String(50), nullable=True)  # optional category filter
    status = Column(String(20), default="pending")  # pending, running, completed, failed
    total_cases = Column(Integer, default=0)
    passed_cases = Column(Integer, default=0)
    failed_cases = Column(Integer, default=0)
    skipped_cases = Column(Integer, default=0)

    # Core Metric Summaries (0.0 to 100.0 or rates)
    composite_score = Column(Float, nullable=True)
    rag_score = Column(Float, nullable=True)
    relevance_score = Column(Float, nullable=True)
    groundedness_score = Column(Float, nullable=True)
    safety_score = Column(Float, nullable=True)
    language_score = Column(Float, nullable=True)

    # Latencies (in milliseconds)
    latency_p50 = Column(Float, nullable=True)
    latency_p95 = Column(Float, nullable=True)
    latency_avg = Column(Float, nullable=True)
    error_rate = Column(Float, nullable=True)

    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    duration_seconds = Column(Float, nullable=True)
    error_message = Column(Text, nullable=True)

    # Relationships
    results = relationship("EvaluationResult", back_populates="run", cascade="all, delete-orphan")


class EvaluationResult(Base):
    """
    Result of evaluating an individual test case in a specific run.
    """
    __tablename__ = "evaluation_results"

    id = Column(Integer, primary_key=True, index=True)
    run_id = Column(String(50), ForeignKey("evaluation_runs.run_id"), nullable=False, index=True)
    test_case_id = Column(String(50), nullable=False, index=True)
    category = Column(String(50), nullable=False)
    language = Column(String(10), default="en")
    query = Column(Text, nullable=False)
    actual_response = Column(Text, nullable=True)
    retrieved_docs = Column(Text, nullable=True)  # JSON representation of retrieved documents/citations
    passed = Column(Boolean, default=False)

    # JSON formatted breakdown of individual metric evaluations
    metrics = Column(Text, nullable=True)  # JSON: {precision, recall, mrr, hit_rate, answer_relevance, faithfulness, etc.}
    evaluator_reasoning = Column(Text, nullable=True)
    issues = Column(Text, nullable=True)  # JSON list of issue strings
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    run = relationship("EvaluationRun", back_populates="results")
    feedbacks = relationship("EvaluationFeedback", back_populates="result", cascade="all, delete-orphan")


class EvaluationFeedback(Base):
    """
    Human-in-the-loop clinical or engineering review of an evaluation result.
    """
    __tablename__ = "evaluation_feedbacks"

    id = Column(Integer, primary_key=True, index=True)
    result_id = Column(Integer, ForeignKey("evaluation_results.id"), nullable=False, index=True)
    reviewer_name = Column(String(100), default="clinical_reviewer")
    rating = Column(Integer, nullable=True)  # 1 to 5
    corrected_label = Column(String(100), nullable=True)
    comments = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    result = relationship("EvaluationResult", back_populates="feedbacks")


class EvaluationTrace(Base):
    """
    Captured, anonymized trace from application interactions for evaluation sampling.
    PII is strictly redacted before persistence.
    """
    __tablename__ = "evaluation_traces"

    id = Column(Integer, primary_key=True, index=True)
    trace_id = Column(String(50), unique=True, nullable=False, index=True)
    user_query = Column(Text, nullable=False)
    intent = Column(String(100), nullable=True)
    retrieved_contexts = Column(Text, nullable=True)  # JSON or text
    generated_response = Column(Text, nullable=True)
    latency_ms = Column(Float, nullable=False)
    language = Column(String(10), default="en")
    is_emergency = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
