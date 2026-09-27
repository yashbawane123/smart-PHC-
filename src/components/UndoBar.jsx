import React, { useEffect, useState } from 'react';
import { RotateCcw, Volume2 } from 'lucide-react';
import { speakText, playSoundTone } from '../utils/audioEngine';

export default function UndoBar({ actionMessage, onUndo, onExpire, durationMs = 5000, lang = 'hi' }) {
  const [timeLeft, setTimeLeft] = useState(durationMs);

  useEffect(() => {
    // Play voice audio prompt
    const undoWord = lang === 'mr' ? 'मागे घ्यायचे?' : lang === 'hi' ? 'वापस लें?' : 'Undo?';
    speakText(undoWord, lang);

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 100) {
          clearInterval(interval);
          onExpire();
          return 0;
        }
        return prev - 100;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [lang, onExpire]);

  const handleUndoTap = () => {
    playSoundTone('undo');
    onUndo();
  };

  const progressPercent = (timeLeft / durationMs) * 100;

  return (
    <div className="undo-floating-bar">
      <div className="undo-info">
        <Volume2 size={24} color="var(--color-warning)" />
        <div>
          <div>{actionMessage}</div>
          <div style={{ height: '4px', background: '#4A5568', borderRadius: '2px', marginTop: '6px', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${progressPercent}%`,
                background: 'var(--color-warning)',
                transition: 'width 0.1s linear'
              }}
            />
          </div>
        </div>
      </div>

      <button className="btn-undo-action" onClick={handleUndoTap}>
        <RotateCcw size={20} />
        <span>{lang === 'mr' ? 'मागे घ्या' : lang === 'hi' ? 'वापस लें' : 'Undo'}</span>
      </button>
    </div>
  );
}
