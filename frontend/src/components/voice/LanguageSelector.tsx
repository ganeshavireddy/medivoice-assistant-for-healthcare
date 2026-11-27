/**
 * MediVoice AI - Language Selector Component
 *
 * Provides a bilingual pill selector for English and Telugu.
 */

import React from 'react';
import { Globe, Languages } from 'lucide-react';
import { SupportedLanguage } from '../../types/voice';

interface LanguageSelectorProps {
  language: SupportedLanguage;
  onChange: (lang: SupportedLanguage) => void;
  disabled?: boolean;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  language,
  onChange,
  disabled = false,
}) => {
  return (
    <div className="inline-flex items-center gap-1.5 p-1 bg-slate-900/80 border border-slate-700/80 rounded-xl backdrop-blur-sm shadow-inner">
      <div className="pl-2 pr-1 text-slate-400 flex items-center gap-1 text-xs font-medium">
        <Languages className="w-3.5 h-3.5 text-blue-400" />
      </div>

      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange('en')}
        className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
          language === 'en'
            ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        English (EN)
      </button>

      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange('te')}
        className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
          language === 'te'
            ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30 font-bold'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        తెలుగు (TE)
      </button>
    </div>
  );
};
