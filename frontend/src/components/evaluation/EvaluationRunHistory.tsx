import React from 'react';
import { EvaluationRun } from '../../types/evaluation';
import { Download, FileText, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';

interface HistoryProps {
  runs: EvaluationRun[];
  loading: boolean;
  onDownloadReport: (runId?: string, format?: 'json' | 'csv') => void;
}

export const EvaluationRunHistory: React.FC<HistoryProps> = ({ runs, loading, onDownloadReport }) => {
  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#0284c7' }}>Loading evaluation run history...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '16px', color: '#0f172a' }}>
            Evaluation Execution History & Export
          </div>
          <div style={{ fontSize: '12.5px', color: '#64748b' }}>
            Historical audit logs of benchmark suites and regression runs
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => onDownloadReport(undefined, 'csv')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              fontSize: '13px',
              fontWeight: 600,
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              color: '#334155',
              cursor: 'pointer',
            }}
          >
            <Download size={15} /> Export CSV
          </button>
          <button
            onClick={() => onDownloadReport(undefined, 'json')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              fontSize: '13px',
              fontWeight: 600,
              backgroundColor: '#0284c7',
              border: 'none',
              borderRadius: '8px',
              color: '#ffffff',
              cursor: 'pointer',
            }}
          >
            <Download size={15} /> Export JSON
          </button>
        </div>
      </div>

      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
        {runs.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
            No evaluation runs recorded.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', textAlign: 'left' }}>
                  <th style={{ padding: '10px 12px' }}>Run ID</th>
                  <th style={{ padding: '10px 12px' }}>Date & Time</th>
                  <th style={{ padding: '10px 12px' }}>Trigger</th>
                  <th style={{ padding: '10px 12px' }}>Total Cases</th>
                  <th style={{ padding: '10px 12px' }}>Passed</th>
                  <th style={{ padding: '10px 12px' }}>Failed</th>
                  <th style={{ padding: '10px 12px' }}>Composite Score</th>
                  <th style={{ padding: '10px 12px' }}>Duration</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Report</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.run_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: '#0f172a' }}>{r.run_id}</td>
                    <td style={{ padding: '10px 12px', color: '#64748b' }}>
                      {new Date(r.started_at).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', backgroundColor: '#f1f5f9', color: '#475569' }}>
                        {r.trigger_type.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>{r.total_cases}</td>
                    <td style={{ padding: '10px 12px', color: '#16a34a', fontWeight: 600 }}>{r.passed_cases}</td>
                    <td style={{ padding: '10px 12px', color: r.failed_cases > 0 ? '#dc2626' : '#64748b', fontWeight: 600 }}>{r.failed_cases}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: '#4f46e5' }}>
                      {r.composite_score != null ? `${r.composite_score}%` : 'N/A'}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#64748b' }}>
                      {r.duration_seconds ? `${r.duration_seconds}s` : 'N/A'}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                      <button
                        onClick={() => onDownloadReport(r.run_id, 'json')}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 10px',
                          fontSize: '12px',
                          fontWeight: 600,
                          backgroundColor: '#f8fafc',
                          border: '1px solid #cbd5e1',
                          color: '#334155',
                          borderRadius: '6px',
                          cursor: 'pointer',
                        }}
                      >
                        <Download size={12} /> JSON
                      </button>
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
