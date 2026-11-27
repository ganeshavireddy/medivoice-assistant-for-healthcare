/**
 * MediVoice AI - Master Voice Assistant Hook
 *
 * Implements a strict finite state machine:
 * IDLE -> REQUESTING_PERMISSION -> RECORDING -> TRANSCRIBING -> PROCESSING -> SPEAKING -> IDLE / ERROR.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  VoiceState,
  VoiceMessage,
  SupportedLanguage,
  VoiceChatResponse,
} from '../types/voice';
import { useAudioRecorder } from './useAudioRecorder';
import { useSpeechPlayback } from './useSpeechPlayback';
import { voiceService } from '../services/voiceService';

export interface UseVoiceAssistantOptions {
  userId?: number;
  initialLanguage?: SupportedLanguage;
  onAppointmentBooked?: (appointment: any) => void;
}

export function useVoiceAssistant({
  userId = 1,
  initialLanguage = 'en',
  onAppointmentBooked,
}: UseVoiceAssistantOptions = {}) {
  const [state, setState] = useState<VoiceState>('IDLE');
  const [language, setLanguage] = useState<SupportedLanguage>(initialLanguage);
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [statusMessage, setStatusMessage] = useState<string>('Ready to listen');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [autoSpeak, setAutoSpeak] = useState<boolean>(true);

  const recorder = useAudioRecorder();
  const playback = useSpeechPlayback();

  // Keep a ref to latest state to prevent race conditions during rapid clicks
  const stateRef = useRef<VoiceState>('IDLE');
  stateRef.current = state;

  // Sync language state with options if changed externally
  useEffect(() => {
    if (initialLanguage) {
      setLanguage(initialLanguage);
    }
  }, [initialLanguage]);

  // Synchronize status message based on state transitions
  useEffect(() => {
    switch (state) {
      case 'IDLE':
        setStatusMessage(
          language === 'te'
            ? 'మాట్లాడటానికి మైక్రోఫోన్ నొక్కండి'
            : 'Click microphone to speak your symptoms'
        );
        break;
      case 'REQUESTING_PERMISSION':
        setStatusMessage(
          language === 'te'
            ? 'మైక్రోఫోన్ అనుమతి అభ్యర్థిస్తోంది...'
            : 'Requesting microphone permission...'
        );
        break;
      case 'RECORDING':
      case 'LISTENING':
        setStatusMessage(
          language === 'te'
            ? `వింటోంది... మాట్లాడుతున్నారు (${recorder.durationSeconds}s)`
            : `Listening... speak clearly (${recorder.durationSeconds}s)`
        );
        break;
      case 'TRANSCRIBING':
        setStatusMessage(
          language === 'te'
            ? 'మీ స్వరాన్ని టెక్స్ట్‌గా మారుస్తోంది...'
            : 'Transcribing your speech via Faster-Whisper...'
        );
        break;
      case 'PROCESSING':
        setStatusMessage(
          language === 'te'
            ? 'క్లినికల్ సమాధానం సిద్ధం చేస్తోంది...'
            : 'Consulting clinical guidelines and agent...'
        );
        break;
      case 'SPEAKING':
        setStatusMessage(
          language === 'te'
            ? 'సమాధానం చదువుతోంది...'
            : 'Speaking clinical guidance aloud...'
        );
        break;
      case 'ERROR':
        setStatusMessage(errorMessage || 'An error occurred.');
        break;
    }
  }, [state, language, recorder.durationSeconds, errorMessage]);

  /**
   * Start Voice Recording Session.
   */
  const startRecordingSession = useCallback(async () => {
    if (stateRef.current !== 'IDLE' && stateRef.current !== 'ERROR') {
      return;
    }

    playback.stop();
    setErrorMessage(null);
    setState('REQUESTING_PERMISSION');

    const started = await recorder.startRecording();
    if (started) {
      setState('RECORDING');
    } else {
      setState('ERROR');
      setErrorMessage(recorder.permissionError || 'Could not start audio recording.');
    }
  }, [recorder, playback]);

  /**
   * Process a text or transcribed prompt through MasterMedicalAgent.
   */
  const processMessage = useCallback(
    async (text: string, currentLang: SupportedLanguage) => {
      const cleanInput = text.trim();
      if (!cleanInput) {
        setState('IDLE');
        return;
      }

      // 1. Add User Message to History
      const userMsgId = `user_${Date.now()}`;
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const userMessage: VoiceMessage = {
        id: userMsgId,
        sender: 'user',
        text: cleanInput,
        timestamp: nowStr,
        language: currentLang,
      };

      setMessages((prev) => [...prev, userMessage]);
      setState('PROCESSING');

      // 2. Send to Medical Agent API
      const response: VoiceChatResponse = await voiceService.sendVoiceChat(
        cleanInput,
        currentLang,
        userId
      );

      // 3. Add AI Response Message
      const aiMsgId = `ai_${Date.now()}`;
      const aiMessage: VoiceMessage = {
        id: aiMsgId,
        sender: 'ai',
        text: response.response_text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        language: (response.language as SupportedLanguage) || currentLang,
        isEmergency: response.is_emergency,
        citations: response.citations,
        bookedAppointment: response.booked_appointment || undefined,
      };

      setMessages((prev) => [...prev, aiMessage]);

      // If an appointment was booked dynamically, notify parent callback
      if (response.booked_appointment && onAppointmentBooked) {
        onAppointmentBooked(response.booked_appointment);
      }

      // 4. Voice Playback if auto-speak is enabled
      if (autoSpeak && response.response_text) {
        setState('SPEAKING');
        await playback.speak(response.response_text, aiMessage.language, aiMsgId);
      }

      setState('IDLE');
    },
    [userId, autoSpeak, playback, onAppointmentBooked]
  );

  /**
   * Stop Voice Recording and upload to STT.
   */
  const stopRecordingSession = useCallback(async () => {
    if (stateRef.current !== 'RECORDING') {
      return;
    }

    setState('TRANSCRIBING');
    const audioBlob = await recorder.stopRecording();

    if (!audioBlob || audioBlob.size < 400) {
      setState('IDLE');
      setStatusMessage(
        language === 'te'
          ? 'శబ్దం గుర్తించబడలేదు. మళ్లీ ప్రయత్నించండి.'
          : 'No audible speech detected. Please speak closer to the mic.'
      );
      return;
    }

    // Call transcription endpoint
    const transcribeRes = await voiceService.transcribeAudio(audioBlob, language);

    if (transcribeRes.success && transcribeRes.transcription.trim()) {
      const detectedLang = (transcribeRes.detected_language as SupportedLanguage) || language;
      await processMessage(transcribeRes.transcription.trim(), detectedLang);
    } else {
      setState('IDLE');
      const err = transcribeRes.error || 'Could not understand audio.';
      setStatusMessage(
        language === 'te'
          ? 'క్షమించండి, మీ మాటలు స్పష్టంగా వినబడలేదు. మళ్లీ మాట్లాడండి.'
          : err
      );
    }
  }, [recorder, language, processMessage]);

  /**
   * Cancel active recording session without processing.
   */
  const cancelSession = useCallback(() => {
    recorder.cancelRecording();
    playback.stop();
    setState('IDLE');
    setErrorMessage(null);
  }, [recorder, playback]);

  /**
   * Send a manual text message (fallback when microphone is inactive).
   */
  const sendTextMessage = useCallback(
    async (text: string) => {
      if (stateRef.current === 'PROCESSING' || stateRef.current === 'TRANSCRIBING') {
        return;
      }
      await processMessage(text, language);
    },
    [language, processMessage]
  );

  /**
   * Speak a specific message aloud.
   */
  const speakMessage = useCallback(
    async (messageId: string, text: string, msgLang?: SupportedLanguage) => {
      playback.stop();
      setState('SPEAKING');
      await playback.speak(text, msgLang || language, messageId);
      setState('IDLE');
    },
    [language, playback]
  );

  /**
   * Stop any active audio playback.
   */
  const stopSpeaking = useCallback(() => {
    playback.stop();
    if (stateRef.current === 'SPEAKING') {
      setState('IDLE');
    }
  }, [playback]);

  /**
   * Clear session messages on UI and backend.
   */
  const clearConversation = useCallback(async () => {
    playback.stop();
    recorder.cancelRecording();
    setState('IDLE');
    setMessages([]);
    await voiceService.clearSession(userId);
  }, [recorder, playback, userId]);

  return {
    state,
    language,
    messages,
    statusMessage,
    errorMessage,
    autoSpeak,
    frequencyData: recorder.frequencyData,
    durationSeconds: recorder.durationSeconds,
    volumeLevel: recorder.volumeLevel,
    isSpeaking: playback.isPlaying,
    currentSpeakingId: playback.currentSpeakingId,
    setLanguage,
    setAutoSpeak,
    startRecordingSession,
    stopRecordingSession,
    cancelSession,
    sendTextMessage,
    speakMessage,
    stopSpeaking,
    clearConversation,
  };
}
