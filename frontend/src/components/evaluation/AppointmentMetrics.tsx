import React from 'react';
import { AppointmentMetricsData } from '../../types/evaluation';
import { MetricCard } from './MetricCard';
import { Calendar, Stethoscope, CheckCircle2, ShieldCheck } from 'lucide-react';

interface ApptProps {
  data: AppointmentMetricsData | null;
  loading: boolean;
}

export const AppointmentMetrics: React.FC<ApptProps> = ({ data, loading }) => {
  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#0284c7' }}>Loading appointment workflow metrics...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ fontSize: '13.5px', color: '#475569', lineHeight: '1.6' }}>
        Appointment scheduling evaluation runs in a strictly isolated sandbox. Real patient appointments, clinical schedules, and hospital records are never created, modified, or deleted during evaluation.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <MetricCard
          title="Doctor Search Success"
          value={data ? `${data.doctor_search_success_rate}%` : null}
          subtitle="Specialty & department lookup"
          icon={Stethoscope}
          color="blue"
        />
        <MetricCard
          title="Workflow Completion"
          value={data ? `${data.workflow_completion_rate}%` : null}
          subtitle="Simulated booking flow completion"
          icon={Calendar}
          color="emerald"
        />
        <MetricCard
          title="Validation Rejection Rate"
          value={data ? `${data.invalid_booking_rejection_rate}%` : null}
          subtitle="Past timestamp rejection compliance"
          icon={ShieldCheck}
          color="indigo"
        />
        <MetricCard
          title="Workflow Latency"
          value={data ? `${data.avg_booking_latency_ms}` : null}
          suffix=" ms"
          subtitle="Database query and booking check duration"
          icon={CheckCircle2}
          color="amber"
        />
      </div>
    </div>
  );
};
