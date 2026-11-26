import React from 'react';
import { VoiceMetricsData } from '../../types/evaluation';
import { MetricCard } from './MetricCard';
import { Mic, Volume2, Clock, CheckCircle2 } from 'lucide-react';

interface VoiceProps {
  data: VoiceMetricsData | null;
  loading: boolean;
}

export const VoiceMetrics: React.FC<VoiceProps> = ({ data, loading }) => {
  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#0284c7' }}>Loading voice evaluation metrics...</div>;
  }

  const isNoData = !data || data.status === 'no_data';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ fontSize: '13.5px', color: '#475569', lineHeight: '1.6' }}>
        MediVoice AI's dual-engine voice pipeline uses Faster-Whisper for Speech-to-Text (STT) and Microsoft Edge-TTS neural speech for Text-to-Speech (TTS).
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <MetricCard
          title="STT Accuracy"
          value={data ? `${data.stt.accuracy_percentage}%` : null}
          subtitle="Word Error Rate (WER) inverse"
          icon={Mic}
          color="emerald"
        />
        <MetricCard
          title="Word Error Rate (WER)"
          value={data ? (data.stt.word_error_rate * 100).toFixed(1) : null}
          suffix="%"
          subtitle="Clinical transcription error rate"
          icon={Mic}
          color="blue"
        />
        <MetricCard
          title="Character Error Rate (CER)"
          value={data ? (data.stt.character_error_rate * 100).toFixed(1) : null}
          suffix="%"
          subtitle="Phonetic character accuracy"
          icon={Mic}
          color="indigo"
        />
        <MetricCard
          title="TTS Synthesis Latency"
          value={data ? data.tts.synthesis_latency_ms : null}
          suffix=" ms"
          subtitle="Neural MP3 audio generation duration"
          icon={Volume2}
          color="amber"
        />
        <MetricCard
          title="Audio Success Rate"
          value={data ? `${data.tts.success_rate}%` : null}
          subtitle="Valid audio byte streams served"
          icon={CheckCircle2}
          color="emerald"
        />
      </div>

      {/* Engine Details */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
        <div style={{ fontWeight: 700, fontSize: '15px', color: '#0f172a', marginBottom: '8px' }}>
          Voice Pipeline Architectural Specifications
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginTop: '12px' }}>
          <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>Speech-to-Text (STT)</div>
            <div style={{ fontSize: '13px', color: '#475569' }}>Engine: Faster-Whisper (CPU int8 / tiny) + Web Speech fallback</div>
            <div style={{ fontSize: '13px', color: '#475569', marginTop: '4px' }}>Languages: English (en-US), Telugu (te-IN)</div>
          </div>
          <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>Text-to-Speech (TTS)</div>
            <div style={{ fontSize: '13px', color: '#475569' }}>Voices: en-US-JennyNeural (EN) & te-IN-ShrutiNeural (TE)</div>
            <div style={{ fontSize: '13px', color: '#475569', marginTop: '4px' }}>Audio Format: MPEG-3 (44.1 kHz, 48 kbps)</div>
          </div>
        </div>
      </div>
    </div>
  );
};
