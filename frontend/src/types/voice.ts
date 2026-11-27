/**
 * MediVoice AI - Voice Subsystem Types
 */

export type VoiceState =
  | 'IDLE'
  | 'REQUESTING_PERMISSION'
  | 'LISTENING'
  | 'RECORDING'
  | 'TRANSCRIBING'
  | 'PROCESSING'
  | 'SPEAKING'
  | 'ERROR';

export type SupportedLanguage = 'en' | 'te';

export interface ClinicalCitation {
  content?: string;
  source?: string;
  page?: any;
  similarity_score?: number;
}

export interface BookedAppointmentDetails {
  id?: number;
  doctor_id?: number;
  doctor_name?: string;
  department?: string;
  appointment_time?: string;
  status?: string;
  reason?: string;
}

export interface VoiceMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  language?: SupportedLanguage;
  isEmergency?: boolean;
  citations?: ClinicalCitation[];
  bookedAppointment?: BookedAppointmentDetails;
}

export interface TranscribeResponse {
  transcription: string;
  detected_language: string;
  processing_time: number;
  success: boolean;
  error?: string | null;
}

export interface SynthesizeResponse {
  audio_url?: string | null;
  audio_base64?: string | null;
  language: string;
  duration_est?: number | null;
  success: boolean;
  error?: string | null;
}

export interface VoiceChatResponse {
  response_text: string;
  language: string;
  requires_tts: boolean;
  citations: ClinicalCitation[];
  is_emergency: boolean;
  booked_appointment?: BookedAppointmentDetails | null;
  audio_url?: string | null;
  error?: string | null;
}
