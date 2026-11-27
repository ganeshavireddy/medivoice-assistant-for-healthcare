/**
 * MediVoice AI - Audio Visualizer Component
 *
 * Renders 8 dynamic frequency bars and active voice pulse indicator.
 */

import React from 'react';
import { Mic, Radio } from 'lucide-react';

interface AudioVisualizerProps {
  frequencyData: number[]; // 8 normalized values [0.0 - 1.0]
  durationSeconds: number;
  volumeLevel: number;
  language: 'en' | 'te';
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  frequencyData,
  durationSeconds,
  volumeLevel,
  language,
}) => {
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
  };

  const hasVoice = volumeLevel > 0.08;

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur-md transition-all">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                hasVoice ? 'bg-emerald-400' : 'bg-rose-400'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-3 w-3 ${
                hasVoice ? 'bg-emerald-500' : 'bg-rose-500'
              }`}
            />
          </span>
          <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
            {language === 'te' ? 'మైక్రోఫోన్ ఆక్టివ్' : 'Live Voice Capture'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`text-xs px-2.5 py-0.5 rounded-full font-medium transition-colors ${
              hasVoice
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            {hasVoice
              ? language === 'te'
                ? 'స్వరం గుర్తించబడింది'
                : 'Voice Detected'
              : language === 'te'
              ? 'మాట్లాడండి...'
              : 'Listening...'}
          </span>
          <span className="text-xs font-mono font-bold text-rose-400 bg-rose-950/60 border border-rose-800/40 px-2 py-0.5 rounded-md">
            {formatTime(durationSeconds)}
          </span>
        </div>
      </div>

      {/* 8 Dynamic Animated Audio Frequency Bars */}
      <div className="flex items-end justify-center gap-2 h-14 px-4 bg-slate-950/60 rounded-xl py-2 border border-slate-800/60">
        {frequencyData.map((val, idx) => {
          // Height between 10% and 100%
          const heightPercent = Math.max(10, Math.min(100, Math.round(val * 100)));
          const isHigh = heightPercent > 55;

          return (
            <div
              key={idx}
              className="flex-1 max-w-[14px] flex flex-col justify-end items-center h-full"
            >
              <div
                style={{ height: `${heightPercent}%` }}
                className={`w-full rounded-full transition-all duration-75 ease-out ${
                  isHigh
                    ? 'bg-gradient-to-t from-emerald-500 via-teal-400 to-cyan-300 shadow-[0_0_12px_rgba(20,184,166,0.6)]'
                    : 'bg-gradient-to-t from-blue-600 to-indigo-400'
                }`}
              />
            </div>
          );
        })}
      </div>

      <div className="mt-2 text-center">
        <p className="text-[11px] text-slate-400 font-medium">
          {language === 'te'
            ? 'స్పష్టంగా మాట్లాడండి. ఆపడానికి రెడ్ బటన్ నొక్కండి.'
            : 'Speak naturally into your mic. Press Stop when done.'}
        </p>
      </div>
    </div>
  );
};
