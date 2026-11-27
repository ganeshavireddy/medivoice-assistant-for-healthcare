/**
 * MediVoice AI - Master Voice Assistant Component (Inline Styles — No Tailwind)
 */

import React, { useState, useRef, useEffect } from 'react';
import { Mic, Send, Trash2, Volume2, VolumeX, Stethoscope } from 'lucide-react';
import { SupportedLanguage } from '../../types/voice';
import { useVoiceAssistant } from '../../hooks/useVoiceAssistant';
import { MicrophoneButton } from './MicrophoneButton';
import { AudioVisualizer } from './AudioVisualizer';
import { LanguageSelector } from './LanguageSelector';
import { ConversationMessages } from './ConversationMessages';

interface VoiceAssistantProps {
  initialLanguage?: SupportedLanguage;
  userId?: number;
  onAppointmentBooked?: (appointment: any) => void;
}

export const VoiceAssistant: React.FC<VoiceAssistantProps> = ({
  initialLanguage = 'en',
  userId = 1,
  onAppointmentBooked,
}) => {
  const [textInput, setTextInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    state,
    language,
    messages,
    statusMessage,
    autoSpeak,
    frequencyData,
    durationSeconds,
    volumeLevel,
    isSpeaking,
    currentSpeakingId,
    setLanguage,
    setAutoSpeak,
    startRecordingSession,
    stopRecordingSession,
    sendTextMessage,
    speakMessage,
    stopSpeaking,
    clearConversation,
  } = useVoiceAssistant({ initialLanguage, userId, onAppointmentBooked });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, state]);

  const handleMicClick = () => {
    if (state === 'RECORDING' || state === 'LISTENING') {
      stopRecordingSession();
    } else {
      startRecordingSession();
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() || state === 'PROCESSING' || state === 'TRANSCRIBING') return;
    sendTextMessage(textInput.trim());
    setTextInput('');
  };

  const handleQuickAction = (promptText: string, actionLang?: SupportedLanguage) => {
    if (actionLang && actionLang !== language) setLanguage(actionLang);
    sendTextMessage(promptText);
  };

  // Status dot color
  const dotColor =
    state === 'RECORDING'
      ? '#ef4444'
      : state === 'PROCESSING' || state === 'TRANSCRIBING'
      ? '#f59e0b'
      : state === 'SPEAKING'
      ? '#10b981'
      : '#3b82f6';

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '960px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 140px)',
        minHeight: '640px',
        background: '#0f172a',
        border: '1px solid #1e293b',
        borderRadius: '20px',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
        overflow: 'hidden',
        fontFamily: 'inherit',
      }}
    >
      {/* ── Header ── */}
      <header
        style={{
          padding: '14px 24px',
          background: '#1e293b',
          borderBottom: '1px solid #334155',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #2563eb, #0d9488)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 4px 14px rgba(37,99,235,0.3)',
              flexShrink: 0,
            }}
          >
            <Stethoscope size={20} />
          </div>
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: '15px',
                fontWeight: 700,
                color: '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              MediVoice AI
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '20px',
                  background: 'rgba(13,148,136,0.2)',
                  color: '#5eead4',
                  border: '1px solid rgba(13,148,136,0.3)',
                }}
              >
                Voice Assistant
              </span>
            </h2>
            <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>
              {language === 'te'
                ? 'క్లినికల్ ట్రయేజ్ మరియు అపాయింట్‌మెంట్ అసిస్టెంట్'
                : 'Bilingual Clinical Triage & Smart Scheduling'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <LanguageSelector language={language} onChange={setLanguage} disabled={state === 'RECORDING'} />

          <button
            type="button"
            onClick={() => setAutoSpeak(!autoSpeak)}
            title={autoSpeak ? 'Auto-speak ON' : 'Auto-speak OFF'}
            style={{
              padding: '8px',
              borderRadius: '10px',
              border: `1px solid ${autoSpeak ? 'rgba(59,130,246,0.4)' : '#334155'}`,
              background: autoSpeak ? 'rgba(59,130,246,0.15)' : 'rgba(30,41,59,0.8)',
              color: autoSpeak ? '#93c5fd' : '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
            }}
          >
            {autoSpeak ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>

          <button
            type="button"
            onClick={clearConversation}
            title={language === 'te' ? 'సంభాషణను తొలగించండి' : 'Clear conversation'}
            style={{
              padding: '8px',
              borderRadius: '10px',
              border: '1px solid #334155',
              background: 'rgba(30,41,59,0.8)',
              color: '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
            }}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </header>

      {/* ── Messages ── */}
      <main
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <ConversationMessages
          messages={messages}
          language={language}
          isSpeaking={isSpeaking}
          currentSpeakingId={currentSpeakingId}
          onSpeak={speakMessage}
          onStopSpeaking={stopSpeaking}
        />
        <div ref={messagesEndRef} />
      </main>

      {/* ── Live Visualizer (recording only) ── */}
      {(state === 'RECORDING' || state === 'LISTENING') && (
        <div style={{ padding: '0 24px 8px', flexShrink: 0 }}>
          <AudioVisualizer
            frequencyData={frequencyData}
            durationSeconds={durationSeconds}
            volumeLevel={volumeLevel}
            language={language}
          />
        </div>
      )}

      {/* ── Footer Controls ── */}
      <footer
        style={{
          padding: '12px 24px 16px',
          background: '#1e293b',
          borderTop: '1px solid #334155',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          flexShrink: 0,
        }}
      >
        {/* Status bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '12px',
            padding: '0 4px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: dotColor,
                display: 'inline-block',
                animation: state === 'RECORDING' ? 'ping 1s infinite' : state === 'PROCESSING' ? 'pulse 1.5s infinite' : 'none',
              }}
            />
            <span
              style={{
                fontWeight: 600,
                color:
                  state === 'ERROR'
                    ? '#f87171'
                    : state === 'RECORDING'
                    ? '#fca5a5'
                    : '#94a3b8',
              }}
            >
              {statusMessage}
            </span>
          </div>
          <span style={{ fontSize: '11px', color: '#475569' }}>
            {language === 'te' ? 'మైక్రోఫోన్ లేదా టైప్ చేయండి' : 'Microphone or Text Mode'}
          </span>
        </div>

        {/* Quick action chips */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            overflowX: 'auto',
            paddingBottom: '2px',
          }}
        >
          <span
            style={{
              fontSize: '10px',
              fontWeight: 700,
              color: '#475569',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              whiteSpace: 'nowrap',
            }}
          >
            {language === 'te' ? 'త్వరిత చర్యలు:' : 'Quick Actions:'}
          </span>
          {[
            {
              label: '📅 Book Checkup',
              prompt: 'Schedule appointment for general checkup tomorrow at 10 AM',
              lang: 'en' as SupportedLanguage,
              style: { background: 'rgba(30,41,59,0.9)', color: '#cbd5e1', border: '1px solid #334155' },
            },
            {
              label: '❤️ Cardiology (Dr. Sarah)',
              prompt: 'I want to consult Dr. Sarah Smith in Cardiology',
              lang: 'en' as SupportedLanguage,
              style: { background: 'rgba(30,41,59,0.9)', color: '#cbd5e1', border: '1px solid #334155' },
            },
            {
              label: '🚨 తెలుగు: ఛాతీ నొప్పి (Emergency)',
              prompt: 'నాకు తీవ్రమైన ఛాతీ నొప్పి మరియు చెమటలు పడుతున్నాయి',
              lang: 'te' as SupportedLanguage,
              style: { background: 'rgba(69,10,10,0.5)', color: '#fca5a5', border: '1px solid rgba(185,28,28,0.4)' },
            },
            {
              label: '🗣️ తెలుగు: అపాయింట్‌మెంట్',
              prompt: 'డాక్టర్ ప్రియా పటేల్‌తో అపాయింట్‌మెంట్ బుక్ చేయండి',
              lang: 'te' as SupportedLanguage,
              style: { background: 'rgba(4,47,46,0.5)', color: '#99f6e4', border: '1px solid rgba(13,148,136,0.4)' },
            },
          ].map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={() => handleQuickAction(chip.prompt, chip.lang)}
              style={{
                ...chip.style,
                padding: '4px 10px',
                borderRadius: '8px',
                fontSize: '11px',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                transition: 'all 0.15s',
                fontFamily: 'inherit',
              }}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Input row: mic + text */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ flexShrink: 0 }}>
            <MicrophoneButton
              state={state}
              onClick={handleMicClick}
              language={language}
              disabled={state === 'PROCESSING' || state === 'TRANSCRIBING'}
            />
          </div>

          <form
            onSubmit={handleTextSubmit}
            style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              disabled={state === 'RECORDING' || state === 'PROCESSING'}
              placeholder={
                language === 'te'
                  ? 'లక్షణాలు నమోదు చేయండి లేదా డాక్టర్‌ను వెతకండి...'
                  : 'Ask a medical question, describe symptoms, or book doctor...'
              }
              style={{
                flex: 1,
                padding: '11px 16px',
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '14px',
                color: '#f1f5f9',
                fontSize: '13px',
                fontFamily: 'inherit',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
            />
            <button
              type="submit"
              disabled={!textInput.trim() || state === 'PROCESSING' || state === 'RECORDING'}
              style={{
                padding: '11px 16px',
                background: '#2563eb',
                border: 'none',
                borderRadius: '14px',
                color: '#fff',
                cursor: textInput.trim() ? 'pointer' : 'not-allowed',
                opacity: !textInput.trim() || state === 'PROCESSING' || state === 'RECORDING' ? 0.4 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
                boxShadow: '0 4px 14px rgba(37,99,235,0.3)',
              }}
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </footer>
    </div>
  );
};
