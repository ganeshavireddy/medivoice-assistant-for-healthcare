/**
 * MediVoice AI - Language Selector (Inline Styles)
 */

import React from 'react';
import { Languages } from 'lucide-react';
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
  const pill = (lang: SupportedLanguage, label: string, activeBg: string, activeColor: string) => (
    <button
      key={lang}
      type="button"
      disabled={disabled}
      onClick={() => onChange(lang)}
      style={{
        padding: '4px 12px',
        fontSize: '12px',
        fontWeight: 700,
        borderRadius: '8px',
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        background: language === lang ? activeBg : 'transparent',
        color: language === lang ? activeColor : '#64748b',
        transition: 'all 0.2s',
        fontFamily: 'inherit',
        boxShadow: language === lang ? `0 2px 8px ${activeBg}60` : 'none',
      }}
    >
      {label}
    </button>
  );

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px',
        background: 'rgba(15,23,42,0.8)',
        border: '1px solid #334155',
        borderRadius: '12px',
      }}
    >
      <Languages size={13} style={{ color: '#3b82f6', marginLeft: '6px' }} />
      {pill('en', 'English (EN)', '#2563eb', '#fff')}
      {pill('te', 'తెలుగు (TE)', '#0d9488', '#fff')}
    </div>
  );
};
