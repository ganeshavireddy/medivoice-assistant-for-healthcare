/**
 * MediVoice AI - Voice API Client Service
 */

import {
  TranscribeResponse,
  SynthesizeResponse,
  VoiceChatResponse,
  SupportedLanguage,
} from '../types/voice';

let rawApiHost = (import.meta.env.VITE_API_URL as string || '').trim().replace(/\/$/, '');
if (rawApiHost && !rawApiHost.startsWith('http://') && !rawApiHost.startsWith('https://')) {
  rawApiHost = `https://${rawApiHost}`;
}
export const API_HOST = rawApiHost;
export const API_BASE = `${API_HOST}/api/v1`;

class VoiceService {
  /**
   * Upload recorded audio blob to the backend for speech recognition.
   */
  async transcribeAudio(
    audioBlob: Blob,
    language: SupportedLanguage = 'en'
  ): Promise<TranscribeResponse> {
    const formData = new FormData();
    // Default file name and extension
    const extension = audioBlob.type.includes('ogg') ? 'ogg' : (audioBlob.type.includes('wav') ? 'wav' : 'webm');
    formData.append('file', audioBlob, `speech_recording.${extension}`);
    formData.append('language', language);

    try {
      const response = await fetch(`${API_BASE}/voice/transcribe`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          transcription: '',
          detected_language: language,
          processing_time: 0,
          success: false,
          error: `Server responded with ${response.status}: ${errorText}`,
        };
      }

      return await response.json();
    } catch (err: any) {
      return {
        transcription: '',
        detected_language: language,
        processing_time: 0,
        success: false,
        error: err.message || 'Network error while uploading speech audio.',
      };
    }
  }

  /**
   * Request text-to-speech synthesis from the backend.
   */
  async synthesizeSpeech(
    text: string,
    language: SupportedLanguage = 'en'
  ): Promise<SynthesizeResponse> {
    try {
      const response = await fetch(`${API_BASE}/voice/synthesize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language }),
      });

      if (!response.ok) {
        return {
          language,
          success: false,
          error: `Synthesis HTTP error: ${response.status}`,
        };
      }

      return await response.json();
    } catch (err: any) {
      return {
        language,
        success: false,
        error: err.message || 'Failed to reach speech synthesis service.',
      };
    }
  }

  /**
   * Direct streaming audio URL for HTML5 Audio playback.
   */
  getStreamSpeechUrl(text: string, language: SupportedLanguage = 'en'): string {
    return `${API_BASE}/voice/stream_speech?text=${encodeURIComponent(text)}&language=${language}`;
  }

  /**
   * Send transcribed or typed message to the MasterMedicalAgent.
   */
  async sendVoiceChat(
    message: string,
    language: SupportedLanguage = 'en',
    userId: number = 1
  ): Promise<VoiceChatResponse> {
    try {
      const response = await fetch(`${API_BASE}/voice/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, language, user_id: userId }),
      });

      if (!response.ok) {
        throw new Error(`Medical chat HTTP error ${response.status}`);
      }

      return await response.json();
    } catch (err: any) {
      return {
        response_text:
          language === 'te'
            ? 'క్షమించండి, సర్వర్‌లో సాంకేతిక సమస్య ఏర్పడింది. దయచేసి అత్యవసరమైతే 112 లేదా 108 కు కాల్ చేయండి.'
            : 'I apologize, but I encountered a connection issue. If this is an emergency, please call 112 or 108 immediately.',
        language,
        requires_tts: true,
        citations: [],
        is_emergency: false,
        error: err.message,
      };
    }
  }

  /**
   * Reset conversation memory for the current session.
   */
  async clearSession(userId: number = 1): Promise<void> {
    try {
      await fetch(`${API_BASE}/voice/session/clear?user_id=${userId}`, {
        method: 'POST',
      });
    } catch (e) {
      console.warn('Failed to clear voice session on backend:', e);
    }
  }
}

export const voiceService = new VoiceService();
