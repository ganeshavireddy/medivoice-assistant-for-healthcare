/**
 * MediVoice AI - Microphone Control Button
 *
 * Large, accessible circular microphone controller featuring state-driven
 * animations, hover glows, and distinct visual feedback per voice state.
 */

import React from 'react';
import {
  Mic,
  Square,
  Loader2,
  Volume2,
  Sparkles,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
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
  const isPermRequest = state === 'REQUESTING_PERMISSION';

  // State-specific button styling and animations
  const getButtonStyles = () => {
    if (isRecording) {
      return 'bg-gradient-to-tr from-rose-600 to-red-500 text-white shadow-[0_0_35px_rgba(239,68,68,0.6)] ring-4 ring-rose-400/40 animate-pulse scale-105';
    }
    if (isProcessing) {
      return 'bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-[0_0_30px_rgba(99,102,241,0.5)] ring-4 ring-indigo-400/30';
    }
    if (isSpeaking) {
      return 'bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-[0_0_30px_rgba(16,185,129,0.5)] ring-4 ring-emerald-400/30';
    }
    if (isPermRequest) {
      return 'bg-gradient-to-tr from-amber-600 to-yellow-500 text-white shadow-[0_0_25px_rgba(245,158,11,0.5)] ring-4 ring-amber-400/30';
    }
    if (isError) {
      return 'bg-gradient-to-tr from-rose-700 to-red-600 text-white shadow-[0_0_20px_rgba(225,29,72,0.4)] ring-4 ring-rose-500/20';
    }
    // IDLE
    return 'bg-gradient-to-tr from-blue-600 via-indigo-600 to-teal-500 text-white shadow-[0_0_30px_rgba(59,130,246,0.4)] hover:shadow-[0_0_40px_rgba(59,130,246,0.7)] hover:scale-105 active:scale-95 ring-4 ring-blue-500/20';
  };

  const getButtonIcon = () => {
    if (isRecording) {
      return <Square className="w-8 h-8 fill-current text-white animate-pulse" />;
    }
    if (isProcessing || isPermRequest) {
      return <Loader2 className="w-9 h-9 animate-spin text-white" />;
    }
    if (isSpeaking) {
      return <Volume2 className="w-9 h-9 animate-bounce text-white" />;
    }
    if (isError) {
      return <RefreshCw className="w-8 h-8 text-white" />;
    }
    return <Mic className="w-9 h-9 text-white transition-transform group-hover:scale-110" />;
  };

  const getLabel = () => {
    if (isRecording) {
      return language === 'te' ? 'ఆపండి (పూర్తయింది)' : 'Stop Recording';
    }
    if (state === 'REQUESTING_PERMISSION') {
      return language === 'te' ? 'అనుమతి అడుగుతోంది...' : 'Allow Microphone...';
    }
    if (state === 'TRANSCRIBING') {
      return language === 'te' ? 'టెక్స్ట్‌గా మారుస్తోంది...' : 'Transcribing Speech...';
    }
    if (state === 'PROCESSING') {
      return language === 'te' ? 'ఆలోచిస్తోంది...' : 'Consulting Doctor Agent...';
    }
    if (state === 'SPEAKING') {
      return language === 'te' ? 'చదువుతోంది...' : 'Speaking Response...';
    }
    if (isError) {
      return language === 'te' ? 'మళ్లీ ప్రయత్నించండి' : 'Retry Speaking';
    }
    return language === 'te' ? 'మాట్లాడటానికి నొక్కండి' : 'Tap to Speak';
  };

  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <div className="relative group">
        {/* Pulsing Ripple Rings for Recording */}
        {isRecording && (
          <>
            <span className="absolute -inset-2 rounded-full bg-rose-500/30 animate-ping opacity-75 duration-1000" />
            <span className="absolute -inset-4 rounded-full bg-rose-400/20 animate-pulse duration-1500" />
          </>
        )}

        <button
          type="button"
          onClick={onClick}
          disabled={disabled || isProcessing}
          aria-label={getLabel()}
          className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-offset-slate-900 cursor-pointer ${getButtonStyles()} ${
            disabled || isProcessing ? 'opacity-80 cursor-wait' : ''
          }`}
        >
          {getButtonIcon()}
        </button>
      </div>

      <span className="text-xs font-semibold text-slate-300 tracking-wide mt-1">
        {getLabel()}
      </span>
    </div>
  );
};
