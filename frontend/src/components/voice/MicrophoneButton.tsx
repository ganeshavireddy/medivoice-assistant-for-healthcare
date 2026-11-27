/**
 * MediVoice AI - Microphone Control Button (Inline Styles)
 */

import React from 'react';
import { Mic, Square, Loader2, Volume2, AlertCircle, RefreshCw } from 'lucide-react';
import { VoiceState } from '../../types/voice';

interface MicrophoneButtonProps {
  state: VoiceState;
  onClick: () => void;
  language: 'en' | 'te';
  disabled?: boolean;
}

export const MicrophoneButton: React.FC<MicrophoneButtonProps> = ({
  state,
  onClick,
  language,
  disabled = false,
}) => {
  const isRecording = state === 'RECORDING' || state === 'LISTENING';
  const isProcessing = state === 'TRANSCRIBING' || state === 'PROCESSING';
  const isSpeaking = state === 'SPEAKING';
  const isError = state === 'ERROR';

  const getBg = () => {
    if (isRecording) return 'linear-gradient(135deg, #dc2626, #ef4444)';
    if (isProcessing) return 'linear-gradient(135deg, #4f46e5, #7c3aed)';
    if (isSpeaking) return 'linear-gradient(135deg, #059669, #0d9488)';
    if (isError) return 'linear-gradient(135deg, #be123c, #dc2626)';
    return 'linear-gradient(135deg, #2563eb, #0d9488)';
  };

  const getGlow = () => {
    if (isRecording) return '0 0 30px rgba(239,68,68,0.6), 0 0 60px rgba(239,68,68,0.2)';
    if (isProcessing) return '0 0 25px rgba(99,102,241,0.5)';
    if (isSpeaking) return '0 0 25px rgba(16,185,129,0.5)';
    if (isError) return '0 0 20px rgba(220,38,38,0.4)';
    return '0 0 25px rgba(37,99,235,0.4)';
  };

  const getIcon = () => {
    if (isRecording) return <Square size={30} style={{ fill: '#fff', color: '#fff' }} />;
    if (isProcessing) return <Loader2 size={30} style={{ color: '#fff', animation: 'spin 1s linear infinite' }} />;
    if (isSpeaking) return <Volume2 size={30} style={{ color: '#fff' }} />;
    if (isError) return <RefreshCw size={28} style={{ color: '#fff' }} />;
    return <Mic size={30} style={{ color: '#fff' }} />;
  };

  const getLabel = () => {
    if (isRecording) return language === 'te' ? 'ఆపండి' : 'Stop Recording';
    if (state === 'REQUESTING_PERMISSION') return language === 'te' ? 'అనుమతి...' : 'Allow Mic...';
    if (state === 'TRANSCRIBING') return language === 'te' ? 'మారుస్తోంది...' : 'Transcribing...';
    if (state === 'PROCESSING') return language === 'te' ? 'ఆలోచిస్తోంది...' : 'Processing...';
    if (state === 'SPEAKING') return language === 'te' ? 'చదువుతోంది...' : 'Speaking...';
    if (isError) return language === 'te' ? 'మళ్లీ ప్రయత్నించండి' : 'Retry';
    return language === 'te' ? 'మాట్లాడటానికి నొక్కండి' : 'Tap to Speak';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
      <div style={{ position: 'relative' }}>
        {/* Ripple rings when recording */}
        {isRecording && (
          <>
            <span
              style={{
                position: 'absolute',
                inset: '-10px',
                borderRadius: '50%',
                background: 'rgba(239,68,68,0.25)',
                animation: 'ping 1.2s ease-out infinite',
                pointerEvents: 'none',
              }}
            />
            <span
              style={{
                position: 'absolute',
                inset: '-18px',
                borderRadius: '50%',
                background: 'rgba(239,68,68,0.12)',
                animation: 'ping 1.6s ease-out infinite 0.3s',
                pointerEvents: 'none',
              }}
            />
          </>
        )}

        <button
          type="button"
          onClick={onClick}
          disabled={disabled || isProcessing}
          aria-label={getLabel()}
          style={{
            position: 'relative',
            zIndex: 1,
            width: 72,
            height: 72,
            borderRadius: '50%',
            border: 'none',
            background: getBg(),
            boxShadow: getGlow(),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: disabled || isProcessing ? 'wait' : 'pointer',
            opacity: disabled && !isProcessing ? 0.7 : 1,
            transition: 'all 0.25s ease',
            outline: 'none',
            transform: isRecording ? 'scale(1.08)' : 'scale(1)',
          }}
        >
          {getIcon()}
        </button>
      </div>

      <span
        style={{
          fontSize: '11px',
          fontWeight: 600,
          color: isRecording ? '#fca5a5' : '#94a3b8',
          letterSpacing: '0.03em',
          textAlign: 'center',
        }}
      >
        {getLabel()}
      </span>

      <style>{`
        @keyframes ping {
          0% { transform: scale(1); opacity: 0.7; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
