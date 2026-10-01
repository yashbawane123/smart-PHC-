import React, { useState, useEffect } from 'react';
import { db } from '../db/offlineDb';
import { syncEngine } from '../utils/syncEngine';
import { speakText, triggerHaptic, playSoundTone } from '../utils/audioEngine';
import { agentBus } from '../utils/agentBus';
import { 
  Check, X, ShieldCheck, AlertCircle, FileText, Pill, 
  Calendar, Stethoscope, Activity, ArrowUpRight, Sparkles
} from 'lucide-react';

const EVENT_ICONS = {
  test: <Stethoscope size={22} color="#0284C7" />,
  prescription: <Pill size={22} color="#10B981" />,
  appointment: <Calendar size={22} color="#F59E0B" />,
  diagnosis_note: <FileText size={22} color="#8B5CF6" />
};

export default function CareTimeline({ patientId, lang = 'hi', refreshTrigger }) {
  const [events, setEvents] = useState([]);
  const [patient, setPatient] = useState(null);

  const loadTimeline = async () => {
    if (!patientId) {
      setEvents([]);
      setPatient(null);
      return;
    }

    try {
      const p = await db.patients.get(patientId);
      setPatient(p || null);

      const allEvents = await db.patient_timeline_events
        .where('patient_id')
        .equals(patientId)
        .toArray();

      // Filter out soft-deleted items
      const activeEvents = allEvents.filter(e => !e.deleted);

      // Sort by event_date descending (newest at top)
      activeEvents.sort((a, b) => new Date(b.event_date || b.created_at) - new Date(a.event_date || a.created_at));

      setEvents(activeEvents);
      agentBus.emit('Timeline Agent', `Updated timeline for patient (${activeEvents.length} events)`, 'done', patientId);
    } catch (err) {
      console.warn('Error loading patient timeline:', err);
    }
  };

  useEffect(() => {
    loadTimeline();
  }, [patientId, refreshTrigger]);

  const handleConfirmAssumption = async (evtId) => {
    try {
      triggerHaptic([60]);
      playSoundTone('tap');
      const target = events.find(e => e.id === evtId);
      await db.patient_timeline_events.update(evtId, {
        confirmed_by_human: true,
        synced: 0
      });
      agentBus.emit('Human Override', `Confirmed assumption as fact: ${target?.title || evtId}`, 'done', patientId);
      syncEngine.triggerSync();
      speakText(lang === 'mr' ? 'माहितीची पुष्टी झाली' : lang === 'hi' ? 'पुष्टि हो गई' : 'Assumption verified', lang);
      await loadTimeline();
    } catch (err) {
      console.error('Confirm assumption error:', err);
    }
  };

  const handleRejectAssumption = async (evtId) => {
    try {
      triggerHaptic([40]);
      playSoundTone('undo');
      const target = events.find(e => e.id === evtId);
      // Soft-delete
      await db.patient_timeline_events.update(evtId, {
        deleted: true,
        synced: 0
      });
      agentBus.emit('Human Override', `Rejected assumption: ${target?.title || evtId}`, 'done', patientId);
      syncEngine.triggerSync();
      speakText(lang === 'mr' ? 'माहिती नाकारली' : lang === 'hi' ? 'अस्वीकार किया गया' : 'Assumption rejected', lang);
      await loadTimeline();
    } catch (err) {
      console.error('Reject assumption error:', err);
    }
  };

  // Group events by Month Year
  const groupedEvents = events.reduce((groups, evt) => {
    const dateObj = new Date(evt.event_date || evt.created_at || Date.now());
    const monthYear = dateObj.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    if (!groups[monthYear]) groups[monthYear] = [];
    groups[monthYear].push(evt);
    return groups;
  }, {});

  const factsCount = events.filter(e => e.source_type === 'fact').length;
  const pendingAssumptionsCount = events.filter(e => e.source_type === 'assumption' && !e.confirmed_by_human).length;

  return (
    <div style={{ background: 'var(--color-surface)', borderRadius: '24px', padding: '24px', border: '2px solid var(--color-border)', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Header with Counters */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 900, color: 'var(--color-text-main)' }}>
            📅 {patient ? `${patient.name}'s Medical Timeline` : 'Care Timeline'}
          </h3>
          <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)', marginTop: '2px' }}>
            Care Coordination & Longitudinal Record
          </p>
        </div>

        {/* Human-in-the-Loop Counter Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ background: 'var(--color-safe-bg)', color: 'var(--color-safe-dark)', padding: '6px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 800 }}>
            🟢 {factsCount} Facts
          </span>
          <span style={{ background: pendingAssumptionsCount > 0 ? 'var(--color-warning-bg)' : 'var(--color-bg)', color: pendingAssumptionsCount > 0 ? 'var(--color-warning-dark)' : 'var(--color-text-muted)', padding: '6px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 800, border: '1px solid var(--color-border)' }}>
            🟡 {pendingAssumptionsCount} Pending Verification
          </span>
        </div>
      </div>

      {/* Empty State */}
      {events.length === 0 ? (
        <div style={{ padding: '40px 20px', textAlign: 'center', background: 'var(--color-bg)', borderRadius: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--color-primary-light)', color: 'var(--color-primary-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>
            📋
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-text-main)' }}>
              No Clinical Events Recorded Yet
            </div>
            <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: 600, marginTop: '4px' }}>
              Upload a prescription or lab report to extract timeline facts & assumptions.
            </div>
          </div>
        </div>
      ) : (
        /* Vertical Timeline Grouped by Month */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {Object.entries(groupedEvents).map(([monthYear, evtList]) => (
            <div key={monthYear} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              {/* Month Header Pill */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--color-primary-dark)', background: 'var(--color-primary-light)', padding: '4px 12px', borderRadius: '999px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {monthYear}
                </span>
                <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }} />
              </div>

              {/* Vertical Events Stream */}
              <div style={{ position: 'relative', paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* Vertical Line */}
                <div style={{ position: 'absolute', top: '10px', bottom: '10px', left: '10px', width: '2px', background: '#CBD5E1' }} />

                {evtList.map((evt) => {
                  const isFact = evt.source_type === 'fact';
                  const isConfirmed = evt.confirmed_by_human;

                  return (
                    <div key={evt.id} style={{ position: 'relative' }}>
                      
                      {/* Timeline Dot */}
                      <div
                        style={{
                          position: 'absolute',
                          left: '-20px',
                          top: '16px',
                          width: '14px',
                          height: '14px',
                          borderRadius: '50%',
                          background: isFact ? 'var(--color-safe)' : isConfirmed ? 'var(--color-safe)' : 'var(--color-warning)',
                          border: '3px solid var(--color-surface)',
                          boxShadow: '0 0 0 2px #CBD5E1'
                        }}
                      />

                      {/* Event Card */}
                      <div
                        style={{
                          background: 'var(--color-surface)',
                          borderRadius: '20px',
                          padding: '16px 20px',
                          border: '2px solid var(--color-border)',
                          boxShadow: 'var(--shadow-sm)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px'
                        }}
                      >
                        {/* Top Bar: Icon, Title, Date, Source Badge */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '42px', height: '42px', borderRadius: '14px', background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {EVENT_ICONS[evt.event_type] || <Activity size={22} color="var(--color-primary)" />}
                            </div>
                            <div>
                              <h4 style={{ fontSize: '16px', fontWeight: 900, color: 'var(--color-text-main)', lineHeight: 1.2 }}>
                                {evt.title}
                              </h4>
                              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: 700, marginTop: '2px' }}>
                                {evt.event_date ? new Date(evt.event_date).toLocaleDateString() : 'Date not specified'} • {evt.event_type.toUpperCase()}
                              </div>
                            </div>
                          </div>

                          {/* Source Badge */}
                          <div>
                            {isFact ? (
                              <span style={{ background: 'var(--color-safe-bg)', color: 'var(--color-safe-dark)', border: '1px solid #A7F3D0', padding: '4px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <ShieldCheck size={14} />
                                Document Fact
                              </span>
                            ) : isConfirmed ? (
                              <span style={{ background: 'var(--color-safe-bg)', color: 'var(--color-safe-dark)', border: '1px solid #A7F3D0', padding: '4px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <Check size={14} />
                                Verified by staff
                              </span>
                            ) : (
                              <span style={{ background: 'var(--color-warning-bg)', color: 'var(--color-warning-dark)', border: '1px solid #FDE68A', padding: '4px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <AlertCircle size={14} />
                                Assumption — needs verification
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Details */}
                        {evt.details && (
                          <div style={{ background: 'var(--color-bg)', padding: '10px 14px', borderRadius: '12px', fontSize: '13px', color: 'var(--color-text-main)', fontWeight: 600, lineHeight: 1.4 }}>
                            {evt.details}
                          </div>
                        )}

                        {/* Verification Action Buttons for Pending Assumptions */}
                        {!isFact && !isConfirmed && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '6px', borderTop: '1px dashed var(--color-border)' }}>
                            <button
                              type="button"
                              onClick={() => handleConfirmAssumption(evt.id)}
                              style={{
                                flex: 1,
                                height: '42px',
                                borderRadius: '12px',
                                border: 'none',
                                background: 'var(--color-safe)',
                                color: 'white',
                                fontWeight: 800,
                                fontSize: '13px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                boxShadow: 'var(--shadow-sm)'
                              }}
                            >
                              <Check size={16} />
                              <span>Confirm Fact</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRejectAssumption(evt.id)}
                              style={{
                                height: '42px',
                                padding: '0 16px',
                                borderRadius: '12px',
                                border: '1.5px solid var(--color-border)',
                                background: 'var(--color-surface)',
                                color: 'var(--color-danger)',
                                fontWeight: 800,
                                fontSize: '13px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px'
                              }}
                            >
                              <X size={16} />
                              <span>Reject</span>
                            </button>
                          </div>
                        )}

                      </div>
                    </div>
                  );
                })}

              </div>

            </div>
          ))}
        </div>
      )}

    </div>
  );
}
