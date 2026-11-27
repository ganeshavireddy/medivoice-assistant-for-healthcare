/**
 * MediVoice AI - Master Voice Assistant Component
 *
 * Full, production-ready bilingual voice interface combining state-driven
 * microphone controls, live audio frequency visualization, structured
 * clinical conversation messages, and text-based fallback.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  Send,
  Trash2,
  Volume2,
  VolumeX,
  Stethoscope,
  Sparkles,
  ShieldAlert,
  Calendar,
  Heart,
  Activity,
  AlertCircle,
} from 'lucide-react';
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
    errorMessage,
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
  } = useVoiceAssistant({
    initialLanguage,
    userId,
    onAppointmentBooked,
  });

  // Auto-scroll to bottom on new messages
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
    if (actionLang && actionLang !== language) {
      setLanguage(actionLang);
    }
    sendTextMessage(promptText);
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col h-[calc(100vh-140px)] min-h-[640px] bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
      {/* 1. Header Bar */}
      <header className="px-6 py-4 bg-slate-900/90 border-b border-slate-800/80 flex items-center justify-between gap-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              MediVoice AI
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                Voice Assistant
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              {language === 'te'
                ? 'క్లినికల్ ట్రయేజ్ మరియు అపాయింట్‌మెంట్ అసిస్టెంట్'
                : 'Bilingual Clinical Triage & Smart Scheduling'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Language Switcher */}
          <LanguageSelector
            language={language}
            onChange={setLanguage}
            disabled={state === 'RECORDING'}
          />

          {/* Auto-TTS Toggle */}
          <button
            type="button"
            onClick={() => setAutoSpeak(!autoSpeak)}
            title={autoSpeak ? 'Auto-speak responses is enabled' : 'Auto-speak is disabled'}
            className={`p-2 rounded-xl border transition ${
              autoSpeak
                ? 'bg-blue-600/20 border-blue-500/30 text-blue-400 hover:bg-blue-600/30'
                : 'bg-slate-800/80 border-slate-700 text-slate-500 hover:bg-slate-800'
            }`}
          >
            {autoSpeak ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Clear Session */}
          <button
            type="button"
            onClick={clearConversation}
            title={language === 'te' ? 'సంభాషణను తొలగించండి' : 'Clear conversation'}
            className="p-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 hover:border-rose-800/50 transition cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. Scrollable Messages Area */}
      <main className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
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

      {/* 3. Live Frequency Visualizer (Shown while recording) */}
      {(state === 'RECORDING' || state === 'LISTENING') && (
        <div className="px-6 pb-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <AudioVisualizer
            frequencyData={frequencyData}
            durationSeconds={durationSeconds}
            volumeLevel={volumeLevel}
            language={language}
          />
        </div>
      )}

      {/* 4. Controls & Input Section */}
      <footer className="p-4 bg-slate-900/95 border-t border-slate-800/80 flex flex-col gap-3">
        {/* Status / Error Banner */}
        <div className="flex items-center justify-between text-xs px-2">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                state === 'RECORDING'
                  ? 'bg-rose-500 animate-ping'
                  : state === 'PROCESSING' || state === 'TRANSCRIBING'
                  ? 'bg-amber-400 animate-pulse'
                  : state === 'SPEAKING'
                  ? 'bg-emerald-400'
                  : 'bg-blue-400'
              }`}
            />
            <span
              className={`font-medium ${
                state === 'ERROR'
                  ? 'text-rose-400'
                  : state === 'RECORDING'
                  ? 'text-rose-300 font-bold'
                  : 'text-slate-400'
              }`}
            >
              {statusMessage}
            </span>
          </div>

          <span className="text-[11px] text-slate-500">
            {language === 'te' ? 'మైక్రోఫోన్ లేదా టైప్ చేయండి' : 'Microphone or Text Mode'}
          </span>
        </div>

        {/* Quick Action Suggestion Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs scrollbar-none">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
            {language === 'te' ? 'త్వరిత చర్యలు:' : 'Quick Actions:'}
          </span>
          <button
            type="button"
            onClick={() => handleQuickAction('Schedule appointment for general checkup tomorrow at 10 AM', 'en')}
            className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 whitespace-nowrap transition cursor-pointer"
          >
            📅 Book Checkup
          </button>
          <button
            type="button"
            onClick={() => handleQuickAction('I want to consult Dr. Sarah Smith in Cardiology', 'en')}
            className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 whitespace-nowrap transition cursor-pointer"
          >
            ❤️ Cardiology (Dr. Sarah)
          </button>
          <button
            type="button"
            onClick={() => handleQuickAction('నాకు తీవ్రమైన ఛాతీ నొప్పి మరియు చెమటలు పడుతున్నాయి', 'te')}
            className="px-2.5 py-1 rounded-lg bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-800/40 whitespace-nowrap transition cursor-pointer"
          >
            🚨 తెలుగు: ఛాతీ నొప్పి (Emergency)
          </button>
          <button
            type="button"
            onClick={() => handleQuickAction('డాక్టర్ ప్రియా పటేల్‌తో అపాయింట్‌మెంట్ బుక్ చేయండి', 'te')}
            className="px-2.5 py-1 rounded-lg bg-teal-950/40 hover:bg-teal-900/50 text-teal-300 border border-teal-800/40 whitespace-nowrap transition cursor-pointer"
          >
            🗣️ తెలుగు: అపాయింట్‌మెంట్ బుక్
          </button>
        </div>

        {/* Dual Input Area: Central Mic + Fallback Text Bar */}
        <div className="flex items-center gap-3">
          {/* Circular Microphone Controller */}
          <div className="flex-shrink-0">
            <MicrophoneButton
              state={state}
              onClick={handleMicClick}
              language={language}
              disabled={state === 'PROCESSING' || state === 'TRANSCRIBING'}
            />
          </div>

          {/* Fallback Text Input Bar */}
          <form onSubmit={handleTextSubmit} className="flex-1 flex items-center gap-2">
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
              className="flex-1 px-4 py-3 bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none transition shadow-inner"
            />
            <button
              type="submit"
              disabled={!textInput.trim() || state === 'PROCESSING' || state === 'RECORDING'}
              className="px-4 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-2xl transition shadow-md shadow-blue-600/30 flex items-center justify-center cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </footer>
    </div>
  );
};
