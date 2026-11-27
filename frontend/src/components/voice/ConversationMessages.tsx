/**
 * MediVoice AI - Conversation Messages Component
 *
 * Renders patient and AI messages with structured clinical sections,
 * emergency triage red-flag banners, direct audio playback controls,
 * and booked appointment confirmations.
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
        const body = cleanChunk.replace(/^1\.\s*(?:Understanding your symptoms|మీ లక్షణాల వివరణ|మీ లక్షణాలు)[:\s]*/i, '').trim();
        sections.push({ type: 'symptoms', title: '1. Understanding Symptoms', content: body });
      } else if (/^2\.\s*(?:Possible explanations|సాధ్యమయ్యే కారణాలు)/i.test(cleanChunk)) {
        const body = cleanChunk.replace(/^2\.\s*(?:Possible explanations|సాధ్యమయ్యే కారణాలు)[:\s]*/i, '').trim();
        sections.push({ type: 'explanations', title: '2. Possible Explanations', content: body });
      } else if (/^3\.\s*(?:Recommended next steps|సిఫార్సు చేయబడిన తదుపరి చర్యలు|సిఫార్సు చేయబడిన జాగ్రత్తలు)/i.test(cleanChunk)) {
        const body = cleanChunk.replace(/^3\.\s*(?:Recommended next steps|సిఫార్సు చేయబడిన తదుపరి చర్యలు|సిఫార్సు చేయబడిన జాగ్రత్తలు)[:\s]*/i, '').trim();
        sections.push({ type: 'next_steps', title: '3. Recommended Next Steps', content: body });
      } else if (/^4\.\s*(?:When to seek urgent help|అత్యవసర సహాయం ఎప్పుడు పొందాలి|అత్యవసర హెచ్చరికలు)/i.test(cleanChunk)) {
        const body = cleanChunk.replace(/^4\.\s*(?:When to seek urgent help|అత్యవసర సహాయం ఎప్పుడు పొందాలి|అత్యవసర హెచ్చరికలు)[:\s]*/i, '').trim();
        sections.push({ type: 'urgent', title: '4. When to Seek Urgent Help', content: body });
      } else if (/^5\.\s*(?:Follow-up question|తదుపరి ప్రశ్న)/i.test(cleanChunk)) {
        const body = cleanChunk.replace(/^5\.\s*(?:Follow-up question|తదుపరి ప్రశ్న)[:\s]*/i, '').trim();
        sections.push({ type: 'followup', title: '5. Follow-up Question', content: body });
      } else {
        const lines = cleanChunk.split('\n');
        const title = lines[0].trim();
        const body = lines.slice(1).join('\n').trim();
        sections.push({ type: 'general', title, content: body });
      }
    }
  }

  return { sections, rawClean: text };
}

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
      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4 shadow-inner">
          <Stethoscope className="w-8 h-8" />
        </div>
        <h3 className="text-base font-semibold text-slate-200 mb-1">
          {language === 'te' ? 'వాయిస్ అసిస్టెంట్ సిద్ధంగా ఉంది' : 'MediVoice AI Voice Assistant is Ready'}
        </h3>
        <p className="text-xs text-slate-400 max-w-md">
          {language === 'te'
            ? 'మీ ఆరోగ్య సమస్యలు, లక్షణాలు చెప్పండి లేదా డాక్టర్‌తో అపాయింట్‌మెంట్ బుక్ చేయడానికి మైక్రోఫోన్ నొక్కండి.'
            : 'Speak your health symptoms, inquire about diagnostic tests, or book an appointment with our hospital specialists.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 py-2">
      {messages.map((msg) => {
        const isUser = msg.sender === 'user';
        const isThisSpeaking = isSpeaking && currentSpeakingId === msg.id;
        const { sections, rawClean } = parseSections(msg.text);

        return (
          <div
            key={msg.id}
            className={`flex gap-3 max-w-3xl ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
          >
            {/* Avatar */}
            <div
              className={`w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center shadow-md ${
                isUser
                  ? 'bg-blue-600 text-white'
                  : msg.isEmergency
                  ? 'bg-rose-600 text-white animate-pulse'
                  : 'bg-teal-600 text-white'
              }`}
            >
              {isUser ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
            </div>

            {/* Bubble Container */}
            <div
              className={`rounded-2xl p-4 shadow-lg backdrop-blur-sm transition-all ${
                isUser
                  ? 'bg-blue-600 text-white rounded-tr-none'
                  : msg.isEmergency
                  ? 'bg-rose-950/80 border-2 border-rose-500 text-slate-100 rounded-tl-none'
                  : 'bg-slate-900/90 border border-slate-800 text-slate-200 rounded-tl-none'
              }`}
            >
              {/* Header with Timestamp */}
              <div className="flex items-center justify-between gap-3 mb-2 pb-1 border-b border-white/10 text-[11px] opacity-80">
                <span className="font-semibold uppercase tracking-wider">
                  {isUser
                    ? language === 'te'
                      ? 'మీరు (రోగి)'
                      : 'You (Patient)'
                    : language === 'te'
                    ? 'మెడివాయిస్ AI డాక్టర్'
                    : 'MediVoice Clinical AI'}
                </span>
                <span>{msg.timestamp}</span>
              </div>

              {/* Emergency Banner if flagged */}
              {msg.isEmergency && (
                <div className="mb-3 p-3 bg-rose-600/30 border border-rose-500/60 rounded-xl flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-rose-300 font-bold text-xs uppercase tracking-wider">
                    <AlertTriangle className="w-4 h-4 text-rose-400 animate-bounce" />
                    <span>
                      {language === 'te'
                        ? 'అత్యవసర హెచ్చరిక! తక్షణమే సహాయం పొందండి'
                        : 'CRITICAL EMERGENCY DETECTED! ACT IMMEDIATELY'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <a
                      href="tel:112"
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-500 transition shadow"
                    >
                      <PhoneCall className="w-3.5 h-3.5" /> Call 112 (National Emergency)
                    </a>
                    <a
                      href="tel:108"
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-500 transition shadow"
                    >
                      <PhoneCall className="w-3.5 h-3.5" /> Call 108 (Ambulance)
                    </a>
                  </div>
                </div>
              )}

              {/* Message Content: Structured Sections or Plain Text */}
              {sections.length > 0 ? (
                <div className="space-y-2.5 my-2">
                  {sections.map((sec, idx) => {
                    let borderClass = 'border-slate-700 bg-slate-800/40';
                    let titleColor = 'text-blue-400';

                    if (sec.type === 'symptoms') {
                      borderClass = 'border-blue-500/30 bg-blue-950/20';
                      titleColor = 'text-blue-400';
                    } else if (sec.type === 'explanations') {
                      borderClass = 'border-amber-500/30 bg-amber-950/20';
                      titleColor = 'text-amber-400';
                    } else if (sec.type === 'next_steps') {
                      borderClass = 'border-emerald-500/30 bg-emerald-950/20';
                      titleColor = 'text-emerald-400';
                    } else if (sec.type === 'urgent') {
                      borderClass = 'border-rose-500/40 bg-rose-950/30';
                      titleColor = 'text-rose-400';
                    } else if (sec.type === 'followup') {
                      borderClass = 'border-purple-500/30 bg-purple-950/20';
                      titleColor = 'text-purple-400';
                    }

                    return (
                      <div key={idx} className={`p-2.5 rounded-xl border ${borderClass}`}>
                        <h4 className={`text-xs font-bold mb-1 ${titleColor}`}>{sec.title}</h4>
                        <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                          {sec.content}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs leading-relaxed whitespace-pre-line">{rawClean}</p>
              )}

              {/* Booked Appointment Confirmation Badge */}
              {msg.bookedAppointment && (
                <div className="mt-3 p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        Appointment Scheduled
                      </div>
                      <div className="text-[11px] text-slate-300">
                        {msg.bookedAppointment.doctor_name || 'Specialist'} •{' '}
                        {msg.bookedAppointment.appointment_time || 'Next Open Slot'}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-600 text-white">
                    Confirmed
                  </span>
                </div>
              )}

              {/* Citations if present */}
              {msg.citations && msg.citations.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-slate-800 text-[10px] text-slate-400 flex items-center gap-1 flex-wrap">
                  <BookOpen className="w-3 h-3 text-teal-400" />
                  <span className="font-semibold text-slate-300">Clinical Guidelines:</span>
                  {msg.citations.map((c, i) => (
                    <span
                      key={i}
                      className="px-1.5 py-0.5 rounded bg-slate-800/80 text-teal-300 font-mono"
                    >
                      {c.source || 'Medical Evidence'}
                    </span>
                  ))}
                </div>
              )}

              {/* Listen Aloud Controls on AI Messages */}
              {!isUser && (
                <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() =>
                      isThisSpeaking
                        ? onStopSpeaking()
                        : onSpeak(msg.id, msg.text, msg.language)
                    }
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                      isThisSpeaking
                        ? 'bg-rose-600 text-white animate-pulse'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    {isThisSpeaking ? (
                      <>
                        <Square className="w-3.5 h-3.5 fill-current" />
                        {language === 'te' ? 'ఆపండి' : 'Stop Speaking'}
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3.5 h-3.5 text-teal-400" />
                        {language === 'te' ? 'వాయిస్ వినండి' : 'Listen Aloud'}
                      </>
                    )}
                  </button>
                  <span className="text-[10px] text-slate-500">
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
