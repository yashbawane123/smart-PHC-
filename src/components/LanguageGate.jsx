import React from 'react';
import { Volume2 } from 'lucide-react';
import { speakText, triggerHaptic } from '../utils/audioEngine';

export default function LanguageGate({ onSelectLanguage }) {
  const handleSelect = (langCode, spokenName) => {
    triggerHaptic([60]);
    speakText(spokenName, langCode);
    setTimeout(() => {
      onSelectLanguage(langCode);
    }, 400);
  };

  return (
    <div
      style={{
        padding: '32px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '80vh',
        gap: '30px',
        textAlign: 'center'
      }}
    >
      <div
        style={{
          width: '100px',
          height: '100px',
          borderRadius: '30px',
          background: 'var(--color-primary-bg)',
          color: 'var(--color-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '48px',
          boxShadow: 'var(--shadow-md)'
        }}
      >
        🏥
      </div>

      <div>
        <h1 style={{ fontSize: '32px', fontWeight: 900, color: 'var(--color-primary)', marginBottom: '8px' }}>
          स्मार्ट PHC ट्रॅकर
        </h1>
        <p style={{ fontSize: '18px', color: 'var(--color-text-muted)', fontWeight: 600 }}>
          भाषा निवडा / भाषा चुनें / Select Language
        </p>
      </div>

      {/* Flag Cards - 96px Min Touch Targets with Spoken Audio */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
        <button
          className="btn-large"
          style={{
            height: '96px',
            background: 'linear-gradient(135deg, #FF9933 0%, #FFFFFF 50%, #128807 100%)',
            color: '#000000',
            border: '3px solid #000',
            justifyContent: 'space-between',
            padding: '0 24px'
          }}
          onClick={() => handleSelect('hi', 'हिंदी भाषा')}
        >
          <span style={{ fontSize: '36px' }}>🇮🇳</span>
          <span style={{ fontSize: '26px', fontWeight: 900, background: 'rgba(255,255,255,0.9)', padding: '4px 16px', borderRadius: '12px' }}>
            हिंदी (Hindi)
          </span>
          <Volume2 size={32} />
        </button>

        <button
          className="btn-large"
          style={{
            height: '96px',
            background: 'linear-gradient(135deg, #FF671F 0%, #FFFFFF 50%, #046A38 100%)',
            color: '#000000',
            border: '3px solid #000',
            justifyContent: 'space-between',
            padding: '0 24px'
          }}
          onClick={() => handleSelect('mr', 'मराठी भाषा')}
        >
          <span style={{ fontSize: '36px' }}>🚩</span>
          <span style={{ fontSize: '26px', fontWeight: 900, background: 'rgba(255,255,255,0.9)', padding: '4px 16px', borderRadius: '12px' }}>
            मराठी (Marathi)
          </span>
          <Volume2 size={32} />
        </button>

        <button
          className="btn-large"
          style={{
            height: '96px',
            background: '#0D47A1',
            color: '#FFFFFF',
            justifyContent: 'space-between',
            padding: '0 24px'
          }}
          onClick={() => handleSelect('en', 'English language')}
        >
          <span style={{ fontSize: '36px' }}>🇬🇧</span>
          <span style={{ fontSize: '26px', fontWeight: 900 }}>
            English
          </span>
          <Volume2 size={32} />
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-muted)', fontSize: '15px' }}>
        <Volume2 size={20} />
        <span>Tapping flag plays language audio</span>
      </div>
    </div>
  );
}
