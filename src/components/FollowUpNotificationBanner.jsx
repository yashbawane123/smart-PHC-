import React, { useState } from 'react';
import { useFollowUpReminders } from '../utils/useFollowUpReminders';
import { speakText, triggerHaptic, playSoundTone } from '../utils/audioEngine';
import { Bell, Check, X, Calendar, Clock } from 'lucide-react';

export default function FollowUpNotificationBanner({ lang = 'hi' }) {
  const { reminders, markDone } = useFollowUpReminders();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || !reminders || reminders.length === 0) {
    return null;
  }

  const handleMarkDone = (id, title) => {
    triggerHaptic([60]);
    playSoundTone('tap');
    markDone(id);
    speakText(lang === 'mr' ? 'फॉलो-अप पूर्ण झाला' : lang === 'hi' ? 'फॉलो-अप पूरा हुआ' : 'Follow-up completed', lang);
  };

  const handleDismiss = () => {
    triggerHaptic([30]);
    setDismissed(true);
  };

  return (
    <div style={{ background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)', borderBottom: '2px solid #F59E0B', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', zIndex: 300, position: 'relative' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
        <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: '#F59E0B', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Bell size={20} />
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '13px', fontWeight: 900, color: '#B78103', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            🔔 Upcoming Follow-up Reminder ({reminders.length} Pending)
          </div>

          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginTop: '4px' }}>
            {reminders.slice(0, 2).map(r => (
              <div key={r.id} style={{ fontSize: '13px', color: '#744210', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span><strong>{r.patientName}:</strong> {r.title}</span>
                <span style={{ fontSize: '11px', background: 'rgba(245, 158, 11, 0.2)', padding: '2px 8px', borderRadius: '6px' }}>
                  {r.due_date ? new Date(r.due_date).toLocaleDateString() : 'Due Soon'}
                </span>
                <button
                  type="button"
                  onClick={() => handleMarkDone(r.id, r.title)}
                  style={{ height: '28px', padding: '0 10px', borderRadius: '8px', border: 'none', background: '#10B981', color: 'white', fontSize: '11px', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <Check size={12} />
                  <span>Mark done</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleDismiss}
        style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#744210', padding: '4px' }}
        title="Dismiss banner"
      >
        <X size={18} />
      </button>

    </div>
  );
}
