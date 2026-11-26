import React from 'react';
import {
  Activity,
  ShieldAlert,
  Search,
  CheckCircle2,
  FileCheck2,
  Clock,
  AlertTriangle,
  Play,
  RotateCcw,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { OverviewMetrics } from '../../types/evaluation';
import { MetricCard } from './MetricCard';

interface OverviewProps {
  data: OverviewMetrics | null;
  loading: boolean;
  onRunEvaluation: () => void;
  isRunning: boolean;
}

export const EvaluationOverview: React.FC<OverviewProps> = ({
  data,
  loading,
  onRunEvaluation,
  isRunning,
}) => {
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
        <div style={{ color: '#0284c7', fontWeight: 600, fontSize: '15px' }}>Loading evaluation metrics...</div>
      </div>
    );
  }

  const isNoData = !data || data.status === 'no_data' || data.total_runs === 0;

  const radarData = data
    ? [
        { subject: 'Safety', score: data.safety_evaluation_score ?? 0, fullMark: 100 },
        { subject: 'RAG Retrieval', score: data.rag_quality_score ?? 0, fullMark: 100 },
        { subject: 'Relevance', score: data.answer_relevance_score ?? 0, fullMark: 100 },
        { subject: 'Groundedness', score: data.groundedness_score ?? 0, fullMark: 100 },
        { subject: 'Language', score: data.language_consistency_score ?? 0, fullMark: 100 },
      ]
    : [];

  const categoryData = data?.category_distribution
    ? Object.entries(data.category_distribution).map(([cat, count]) => ({
        category: cat.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        testCases: count,
      }))
    : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Critical Safety Alert Banner if any critical safety alerts exist */}
      {data && data.critical_safety_alerts > 0 && (
        <div
          style={{
            backgroundColor: '#fef2f2',
            border: '2px solid #ef4444',
            borderRadius: '12px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ backgroundColor: '#dc2626', color: '#fff', padding: '10px', borderRadius: '10px' }}>
              <ShieldAlert size={24} />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: '#991b1b', fontSize: '15px' }}>
                CRITICAL MEDICAL SAFETY NOTICE: {data.critical_safety_alerts} Safety Case(s) Failed
              </div>
              <div style={{ fontSize: '13px', color: '#b91c1c', marginTop: '2px' }}>
                One or more emergency triage cases failed deterministic detection. Immediate engineering review required.
              </div>
            </div>
          </div>
          <button
            onClick={onRunEvaluation}
            disabled={isRunning}
            style={{
              backgroundColor: '#dc2626',
              color: '#ffffff',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '13px',
              cursor: isRunning ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {isRunning ? 'Re-running...' : 'Re-verify Safety Cases'}
          </button>
        </div>
      )}

      {/* KPI Grid (8 Core Evaluation Metrics) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
        }}
      >
        <MetricCard
          title="Overall Evaluation Score"
          value={data?.composite_score}
          suffix="/100"
          subtitle="Weighted engineering composite benchmark"
          icon={Activity}
          color="indigo"
          badge="Internal Benchmark"
        />
        <MetricCard
          title="RAG Retrieval Quality"
          value={data?.rag_quality_score}
          suffix="%"
          subtitle="Precision@5, MRR & HitRate against sources"
          icon={Search}
          color="blue"
        />
        <MetricCard
          title="Answer Relevance"
          value={data?.answer_relevance_score}
          suffix="%"
          subtitle="Query symptom alignment score"
          icon={CheckCircle2}
          color="emerald"
        />
        <MetricCard
          title="Answer Groundedness"
          value={data?.groundedness_score}
          suffix="%"
          subtitle="Absence of unsupported hallucinations"
          icon={FileCheck2}
          color="indigo"
        />
        <MetricCard
          title="Safety Evaluation Score"
          value={data?.safety_evaluation_score}
          suffix="%"
          subtitle="Emergency triage & disclaimer adherence"
          icon={ShieldAlert}
          color={data && data.critical_safety_alerts > 0 ? 'rose' : 'emerald'}
        />
        <MetricCard
          title="Average Response Latency"
          value={data?.average_latency_ms}
          suffix=" ms"
          subtitle="End-to-end processing duration"
          icon={Clock}
          color="blue"
        />
        <MetricCard
          title="API Failure Rate"
          value={data?.api_failure_rate != null ? (data.api_failure_rate * 100).toFixed(1) : null}
          suffix="%"
          subtitle="Evaluator / pipeline execution failures"
          icon={AlertTriangle}
          color="amber"
        />
        <MetricCard
          title="Total Evaluated Queries"
          value={data?.total_evaluated_queries}
          subtitle="Across all benchmark runs"
          icon={Sparkles}
          color="indigo"
        />
      </div>

      {/* Visual Charts: Multi-Dimensional Radar & Category Distribution */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '16px' }}>
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
          <div style={{ fontWeight: 700, fontSize: '15px', color: '#0f172a', marginBottom: '4px' }}>
            5-Dimension Evaluation Radar
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>
            Scores across Safety, RAG, Relevance, Groundedness, and Language Consistency
          </div>
          {isNoData ? (
            <div style={{ height: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
              Not enough evaluation data
            </div>
          ) : (
            <div style={{ height: '260px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 12 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <Radar name="MediVoice AI" dataKey="score" stroke="#4f46e5" fill="#6366f1" fillOpacity={0.4} />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
          <div style={{ fontWeight: 700, fontSize: '15px', color: '#0f172a', marginBottom: '4px' }}>
            Benchmark Test Case Distribution
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>
            Number of active test cases across evaluation categories
          </div>
          {isNoData ? (
            <div style={{ height: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
              Not enough evaluation data
            </div>
          ) : (
            <div style={{ height: '260px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} />
                  <YAxis dataKey="category" type="category" tick={{ fill: '#475569', fontSize: 11 }} width={120} />
                  <Tooltip />
                  <Bar dataKey="testCases" fill="#0284c7" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Recent Evaluation Runs Table */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '15px', color: '#0f172a' }}>
              Recent Evaluation Runs
            </div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>
              History of evaluation execution batches
            </div>
          </div>
          <button
            onClick={onRunEvaluation}
            disabled={isRunning}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              padding: '8px 14px',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 600,
              fontSize: '13px',
              cursor: isRunning ? 'not-allowed' : 'pointer',
            }}
          >
            {isRunning ? <RotateCcw size={15} className="animate-spin" /> : <Play size={15} />}
            {isRunning ? 'Running Suite...' : 'Run Evaluation Suite'}
          </button>
        </div>

        {isNoData || !data.recent_runs || data.recent_runs.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
            No evaluation runs recorded yet. Click "Run Evaluation Suite" to execute your first benchmark.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', textAlign: 'left' }}>
                  <th style={{ padding: '10px 12px' }}>Run ID</th>
                  <th style={{ padding: '10px 12px' }}>Started At</th>
                  <th style={{ padding: '10px 12px' }}>Cases</th>
                  <th style={{ padding: '10px 12px' }}>Passed</th>
                  <th style={{ padding: '10px 12px' }}>Failed</th>
                  <th style={{ padding: '10px 12px' }}>Composite Score</th>
                  <th style={{ padding: '10px 12px' }}>P95 Latency</th>
                  <th style={{ padding: '10px 12px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.recent_runs.map((run) => (
                  <tr key={run.run_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: '#0f172a' }}>{run.run_id}</td>
                    <td style={{ padding: '10px 12px', color: '#64748b' }}>
                      {new Date(run.started_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ padding: '10px 12px' }}>{run.total_cases}</td>
                    <td style={{ padding: '10px 12px', color: '#16a34a', fontWeight: 600 }}>{run.passed_cases}</td>
                    <td style={{ padding: '10px 12px', color: run.failed_cases > 0 ? '#dc2626' : '#64748b', fontWeight: 600 }}>{run.failed_cases}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: '#4f46e5' }}>
                      {run.composite_score != null ? `${run.composite_score}%` : 'N/A'}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#64748b' }}>
                      {run.latency_p95 ? `${run.latency_p95} ms` : 'N/A'}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          backgroundColor: run.status === 'completed' ? '#ecfdf5' : '#eff6ff',
                          color: run.status === 'completed' ? '#047857' : '#1d4ed8',
                        }}
                      >
                        {run.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
