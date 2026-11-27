/**
 * MediVoice AI - Conversation Messages Component (Inline Styles)
 */

import React from 'react';
import {
  User,
  Bot,
  Volume2,
  Square,
  AlertTriangle,
  PhoneCall,
  Calendar,
  CheckCircle2,
  Stethoscope,
  BookOpen,
} from 'lucide-react';
import { VoiceMessage, SupportedLanguage } from '../../types/voice';

interface ConversationMessagesProps {
  messages: VoiceMessage[];
  language: SupportedLanguage;
  isSpeaking: boolean;
  currentSpeakingId: string | null;
  onSpeak: (messageId: string, text: string, lang?: SupportedLanguage) => void;
  onStopSpeaking: () => void;
}

interface StructuredSection {
  type: 'symptoms' | 'explanations' | 'next_steps' | 'urgent' | 'followup' | 'general';
  title: string;
  content: string;
}

function parseSections(rawText: string): { sections: StructuredSection[]; rawClean: string } {
  const text = rawText || '';
  const sections: StructuredSection[] = [];

  if (/###\s*/.test(text)) {
    const rawChunks = text.split(/(?=###)/).map((s) => s.trim()).filter(Boolean);
    for (const chunk of rawChunks) {
      const cleanChunk = chunk.replace(/^###\s*/, '').trim();
      if (/^1\.\s*(?:Understanding your symptoms|మీ లక్షణాల వివరణ|మీ లక్షణాలు)/i.test(cleanChunk)) {
        sections.push({ type: 'symptoms', title: '1. Understanding Symptoms', content: cleanChunk.replace(/^1\.\s*[^:]+[:\s]*/i, '').trim() });
      } else if (/^2\.\s*(?:Possible explanations|సాధ్యమయ్యే కారణాలు)/i.test(cleanChunk)) {
        sections.push({ type: 'explanations', title: '2. Possible Explanations', content: cleanChunk.replace(/^2\.\s*[^:]+[:\s]*/i, '').trim() });
      } else if (/^3\.\s*(?:Recommended next steps|సిఫార్సు)/i.test(cleanChunk)) {
        sections.push({ type: 'next_steps', title: '3. Recommended Next Steps', content: cleanChunk.replace(/^3\.\s*[^:]+[:\s]*/i, '').trim() });
      } else if (/^4\.\s*(?:When to seek urgent help|అత్యవసర)/i.test(cleanChunk)) {
        sections.push({ type: 'urgent', title: '4. When to Seek Urgent Help', content: cleanChunk.replace(/^4\.\s*[^:]+[:\s]*/i, '').trim() });
      } else if (/^5\.\s*(?:Follow-up|తదుపరి ప్రశ్న)/i.test(cleanChunk)) {
        sections.push({ type: 'followup', title: '5. Follow-up Question', content: cleanChunk.replace(/^5\.\s*[^:]+[:\s]*/i, '').trim() });
      } else {
        const lines = cleanChunk.split('\n');
        sections.push({ type: 'general', title: lines[0].trim(), content: lines.slice(1).join('\n').trim() });
      }
    }
  }

  return { sections, rawClean: text };
}

const sectionStyle = (type: StructuredSection['type']): React.CSSProperties => {
  const map: Record<string, { border: string; bg: string; titleColor: string }> = {
    symptoms:     { border: 'rgba(59,130,246,0.3)',   bg: 'rgba(23,37,84,0.3)',   titleColor: '#93c5fd' },
    explanations: { border: 'rgba(245,158,11,0.3)',   bg: 'rgba(69,26,3,0.3)',    titleColor: '#fcd34d' },
    next_steps:   { border: 'rgba(16,185,129,0.3)',   bg: 'rgba(2,44,34,0.3)',    titleColor: '#6ee7b7' },
    urgent:       { border: 'rgba(239,68,68,0.4)',    bg: 'rgba(69,10,10,0.3)',   titleColor: '#fca5a5' },
    followup:     { border: 'rgba(168,85,247,0.3)',   bg: 'rgba(46,16,101,0.3)',  titleColor: '#d8b4fe' },
    general:      { border: '#334155',                bg: 'rgba(30,41,59,0.4)',   titleColor: '#93c5fd' },
  };
  return { border: `1px solid ${map[type].border}`, background: map[type].bg, padding: '10px 12px', borderRadius: '10px', marginBottom: '8px', titleColor: map[type].titleColor } as any;
};

export const ConversationMessages: React.FC<ConversationMessagesProps> = ({
  messages,
  language,
  isSpeaking,
  currentSpeakingId,
  onSpeak,
  onStopSpeaking,
}) => {
  if (messages.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 20px',
          textAlign: 'center',
          flex: 1,
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '16px',
            background: 'rgba(37,99,235,0.1)',
            border: '1px solid rgba(37,99,235,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#3b82f6',
            marginBottom: '16px',
          }}
        >
          <Stethoscope size={30} />
        </div>
        <h3 style={{ margin: '0 0 8px', fontSize: '15px', fontWeight: 700, color: '#e2e8f0' }}>
          {language === 'te' ? 'వాయిస్ అసిస్టెంట్ సిద్ధంగా ఉంది' : 'MediVoice AI Voice Assistant is Ready'}
        </h3>
        <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', maxWidth: '380px', lineHeight: '1.6' }}>
          {language === 'te'
            ? 'మీ ఆరోగ్య సమస్యలు చెప్పండి లేదా డాక్టర్‌తో అపాయింట్‌మెంట్ బుక్ చేయడానికి మైక్రోఫోన్ నొక్కండి.'
            : 'Speak your health symptoms, inquire about diagnostic tests, or book an appointment with our hospital specialists.'}
        </p>
        <p style={{ margin: '12px 0 0', fontSize: '11px', color: '#475569' }}>
          {language === 'te' ? 'మైక్రోఫోన్ నొక్కడానికి లేదా టెక్స్ట్ ఇన్‌పుట్ ఉపయోగించండి' : 'Click microphone to speak your symptoms'}
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '8px 0' }}>
      {messages.map((msg) => {
        const isUser = msg.sender === 'user';
        const isThisSpeaking = isSpeaking && currentSpeakingId === msg.id;
        const { sections, rawClean } = parseSections(msg.text);

        const bubbleBg = isUser
          ? '#2563eb'
          : msg.isEmergency
          ? 'rgba(69,10,10,0.9)'
          : 'rgba(15,23,42,0.95)';

        const bubbleBorder = isUser
          ? 'none'
          : msg.isEmergency
          ? '2px solid #ef4444'
          : '1px solid #334155';

        const textColor = isUser ? '#fff' : '#e2e8f0';

        return (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              gap: '12px',
              maxWidth: '760px',
              alignSelf: isUser ? 'flex-end' : 'flex-start',
              flexDirection: isUser ? 'row-reverse' : 'row',
            }}
          >
            {/* Avatar */}
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '10px',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: isUser ? '#2563eb' : msg.isEmergency ? '#dc2626' : '#0d9488',
                color: '#fff',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              }}
            >
              {isUser ? <User size={18} /> : <Bot size={18} />}
            </div>

            {/* Bubble */}
            <div
              style={{
                background: bubbleBg,
                border: bubbleBorder,
                borderRadius: isUser ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                padding: '12px 16px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                color: textColor,
                maxWidth: '100%',
              }}
            >
              {/* Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  marginBottom: '8px',
                  paddingBottom: '6px',
                  borderBottom: '1px solid rgba(255,255,255,0.1)',
                  fontSize: '10px',
                  opacity: 0.85,
                }}
              >
                <span style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  {isUser
                    ? language === 'te' ? 'మీరు (రోగి)' : 'You (Patient)'
                    : language === 'te' ? 'మెడివాయిస్ AI డాక్టర్' : 'MediVoice Clinical AI'}
                </span>
                <span>{msg.timestamp}</span>
              </div>

              {/* Emergency Banner */}
              {msg.isEmergency && (
                <div
                  style={{
                    marginBottom: '10px',
                    padding: '10px 12px',
                    background: 'rgba(220,38,38,0.25)',
                    border: '1px solid rgba(239,68,68,0.5)',
                    borderRadius: '10px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      color: '#fca5a5',
                      fontWeight: 700,
                      fontSize: '11px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.07em',
                      marginBottom: '8px',
                    }}
                  >
                    <AlertTriangle size={14} style={{ color: '#f87171' }} />
                    {language === 'te'
                      ? 'అత్యవసర హెచ్చరిక! తక్షణమే సహాయం పొందండి'
                      : 'CRITICAL EMERGENCY DETECTED! ACT IMMEDIATELY'}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <a
                      href="tel:112"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '5px 12px',
                        background: '#dc2626',
                        color: '#fff',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: 700,
                        textDecoration: 'none',
                      }}
                    >
                      <PhoneCall size={12} /> Call 112 (National Emergency)
                    </a>
                    <a
                      href="tel:108"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '5px 12px',
                        background: '#d97706',
                        color: '#fff',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: 700,
                        textDecoration: 'none',
                      }}
                    >
                      <PhoneCall size={12} /> Call 108 (Ambulance)
                    </a>
                  </div>
                </div>
              )}

              {/* Message content */}
              {sections.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: '4px 0' }}>
                  {sections.map((sec, idx) => {
                    const ss = sectionStyle(sec.type) as any;
                    return (
                      <div
                        key={idx}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '10px',
                          border: ss.border,
                          background: ss.bg,
                        }}
                      >
                        <h4 style={{ margin: '0 0 4px', fontSize: '11px', fontWeight: 700, color: ss.titleColor }}>
                          {sec.title}
                        </h4>
                        <p style={{ margin: 0, fontSize: '12px', color: '#cbd5e1', lineHeight: '1.6', whiteSpace: 'pre-line' }}>
                          {sec.content}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.6', whiteSpace: 'pre-line' }}>
                  {rawClean}
                </p>
              )}

              {/* Booked Appointment Badge */}
              {msg.bookedAppointment && (
                <div
                  style={{
                    marginTop: '12px',
                    padding: '10px 12px',
                    background: 'rgba(2,44,34,0.5)',
                    border: '1px solid rgba(16,185,129,0.4)',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '8px',
                        background: 'rgba(16,185,129,0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#6ee7b7',
                      }}
                    >
                      <Calendar size={16} />
                    </div>
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontSize: '11px',
                          fontWeight: 700,
                          color: '#6ee7b7',
                        }}
                      >
                        <CheckCircle2 size={12} style={{ color: '#10b981' }} />
                        Appointment Scheduled
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '1px' }}>
                        {msg.bookedAppointment.doctor_name || 'Specialist'} •{' '}
                        {msg.bookedAppointment.appointment_time || 'Next Open Slot'}
                      </div>
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      padding: '3px 8px',
                      background: '#059669',
                      color: '#fff',
                      borderRadius: '6px',
                    }}
                  >
                    Confirmed
                  </span>
                </div>
              )}

              {/* Citations */}
              {msg.citations && msg.citations.length > 0 && (
                <div
                  style={{
                    marginTop: '10px',
                    paddingTop: '8px',
                    borderTop: '1px solid #1e293b',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    flexWrap: 'wrap',
                    fontSize: '10px',
                    color: '#64748b',
                  }}
                >
                  <BookOpen size={11} style={{ color: '#0d9488' }} />
                  <span style={{ fontWeight: 600, color: '#94a3b8' }}>Clinical Guidelines:</span>
                  {msg.citations.map((c, i) => (
                    <span
                      key={i}
                      style={{
                        padding: '1px 6px',
                        borderRadius: '4px',
                        background: '#1e293b',
                        color: '#5eead4',
                        fontFamily: 'monospace',
                      }}
                    >
                      {c.source || 'Medical Evidence'}
                    </span>
                  ))}
                </div>
              )}

              {/* Listen Aloud (AI messages only) */}
              {!isUser && (
                <div
                  style={{
                    marginTop: '10px',
                    paddingTop: '8px',
                    borderTop: '1px solid #1e293b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <button
                    type="button"
                    onClick={() =>
                      isThisSpeaking ? onStopSpeaking() : onSpeak(msg.id, msg.text, msg.language)
                    }
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      fontSize: '11px',
                      fontWeight: 600,
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      background: isThisSpeaking ? '#dc2626' : '#1e293b',
                      color: isThisSpeaking ? '#fff' : '#94a3b8',
                      fontFamily: 'inherit',
                    }}
                  >
                    {isThisSpeaking ? (
                      <>
                        <Square size={12} style={{ fill: '#fff' }} />
                        {language === 'te' ? 'ఆపండి' : 'Stop Speaking'}
                      </>
                    ) : (
                      <>
                        <Volume2 size={12} style={{ color: '#0d9488' }} />
                        {language === 'te' ? 'వాయిస్ వినండి' : 'Listen Aloud'}
                      </>
                    )}
                  </button>
                  <span style={{ fontSize: '10px', color: '#475569' }}>
                    {msg.language === 'te' ? 'తెలుగు వాయిస్' : 'English Voice'}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
