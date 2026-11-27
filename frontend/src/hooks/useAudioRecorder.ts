/**
 * MediVoice AI - Audio Recorder Hook
 *
 * Reliable MediaDevices & MediaRecorder management with real-time Web Audio API
 * AnalyserNode 8-band frequency extraction and complete resource cleanup.
 */

import { useState, useRef, useCallback, useEffect } from 'react';

export interface AudioRecorderState {
  isRecording: boolean;
  isPermissionRequested: boolean;
  permissionError: string | null;
  durationSeconds: number;
  frequencyData: number[]; // 8 normalized values between 0.0 and 1.0
  volumeLevel: number; // 0.0 to 1.0
}

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [isPermissionRequested, setIsPermissionRequested] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [frequencyData, setFrequencyData] = useState<number[]>([0, 0, 0, 0, 0, 0, 0, 0]);
  const [volumeLevel, setVolumeLevel] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<any>(null);

  // Clean up all audio hardware resources
  const cleanupResources = useCallback(() => {
    // 1. Cancel meter loop
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // 2. Clear timer
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    // 3. Stop all audio tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          console.warn('Track stop notice:', e);
        }
      });
      mediaStreamRef.current = null;
    }

    // 4. Close AudioContext
    if (audioContextRef.current) {
      try {
        if (audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close();
        }
      } catch (e) {
        console.warn('AudioContext close notice:', e);
      }
      audioContextRef.current = null;
    }

    analyserRef.current = null;
    mediaRecorderRef.current = null;
    setFrequencyData([0, 0, 0, 0, 0, 0, 0, 0]);
    setVolumeLevel(0);
  }, []);

  // Make sure resources are closed if component unmounts
  useEffect(() => {
    return () => {
      cleanupResources();
    };
  }, [cleanupResources]);

  /**
   * Request microphone stream and start recording.
   */
  const startRecording = useCallback(async (): Promise<boolean> => {
    cleanupResources();
    setPermissionError(null);
    setIsPermissionRequested(true);
    setDurationSeconds(0);
    audioChunksRef.current = [];

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support microphone audio capture.');
      }

      // Request microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      mediaStreamRef.current = stream;
      setIsPermissionRequested(false);

      // 1. Determine optimal supported MIME type
      let mimeType = '';
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
          mimeType = 'audio/ogg;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        }
      }

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // 2. Set up Web Audio AnalyserNode for 8 frequency bands
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const audioCtx = new AudioCtx();
          audioContextRef.current = audioCtx;
          if (audioCtx.state === 'suspended') {
            await audioCtx.resume();
          }

          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64; // Gives 32 frequency bins
          analyser.smoothingTimeConstant = 0.8;
          source.connect(analyser);
          analyserRef.current = analyser;

          const freqBuffer = new Uint8Array(analyser.frequencyBinCount);

          const updateMeter = () => {
            if (!analyserRef.current) return;
            analyserRef.current.getByteFrequencyData(freqBuffer);

            // Group into 8 representative frequency bands
            // bins roughly corresponding to bass, mid, treble
            const bands = [0, 0, 0, 0, 0, 0, 0, 0];
            const binStep = Math.max(1, Math.floor(freqBuffer.length / 8));
            let totalVolume = 0;

            for (let i = 0; i < 8; i++) {
              let sum = 0;
              for (let j = 0; j < binStep; j++) {
                const idx = i * binStep + j;
                if (idx < freqBuffer.length) {
                  sum += freqBuffer[idx];
                }
              }
              const avg = sum / binStep;
              bands[i] = Math.min(1.0, Math.max(0.05, avg / 220.0));
              totalVolume += avg;
            }

            setFrequencyData(bands);
            setVolumeLevel(Math.min(1.0, (totalVolume / (8 * 200.0))));

            animationFrameRef.current = requestAnimationFrame(updateMeter);
          };

          animationFrameRef.current = requestAnimationFrame(updateMeter);
        }
      } catch (audioCtxErr) {
        console.warn('AudioContext visualizer notice:', audioCtxErr);
      }

      // 3. Start recording in chunks of 250ms
      recorder.start(250);
      setIsRecording(true);

      // Start recording timer
      timerIntervalRef.current = setInterval(() => {
        setDurationSeconds((prev) => prev + 1);
      }, 1000);

      return true;
    } catch (err: any) {
      console.error('Microphone start error:', err);
      setIsPermissionRequested(false);
      setIsRecording(false);
      cleanupResources();

      let message = 'Failed to access microphone.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        message = 'Microphone permission was denied. Please allow microphone access in your browser.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        message = 'No microphone device was detected on your computer.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        message = 'Your microphone is currently in use by another application.';
      }
      setPermissionError(message);
      return false;
    }
  }, [cleanupResources]);

  /**
   * Stop recording and return final audio Blob.
   */
  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === 'inactive') {
        cleanupResources();
        setIsRecording(false);
        resolve(null);
        return;
      }

      recorder.onstop = () => {
        const mimeType = recorder.mimeType || 'audio/webm';
        const finalBlob = new Blob(audioChunksRef.current, { type: mimeType });
        cleanupResources();
        setIsRecording(false);
        resolve(finalBlob.size > 0 ? finalBlob : null);
      };

      try {
        recorder.stop();
      } catch (stopErr) {
        console.warn('Recorder stop error:', stopErr);
        cleanupResources();
        setIsRecording(false);
        resolve(null);
      }
    });
  }, [cleanupResources]);

  /**
   * Cancel and discard recording without returning data.
   */
  const cancelRecording = useCallback(() => {
    cleanupResources();
    setIsRecording(false);
    audioChunksRef.current = [];
  }, [cleanupResources]);

  return {
    isRecording,
    isPermissionRequested,
    permissionError,
    durationSeconds,
    frequencyData,
    volumeLevel,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}
