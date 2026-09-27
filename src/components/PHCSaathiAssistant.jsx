import React, { useState, useEffect } from 'react';
import { Mic, MicOff, PhoneCall, AlertTriangle, Check, X, Volume2, ShieldAlert, Pill, Footprints, UserCheck } from 'lucide-react';
import { processSaathiIntent, logSaathiInteraction, SAATHI_RESPONSES } from '../utils/phcSaathiEngine';
import { speakText, playSoundTone, triggerHaptic } from '../utils/audioEngine';
import { db, DEFAULT_PHC_ID, WORKER_PROFILE_ID } from '../db/offlineDb';
import { syncEngine } from '../utils/syncEngine';

export default function PHCSaathiAssistant({ lang = 'hi', onNavigate }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [saathiState, setSaathiState] = useState(null); // intent payload
  const [failCount, setFailCount] = useState(0); // 2x STT failure tracker
  const [showPictureFallback, setShowPictureFallback] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);

  // Web Speech Recognition setup
  const [recognition, setRecognition] = useState(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechClass = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechClass) {
        const rec = new SpeechClass();
        rec.continuous = false;
        rec.interimResults = false;

        const langMap = { hi: 'hi-IN', mr: 'mr-IN', en: 'en-IN' };
        rec.lang = langMap[lang] || 'hi-IN';

        rec.onresult = async (event) => {
          const text = event.results[0][0].transcript;
          setTranscript(text);
          setIsListening(false);
          triggerHaptic([40]);
          await handleSpeechInput(text);
        };

        rec.onerror = (err) => {
          console.warn('STT Recognition Error:', err);
          setIsListening(false);
          handleSTTFailure();
        };

        rec.onend = () => {
          setIsListening(false);
        };

        setRecognition(rec);
      }
    }
  }, [lang]);

  const startListening = () => {
    triggerHaptic([60]);
    playSoundTone('tap');
    setIsOpen(true);
    setTranscript('');
    setSaathiState(null);

    if (recognition) {
      try {
        const langMap = { hi: 'hi-IN', mr: 'mr-IN', en: 'en-IN' };
        recognition.lang = langMap[lang] || 'hi-IN';
        recognition.start();
        setIsListening(true);
        speakText(lang === 'mr' ? 'मी ऐकत आहे...' : lang === 'hi' ? 'मैं सुन रहा हूँ...' : 'Listening...', lang);
      } catch (err) {
        console.warn('Recognition start error:', err);
        handleSTTFailure();
      }
    } else {
      handleSTTFailure();
    }
  };

  const handleSTTFailure = () => {
    const nextFail = failCount + 1;
    setFailCount(nextFail);

    if (nextFail >= 2) {
      // 2x Failure Fallback -> Show Big Picture Menu
      setShowPictureFallback(true);
      speakText(lang === 'mr' ? 'स्क्रीनवरील पर्याय निवडा' : lang === 'hi' ? 'स्क्रीन पर दिए गए विकल्प चुनें' : 'Please select an option from screen', lang);
    } else {
      speakText(lang === 'mr' ? 'पुन्हा बोला' : lang === 'hi' ? 'कृपया दोबारा बोलें' : 'Please speak again', lang);
    }
  };

  const handleSpeechInput = async (inputText) => {
    setFailCount(0); // Reset fail counter on successful speech
    setShowPictureFallback(false);

    const result = await processSaathiIntent(inputText, lang);
    setSaathiState(result);

    // Speak Pre-Approved Native Audio Response
    speakText(result.responseText, lang);

    // Log Interaction (DPDP Compliant)
    await logSaathiInteraction(result.intent, inputText, result.responseText);

    // Emergency check
    if (result.showEmergencyModal) {
      setShowEmergencyModal(true);
    }
  };

  const handleConfirmAction = async () => {
    if (!saathiState || !saathiState.pendingAction) return;

    const action = saathiState.pendingAction;
    triggerHaptic([80]);

    try {
      if (action.type === 'stock_write') {
        const { medicine, delta, reason } = action;
        const stocks = await db.medicine_stock.toArray();
        const current = stocks.find(s => s.medicine_id === medicine.id) || { quantity: 0 };
        const newQty = Math.max(0, current.quantity + delta);

        await db.medicine_stock.put({
          id: current.id || `stock-${medicine.id}`,
          medicine_id: medicine.id,
          quantity: newQty,
          updated_at: new Date().toISOString()
        });

        // Write Audit Movement with reason='voice_adjustment'
        await db.stock_movements.add({
          id: `mov-voice-${Date.now()}`,
          medicine_id: medicine.id,
          change: delta,
          reason: 'voice_adjustment',
          created_by: WORKER_PROFILE_ID,
          created_at: new Date().toISOString(),
          synced: 0
        });

        syncEngine.triggerSync();
        speakText(SAATHI_RESPONSES[lang]?.saved_success || 'Saved', lang);
      } else if (action.type === 'footfall_write') {
        const { department, count } = action;
        const todayStr = new Date().toISOString().split('T')[0];
        const records = await db.patient_footfall.where('visit_date').equals(todayStr).toArray();
        const current = records.find(r => r.department_id === department.id)?.count || 0;

        await db.patient_footfall.put({
          id: `ff-${department.id}-${todayStr}`,
          phc_id: DEFAULT_PHC_ID,
          department_id: department.id,
          visit_date: todayStr,
          count: current + count,
          updated_at: new Date().toISOString(),
          synced: 0
        });

        syncEngine.triggerSync();
        speakText(SAATHI_RESPONSES[lang]?.saved_success || 'Saved', lang);
      } else if (action.type === 'attendance_write') {
        const { doctor, status } = action;
        const todayStr = new Date().toISOString().split('T')[0];

        await db.doctor_attendance.put({
          id: `att-${doctor.id}-${todayStr}-full_day`,
          doctor_id: doctor.id,
          attendance_date: todayStr,
          session: 'full_day',
          status: status,
          marked_by: WORKER_PROFILE_ID,
          marked_at: new Date().toISOString(),
          synced: 0
        });

        syncEngine.triggerSync();
        speakText(SAATHI_RESPONSES[lang]?.saved_success || 'Saved', lang);
      }
    } catch (err) {
      console.error('Voice action execution error:', err);
    } finally {
      setSaathiState(null);
      setIsOpen(false);
    }
  };

  const handleCancelAction = () => {
    playSoundTone('undo');
    speakText(SAATHI_RESPONSES[lang]?.action_cancelled || 'Cancelled', lang);
    setSaathiState(null);
    setIsOpen(false);
  };

  return (
    <>
      {/* 1. Floating 88px Pulsing Mic Button (Bottom-Right) */}
      <button
        className={`saathi-floating-mic ${isListening ? 'listening' : ''}`}
        onClick={startListening}
        title="PHC Saathi Voice Assistant"
      >
        <Mic size={40} color="white" />
        <span className="mic-pulse-ring" />
      </button>

      {/* 2. Main Assistant Modal Overlay */}
      {isOpen && (
        <div className="sheet-overlay" onClick={() => setIsOpen(false)}>
          <div className="saathi-modal-card" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="saathi-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="saathi-avatar">🤖</div>
                <div>
                  <h3 style={{ fontSize: '20px', fontWeight: 900, color: 'var(--color-primary-dark)' }}>
                    PHC Saathi (वॉइस असिस्टेंट)
                  </h3>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-muted)' }}>
                    {isListening ? 'Listening...' : 'Voice Assistant Active'}
                  </span>
                </div>
              </div>
              <button
                style={{ border: 'none', background: '#EDF2F7', width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer' }}
                onClick={() => setIsOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            {/* Transcript Display */}
            {transcript && (
              <div className="saathi-transcript-box">
                <Volume2 size={20} color="var(--color-primary)" />
                <span>"{transcript}"</span>
              </div>
            )}

            {/* Response Speech Display */}
            {saathiState && (
              <div className="saathi-response-box">
                <p>{saathiState.responseText}</p>
              </div>
            )}

            {/* 3. VISUAL CONFIRMATION CARD (For Stock/Attendance Writes) */}
            {saathiState && saathiState.needsConfirmation && saathiState.pendingAction && (
              <div className="saathi-confirm-card">
                <div style={{ fontWeight: 800, fontSize: '16px', color: 'var(--color-primary-dark)', marginBottom: '8px' }}>
                  ⚠️ {lang === 'mr' ? 'पुष्टी आवश्यक आहे' : lang === 'hi' ? 'पुष्टि आवश्यक है' : 'Confirmation Required'}
                </div>

                {saathiState.pendingAction.type === 'stock_write' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <img src={saathiState.pendingAction.medicine.photo_url} alt="Med" style={{ width: '60px', height: '60px', borderRadius: '14px', objectFit: 'cover' }} />
                    <div>
                      <div style={{ fontWeight: 900, fontSize: '18px' }}>{saathiState.pendingAction.medicine.name_en}</div>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: saathiState.pendingAction.delta > 0 ? 'var(--color-safe-dark)' : 'var(--color-danger-dark)' }}>
                        {saathiState.pendingAction.delta > 0 ? `+${saathiState.pendingAction.delta}` : saathiState.pendingAction.delta} {saathiState.pendingAction.medicine.unit} (Voice Adjustment)
                      </div>
                    </div>
                  </div>
                )}

                {saathiState.pendingAction.type === 'footfall_write' && (
                  <div style={{ fontWeight: 800, fontSize: '18px' }}>
                    🚶 {saathiState.pendingAction.department.name_en}: +{saathiState.pendingAction.count} Patients
                  </div>
                )}

                {saathiState.pendingAction.type === 'attendance_write' && (
                  <div style={{ fontWeight: 800, fontSize: '18px' }}>
                    🩺 {saathiState.pendingAction.doctor.full_name}: {saathiState.pendingAction.status.toUpperCase()}
                  </div>
                )}

                {/* 80px Confirm / Cancel Touch Buttons */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '14px' }}>
                  <button className="btn-large btn-danger" style={{ height: '72px' }} onClick={handleCancelAction}>
                    <X size={28} />
                    <span>Cancel</span>
                  </button>
                  <button className="btn-large btn-safe" style={{ height: '72px' }} onClick={handleConfirmAction}>
                    <Check size={28} />
                    <span>Confirm</span>
                  </button>
                </div>
              </div>
            )}

            {/* 4. STT 2x FAILURE PICTURE MENU FALLBACK */}
            {showPictureFallback && (
              <div className="saathi-picture-menu">
                <div style={{ fontWeight: 800, fontSize: '16px', color: 'var(--color-warning-dark)', textCenter: 'center' }}>
                  ⚠️ Voice unclear. Please tap an option below:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginTop: '10px' }}>
                  <button
                    className="picture-menu-tile"
                    onClick={() => { setIsOpen(false); onNavigate?.('stock'); }}
                  >
                    <Pill size={36} color="var(--color-safe)" />
                    <span>💊 Medicine Stock</span>
                  </button>

                  <button
                    className="picture-menu-tile"
                    onClick={() => { setIsOpen(false); onNavigate?.('footfall'); }}
                  >
                    <Footprints size={36} color="var(--color-primary)" />
                    <span>🚶 Footfall Count</span>
                  </button>

                  <button
                    className="picture-menu-tile"
                    onClick={() => { setIsOpen(false); onNavigate?.('attendance'); }}
                  >
                    <UserCheck size={36} color="var(--color-warning)" />
                    <span>🩺 Doctor Attendance</span>
                  </button>

                  <button
                    className="picture-menu-tile emergency"
                    onClick={() => setShowEmergencyModal(true)}
                  >
                    <PhoneCall size={36} color="var(--color-danger)" />
                    <span>🚑 Emergency 108</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. ONE-TAP EMERGENCY CALL SCREEN MODAL (104 / 108 / 112) */}
      {showEmergencyModal && (
        <div className="sheet-overlay" onClick={() => setShowEmergencyModal(false)}>
          <div className="saathi-emergency-modal" onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: 'center' }}>
              <ShieldAlert size={60} color="var(--color-danger)" />
              <h2 style={{ fontSize: '24px', fontWeight: 900, color: 'var(--color-danger-dark)', marginTop: '8px' }}>
                🚨 Emergency & Medical Helpline
              </h2>
              <p style={{ fontSize: '15px', color: 'var(--color-text-muted)', fontWeight: 600, marginTop: '4px' }}>
                {SAATHI_RESPONSES[lang]?.medical_redirect || 'Please call 104 or 108 for medical emergency'}
              </p>
            </div>

            {/* Direct Dial Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
              <a href="tel:104" className="emergency-call-btn helpline">
                <PhoneCall size={32} />
                <div>
                  <div style={{ fontSize: '22px', fontWeight: 900 }}>📞 Call 104</div>
                  <div style={{ fontSize: '13px' }}>National Medical Health Helpline</div>
                </div>
              </a>

              <a href="tel:108" className="emergency-call-btn ambulance">
                <PhoneCall size={32} />
                <div>
                  <div style={{ fontSize: '22px', fontWeight: 900 }}>🚑 Call 108</div>
                  <div style={{ fontSize: '13px' }}>Emergency Ambulance Service</div>
                </div>
              </a>

              <a href="tel:112" className="emergency-call-btn police">
                <PhoneCall size={32} />
                <div>
                  <div style={{ fontSize: '22px', fontWeight: 900 }}>🚨 Call 112</div>
                  <div style={{ fontSize: '13px' }}>National Emergency Response</div>
                </div>
              </a>
            </div>

            <button
              className="btn-large"
              style={{ width: '100%', height: '56px', marginTop: '16px', background: '#CBD5E1', color: 'black' }}
              onClick={() => setShowEmergencyModal(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
