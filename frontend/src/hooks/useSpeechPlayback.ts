/**
 * MediVoice AI - Speech Playback Hook
 *
 * Provides resilient, non-overlapping audio playback using backend Edge-TTS stream
 * with seamless fallback to client-side SpeechSynthesis.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { voiceService } from '../services/voiceService';
import { SupportedLanguage } from '../types/voice';

export function useSpeechPlayback() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentSpeakingId, setCurrentSpeakingId] = useState<string | null>(null);

  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const isSpeechSynthesisRef = useRef<boolean>(false);

  // Stop any active speech completely
  const stop = useCallback(() => {
    // 1. Stop HTML5 audio stream if playing
    if (audioElementRef.current) {
      try {
        audioElementRef.current.pause();
        audioElementRef.current.currentTime = 0;
        audioElementRef.current.src = '';
      } catch (e) {
        console.warn('AudioElement pause notice:', e);
      }
      audioElementRef.current = null;
    }

    // 2. Cancel SpeechSynthesis if active
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {
        console.warn('SpeechSynthesis cancel notice:', e);
      }
    }

    isSpeechSynthesisRef.current = false;
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentSpeakingId(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  /**
   * Speak clinical text aloud using server Edge-TTS stream, with client SpeechSynthesis fallback.
   */
  const speak = useCallback(
    async (
      text: string,
      language: SupportedLanguage = 'en',
      messageId?: string
    ): Promise<boolean> => {
      stop(); // Prevent overlapping speech

      const cleanText = text
        .replace(/\[[^\]]+\]/g, '')
        .replace(/#{1,6}\s*(\d+\.?\s*)?/g, '$1')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/[🚨⚠️ℹ️✓🩺❤️📅⏰•—–]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (!cleanText) return false;

      setIsPlaying(true);
      setIsPaused(false);
      setCurrentSpeakingId(messageId || 'global');

      // Strategy A: Stream high-quality Edge-TTS MP3 from backend
      try {
        const streamUrl = voiceService.getStreamSpeechUrl(cleanText, language);
        const audio = new Audio(streamUrl);
        audioElementRef.current = audio;

        const playbackPromise = new Promise<boolean>((resolve) => {
          audio.onended = () => {
            setIsPlaying(false);
            setIsPaused(false);
            setCurrentSpeakingId(null);
            resolve(true);
          };

          audio.onerror = () => {
            console.warn('Backend TTS audio stream failed, falling back to browser SpeechSynthesis.');
            resolve(false);
          };
        });

        await audio.play();
        const success = await playbackPromise;
        if (success) return true;
      } catch (audioErr) {
        console.warn('Server TTS stream could not play:', audioErr);
      }

      // Strategy B: Browser Web SpeechSynthesis fallback
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(cleanText);
          utterance.lang = language === 'te' ? 'te-IN' : 'en-US';
          utterance.rate = 0.95; // Slightly slower, clear clinical cadence

          // Attempt to find a suitable installed voice
          const voices = window.speechSynthesis.getVoices();
          if (voices && voices.length > 0) {
            const preferred = voices.find((v) =>
              language === 'te'
                ? v.lang.startsWith('te')
                : v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Jenny'))
            );
            if (preferred) {
              utterance.voice = preferred;
            }
          }

          return new Promise<boolean>((resolve) => {
            utterance.onend = () => {
              setIsPlaying(false);
              setIsPaused(false);
              setCurrentSpeakingId(null);
              resolve(true);
            };

            utterance.onerror = (e) => {
              console.warn('SpeechSynthesis utterance error:', e);
              setIsPlaying(false);
              setIsPaused(false);
              setCurrentSpeakingId(null);
              resolve(false);
            };

            isSpeechSynthesisRef.current = true;
            window.speechSynthesis.speak(utterance);
          });
        } catch (synthErr) {
          console.warn('SpeechSynthesis invocation failed:', synthErr);
        }
      }

      setIsPlaying(false);
      setIsPaused(false);
      setCurrentSpeakingId(null);
      return false;
    },
    [stop]
  );

  const pause = useCallback(() => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      setIsPaused(true);
    } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  }, []);

  const resume = useCallback(() => {
    if (audioElementRef.current && isPaused) {
      audioElementRef.current.play();
      setIsPaused(false);
    } else if (typeof window !== 'undefined' && 'speechSynthesis' in window && isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    }
  }, [isPaused]);

  return {
    isPlaying,
    isPaused,
    currentSpeakingId,
    speak,
    stop,
    pause,
    resume,
  };
}
