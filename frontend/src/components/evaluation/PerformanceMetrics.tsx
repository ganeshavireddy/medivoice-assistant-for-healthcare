import React from 'react';
import { PerformanceMetricsData } from '../../types/evaluation';
import { MetricCard } from './MetricCard';
import { Clock, Zap, CheckCircle2, DollarSign, Activity } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface PerfProps {
  data: PerformanceMetricsData | null;
  loading: boolean;
}

export const PerformanceMetrics: React.FC<PerfProps> = ({ data, loading }) => {
  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#0284c7' }}>Loading performance metrics...</div>;
  }

  const isNoData = !data || data.status === 'no_data';

  const latencyPercentilesData = data && !isNoData
    ? [
        { name: 'P50 (Median)', latency: data.p50_latency_ms },
        { name: 'P90', latency: data.p95_latency_ms ? Math.round(data.p95_latency_ms * 0.9) : 0 },
        { name: 'P95', latency: data.p95_latency_ms },
        { name: 'P99', latency: data.p99_latency_ms },
        { name: 'Average', latency: data.average_latency_ms },
      ]
    : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <MetricCard
          title="P50 Response Latency"
          value={data ? data.p50_latency_ms : null}
          suffix=" ms"
          subtitle="Median end-to-end response time"
          icon={Clock}
          color="blue"
        />
        <MetricCard
          title="P95 Response Latency"
          value={data ? data.p95_latency_ms : null}
          suffix=" ms"
          subtitle="95th percentile worst-case latency"
          icon={Zap}
          color="indigo"
        />
        <MetricCard
          title="API Success Rate"
          value={data ? `${data.api_success_rate}%` : null}
          subtitle="Proportion of successful API calls"
          icon={CheckCircle2}
          color="emerald"
        />
        <MetricCard
          title="Estimated Tokens"
          value={data ? data.token_usage.total_estimated_tokens.toLocaleString() : null}
          subtitle="Input & generation token volume"
          icon={Activity}
          color="indigo"
        />
        <MetricCard
          title="Estimated API Cost"
          value={data ? `$${data.token_usage.estimated_cost_usd.toFixed(4)}` : null}
          subtitle="LLM inference cost projection"
          icon={DollarSign}
          color="emerald"
        />
      </div>

      {/* Latency Percentile Chart */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
        <div style={{ fontWeight: 700, fontSize: '15px', color: '#0f172a', marginBottom: '4px' }}>
          Response Latency Distribution Percentiles (ms)
        </div>
        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>
          Measurement includes RAG retrieval, prompt generation, LLM inference, and response formatting
        </div>
        {isNoData ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>Not enough evaluation data</div>
        ) : (
          <div style={{ height: '260px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={latencyPercentilesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fill: '#475569', fontSize: 12 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip formatter={(value) => [`${value} ms`, 'Latency']} />
                <Bar dataKey="latency" fill="#0284c7" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};
