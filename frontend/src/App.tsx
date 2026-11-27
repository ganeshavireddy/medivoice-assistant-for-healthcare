import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Stethoscope,
  FileText,
  Calendar,
  Send,
  AlertTriangle,
  CheckCircle2,
  Clock,
  User,
  Activity,
  Search,
  Volume2,
  VolumeX,
  Sparkles,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  HeartPulse,
  HelpCircle,
  PhoneCall,
  Loader2,
  AlertCircle,
  Play,
  Square,
  Home,
  Lock,
} from 'lucide-react';
import { MediVoiceDashboard } from './components/dashboard/MediVoiceDashboard';
import { AdminDashboard } from './components/dashboard/AdminDashboard';
import { VoiceAssistant } from './components/voice/VoiceAssistant';

interface Doctor {
  id: number;
  name: string;
  specialization: string;
  department: string;
  crm_number?: string;
}

interface Appointment {
  id: number;
  patient_id: number;
  doctor_id: number;
  appointment_time: string;
  status: string;
  reason?: string;
  created_at: string;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  time: string;
  language?: string;
  citations?: Array<{ content?: string; source?: string; page?: any; similarity_score?: number }>;
  isEmergency?: boolean;
}

let rawApiHost = (import.meta.env.VITE_API_URL as string || '').trim().replace(/\/$/, '');
if (rawApiHost && !rawApiHost.startsWith('http://') && !rawApiHost.startsWith('https://')) {
  rawApiHost = `https://${rawApiHost}`;
}
const API_HOST = rawApiHost;
const API_BASE = `${API_HOST}/api/v1`;

// ---------------------------------------------------------------------------
// STRUCTURED MESSAGE FORMATTER
// ---------------------------------------------------------------------------
interface SectionData {
  type: 'symptoms' | 'explanations' | 'next_steps' | 'urgent' | 'followup' | 'general';
  title: string;
  content: string;
}

function parseStructuredMessage(rawText: string) {
  let text = rawText || '';
  let isEmergency = text.includes('CRITICAL EMERGENCY DETECTED') || text.includes('EMERGENCY DETECTED');
  let disclaimer = '';

  // Extract disclaimer if present
  const disclaimerMatch = text.match(/(?:[⚠️ℹ️]?\s*)?Disclaimer:?\s*([\s\S]+)$/i);
  if (disclaimerMatch) {
    disclaimer = disclaimerMatch[1].trim();
    text = text.substring(0, disclaimerMatch.index).trim();
  }

  // Check if text has ### sections
  const hasSections = /###\s*/.test(text);
  const sections: SectionData[] = [];

  if (hasSections) {
    // Split into chunks starting with ###
    const rawChunks = text.split(/(?=###)/).map((s) => s.trim()).filter(Boolean);

    for (const chunk of rawChunks) {
      const cleanChunk = chunk.replace(/^###\s*/, '').trim();

      // Check section 1: Understanding symptoms
      if (/^1\.\s*(?:Understanding your symptoms|మీ లక్షణాల వివరణ|మీ లక్షణాలు)/i.test(cleanChunk)) {
        const body = cleanChunk.replace(/^1\.\s*(?:Understanding your symptoms|మీ లక్షణాల వివరణ|మీ లక్షణాలు)[:\s]*/i, '').trim();
        sections.push({
          type: 'symptoms',
          title: '1. Understanding Your Symptoms',
          content: body,
        });
      }
      // Check section 2: Possible explanations
      else if (/^2\.\s*(?:Possible explanations|సాధ్యమయ్యే కారణాలు)/i.test(cleanChunk)) {
        const body = cleanChunk.replace(/^2\.\s*(?:Possible explanations|సాధ్యమయ్యే కారణాలు)[:\s]*/i, '').trim();
        sections.push({
          type: 'explanations',
          title: '2. Possible Explanations',
          content: body,
        });
      }
      // Check section 3: Recommended next steps
      else if (/^3\.\s*(?:Recommended next steps|సిఫార్సు చేయబడిన తదుపరి చర్యలు|సిఫార్సు చేయబడిన జాగ్రత్తలు)/i.test(cleanChunk)) {
        const body = cleanChunk.replace(/^3\.\s*(?:Recommended next steps|సిఫార్సు చేయబడిన తదుపరి చర్యలు|సిఫార్సు చేయబడిన జాగ్రత్తలు)[:\s]*/i, '').trim();
        sections.push({
          type: 'next_steps',
          title: '3. Recommended Next Steps',
          content: body,
        });
      }
      // Check section 4: When to seek urgent help
      else if (/^4\.\s*(?:When to seek urgent help|అత్యవసర సహాయం ఎప్పుడు పొందాలి|అత్యవసర హెచ్చరికలు)/i.test(cleanChunk)) {
        const body = cleanChunk.replace(/^4\.\s*(?:When to seek urgent help|అత్యవసర సహాయం ఎప్పుడు పొందాలి|అత్యవసర హెచ్చరికలు)[:\s]*/i, '').trim();
        sections.push({
          type: 'urgent',
          title: '4. When to Seek Urgent Help',
          content: body,
        });
      }
      // Check section 5: Follow-up question
      else if (/^5\.\s*(?:Follow-up question|తదుపరి ప్రశ్న)/i.test(cleanChunk)) {
        const body = cleanChunk.replace(/^5\.\s*(?:Follow-up question|తదుపరి ప్రశ్న)[:\s]*/i, '').trim();
        sections.push({
          type: 'followup',
          title: '5. Follow-up Question',
          content: body,
        });
      }
      // Other custom ### header
      else {
        const lines = cleanChunk.split('\n');
        const title = lines[0].trim();
        const body = lines.slice(1).join('\n').trim() || cleanChunk;
        sections.push({
          type: 'general',
          title: title,
          content: body,
        });
      }
    }
  }

  return { isEmergency, sections, rawBody: text, disclaimer };
}

function renderFormattedParagraph(text: string) {
  if (!text) return null;

  // Check if text has bullet points (either • or -)
  if (text.includes('•') || text.includes('\n- ') || text.includes('\n* ')) {
    let parts: string[] = [];
    if (text.includes('•')) {
      parts = text.split(/\s*•\s*/).map((p) => p.trim()).filter(Boolean);
    } else {
      parts = text.split(/\n[\-*]\s*/).map((p) => p.trim()).filter(Boolean);
    }

    // Determine if the first part is introductory text (e.g. "These symptoms can occur with:")
    const firstPartIsIntro =
      parts.length > 1 &&
      (parts[0].endsWith(':') ||
        parts[0].toLowerCase().includes('occur with') ||
        parts[0].toLowerCase().includes('experience') ||
        parts[0].toLowerCase().includes('attention if') ||
        parts[0].length < 80);

    const intro = firstPartIsIntro ? parts[0] : null;
    const bullets = firstPartIsIntro ? parts.slice(1) : parts;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {intro && (
          <p style={{ margin: '2px 0 4px 0', color: '#334155', fontSize: '13.5px', lineHeight: '1.55' }}>
            {renderInlineStyles(intro)}
          </p>
        )}
        <ul
          style={{
            margin: '2px 0 4px 0',
            paddingLeft: '20px',
            listStyleType: 'disc',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          {bullets.map((b, i) => (
            <li key={i} style={{ color: '#334155', fontSize: '13.5px', lineHeight: '1.55' }}>
              {renderInlineStyles(b)}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // Split lines for regular paragraphs
  const lines = text.split('\n');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {lines
        .map((l) => l.trim())
        .filter(Boolean)
        .map((line, idx) => (
          <p
            key={idx}
            style={{
              margin: '2px 0',
              color: '#334155',
              fontSize: '13.5px',
              lineHeight: '1.6',
            }}
          >
            {renderInlineStyles(line)}
          </p>
        ))}
    </div>
  );
}

function renderInlineStyles(str: string) {
  // Support **bold**
  const parts = str.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} style={{ fontWeight: 600, color: '#0f172a' }}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

function StructuredMedicalMessage({ text, isEmergencyMsg }: { text: string; isEmergencyMsg?: boolean }) {
  const { isEmergency, sections, rawBody, disclaimer } = parseStructuredMessage(text);
  const emergencyMode = isEmergency || isEmergencyMsg;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {/* Critical Emergency Banner */}
      {emergencyMode && (
        <div
          style={{
            backgroundColor: '#fef2f2',
            border: '2px solid #ef4444',
            borderRadius: '12px',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b91c1c', fontWeight: 700, fontSize: '14px' }}>
            <AlertTriangle size={18} color="#dc2626" />
            CRITICAL MEDICAL ALERT: IMMEDIATE ACTION REQUIRED
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#dc2626',
                color: '#ffffff',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              <PhoneCall size={14} /> Call Ambulance (India): 112 / 108
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#991b1b',
                color: '#ffffff',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              <AlertCircle size={14} /> Emergency Department
            </div>
          </div>
        </div>
      )}

      {/* Structured Sections (5-Part Master System Format) */}
      {sections.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {sections.map((sec, idx) => {
            if (sec.type === 'symptoms') {
              return (
                <div
                  key={idx}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #bae6fd',
                    borderLeft: '4px solid #0284c7',
                    borderRadius: '10px',
                    padding: '12px 14px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontWeight: 700,
                      color: '#0369a1',
                      fontSize: '13px',
                      marginBottom: '6px',
                    }}
                  >
                    <Stethoscope size={16} color="#0284c7" />
                    {sec.title}
                  </div>
                  <div>{renderFormattedParagraph(sec.content)}</div>
                </div>
              );
            }

            if (sec.type === 'explanations') {
              return (
                <div
                  key={idx}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #ddd6fe',
                    borderLeft: '4px solid #7c3aed',
                    borderRadius: '10px',
                    padding: '12px 14px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontWeight: 700,
                      color: '#6d28d9',
                      fontSize: '13px',
                      marginBottom: '6px',
                    }}
                  >
                    <Activity size={16} color="#7c3aed" />
                    {sec.title}
                  </div>
                  <div>{renderFormattedParagraph(sec.content)}</div>
                </div>
              );
            }

            if (sec.type === 'next_steps') {
              return (
                <div
                  key={idx}
                  style={{
                    backgroundColor: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderLeft: '4px solid #16a34a',
                    borderRadius: '10px',
                    padding: '12px 14px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontWeight: 700,
                      color: '#15803d',
                      fontSize: '13px',
                      marginBottom: '6px',
                    }}
                  >
                    <CheckCircle2 size={16} color="#16a34a" />
                    {sec.title}
                  </div>
                  <div>{renderFormattedParagraph(sec.content)}</div>
                </div>
              );
            }

            if (sec.type === 'urgent') {
              return (
                <div
                  key={idx}
                  style={{
                    backgroundColor: '#fff1f2',
                    border: '1px solid #fecdd3',
                    borderLeft: '4px solid #e11d48',
                    borderRadius: '10px',
                    padding: '12px 14px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontWeight: 700,
                      color: '#be123c',
                      fontSize: '13px',
                      marginBottom: '6px',
                    }}
                  >
                    <AlertTriangle size={16} color="#e11d48" />
                    {sec.title}
                  </div>
                  <div>{renderFormattedParagraph(sec.content)}</div>
                </div>
              );
            }

            if (sec.type === 'followup') {
              return (
                <div
                  key={idx}
                  style={{
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fde68a',
                    borderLeft: '4px solid #d97706',
                    borderRadius: '10px',
                    padding: '12px 14px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontWeight: 700,
                      color: '#b45309',
                      fontSize: '13px',
                      marginBottom: '6px',
                    }}
                  >
                    <HelpCircle size={16} color="#d97706" />
                    {sec.title}
                  </div>
                  <div>{renderFormattedParagraph(sec.content)}</div>
                </div>
              );
            }

            // General section with custom title
            return (
              <div
                key={idx}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '12px 14px',
                }}
              >
                {sec.title && (
                  <div
                    style={{
                      fontWeight: 700,
                      color: '#0f172a',
                      fontSize: '13px',
                      marginBottom: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <BookOpen size={15} color="#0284c7" />
                    {sec.title}
                  </div>
                )}
                <div>{renderFormattedParagraph(sec.content)}</div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Plain/Default Message formatting */
        <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
          {renderFormattedParagraph(rawBody)}
        </div>
      )}

      {/* Structured Medical Disclaimer Footer */}
      {disclaimer && (
        <div
          style={{
            marginTop: '8px',
            padding: '8px 12px',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
            fontSize: '11px',
            color: '#64748b',
            lineHeight: '1.5',
          }}
        >
          <ShieldCheck size={14} color="#64748b" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong style={{ color: '#475569' }}>Medical Disclaimer:</strong> {disclaimer}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// MAIN APPLICATION COMPONENT
// ---------------------------------------------------------------------------
export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'voice' | 'doctors' | 'reports' | 'appointments' | 'admin'>('home');
  const [language, setLanguage] = useState<'en' | 'te'>('en');
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      sender: 'ai',
      text: 'Hello! I am MediVoice AI, your multilingual healthcare assistant. How can I assist you with your health, doctor search, or medical reports today?',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Voice Recording (STT) State
  const [isRecording, setIsRecording] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [micStatusMsg, setMicStatusMsg] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedMicId, setSelectedMicId] = useState<string>('');
  const animFrameRef = useRef<any>(null);
  const maxAudioLevelRef = useRef<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);
  const recognitionErrorRef = useRef<boolean>(false);
  const transcriptRef = useRef<string>('');

  // Audio Playback (TTS) State
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [loadingAudioId, setLoadingAudioId] = useState<string | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // Doctors State
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [searchSpec, setSearchSpec] = useState('');
  const [loadingDoctors, setLoadingDoctors] = useState(false);

  // Appointments State
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [bookingDoctorId, setBookingDoctorId] = useState<number | null>(null);
  const [appointmentTime, setAppointmentTime] = useState('');
  const [appointmentReason, setAppointmentReason] = useState('');
  const [bookingStatus, setBookingStatus] = useState<string | null>(null);

  // Reports State
  const [reports, setReports] = useState<any[]>([]);
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [reportSummary, setReportSummary] = useState<string | null>(null);
  const [reportParameters, setReportParameters] = useState<any[]>([]);
  const [uploadingReport, setUploadingReport] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isProcessing]);

  // Health check with automatic retry while connecting
  const checkBackendHealth = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${API_HOST}/health`, { signal: controller.signal });
      clearTimeout(timeoutId);
      setBackendOnline(res.ok);
    } catch {
      setBackendOnline(false);
    }
  };

  useEffect(() => {
    checkBackendHealth();
    const interval = setInterval(checkBackendHealth, backendOnline ? 30000 : 3000);
    return () => clearInterval(interval);
  }, [backendOnline]);

  // Fetch doctors
  const fetchDoctors = async (query = '') => {
    setLoadingDoctors(true);
    try {
      const url = query ? `${API_BASE}/doctors/?specialization=${encodeURIComponent(query)}` : `${API_BASE}/doctors/`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setDoctors(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDoctors(false);
    }
  };

  // Fetch appointments
  const fetchAppointments = async () => {
    try {
      const res = await fetch(`${API_BASE}/appointments/`);
      if (res.ok) {
        const data = await res.json();
        setAppointments(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchReports = async () => {
    try {
      const res = await fetch(`${API_BASE}/reports/`);
      if (res.ok) {
        const data = await res.json();
        setReports(data);
      }
    } catch (e) {
      console.debug('Fetch reports notice:', e);
    }
  };

  const handleQuickVoicePrompt = (prompt: string) => {
    setActiveTab('voice');
    setInputQuery(prompt);
    handleSendMessage(prompt);
  };

  useEffect(() => {
    if (backendOnline) {
      fetchDoctors();
      fetchAppointments();
      fetchReports();
    }
  }, [backendOnline]);

  // -------------------------------------------------------------------------
  // AUDIO PLAYBACK (TEXT-TO-SPEECH)
  // -------------------------------------------------------------------------
  const stopAudio = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setPlayingMessageId(null);
    setLoadingAudioId(null);
  };

  const playMessageSpeech = async (msgId: string, text: string, lang = 'en') => {
    // If clicking on already playing message, toggle stop
    if (playingMessageId === msgId) {
      stopAudio();
      return;
    }

    stopAudio();
    setLoadingAudioId(msgId);

    try {
      // 1. Try Backend Neural Edge-TTS
      const res = await fetch(`${API_BASE}/voice/speak`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language: lang }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.audio_url) {
          const audioUrl = data.audio_url.startsWith('http') ? data.audio_url : `${API_HOST}${data.audio_url}`;
          const audio = new Audio(audioUrl);
          currentAudioRef.current = audio;

          audio.onplay = () => {
            setLoadingAudioId(null);
            setPlayingMessageId(msgId);
          };

          audio.onended = () => {
            setPlayingMessageId(null);
            currentAudioRef.current = null;
          };

          audio.onerror = () => {
            fallbackWebSpeech(text, lang, msgId);
          };

          await audio.play();
          return;
        }
      }

      fallbackWebSpeech(text, lang, msgId);
    } catch (err) {
      console.warn('Backend TTS failed, using Web Speech API fallback:', err);
      fallbackWebSpeech(text, lang, msgId);
    }
  };

  const fallbackWebSpeech = (text: string, lang: string, msgId: string) => {
    setLoadingAudioId(null);
    if (!('speechSynthesis' in window)) {
      setPlayingMessageId(null);
      return;
    }

    window.speechSynthesis.cancel();

    // Clean text of markdown characters
    const clean = text
      .replace(/#{1,6}\s*/g, '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/[•\-\*]/g, '')
      .replace(/[🚨⚠️ℹ️]/g, '')
      .trim();

    const utterance = new SpeechSynthesisUtterance(clean.substring(0, 500));
    utterance.lang = lang === 'te' ? 'te-IN' : 'en-US';

    utterance.onstart = () => {
      setPlayingMessageId(msgId);
    };

    utterance.onend = () => {
      setPlayingMessageId(null);
    };

    utterance.onerror = () => {
      setPlayingMessageId(null);
    };

    // Short delay after cancel() prevents Chromium from silently dropping the utterance
    setTimeout(() => {
      try {
        window.speechSynthesis.speak(utterance);
      } catch {
        setPlayingMessageId(null);
      }
    }, 50);
  };

  // -------------------------------------------------------------------------
  // SEND MESSAGE HANDLER
  // -------------------------------------------------------------------------
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputQuery).trim();
    if (!text || isProcessing) return;

    // Stop any ongoing speech
    stopAudio();

    const userMsg: ChatMessage = {
      id: String(Date.now()),
      sender: 'user',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      language,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setLiveTranscript('');
    setIsProcessing(true);

    try {
      const res = await fetch(`${API_BASE}/voice/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, language }),
      });

      if (res.ok) {
        const data = await res.json();
        const isEmergency = data.response_text?.includes('EMERGENCY DETECTED') || data.is_emergency;
        const newMsgId = String(Date.now() + 1);
        const aiMsg: ChatMessage = {
          id: newMsgId,
          sender: 'ai',
          text: data.response_text || 'I have received your request.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          citations: data.citations || [],
          isEmergency,
        };
        setMessages((prev) => [...prev, aiMsg]);

        // Auto-refresh appointments if the AI scheduled an appointment
        if (data.booked_appointment) {
          fetchAppointments();
        }

        // Auto-play speech for AI response
        playMessageSpeech(newMsgId, aiMsg.text, language);
      } else {
        throw new Error('Chat API returned error');
      }
    } catch (err) {
      const fallbackMsg: ChatMessage = {
        id: String(Date.now() + 1),
        sender: 'ai',
        text: 'Unable to reach the MediVoice backend API right now. Please verify the backend server is running and try again.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsProcessing(false);
    }
  };

  // -------------------------------------------------------------------------
  // VOICE INPUT RECORDING (SPEECH-TO-TEXT)
  // -------------------------------------------------------------------------
  const refreshAudioDevices = async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      const devices = await navigator.mediaDevices.enumerateDevices();
      const mics = devices.filter((d) => d.kind === 'audioinput');
      setAudioDevices(mics);
      if (!selectedMicId && mics.length > 0) {
        setSelectedMicId(mics[0].deviceId);
      }
    } catch (e) {
      console.debug('Audio device enumeration notice:', e);
    }
  };

  useEffect(() => {
    refreshAudioDevices();
  }, []);

  // Helper to encode raw PCM Float32 audio samples into a genuine 16-bit Mono WAV file
  const createWAVBlob = (audioBuffers: Float32Array[], sampleRate: number): { blob: Blob; rms: number } => {
    let totalLength = 0;
    for (const buf of audioBuffers) {
      totalLength += buf.length;
    }
    const merged = new Float32Array(totalLength);
    let offset = 0;
    for (const buf of audioBuffers) {
      merged.set(buf, offset);
      offset += buf.length;
    }

    // Compute RMS energy (ignoring initial 60ms mic-open transient)
    const skip = Math.min(Math.floor(sampleRate * 0.06), Math.floor(merged.length / 4));
    let sumSq = 0;
    let count = 0;
    for (let i = skip; i < merged.length; i++) {
      sumSq += merged[i] * merged[i];
      count++;
    }
    const rms = count > 0 ? Math.sqrt(sumSq / count) : 0;

    // RMS normalization (immune to single-sample click spikes)
    const gain = rms > 0.0005 && rms < 0.08 ? Math.min(20.0, 0.1 / rms) : 1.0;

    const buffer = new ArrayBuffer(44 + merged.length * 2);
    const view = new DataView(buffer);

    const writeString = (view: DataView, offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + merged.length * 2, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, 1, true); // Mono channel
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true); // Byte rate
    view.setUint16(32, 2, true); // Block align
    view.setUint16(34, 16, true); // 16 bits per sample
    writeString(view, 36, 'data');
    view.setUint32(40, merged.length * 2, true);

    let sampleOffset = 44;
    for (let i = 0; i < merged.length; i++, sampleOffset += 2) {
      const s = Math.max(-1, Math.min(1, merged[i] * gain));
      view.setInt16(sampleOffset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }

    return { blob: new Blob([buffer], { type: 'audio/wav' }), rms };
  };

  const silenceTimerRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioBuffersRef = useRef<Float32Array[]>([]);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const recordedSampleRateRef = useRef<number>(16000);

  const startRecording = async () => {
    setMicStatusMsg(null);
    setLiveTranscript('');
    transcriptRef.current = '';
    recognitionErrorRef.current = false;
    audioBuffersRef.current = [];
    maxAudioLevelRef.current = 0;
    stopAudio();

    try {
      // Create & resume AudioContext synchronously inside user click gesture
      let preAudioCtx: AudioContext | null = null;
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          preAudioCtx = new AudioCtx();
          if (preAudioCtx.state === 'suspended') {
            await preAudioCtx.resume();
          }
        }
      } catch (e) {
        console.warn('AudioContext init notice:', e);
      }

      // 1. Request microphone permission with echo cancellation & auto gain
      const audioConstraints: MediaTrackConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        ...(selectedMicId ? { deviceId: { exact: selectedMicId } } : {}),
      };
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
      } catch {
        // Fallback to default device if selected deviceId is unavailable
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
      }
      audioStreamRef.current = stream;
      audioChunksRef.current = [];
      refreshAudioDevices();

      // 2. Start MediaRecorder (native standard browser recording)
      if (typeof MediaRecorder !== 'undefined') {
        let mimeType = '';
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
          mimeType = 'audio/ogg';
        }
        const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };
        recorder.start(100); // Collect slice every 100ms
      }

      // 3. AudioContext for live volume visualizer & raw 16-bit PCM WAV capture
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = preAudioCtx || new AudioCtx();
        if (audioCtx.state === 'suspended') {
          await audioCtx.resume();
        }
        audioContextRef.current = audioCtx;
        recordedSampleRateRef.current = audioCtx.sampleRate || 16000;

        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);

        // Capture PCM samples cleanly into audioBuffersRef for reliable WAV upload
        if (typeof audioCtx.createScriptProcessor === 'function') {
          const processor = audioCtx.createScriptProcessor(4096, 1, 1);
          const silentGain = audioCtx.createGain();
          silentGain.gain.value = 0;
          processor.onaudioprocess = (event: AudioProcessingEvent) => {
            const channelData = event.inputBuffer.getChannelData(0);
            audioBuffersRef.current.push(new Float32Array(channelData));
          };
          source.connect(processor);
          processor.connect(silentGain);
          silentGain.connect(audioCtx.destination);
          scriptProcessorRef.current = processor;
        }

        const dataArray = new Uint8Array(analyser.fftSize);
        const updateLevel = () => {
          if (!audioStreamRef.current) return;
          analyser.getByteTimeDomainData(dataArray);
          let sumSq = 0;
          for (let i = 0; i < dataArray.length; i++) {
            const norm = (dataArray[i] - 128) / 128;
            sumSq += norm * norm;
          }
          const rms = Math.sqrt(sumSq / dataArray.length);
          const level = Math.min(100, Math.round(rms * 450));
          if (level > maxAudioLevelRef.current) {
            maxAudioLevelRef.current = level;
          }
          setAudioLevel(level);
          animFrameRef.current = requestAnimationFrame(updateLevel);
        };
        updateLevel();
      } catch (e) {
        console.warn('AudioContext meter notice:', e);
      }

      setIsRecording(true);
      setMicStatusMsg(
        language === 'te'
          ? '🎙️ వింటున్నాను... మాట్లాడండి (పూర్తయ్యాక Stop & Send నొక్కండి)'
          : '🎙️ Listening... speak clearly (click Stop & Send when done)'
      );

      // 4. In parallel, run Web Speech API if supported
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognitionRef.current = recognition;
          recognition.lang = language === 'te' ? 'te-IN' : 'en-US';
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.maxAlternatives = 1;

          recognition.onresult = (event: any) => {
            let final = '';
            let interim = '';
            for (let i = 0; i < event.results.length; i++) {
              if (event.results[i].isFinal) {
                final += event.results[i][0].transcript + ' ';
              } else {
                interim += event.results[i][0].transcript;
              }
            }
            const fullText = (final || interim || '').trim();
            if (fullText) {
              transcriptRef.current = fullText;
              setLiveTranscript(fullText);
              setInputQuery(fullText);
            }
          };

          recognition.onerror = (e: any) => {
            console.warn('Native speech recognition notice:', e.error);
            if (e.error === 'not-allowed' || e.error === 'service-not-allowed' || e.error === 'network' || e.error === 'audio-capture') {
              recognitionErrorRef.current = true;
            }
            if (e.error === 'not-allowed') {
              setMicStatusMsg(
                language === 'te'
                  ? 'మైక్రోఫోన్ అనుమతి నిరాకరించబడింది. బ్రౌజర్‌లో మైక్రోఫోన్ అనుమతించండి.'
                  : 'Microphone permission blocked. Please allow mic in browser address bar.'
              );
            }
          };

          recognition.onend = () => {
            // Keep listening only if recording is active and no fatal SpeechRecognition error occurred
            if (!recognitionErrorRef.current && mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
              try {
                recognition.start();
              } catch (e) {}
            }
          };

          recognition.start();
        } catch (recErr) {
          console.warn('Native speech recognition start notice:', recErr);
        }
      }
    } catch (err: any) {
      console.warn('Microphone access failed:', err);
      setMicStatusMsg(
        language === 'te'
          ? 'దయచేసి మీ బ్రౌజర్‌లో మైక్రోఫోన్ అనుమతిని (Allow Microphone) ఆన్ చేయండి.'
          : 'Microphone permission blocked. Please allow mic permissions in your browser address bar.'
      );
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setAudioLevel(0);

    if (recognitionRef.current) {
      try {
        recognitionErrorRef.current = true; // Prevent onend from restarting during stop
        recognitionRef.current.stop();
      } catch (e) {}
    }

    // Give Web Speech API a brief moment to emit any final buffered transcript
    if (!transcriptRef.current.trim() && recognitionRef.current) {
      await new Promise((r) => setTimeout(r, 200));
    }

    // Stop MediaRecorder and await final audio blob
    let recordedBlob: Blob | null = null;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        recordedBlob = await new Promise<Blob>((resolve) => {
          if (!mediaRecorderRef.current) {
            resolve(new Blob(audioChunksRef.current, { type: 'audio/webm' }));
            return;
          }
          mediaRecorderRef.current.onstop = () => {
            const mime = mediaRecorderRef.current?.mimeType || 'audio/webm';
            resolve(new Blob(audioChunksRef.current, { type: mime }));
          };
          mediaRecorderRef.current.stop();
        });
      } catch (recErr) {
        console.warn('MediaRecorder stop error:', recErr);
        recordedBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      }
    } else if (audioChunksRef.current.length > 0) {
      recordedBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
    }

    // Prefer genuine 16-bit PCM WAV blob if PCM frames were captured (maximally compatible with STT backends)
    let uploadFilename = 'recording.webm';
    let capturedRms = 1;
    if (audioBuffersRef.current.length > 0) {
      const wav = createWAVBlob(audioBuffersRef.current, recordedSampleRateRef.current || 16000);
      recordedBlob = wav.blob;
      capturedRms = wav.rms;
      uploadFilename = 'recording.wav';
    }

    if (scriptProcessorRef.current) {
      try {
        scriptProcessorRef.current.disconnect();
      } catch (e) {}
      scriptProcessorRef.current = null;
    }

    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }

    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (e) {}
      audioContextRef.current = null;
    }

    const collectedText = (transcriptRef.current || liveTranscript).trim();
    setIsRecording(false);

    // 1. If native speech recognition captured words, send immediately!
    if (collectedText.length > 0) {
      handleSendMessage(collectedText);
      transcriptRef.current = '';
      setLiveTranscript('');
      setMicStatusMsg(null);
      audioBuffersRef.current = [];
      return;
    }

    // 2. Fallback: If native speech recognition did not produce text, check mic signal & send audio to backend!
    if (uploadFilename === 'recording.wav' && capturedRms < 0.0005 && maxAudioLevelRef.current < 2) {
      setMicStatusMsg(
        language === 'te'
          ? 'మైక్రోఫోన్ నుండి శబ్దం వినిపించడం లేదు (0% వాల్యూమ్). దయచేసి మైక్ మ్యూట్‌లో లేదో తనిఖీ చేయండి లేదా మరో మైక్రోఫోన్‌ను ఎంచుకోండి.'
          : 'No sound detected from your microphone (0% input). Check if your mic is muted or choose a different microphone below.'
      );
      audioBuffersRef.current = [];
      audioChunksRef.current = [];
      return;
    }

    if (recordedBlob && recordedBlob.size > 100) {
      try {
        setIsProcessing(true);
        setMicStatusMsg(
          language === 'te'
            ? 'వాయిస్ ప్రాసెస్ అవుతోంది...'
            : 'Transcribing speech audio with AI voice recognizer...'
        );

        const formData = new FormData();
        formData.append('file', recordedBlob, uploadFilename);
        formData.append('language', language);

        const res = await fetch(`${API_BASE}/voice/transcribe`, {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          const transcription = (data.transcription || '').trim();
          if (transcription.length > 0) {
            setInputQuery(transcription);
            handleSendMessage(transcription);
            setMicStatusMsg(null);
            setLiveTranscript('');
            transcriptRef.current = '';
            audioChunksRef.current = [];
            audioBuffersRef.current = [];
            return;
          } else {
            setMicStatusMsg(
              language === 'te'
                ? 'వాయిస్ గుర్తించబడలేదు. దయచేసి మైక్రోఫోన్‌కు దగ్గరగా మాట్లాడండి.'
                : 'No words detected in audio. Please speak louder into your mic or type your question.'
            );
          }
        } else {
          setMicStatusMsg('Failed to transcribe audio from server.');
        }
      } catch (e) {
        console.error('Transcription error:', e);
        setMicStatusMsg('Error communicating with voice recognition server.');
      } finally {
        setIsProcessing(false);
        setLiveTranscript('');
        transcriptRef.current = '';
        audioChunksRef.current = [];
        audioBuffersRef.current = [];
      }
    } else {
      const fallbackQuery = inputQuery.trim();
      if (fallbackQuery.length > 0) {
        handleSendMessage(fallbackQuery);
      } else {
        setMicStatusMsg(
          language === 'te'
            ? 'మైక్రోఫోన్ ఆడియో నమోదు కాలేదు. దయచేసి మైక్ అనుమతి మరియు ఇన్‌పుట్‌ను తనిఖీ చేయండి.'
            : 'No microphone audio was captured. Please check your microphone device and speak for at least 1 second.'
        );
      }
      audioBuffersRef.current = [];
    }
  };

  // -------------------------------------------------------------------------
  // APPOINTMENT BOOKING
  // -------------------------------------------------------------------------
  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingDoctorId || !appointmentTime) return;

    try {
      const res = await fetch(`${API_BASE}/appointments/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctor_id: bookingDoctorId,
          appointment_time: appointmentTime,
          reason: appointmentReason || 'General Consultation',
        }),
      });

      if (res.ok) {
        setBookingStatus('Appointment booked successfully!');
        setAppointmentTime('');
        setAppointmentReason('');
        setBookingDoctorId(null);
        fetchAppointments();
      } else {
        setBookingStatus('Slot conflict or unable to book.');
      }
    } catch (err) {
      setBookingStatus('Error booking appointment.');
    }
  };

  const handleCancelAppointment = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}/appointments/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchAppointments();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      {/* Top Navbar */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 24px',
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.05)',
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              backgroundColor: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
            }}
          >
            <HeartPulse size={26} />
          </div>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em' }}>
              MediVoice AI
            </h1>
            <p style={{ fontSize: '12px', color: '#64748b' }}>Voice-Based Intelligent Healthcare Assistant</p>
          </div>
        </div>

        {/* Tab Buttons */}
        <nav style={{ display: 'flex', gap: '8px', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '10px' }}>
          <button
            onClick={() => setActiveTab('home')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: 500,
              backgroundColor: activeTab === 'home' ? '#ffffff' : 'transparent',
              color: activeTab === 'home' ? '#0284c7' : '#64748b',
              boxShadow: activeTab === 'home' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <Home size={16} /> {language === 'te' ? 'హోమ్' : 'Home'}
          </button>
          <button
            onClick={() => setActiveTab('voice')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: 500,
              backgroundColor: activeTab === 'voice' ? '#ffffff' : 'transparent',
              color: activeTab === 'voice' ? '#0284c7' : '#64748b',
              boxShadow: activeTab === 'voice' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            <Mic size={16} /> Voice Assistant
          </button>
          <button
            onClick={() => setActiveTab('doctors')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: 500,
              backgroundColor: activeTab === 'doctors' ? '#ffffff' : 'transparent',
              color: activeTab === 'doctors' ? '#0284c7' : '#64748b',
              boxShadow: activeTab === 'doctors' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            <Stethoscope size={16} /> Doctors
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: 500,
              backgroundColor: activeTab === 'reports' ? '#ffffff' : 'transparent',
              color: activeTab === 'reports' ? '#0284c7' : '#64748b',
              boxShadow: activeTab === 'reports' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            <FileText size={16} /> Reports
          </button>
          <button
            onClick={() => setActiveTab('appointments')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: 500,
              backgroundColor: activeTab === 'appointments' ? '#ffffff' : 'transparent',
              color: activeTab === 'appointments' ? '#0284c7' : '#64748b',
              boxShadow: activeTab === 'appointments' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            <Calendar size={16} /> Appointments ({appointments.length})
          </button>
          <button
            onClick={() => setActiveTab('admin')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: 500,
              backgroundColor: activeTab === 'admin' ? '#ffffff' : 'transparent',
              color: activeTab === 'admin' ? '#0284c7' : '#64748b',
              boxShadow: activeTab === 'admin' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              borderRadius: '8px',
            }}
          >
            <Lock size={15} /> Admin Dashboard
          </button>
        </nav>

        {/* Right Section: Language & Backend Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            type="button"
            onClick={checkBackendHealth}
            title="Click to re-check backend API connection"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              background: 'none',
              padding: '4px 8px',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: backendOnline ? '#10b981' : '#f59e0b',
              }}
            />
            <span style={{ color: '#64748b' }}>{backendOnline ? 'API Online' : 'API Connecting...'}</span>
          </button>

          <div style={{ display: 'flex', backgroundColor: '#e2e8f0', borderRadius: '8px', padding: '2px' }}>
            <button
              onClick={() => setLanguage('en')}
              style={{
                padding: '4px 10px',
                fontSize: '12px',
                fontWeight: 600,
                backgroundColor: language === 'en' ? '#0284c7' : 'transparent',
                color: language === 'en' ? '#ffffff' : '#475569',
                borderRadius: '6px',
              }}
            >
              EN
            </button>
            <button
              onClick={() => setLanguage('te')}
              style={{
                padding: '4px 10px',
                fontSize: '12px',
                fontWeight: 600,
                backgroundColor: language === 'te' ? '#0284c7' : 'transparent',
                color: language === 'te' ? '#ffffff' : '#475569',
                borderRadius: '6px',
              }}
            >
              తెలుగు (TE)
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ flex: 1, padding: '20px 24px', maxWidth: '1250px', margin: '0 auto', width: '100%' }}>
        {/* TAB 0: HOME CLINICAL DASHBOARD */}
        {activeTab === 'home' && (
          <MediVoiceDashboard
            language={language}
            appointments={appointments}
            doctors={doctors}
            reports={reports}
            onNavigateTab={(tab) => setActiveTab(tab === 'dashboard' ? 'home' : tab as any)}
            onQuickVoicePrompt={handleQuickVoicePrompt}
            onCancelAppointment={handleCancelAppointment}
            backendOnline={backendOnline}
          />
        )}

        {/* TAB 1: VOICE ASSISTANT (Rebuilt) */}
        {activeTab === 'voice' && (
          <div style={{ padding: "0", background: "transparent" }}>
            <VoiceAssistant
              initialLanguage={language}
              userId={1}
              onAppointmentBooked={fetchAppointments}
            />
          </div>
        )}

        {/* TAB 2: DOCTOR DIRECTORY */}
        {activeTab === 'doctors' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>Hospital Doctor Directory</h2>
                <p style={{ fontSize: '13px', color: '#64748b' }}>Search certified specialists and schedule clinical visits.</p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Filter by specialization (e.g. Cardiology)..."
                  value={searchSpec}
                  onChange={(e) => setSearchSpec(e.target.value)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    width: '260px',
                  }}
                />
                <button
                  onClick={() => fetchDoctors(searchSpec)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '14px',
                    fontWeight: 500,
                  }}
                >
                  <Search size={14} /> Search
                </button>
              </div>
            </div>

            {/* Doctors Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
              {doctors.map((doc) => (
                <div
                  key={doc.id}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '14px',
                    border: '1px solid #e2e8f0',
                    padding: '20px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                      <div
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '50%',
                          backgroundColor: '#e0f2fe',
                          color: '#0284c7',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                        }}
                      >
                        {doc.name.split(' ').slice(-1)[0][0]}
                      </div>
                      <div>
                        <h4 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>{doc.name}</h4>
                        <span
                          style={{
                            display: 'inline-block',
                            backgroundColor: '#f1f5f9',
                            color: '#475569',
                            fontSize: '11px',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            marginTop: '2px',
                          }}
                        >
                          {doc.specialization}
                        </span>
                      </div>
                    </div>
                    <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '6px' }}>
                      <strong>Department:</strong> {doc.department}
                    </p>
                    <p style={{ fontSize: '12px', color: '#94a3b8' }}>Registration: {doc.crm_number || 'Certified'}</p>
                  </div>

                  <button
                    onClick={() => {
                      setBookingDoctorId(doc.id);
                      setActiveTab('appointments');
                    }}
                    style={{
                      marginTop: '16px',
                      padding: '10px',
                      backgroundColor: '#0284c7',
                      color: '#ffffff',
                      fontSize: '13px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <Calendar size={14} /> Book Appointment
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: REPORT ANALYZER */}
        {activeTab === 'reports' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>Medical Report Extraction & Analysis</h2>
              <p style={{ fontSize: '13px', color: '#64748b' }}>
                Upload pathology reports, blood tests (CBC, Lipid profile, Thyroid), or use preloaded clinical samples.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              {/* Upload Card */}
              <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>Upload Test Document</h3>
                <div
                  style={{
                    border: '2px dashed #cbd5e1',
                    borderRadius: '12px',
                    padding: '32px',
                    textAlign: 'center',
                    backgroundColor: '#f8fafc',
                  }}
                >
                  <FileText size={40} color="#0284c7" style={{ margin: '0 auto 12px auto' }} />
                  <p style={{ fontSize: '14px', fontWeight: 500, color: '#1e293b' }}>
                    {reportFile ? reportFile.name : 'Select PDF or Text report'}
                  </p>
                  <input
                    type="file"
                    accept=".pdf,.txt,.doc,.docx"
                    onChange={(e) => setReportFile(e.target.files ? e.target.files[0] : null)}
                    style={{ marginTop: '12px' }}
                  />
                </div>

                <div style={{ marginTop: '16px', display: 'flex', gap: '10px' }}>
                  <button
                    disabled={!reportFile || uploadingReport}
                    onClick={async () => {
                      if (!reportFile) return;
                      setUploadingReport(true);
                      const formData = new FormData();
                      formData.append('file', reportFile);
                      try {
                        const res = await fetch(`${API_BASE}/reports/upload`, {
                          method: 'POST',
                          body: formData,
                        });
                        if (res.ok) {
                          const data = await res.json();
                          setReportSummary(data.summary || `File ${reportFile.name} uploaded and indexed successfully.`);
                          if (data.parameters && data.parameters.length > 0) {
                            setReportParameters(data.parameters);
                          } else {
                            setReportParameters([
                              { name: 'Document Status', value: 'Indexed', unit: '', reference_range: 'Verified Format', status: 'NORMAL', color: '#10b981' },
                            ]);
                          }
                          fetchReports();
                        } else {
                          setReportSummary('Server could not process this file format. Please upload PDF or TXT.');
                        }
                      } catch (e) {
                        setReportSummary('Error uploading report to server.');
                      } finally {
                        setUploadingReport(false);
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: '10px',
                      backgroundColor: reportFile ? '#0284c7' : '#94a3b8',
                      color: '#ffffff',
                      fontWeight: 600,
                      borderRadius: '8px',
                      border: 'none',
                      cursor: reportFile ? 'pointer' : 'not-allowed',
                    }}
                  >
                    {uploadingReport ? 'Processing...' : 'Upload & Process'}
                  </button>

                  <button
                    onClick={() => {
                      setReportSummary(
                        'Complete Blood Count (CBC) Panel Analyzed. All hematologic and metabolic markers evaluated against standard adult reference intervals.'
                      );
                      setReportParameters([
                        { name: 'Hemoglobin (Hb)', value: 14.2, unit: 'g/dL', reference_range: '12.0 - 17.5 g/dL', status: 'NORMAL', color: '#10b981' },
                        { name: 'White Blood Cell Count (WBC)', value: 7200, unit: '/mcL', reference_range: '4,000 - 11,000 /mcL', status: 'NORMAL', color: '#10b981' },
                        { name: 'Platelet Count', value: 240000, unit: '/mcL', reference_range: '150,000 - 450,000 /mcL', status: 'NORMAL', color: '#10b981' },
                        { name: 'Fasting Blood Glucose', value: 92, unit: 'mg/dL', reference_range: '70 - 99 mg/dL', status: 'NORMAL', color: '#10b981' },
                        { name: 'Total Cholesterol', value: 185, unit: 'mg/dL', reference_range: '< 200 mg/dL', status: 'NORMAL', color: '#10b981' },
                      ]);
                    }}
                    style={{
                      padding: '10px 16px',
                      backgroundColor: '#e2e8f0',
                      color: '#1e293b',
                      fontWeight: 600,
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Load Sample CBC
                  </button>
                </div>
              </div>

              {/* Analysis Result */}
              <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>Clinical Report Summary</h3>
                {reportSummary ? (
                  <div>
                    <div
                      style={{
                        padding: '14px 16px',
                        backgroundColor: '#f0fdf4',
                        border: '1px solid #86efac',
                        borderRadius: '10px',
                        fontSize: '13px',
                        lineHeight: '1.6',
                        color: '#166534',
                        marginBottom: '16px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, marginBottom: '4px' }}>
                        <CheckCircle2 size={16} /> Clinical Analysis Complete
                      </div>
                      {reportSummary}
                    </div>

                    {reportParameters.length > 0 && (
                      <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
                          <thead>
                            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                              <th style={{ padding: '8px 12px' }}>Parameter</th>
                              <th style={{ padding: '8px 12px' }}>Value</th>
                              <th style={{ padding: '8px 12px' }}>Standard Range</th>
                              <th style={{ padding: '8px 12px', textAlign: 'center' }}>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reportParameters.map((param, pIdx) => (
                              <tr key={pIdx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '8px 12px', fontWeight: 500, color: '#1e293b' }}>{param.name}</td>
                                <td style={{ padding: '8px 12px', fontWeight: 600, color: '#0f172a' }}>{param.value} {param.unit}</td>
                                <td style={{ padding: '8px 12px', color: '#64748b' }}>{param.reference_range}</td>
                                <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                  <span
                                    style={{
                                      display: 'inline-block',
                                      padding: '2px 8px',
                                      borderRadius: '10px',
                                      fontSize: '10.5px',
                                      fontWeight: 700,
                                      backgroundColor: param.status === 'NORMAL' ? '#dcfce7' : param.status === 'HIGH' ? '#fee2e2' : '#fef3c7',
                                      color: param.status === 'NORMAL' ? '#15803d' : param.status === 'HIGH' ? '#b91c1c' : '#b45309',
                                    }}
                                  >
                                    {param.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '40px 0' }}>
                    No report loaded yet. Upload a lab report or click "Load Sample CBC".
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: APPOINTMENTS */}
        {activeTab === 'appointments' && (
          <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '24px' }}>
            {/* Booking Form */}
            <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: '#0f172a' }}>
                Schedule Consultation
              </h3>

              {bookingStatus && (
                <div
                  style={{
                    padding: '10px',
                    marginBottom: '16px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    backgroundColor: bookingStatus.includes('success') ? '#dcfce7' : '#fee2e2',
                    color: bookingStatus.includes('success') ? '#166534' : '#991b1b',
                  }}
                >
                  {bookingStatus}
                </div>
              )}

              <form onSubmit={handleBookAppointment} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#334155', marginBottom: '6px' }}>
                    Select Doctor
                  </label>
                  <select
                    value={bookingDoctorId || ''}
                    onChange={(e) => setBookingDoctorId(Number(e.target.value))}
                    required
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  >
                    <option value="">-- Choose Specialist --</option>
                    {doctors.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.specialization})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#334155', marginBottom: '6px' }}>
                    Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={appointmentTime}
                    onChange={(e) => setAppointmentTime(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#334155', marginBottom: '6px' }}>
                    Reason for Visit
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Describe symptoms or purpose..."
                    value={appointmentReason}
                    onChange={(e) => setAppointmentReason(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  />
                </div>

                <button
                  type="submit"
                  style={{
                    padding: '12px',
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    fontWeight: 600,
                    borderRadius: '8px',
                    marginTop: '8px',
                  }}
                >
                  Confirm Appointment
                </button>
              </form>
            </div>

            {/* Existing Appointments List */}
            <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Upcoming Appointments</h3>
                <button
                  onClick={fetchAppointments}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', background: 'none', color: '#0284c7' }}
                >
                  <RefreshCw size={13} /> Refresh
                </button>
              </div>

              {appointments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: '13px' }}>
                  No appointments scheduled. Select a specialist on the left to book.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {appointments.map((app) => (
                    <div
                      key={app.id}
                      style={{
                        padding: '16px',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '14px', color: '#0f172a' }}>
                          Doctor ID #{app.doctor_id}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                          <Clock size={12} /> {new Date(app.appointment_time).toLocaleString()}
                        </div>
                        {app.reason && (
                          <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px' }}>
                            Reason: {app.reason}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 600,
                            backgroundColor: app.status === 'confirmed' ? '#dcfce7' : '#fef3c7',
                            color: app.status === 'confirmed' ? '#166534' : '#92400e',
                          }}
                        >
                          {app.status.toUpperCase()}
                        </span>
                        <button
                          onClick={() => handleCancelAppointment(app.id)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#fee2e2',
                            color: '#991b1b',
                            fontSize: '12px',
                            fontWeight: 500,
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        {/* TAB 5: ADMIN-ONLY CLINICAL ANALYTICS & LINEAR REGRESSION DASHBOARD */}
        {activeTab === 'admin' && (
          <AdminDashboard apiHost={API_HOST} onAppointmentsChanged={fetchAppointments} />
        )}
      </main>
    </div>
  );
}
