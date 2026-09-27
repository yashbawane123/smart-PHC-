import React, { useState } from 'react';
import { Plus, Minus, X, Volume2, Package, Check } from 'lucide-react';
import TallyDots from './TallyDots';
import { speakText, playSoundTone, triggerHaptic } from '../utils/audioEngine';

export default function CounterSheet({ medicine, currentStock, lang = 'hi', onClose, onUpdateStock }) {
  const [delta, setDelta] = useState(0);
  const [reason, setReason] = useState('dispense'); // dispense | restock | adjustment

  const handleIncrement = (amount) => {
    playSoundTone('add');
    triggerHaptic([40]);
    const newDelta = delta + amount;
    setDelta(newDelta);

    const itemName = lang === 'mr' ? medicine.name_mr || medicine.name_en : lang === 'hi' ? medicine.name_hi || medicine.name_en : medicine.name_en;
    const spokenText = lang === 'mr' ? `${amount} जोडले` : lang === 'hi' ? `${amount} जोड़ा गया` : `${amount} added`;
    speakText(spokenText, lang);
  };

  const handleDecrement = (amount) => {
    playSoundTone('subtract');
    triggerHaptic([40]);
    const newDelta = delta - amount;
    setDelta(newDelta);

    const spokenText = lang === 'mr' ? `${amount} कमी केले` : lang === 'hi' ? `${amount} घटाया गया` : `${amount} subtracted`;
    speakText(spokenText, lang);
  };

  const handleConfirm = () => {
    if (delta === 0) {
      onClose();
      return;
    }
    triggerHaptic([80]);
    onUpdateStock(medicine, delta, reason);
    onClose();
  };

  const projectedCount = Math.max(0, (currentStock?.quantity || 0) + delta);
  const medName = lang === 'mr' ? medicine.name_mr || medicine.name_en : lang === 'hi' ? medicine.name_hi || medicine.name_en : medicine.name_en;

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="counter-sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-handle" />

        {/* Header */}
        <div className="sheet-header">
          <img src={medicine.photo_url} alt={medName} className="sheet-med-photo" />
          <div className="sheet-header-info" style={{ flex: 1 }}>
            <h3>{medName}</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              <span className="unit-tag" style={{ background: 'var(--color-primary-bg)', padding: '2px 8px', borderRadius: '6px', color: 'var(--color-primary)' }}>
                {medicine.unit}
              </span>
              <button
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-primary)' }}
                onClick={() => speakText(medName, lang)}
              >
                <Volume2 size={20} />
              </button>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ width: '48px', height: '48px', borderRadius: '50%', border: 'none', background: '#EDF2F7', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Reason Selector Pills (Zero-literacy icons) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          <button
            style={{
              padding: '12px',
              borderRadius: '16px',
              border: '2px solid',
              borderColor: reason === 'dispense' ? 'var(--color-danger)' : 'var(--color-border)',
              background: reason === 'dispense' ? 'var(--color-danger-bg)' : 'var(--color-surface)',
              fontWeight: 800,
              fontSize: '15px',
              cursor: 'pointer'
            }}
            onClick={() => { setReason('dispense'); speakText(lang === 'mr' ? 'रुग्णाला औषध दिले' : lang === 'hi' ? 'मरीज को दवा दी' : 'Dispense to patient', lang); }}
          >
            💊 {lang === 'mr' ? 'दिले (-)' : lang === 'hi' ? 'दिया (-)' : 'Dispense'}
          </button>

          <button
            style={{
              padding: '12px',
              borderRadius: '16px',
              border: '2px solid',
              borderColor: reason === 'restock' ? 'var(--color-safe)' : 'var(--color-border)',
              background: reason === 'restock' ? 'var(--color-safe-bg)' : 'var(--color-surface)',
              fontWeight: 800,
              fontSize: '15px',
              cursor: 'pointer'
            }}
            onClick={() => { setReason('restock'); setDelta(Math.abs(delta)); speakText(lang === 'mr' ? 'नवीन साठा आला' : lang === 'hi' ? 'नया स्टॉक आया' : 'Restock stock', lang); }}
          >
            📦 {lang === 'mr' ? 'आला (+)' : lang === 'hi' ? 'आया (+)' : 'Restock'}
          </button>

          <button
            style={{
              padding: '12px',
              borderRadius: '16px',
              border: '2px solid',
              borderColor: reason === 'adjustment' ? 'var(--color-primary)' : 'var(--color-border)',
              background: reason === 'adjustment' ? 'var(--color-primary-bg)' : 'var(--color-surface)',
              fontWeight: 800,
              fontSize: '15px',
              cursor: 'pointer'
            }}
            onClick={() => { setReason('adjustment'); speakText('एडजस्टमेंट', lang); }}
          >
            ⚙️ {lang === 'mr' ? 'दुरुस्ती' : lang === 'hi' ? 'गिनती' : 'Adjust'}
          </button>
        </div>

        {/* Big Digit & Tally Dots Display */}
        <div className="counter-hero-box">
          <div className="hero-number">
            {projectedCount}
          </div>
          <div style={{ fontSize: '15px', color: 'var(--color-text-muted)', fontWeight: 700, marginTop: '4px' }}>
            {delta !== 0 && (
              <span style={{ color: delta > 0 ? 'var(--color-safe)' : 'var(--color-danger)', fontWeight: 900 }}>
                ({delta > 0 ? `+${delta}` : delta})
              </span>
            )}
            {' '}{lang === 'mr' ? 'एकूण साठा' : lang === 'hi' ? 'कुल स्टॉक' : 'Total Units'}
          </div>
          {/* Visual Tally Dots */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px' }}>
            <TallyDots count={projectedCount} maxDisplay={30} />
          </div>
        </div>

        {/* Quick Steppers: +1, +5, +10 */}
        <div className="quick-steppers-row">
          <button className="btn-quick-step" onClick={() => handleIncrement(1)}>+1</button>
          <button className="btn-quick-step" onClick={() => handleIncrement(5)}>+5</button>
          <button className="btn-quick-step" onClick={() => handleIncrement(10)}>+10</button>
        </div>

        {/* Giant 96px Buttons: [+] and [-] */}
        <div className="stepper-controls-row">
          <button
            className="btn-counter-giant minus"
            onClick={() => handleDecrement(1)}
          >
            <Minus size={48} strokeWidth={3} />
          </button>
          <button
            className="btn-counter-giant plus"
            onClick={() => handleIncrement(1)}
          >
            <Plus size={48} strokeWidth={3} />
          </button>
        </div>

        {/* Save / Confirm Button */}
        <button
          className="btn-large btn-safe"
          style={{ width: '100%', height: '80px', fontSize: '24px' }}
          onClick={handleConfirm}
        >
          <Check size={32} />
          <span>{lang === 'mr' ? 'जतन करा (Save)' : lang === 'hi' ? 'सुरक्षित करें (Save)' : 'Confirm Save'}</span>
        </button>
      </div>
    </div>
  );
}
