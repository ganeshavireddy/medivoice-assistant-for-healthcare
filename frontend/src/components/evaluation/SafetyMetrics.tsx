import React from 'react';
import { SafetyMetricsData } from '../../types/evaluation';
import { MetricCard } from './MetricCard';
import { ShieldAlert, ShieldCheck, AlertTriangle, FileWarning, CheckCircle2 } from 'lucide-react';

interface SafetyProps {
  data: SafetyMetricsData | null;
  loading: boolean;
}

export const SafetyMetrics: React.FC<SafetyProps> = ({ data, loading }) => {
  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#0284c7' }}>Loading medical safety evaluation...</div>;
  }

  const isNoData = !data || data.status === 'no_data';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Critical False Negative Warning Box */}
      {data && data.critical_false_negatives > 0 && (
        <div
          style={{
            backgroundColor: '#fef2f2',
            border: '2px solid #ef4444',
            borderRadius: '12px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div style={{ backgroundColor: '#dc2626', color: '#fff', padding: '10px', borderRadius: '10px' }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <div style={{ fontWeight: 700, color: '#991b1b', fontSize: '15px' }}>
              CRITICAL SAFETY CONCERN: {data.critical_false_negatives} Emergency Case(s) Missed
            </div>
            <div style={{ fontSize: '13px', color: '#b91c1c', marginTop: '2px' }}>
              One or more life-threatening emergency scenarios were NOT identified as emergencies. In clinical deployment, false negatives are unacceptable risks.
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <MetricCard
          title="Emergency Recall (Sensitivity)"
          value={data ? `${Math.round(data.emergency_recall * 100)}%` : null}
          subtitle="Crucial: Avoid missed emergencies"
          icon={ShieldAlert}
          color={data && data.critical_false_negatives > 0 ? 'rose' : 'emerald'}
          badge="Priority Metric"
        />
        <MetricCard
          title="Emergency Precision"
          value={data ? `${Math.round(data.emergency_precision * 100)}%` : null}
          subtitle="True emergencies / Flagged emergencies"
          icon={ShieldCheck}
          color="blue"
        />
        <MetricCard
          title="Critical False Negatives"
          value={data ? data.critical_false_negatives : null}
          subtitle="Must be 0 in clinical production"
          icon={FileWarning}
          color={data && data.critical_false_negatives > 0 ? 'rose' : 'emerald'}
        />
        <MetricCard
          title="False Positives"
          value={data ? data.false_positives : null}
          subtitle="Routine symptoms flagged as emergency"
          icon={AlertTriangle}
          color="amber"
        />
        <MetricCard
          title="Disclaimer Adherence"
          value={data ? `${Math.round(data.disclaimer_adherence_rate * 100)}%` : null}
          subtitle="Mandatory non-diagnostic disclaimers"
          icon={CheckCircle2}
          color="indigo"
        />
      </div>

      {/* Confusion Matrix (TP, FP, FN, TN) */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
        <div style={{ fontWeight: 700, fontSize: '15px', color: '#0f172a', marginBottom: '4px' }}>
          Emergency Triage Confusion Matrix
        </div>
        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>
          Classification breakdown of benchmark emergency scenarios
        </div>

        {isNoData ? (
          <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>Not enough evaluation data</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', maxWidth: '600px' }}>
            <div style={{ backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#047857' }}>TRUE POSITIVE (TP)</div>
              <div style={{ fontSize: '26px', fontWeight: 700, color: '#065f46', margin: '4px 0' }}>{data.true_positives}</div>
              <div style={{ fontSize: '11px', color: '#047857' }}>Correctly escalated emergency</div>
            </div>

            <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#b45309' }}>FALSE POSITIVE (FP)</div>
              <div style={{ fontSize: '26px', fontWeight: 700, color: '#92400e', margin: '4px 0' }}>{data.false_positives}</div>
              <div style={{ fontSize: '11px', color: '#b45309' }}>Routine symptom over-escalated</div>
            </div>

            <div style={{ backgroundColor: data.critical_false_negatives > 0 ? '#fff1f2' : '#f8fafc', border: `1px solid ${data.critical_false_negatives > 0 ? '#fecdd3' : '#e2e8f0'}`, borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#be123c' }}>FALSE NEGATIVE (FN) ⚠️</div>
              <div style={{ fontSize: '26px', fontWeight: 700, color: '#9f1239', margin: '4px 0' }}>{data.critical_false_negatives}</div>
              <div style={{ fontSize: '11px', color: '#be123c' }}>Life-safety emergency missed!</div>
            </div>

            <div style={{ backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#047857' }}>TRUE NEGATIVE (TN)</div>
              <div style={{ fontSize: '26px', fontWeight: 700, color: '#065f46', margin: '4px 0' }}>{data.true_negatives}</div>
              <div style={{ fontSize: '11px', color: '#047857' }}>Routine guidance safely provided</div>
            </div>
          </div>
        )}
      </div>

      {/* Safety Scenarios Breakdown */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
        <div style={{ fontWeight: 700, fontSize: '15px', color: '#0f172a', marginBottom: '14px' }}>
          Audited Medical Safety Scenarios
        </div>
        {isNoData || !data.cases || data.cases.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>No safety cases recorded</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', textAlign: 'left' }}>
                  <th style={{ padding: '10px 12px' }}>Test ID</th>
                  <th style={{ padding: '10px 12px' }}>Query Scenario</th>
                  <th style={{ padding: '10px 12px' }}>Expected</th>
                  <th style={{ padding: '10px 12px' }}>Detected</th>
                  <th style={{ padding: '10px 12px' }}>Disclaimer</th>
                  <th style={{ padding: '10px 12px' }}>Safety Status</th>
                </tr>
              </thead>
              <tbody>
                {data.cases.map((c) => (
                  <tr key={c.test_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>{c.test_id}</td>
                    <td style={{ padding: '10px 12px', color: '#334155', maxWidth: '340px' }}>{c.query}</td>
                    <td style={{ padding: '10px 12px' }}>{c.expected_emergency ? 'Emergency' : 'Routine'}</td>
                    <td style={{ padding: '10px 12px' }}>{c.detected_emergency ? 'Emergency' : 'Routine'}</td>
                    <td style={{ padding: '10px 12px' }}>{c.disclaimer_present ? 'Yes' : 'No'}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          backgroundColor: c.passed ? '#ecfdf5' : '#fff1f2',
                          color: c.passed ? '#047857' : '#be123c',
                        }}
                      >
                        {c.is_false_negative ? 'CRITICAL FN' : c.passed ? 'PASSED' : 'FAILED'}
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
