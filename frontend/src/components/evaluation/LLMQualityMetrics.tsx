import React from 'react';
import { LLMMetricsData } from '../../types/evaluation';
import { MetricCard } from './MetricCard';
import { CheckCircle2, ShieldCheck, BookOpen, FileText, AlertCircle } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface LLMProps {
  data: LLMMetricsData | null;
  loading: boolean;
}

export const LLMQualityMetrics: React.FC<LLMProps> = ({ data, loading }) => {
  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#0284c7' }}>Loading LLM evaluation metrics...</div>;
  }

  const isNoData = !data || data.status === 'no_data';

  const dimensionsData = data && !isNoData
    ? [
        { name: 'Answer Relevance', score: data.answer_relevance },
        { name: 'Faithfulness', score: data.faithfulness },
        { name: 'Context Utilization', score: data.context_utilization },
        { name: 'Citation Correctness', score: data.citation_correctness },
        { name: 'Completeness', score: data.completeness },
      ]
    : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* KPI Cards (0 to 5 Scale) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <MetricCard
          title="Answer Relevance"
          value={data ? `${data.answer_relevance}` : null}
          suffix="/5.0"
          subtitle="Clinical inquiry alignment"
          icon={CheckCircle2}
          color="emerald"
        />
        <MetricCard
          title="Faithfulness / Groundedness"
          value={data ? `${data.faithfulness}` : null}
          suffix="/5.0"
          subtitle="Absence of unsupported claims"
          icon={ShieldCheck}
          color="indigo"
        />
        <MetricCard
          title="Context Utilization"
          value={data ? `${data.context_utilization}` : null}
          suffix="/5.0"
          subtitle="Effective use of retrieved evidence"
          icon={BookOpen}
          color="blue"
        />
        <MetricCard
          title="Citation Correctness"
          value={data ? `${data.citation_correctness}` : null}
          suffix="/5.0"
          subtitle="Accuracy of references"
          icon={FileText}
          color="indigo"
        />
        <MetricCard
          title="Contradiction Rate"
          value={data ? `${(data.contradiction_rate * 100).toFixed(1)}%` : null}
          subtitle="Conflicting clinical statements"
          icon={AlertCircle}
          color="amber"
        />
      </div>

      {/* Chart: 5 Core LLM Evaluation Dimensions */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
        <div style={{ fontWeight: 700, fontSize: '15px', color: '#0f172a', marginBottom: '4px' }}>
          LLM-as-a-Judge Clinical Quality Dimensions (0.0 to 5.0)
        </div>
        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>
          Note: Evaluator scores are engineering benchmarks and do not substitute for formal clinical peer-review.
        </div>
        {isNoData ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>Not enough evaluation data</div>
        ) : (
          <div style={{ height: '240px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dimensionsData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fill: '#475569', fontSize: 12 }} />
                <YAxis domain={[0, 5]} tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip formatter={(value) => [`${value} / 5.0`, 'Score']} />
                <Bar dataKey="score" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Itemized LLM Quality Evaluations */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
        <div style={{ fontWeight: 700, fontSize: '15px', color: '#0f172a', marginBottom: '14px' }}>
          Evaluated Clinical Inquiries & Judge Reasoning
        </div>
        {isNoData || !data.items || data.items.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>No evaluation items available</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {data.items.map((it) => (
              <div
                key={it.test_id}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '14px 16px',
                  backgroundColor: '#f8fafc',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '14px' }}>
                    {it.test_id}: {it.query}
                  </span>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#4338ca' }}>
                      Relevance: {it.answer_relevance}/5
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#047857' }}>
                      Faithfulness: {it.faithfulness}/5
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        backgroundColor: it.passed ? '#ecfdf5' : '#fff1f2',
                        color: it.passed ? '#047857' : '#be123c',
                      }}
                    >
                      {it.passed ? 'PASSED' : 'NEEDS IMPROVEMENT'}
                    </span>
                  </div>
                </div>
                {it.reasoning && (
                  <div style={{ fontSize: '12.5px', color: '#475569', fontStyle: 'italic', marginTop: '4px' }}>
                    Judge analysis: {it.reasoning}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
