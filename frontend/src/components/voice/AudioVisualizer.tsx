/**
 * MediVoice AI - Audio Visualizer Component (Inline Styles)
 */

import React from 'react';
import { Mic } from 'lucide-react';

interface AudioVisualizerProps {
  frequencyData: number[];
  durationSeconds: number;
  volumeLevel: number;
  language: 'en' | 'te';
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  frequencyData,
  durationSeconds,
  volumeLevel,
  language,
}) => {
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  const hasVoice = volumeLevel > 0.08;

  return (
    <div
      style={{
        width: '100%',
        background: 'rgba(15,23,42,0.95)',
        border: '1px solid #1e293b',
        borderRadius: '14px',
        padding: '12px 16px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
      }}
    >
      {/* Top row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: hasVoice ? '#10b981' : '#ef4444',
              display: 'inline-block',
              boxShadow: `0 0 8px ${hasVoice ? '#10b981' : '#ef4444'}`,
            }}
          />
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#e2e8f0', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Mic size={12} style={{ color: '#f87171' }} />
            {language === 'te' ? 'మైక్రోఫోన్ ఆక్టివ్' : 'Live Voice Capture'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontSize: '11px',
              padding: '2px 10px',
              borderRadius: '20px',
              fontWeight: 600,
              background: hasVoice ? 'rgba(16,185,129,0.15)' : 'rgba(30,41,59,0.8)',
              color: hasVoice ? '#6ee7b7' : '#94a3b8',
              border: `1px solid ${hasVoice ? 'rgba(16,185,129,0.3)' : '#334155'}`,
            }}
          >
            {hasVoice
              ? language === 'te' ? 'స్వరం గుర్తించబడింది' : '● Voice Detected'
              : language === 'te' ? 'మాట్లాడండి...' : 'Listening...'}
          </span>
          <span
            style={{
              fontSize: '12px',
              fontFamily: 'monospace',
              fontWeight: 700,
              color: '#f87171',
              background: 'rgba(69,10,10,0.5)',
              border: '1px solid rgba(185,28,28,0.4)',
              padding: '2px 8px',
              borderRadius: '6px',
            }}
          >
            ⏺ {formatTime(durationSeconds)}
          </span>
        </div>
      </div>

      {/* Frequency bars */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          gap: '5px',
          height: '52px',
          padding: '6px 12px',
          background: 'rgba(2,6,23,0.6)',
          borderRadius: '10px',
          border: '1px solid #1e293b',
        }}
      >
        {frequencyData.map((val, idx) => {
          const heightPct = Math.max(10, Math.min(100, Math.round(val * 100)));
          const isHigh = heightPct > 55;
          return (
            <div
              key={idx}
              style={{
                flex: 1,
                maxWidth: '14px',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: `${heightPct}%`,
                  borderRadius: '4px',
                  transition: 'height 0.07s ease-out',
                  background: isHigh
                    ? 'linear-gradient(to top, #10b981, #2dd4bf, #67e8f9)'
                    : 'linear-gradient(to top, #2563eb, #818cf8)',
                  boxShadow: isHigh ? '0 0 10px rgba(45,212,191,0.5)' : 'none',
                }}
              />
            </div>
          );
        })}
      </div>

      <p style={{ margin: '8px 0 0', textAlign: 'center', fontSize: '11px', color: '#64748b' }}>
        {language === 'te'
          ? 'స్పష్టంగా మాట్లాడండి. ఆపడానికి రెడ్ బటన్ నొక్కండి.'
          : 'Speak naturally into your mic. Press Stop when done.'}
      </p>
    </div>
  );
};
