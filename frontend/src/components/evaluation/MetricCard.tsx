import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: number | string | null | undefined;
  suffix?: string;
  subtitle?: string;
  icon: LucideIcon;
  color?: 'blue' | 'indigo' | 'emerald' | 'rose' | 'amber';
  tooltip?: string;
  badge?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  suffix = '',
  subtitle,
  icon: Icon,
  color = 'indigo',
  badge,
}) => {
  const colorMap = {
    blue: { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8', icon: '#2563eb' },
    indigo: { bg: '#eef2ff', border: '#c7d2fe', text: '#4338ca', icon: '#4f46e5' },
    emerald: { bg: '#ecfdf5', border: '#a7f3d0', text: '#047857', icon: '#059669' },
    rose: { bg: '#fff1f2', border: '#fecdd3', text: '#be123c', icon: '#e11d48' },
    amber: { bg: '#fffbeb', border: '#fde68a', text: '#b45309', icon: '#d97706' },
  };

  const scheme = colorMap[color] || colorMap.indigo;
  const isNoData = value === null || value === undefined || value === '';

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        position: 'relative',
        transition: 'all 0.2s ease',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {title}
        </div>
        <div
          style={{
            backgroundColor: scheme.bg,
            border: `1px solid ${scheme.border}`,
            borderRadius: '10px',
            padding: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={18} color={scheme.icon} />
        </div>
      </div>

      <div>
        {isNoData ? (
          <div style={{ fontSize: '14px', fontWeight: 500, color: '#94a3b8', fontStyle: 'italic', margin: '6px 0' }}>
            Not enough evaluation data
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a' }}>
              {value}
            </span>
            {suffix && (
              <span style={{ fontSize: '16px', fontWeight: 600, color: '#64748b' }}>
                {suffix}
              </span>
            )}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
          {subtitle && (
            <div style={{ fontSize: '12px', color: '#64748b', lineHeight: '1.4' }}>
              {subtitle}
            </div>
          )}
          {badge && (
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: '6px',
                backgroundColor: scheme.bg,
                color: scheme.text,
              }}
            >
              {badge}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
