import React, { useState, useEffect } from 'react';
import { db, DEFAULT_PHC_ID } from '../db/offlineDb';
import TallyDots from './TallyDots';
import UndoBar from './UndoBar';
import { ArrowLeft, Stethoscope, Baby, Ambulance, HeartPulse, FlaskConical, Plus } from 'lucide-react';
import { speakText, playSoundTone, triggerHaptic } from '../utils/audioEngine';
import { syncEngine } from '../utils/syncEngine';

const DEPT_ICONS = {
  stethoscope: <Stethoscope size={40} />,
  baby: <Baby size={40} />,
  ambulance: <Ambulance size={40} />,
  'heart-pulse': <HeartPulse size={40} />,
  'flask-conical': <FlaskConical size={40} />
};

export default function FootfallScreen({ lang = 'hi', onBack }) {
  const [departments, setDepartments] = useState([]);
  const [footfallMap, setFootfallMap] = useState({});
  const [activeDept, setActiveDept] = useState(null);

  // Undo state
  const [undoState, setUndoState] = useState(null);

  const todayStr = new Date().toISOString().split('T')[0];

  const loadFootfall = async () => {
    try {
      const depts = await db.departments.toArray();
      const records = await db.patient_footfall.where('visit_date').equals(todayStr).toArray();

      const map = {};
      records.forEach(r => {
        map[r.department_id] = r.count;
      });

      setDepartments(depts);
      setFootfallMap(map);
    } catch (err) {
      console.warn('Footfall data load error:', err);
    }
  };

  useEffect(() => {
    loadFootfall();
  }, []);

  const handleIncrement = async (dept, delta = 1) => {
    try {
      playSoundTone('add');
      triggerHaptic([50]);

      const currentCount = footfallMap[dept.id] || 0;
      const newCount = currentCount + delta;

      // Local IndexedDB update
      await db.patient_footfall.put({
        id: `ff-${dept.id}-${todayStr}`,
        phc_id: DEFAULT_PHC_ID,
        department_id: dept.id,
        visit_date: todayStr,
        count: newCount,
        updated_at: new Date().toISOString(),
        synced: 0
      });

      await loadFootfall();
      syncEngine.triggerSync();

      const deptName = lang === 'mr' ? dept.name_mr : lang === 'hi' ? dept.name_hi : dept.name_en;
      speakText(`${deptName} ${newCount}`, lang);

      setUndoState({
        dept,
        prevCount: currentCount,
        delta,
        message: `${deptName}: +${delta}`
      });
    } catch (err) {
      console.error('Footfall increment error:', err);
    }
  };

  const handleUndo = async () => {
    if (!undoState) return;
    try {
      const { dept, prevCount } = undoState;
      await db.patient_footfall.put({
        id: `ff-${dept.id}-${todayStr}`,
        phc_id: DEFAULT_PHC_ID,
        department_id: dept.id,
        visit_date: todayStr,
        count: prevCount,
        updated_at: new Date().toISOString(),
        synced: 0
      });

      await loadFootfall();
      speakText(lang === 'mr' ? 'कमी केले' : lang === 'hi' ? 'वापस लिया' : 'Undone', lang);
      setUndoState(null);
    } catch (err) {
      console.error('Footfall undo error:', err);
    }
  };

  const totalToday = Object.values(footfallMap).reduce((sum, val) => sum + val, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '90vh' }}>
      {/* Title Header */}
      <div style={{ background: 'var(--color-surface)', padding: '16px 20px', borderBottom: '2px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            onClick={activeDept ? () => setActiveDept(null) : onBack}
            style={{ width: '56px', height: '56px', borderRadius: '16px', border: 'none', background: 'var(--color-bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <ArrowLeft size={28} />
          </button>
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--color-primary)' }}>
              🚶 {lang === 'mr' ? 'रुग्ण संख्या' : lang === 'hi' ? 'मरीज गिनती' : 'Patient Footfall'}
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: 600 }}>
              {lang === 'mr' ? 'एकूण आज: ' : lang === 'hi' ? 'आज कुल: ' : 'Today Total: '}
              <strong style={{ color: 'var(--color-primary)', fontSize: '16px' }}>{totalToday}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Mode A: Department Selection Cards */}
      {!activeDept ? (
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-muted)', textAlign: 'center' }}>
            {lang === 'mr' ? 'विभाग निवडून रुग्ण मोजा 👇' : lang === 'hi' ? 'विभाग चुनकर मरीज गिनें 👇' : 'Select department to tap count 👇'}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {departments.map(dept => {
              const count = footfallMap[dept.id] || 0;
              const deptName = lang === 'mr' ? dept.name_mr : lang === 'hi' ? dept.name_hi : dept.name_en;

              return (
                <div
                  key={dept.id}
                  className="module-tile footfall"
                  onClick={() => {
                    triggerHaptic([40]);
                    setActiveDept(dept);
                    speakText(deptName, lang);
                  }}
                  style={{ minHeight: '100px', padding: '16px 20px' }}
                >
                  <div className="module-icon-box" style={{ width: '64px', height: '64px', fontSize: '32px' }}>
                    {DEPT_ICONS[dept.icon] || <span>🩺</span>}
                  </div>
                  <div className="module-info">
                    <h3 style={{ fontSize: '20px', fontWeight: 800 }}>{deptName}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                      <span className="big-count-num" style={{ fontSize: '28px' }}>{count}</span>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-muted)' }}>
                        {lang === 'mr' ? 'रुग्ण' : lang === 'hi' ? 'मरीज' : 'patients'}
                      </span>
                    </div>
                    <TallyDots count={count} maxDisplay={15} />
                  </div>
                  <button
                    className="btn-large btn-primary"
                    style={{ height: '64px', minWidth: '64px', padding: 0, borderRadius: '16px' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleIncrement(dept, 1);
                    }}
                    title="Quick +1"
                  >
                    <Plus size={32} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Mode B: Full Screen Tap Counter Hero for Active Department */
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '16px' }}>
          <div
            className="footfall-tap-hero"
            onClick={() => handleIncrement(activeDept, 1)}
          >
            <div style={{ background: 'var(--color-primary-bg)', color: 'var(--color-primary)', padding: '20px', borderRadius: '50%' }}>
              {DEPT_ICONS[activeDept.icon] || <Stethoscope size={48} />}
            </div>

            <h2 style={{ fontSize: '26px', fontWeight: 900 }}>
              {lang === 'mr' ? activeDept.name_mr : lang === 'hi' ? activeDept.name_hi : activeDept.name_en}
            </h2>

            <div style={{ fontSize: '18px', color: 'var(--color-text-muted)', fontWeight: 700 }}>
              {lang === 'mr' ? 'स्क्रीनवर कुठेही टॅप करा (+१)' : lang === 'hi' ? 'स्क्रीन पर कहीं भी टैप करें (+१)' : 'Tap anywhere to count (+1)'}
            </div>

            <div className="giant-count-number">
              {footfallMap[activeDept.id] || 0}
            </div>

            <TallyDots count={footfallMap[activeDept.id] || 0} maxDisplay={30} />
          </div>

          {/* Quick Steppers (+5 group visit, sound trigger) */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <button
              className="btn-large btn-primary"
              style={{ flex: 1, height: '76px', fontSize: '24px' }}
              onClick={() => handleIncrement(activeDept, 5)}
            >
              <Plus size={32} />
              <span>+५ (Group 5)</span>
            </button>
          </div>
        </div>
      )}

      {/* Floating 5-second Undo Bar */}
      {undoState && (
        <UndoBar
          actionMessage={undoState.message}
          lang={lang}
          onUndo={handleUndo}
          onExpire={() => setUndoState(null)}
        />
      )}
    </div>
  );
}
