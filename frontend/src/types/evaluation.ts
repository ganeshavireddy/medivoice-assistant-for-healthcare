export interface TestCase {
  id: number;
  test_id: string;
  category: 'medical_safety' | 'rag' | 'llm_response' | 'english_telugu' | 'voice' | 'appointment_workflow' | 'system_performance';
  language: 'en' | 'te';
  query: string;
  expected_behavior: string;
  expected_label?: string;
  expected_sources?: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  ground_truth_context?: string;
  enabled: boolean;
  is_reviewed: boolean;
  created_at: string;
  updated_at?: string;
}

export interface EvaluationRun {
  id: number;
  run_id: string;
  trigger_type: string;
  category?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  total_cases: number;
  passed_cases: number;
  failed_cases: number;
  skipped_cases: number;
  composite_score?: number | null;
  rag_score?: number | null;
  relevance_score?: number | null;
  groundedness_score?: number | null;
  safety_score?: number | null;
  language_score?: number | null;
  latency_p50?: number | null;
  latency_p95?: number | null;
  latency_avg?: number | null;
  error_rate?: number | null;
  started_at: string;
  completed_at?: string;
  duration_seconds?: number;
}

export interface EvaluationResult {
  id: number;
  run_id: string;
  test_case_id: string;
  category: string;
  language: string;
  query: string;
  actual_response?: string;
  passed: boolean;
  metrics?: Record<string, any>;
  evaluator_reasoning?: string;
  issues?: string[];
  created_at: string;
}

export interface OverviewMetrics {
  status: 'operational' | 'no_data';
  total_runs: number;
  total_evaluated_queries: number;
  composite_score: number | null;
  rag_quality_score: number | null;
  answer_relevance_score: number | null;
  groundedness_score: number | null;
  safety_evaluation_score: number | null;
  language_consistency_score: number | null;
  average_latency_ms: number | null;
  api_failure_rate: number | null;
  critical_safety_alerts: number;
  last_evaluated_at: string | null;
  recent_runs: EvaluationRun[];
  category_distribution: Record<string, number>;
}

export interface RAGMetricsData {
  status: string;
  precision_at_3: number;
  precision_at_5: number;
  precision_at_10: number;
  recall_at_5: number;
  mrr: number;
  hit_rate_at_5: number;
  context_relevance: number;
  avg_retrieval_latency_ms: number;
  total_queries: number;
  queries: Array<{
    test_id: string;
    query: string;
    passed: boolean;
    hit_rate_at_5: number;
    precision_at_5: number;
    mrr: number;
    latency_ms: number;
    retrieved_count: number;
  }>;
}

export interface LLMMetricsData {
  status: string;
  answer_relevance: number;
  faithfulness: number;
  context_utilization: number;
  citation_correctness: number;
  completeness: number;
  contradiction_rate: number;
  items: Array<{
    test_id: string;
    query: string;
    response: string;
    answer_relevance: number;
    faithfulness: number;
    completeness: number;
    reasoning?: string;
    passed: boolean;
  }>;
}

export interface SafetyMetricsData {
  status: string;
  emergency_recall: number;
  emergency_precision: number;
  critical_false_negatives: number;
  false_positives: number;
  true_positives: number;
  true_negatives: number;
  disclaimer_adherence_rate: number;
  unsafe_medications_prevented: number;
  cases: Array<{
    test_id: string;
    query: string;
    passed: boolean;
    expected_emergency: boolean;
    detected_emergency: boolean;
    is_false_negative: boolean;
    disclaimer_present: boolean;
    severity: string;
    reasoning?: string;
  }>;
}

export interface LanguageMetricsData {
  status: string;
  english: {
    total: number;
    pass_rate: number;
    avg_consistency: number;
    warnings_preserved: boolean;
  };
  telugu: {
    total: number;
    pass_rate: number;
    avg_consistency: number;
    warnings_preserved: boolean;
  };
}

export interface VoiceMetricsData {
  status: string;
  stt: {
    word_error_rate: number;
    character_error_rate: number;
    accuracy_percentage: number;
    avg_transcription_latency_ms: number;
  };
  tts: {
    synthesis_latency_ms: number;
    success_rate: number;
    neural_voice: string;
  };
}

export interface PerformanceMetricsData {
  status: string;
  p50_latency_ms: number;
  p95_latency_ms: number;
  p99_latency_ms: number;
  average_latency_ms: number;
  api_success_rate: number;
  error_rate: number;
  token_usage: {
    total_estimated_tokens: number;
    estimated_cost_usd: number;
  };
}

export interface AppointmentMetricsData {
  status: string;
  doctor_search_success_rate: number;
  workflow_completion_rate: number;
  invalid_booking_rejection_rate: number;
  avg_booking_latency_ms: number;
}
