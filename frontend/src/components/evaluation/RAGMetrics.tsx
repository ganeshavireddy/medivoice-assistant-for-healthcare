import React from 'react';
import { RAGMetricsData } from '../../types/evaluation';
import { MetricCard } from './MetricCard';
import { Search, CheckCircle2, Clock, BookOpen, Layers } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

interface RAGProps {
  data: RAGMetricsData | null;
  loading: boolean;
}

export const RAGMetrics: React.FC<RAGProps> = ({ data, loading }) => {
  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#0284c7' }}>Loading RAG retrieval metrics...</div>;
  }

  const isNoData = !data || data.status === 'no_data';

  const kMetricsData = data && !isNoData
    ? [
        { name: 'Precision@3', score: Math.round(data.precision_at_3 * 100) },
        { name: 'Precision@5', score: Math.round(data.precision_at_5 * 100) },
        { name: 'Precision@10', score: Math.round(data.precision_at_10 * 100) },
        { name: 'Recall@5', score: Math.round(data.recall_at_5 * 100) },
        { name: 'Hit Rate@5', score: Math.round(data.hit_rate_at_5 * 100) },
        { name: 'MRR', score: Math.round(data.mrr * 100) },
      ]
    : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <MetricCard
          title="Hit Rate@5"
          value={data ? `${Math.round(data.hit_rate_at_5 * 100)}%` : null}
          subtitle="Queries with >= 1 relevant doc in top 5"
          icon={CheckCircle2}
          color="emerald"
        />
        <MetricCard
          title="Precision@5"
          value={data ? `${Math.round(data.precision_at_5 * 100)}%` : null}
          subtitle="Relevant retrieved docs / 5"
          icon={Search}
          color="blue"
        />
        <MetricCard
          title="Mean Reciprocal Rank (MRR)"
          value={data ? data.mrr.toFixed(3) : null}
          subtitle="Reciprocal rank of first relevant doc"
          icon={Layers}
          color="indigo"
        />
        <MetricCard
          title="Context Relevance"
          value={data ? `${Math.round(data.context_relevance * 100)}%` : null}
          subtitle="Medical query concept density"
          icon={BookOpen}
          color="blue"
        />
        <MetricCard
          title="Retrieval Latency"
          value={data ? `${data.avg_retrieval_latency_ms}` : null}
          suffix=" ms"
          subtitle="ChromaDB vector search duration"
          icon={Clock}
          color="amber"
        />
      </div>

      {/* Chart: Precision & Recall at Configurable K */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
        <div style={{ fontWeight: 700, fontSize: '15px', color: '#0f172a', marginBottom: '4px' }}>
          Retrieval Quality Across K (Precision@K, Recall@K, MRR)
        </div>
        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>
          Comparing document retrieval metrics against manually verified ground truth sources
        </div>
        {isNoData ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>Not enough evaluation data</div>
        ) : (
          <div style={{ height: '260px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={kMetricsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fill: '#475569', fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip formatter={(value) => [`${value}%`, 'Score']} />
                <Bar dataKey="score" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Query Retrieval Breakdown */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
        <div style={{ fontWeight: 700, fontSize: '15px', color: '#0f172a', marginBottom: '14px' }}>
          Query-by-Query Retrieval Details
        </div>
        {isNoData || !data.queries || data.queries.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>No query results available</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', textAlign: 'left' }}>
                  <th style={{ padding: '10px 12px' }}>Test ID</th>
                  <th style={{ padding: '10px 12px' }}>Query</th>
                  <th style={{ padding: '10px 12px' }}>Hit@5</th>
                  <th style={{ padding: '10px 12px' }}>Precision@5</th>
                  <th style={{ padding: '10px 12px' }}>MRR</th>
                  <th style={{ padding: '10px 12px' }}>Latency</th>
                  <th style={{ padding: '10px 12px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.queries.map((q) => (
                  <tr key={q.test_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>{q.test_id}</td>
                    <td style={{ padding: '10px 12px', color: '#334155', maxWidth: '300px' }}>{q.query}</td>
                    <td style={{ padding: '10px 12px' }}>{q.hit_rate_at_5 > 0 ? 'Yes' : 'No'}</td>
                    <td style={{ padding: '10px 12px' }}>{(q.precision_at_5 * 100).toFixed(0)}%</td>
                    <td style={{ padding: '10px 12px' }}>{q.mrr.toFixed(2)}</td>
                    <td style={{ padding: '10px 12px' }}>{q.latency_ms} ms</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          backgroundColor: q.passed ? '#ecfdf5' : '#fff1f2',
                          color: q.passed ? '#047857' : '#be123c',
                        }}
                      >
                        {q.passed ? 'PASSED' : 'FAILED'}
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
