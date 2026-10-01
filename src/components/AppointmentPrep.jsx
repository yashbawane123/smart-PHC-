import React, { useState, useEffect } from 'react';
import { db } from '../db/offlineDb';
import { syncEngine } from '../utils/syncEngine';
import { speakText, triggerHaptic, playSoundTone } from '../utils/audioEngine';
import { agentBus } from '../utils/agentBus';
import { 
  Calendar, CheckSquare, Square, AlertCircle, Clock, 
  FileText, CheckCircle, Plus, Sparkles, UserCheck, Stethoscope
} from 'lucide-react';

export default function AppointmentPrep({ patientId, lang = 'hi' }) {
  const [patient, setPatient] = useState(null);
  const [upcomingAppointment, setUpcomingAppointment] = useState(null);
  const [lastVisitDate, setLastVisitDate] = useState(null);
  const [events, setEvents] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [docs, setDocs] = useState([]);
  const [checkedItems, setCheckedItems] = useState({});

  const todayStr = new Date().toISOString().split('T')[0];

  const loadPrepData = async () => {
    if (!patientId) return;

    try {
      const p = await db.patients.get(patientId);
      setPatient(p || null);

      const allEvents = await db.patient_timeline_events
        .where('patient_id')
        .equals(patientId)
        .toArray();
      const activeEvents = allEvents.filter(e => !e.deleted);
      setEvents(activeEvents);

      const allDocs = await db.patient_documents
        .where('patient_id')
        .equals(patientId)
        .toArray();
      setDocs(allDocs);

      const allFollowUps = await db.follow_ups
        .where('patient_id')
        .equals(patientId)
        .toArray();
      setFollowUps(allFollowUps);

      agentBus.emit('Appointment Agent', `Analyzed visit prep checklist for ${p ? p.name : 'patient'}`, 'done', patientId);
      agentBus.emit('Follow-up Agent', `Tracked ${allFollowUps.length} follow-up reminders`, 'done', patientId);

      // Find upcoming appointment (event_type='appointment' & event_date >= todayStr)
      const appointments = activeEvents
        .filter(e => e.event_type === 'appointment' && e.event_date && e.event_date >= todayStr)
        .sort((a, b) => new Date(a.event_date) - new Date(b.event_date));

      if (appointments.length > 0) {
        setUpcomingAppointment(appointments[0]);
      } else {
        setUpcomingAppointment(null);
      }

      // Find last visit date
      const pastEvents = activeEvents
        .filter(e => e.event_date && e.event_date <= todayStr)
        .sort((a, b) => new Date(b.event_date) - new Date(a.event_date));

      if (pastEvents.length > 0) {
        setLastVisitDate(pastEvents[0].event_date);
      } else {
        setLastVisitDate(null);
      }
    } catch (err) {
      console.warn('Error loading appointment prep data:', err);
    }
  };

  useEffect(() => {
    loadPrepData();
  }, [patientId]);

  // Derive Missing Documents Checklist
  const missingDocsList = [];
  const testKeywords = ['ordered', 'advised', 'recommended', 'cbc', 'hba1c', 'hb', 'test', 'scan', 'x-ray', 'xray', 'ecg', 'blood', 'urine', 'ultrasound', 'sugar', 'lipid'];
  
  events.forEach(evt => {
    const textStr = (evt.title + ' ' + (evt.details || '')).toLowerCase();
    const isTestOrdered = testKeywords.some(kw => textStr.includes(kw));

    if (isTestOrdered) {
      // Check if there is a corresponding result event or document
      const hasResult = events.some(other => 
        other.id !== evt.id &&
        (other.title.toLowerCase().includes(evt.title.toLowerCase().slice(0, 8)) ||
         (other.details && other.details.toLowerCase().includes('result')))
      );

      if (!hasResult) {
        missingDocsList.push({
          id: `missing-${evt.id}`,
          title: `Result Pending: ${evt.title}`,
          reason: `Ordered on ${evt.event_date || 'recent visit'}. Value/report not yet attached.`
        });
      }
    }

    // Prescription / Notes mentioning previous reports
    if (textStr.includes('bring') || textStr.includes('previous') || textStr.includes('old report')) {
      missingDocsList.push({
        id: `missing-bring-${evt.id}`,
        title: `Previous Medical Records / Prescription`,
        reason: `Requested in clinical note: "${evt.title}"`
      });
    }
  });

  // Deduplicate missing documents
  const uniqueMissingDocs = missingDocsList.filter((doc, idx, self) =>
    idx === self.findIndex(d => d.title === doc.title)
  );

  const pendingAssumptionsCount = events.filter(e => e.source_type === 'assumption' && !e.confirmed_by_human).length;
  const pendingFollowUpsList = followUps
    .filter(f => f.status === 'pending')
    .sort((a, b) => new Date(a.due_date || '2099-01-01') - new Date(b.due_date || '2099-01-01'));

  const toggleCheckItem = (itemId) => {
    triggerHaptic([30]);
    playSoundTone('tap');
    setCheckedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const handleScheduleFollowUpFromLastVisit = async () => {
    try {
      triggerHaptic([60]);
      playSoundTone('tap');

      const baseDate = lastVisitDate ? new Date(lastVisitDate) : new Date();
      const dueDateObj = new Date(baseDate.getTime() + 30 * 86400000);
      const dueDateStr = dueDateObj.toISOString().split('T')[0];

      const newFollowUp = {
        id: `fu-sched-${Date.now()}`,
        patient_id: patientId,
        title: '30-Day Follow-Up Consultation',
        due_date: dueDateStr,
        status: 'pending',
        created_at: new Date().toISOString(),
        synced: 0
      };

      await db.follow_ups.put(newFollowUp);
      await loadPrepData();
      syncEngine.triggerSync();
      speakText(lang === 'mr' ? 'फॉलो-अप तारीख निश्चित केली' : lang === 'hi' ? 'फॉलो-अप शेड्यूल किया गया' : 'Follow-up scheduled', lang);
    } catch (err) {
      console.error('Error scheduling follow-up:', err);
    }
  };

  return (
    <div style={{ background: 'var(--color-surface)', borderRadius: '24px', padding: '24px', border: '2px solid var(--color-border)', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Patient Snapshot Top Strip */}
      {patient && (
        <div style={{ background: 'var(--color-bg)', borderRadius: '20px', padding: '16px 20px', border: '1.5px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--color-primary-light)', color: 'var(--color-primary-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UserCheck size={22} />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 900, color: 'var(--color-text-main)' }}>
                {patient.name} ({patient.age || 'N/A'}y {patient.gender}) • {patient.village || 'Shirur'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                Total Events: <strong>{events.length}</strong> • Documents Uploaded: <strong>{docs.length}</strong> • Last Visit: <strong>{lastVisitDate ? new Date(lastVisitDate).toLocaleDateString() : 'None'}</strong>
              </div>
            </div>
          </div>

          <span style={{ background: pendingAssumptionsCount > 0 ? 'var(--color-warning-bg)' : 'var(--color-safe-bg)', color: pendingAssumptionsCount > 0 ? 'var(--color-warning-dark)' : 'var(--color-safe-dark)', padding: '6px 14px', borderRadius: '999px', fontSize: '12px', fontWeight: 800 }}>
            {pendingAssumptionsCount > 0 ? `🟡 ${pendingAssumptionsCount} Assumptions Pending` : '🟢 Records Fully Verified'}
          </span>
        </div>
      )}

      {/* Upcoming Appointment Card */}
      {upcomingAppointment ? (
        <div style={{ background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)', color: 'white', borderRadius: '20px', padding: '20px', boxShadow: 'var(--shadow-glow)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'rgba(255, 255, 255, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calendar size={28} />
            </div>
            <div>
              <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.8px', opacity: 0.9, fontWeight: 800 }}>
                NEXT UPCOMING APPOINTMENT
              </div>
              <div style={{ fontSize: '20px', fontWeight: 900 }}>
                {upcomingAppointment.title}
              </div>
              <div style={{ fontSize: '13px', opacity: 0.95, fontWeight: 600 }}>
                Scheduled Date: {new Date(upcomingAppointment.event_date).toLocaleDateString()} {upcomingAppointment.details ? `• ${upcomingAppointment.details}` : ''}
              </div>
            </div>
          </div>

          <span style={{ background: 'rgba(255, 255, 255, 0.2)', padding: '6px 14px', borderRadius: '12px', fontSize: '13px', fontWeight: 800 }}>
            Ready for Prep
          </span>
        </div>
      ) : (
        /* Empty State when no upcoming appointment exists */
        <div style={{ background: 'var(--color-bg)', borderRadius: '20px', padding: '24px', textAlign: 'center', border: '2px dashed #CBD5E1', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <Calendar size={36} color="var(--color-text-muted)" />
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-text-main)' }}>
              No Upcoming Appointment Scheduled
            </div>
            <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: 600, marginTop: '2px' }}>
              Schedule a 30-day follow-up consultation based on the patient's last visit.
            </div>
          </div>
          <button
            type="button"
            className="btn-large btn-primary"
            onClick={handleScheduleFollowUpFromLastVisit}
            style={{ height: '46px', padding: '0 20px', fontSize: '13px', borderRadius: '14px', marginTop: '6px' }}
          >
            <Plus size={18} />
            <span>Schedule Follow-Up (30 Days)</span>
          </button>
        </div>
      )}

      {/* Section A: Missing Documents Checklist */}
      <div>
        <h4 style={{ fontSize: '15px', fontWeight: 900, color: 'var(--color-text-main)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>📋 Missing Documents Checklist (Staff Manual Verification)</span>
        </h4>

        {uniqueMissingDocs.length === 0 ? (
          <div style={{ padding: '16px', background: 'var(--color-safe-bg)', color: 'var(--color-safe-dark)', borderRadius: '16px', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CheckCircle size={20} />
            <span>No missing documents detected. All ordered test results & records appear attached.</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {uniqueMissingDocs.map(item => {
              const isChecked = !!checkedItems[item.id];
              return (
                <div
                  key={item.id}
                  onClick={() => toggleCheckItem(item.id)}
                  style={{
                    background: isChecked ? 'var(--color-safe-bg)' : 'var(--color-bg)',
                    border: isChecked ? '1.5px solid #A7F3D0' : '1.5px solid var(--color-border)',
                    borderRadius: '16px',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {isChecked ? (
                    <CheckSquare size={22} color="var(--color-safe-dark)" />
                  ) : (
                    <Square size={22} color="var(--color-text-muted)" />
                  )}

                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: isChecked ? 'var(--color-safe-dark)' : 'var(--color-text-main)', textDecoration: isChecked ? 'line-through' : 'none' }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: 600, marginTop: '2px' }}>
                      {item.reason}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section B: Open Follow-ups */}
      <div>
        <h4 style={{ fontSize: '15px', fontWeight: 900, color: 'var(--color-text-main)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>🔔 Open Follow-ups ({pendingFollowUpsList.length})</span>
        </h4>

        {pendingFollowUpsList.length === 0 ? (
          <div style={{ padding: '16px', background: 'var(--color-bg)', borderRadius: '16px', color: 'var(--color-text-muted)', fontSize: '13px', fontWeight: 600 }}>
            No pending follow-ups for this patient.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {pendingFollowUpsList.map(fu => {
              const isOverdue = fu.due_date && fu.due_date < todayStr;
              const isDueToday = fu.due_date && fu.due_date === todayStr;

              const bg = isOverdue ? 'var(--color-danger-bg)' : isDueToday ? 'var(--color-warning-bg)' : 'var(--color-bg)';
              const borderColor = isOverdue ? '#FCA5A5' : isDueToday ? '#FDE68A' : 'var(--color-border)';
              const textColor = isOverdue ? 'var(--color-danger-dark)' : isDueToday ? 'var(--color-warning-dark)' : 'var(--color-text-main)';

              return (
                <div
                  key={fu.id}
                  style={{
                    background: bg,
                    border: `1.5px solid ${borderColor}`,
                    borderRadius: '16px',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Clock size={20} color={textColor} />
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: textColor }}>
                        {fu.title}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: 600, marginTop: '2px' }}>
                        Due Date: {fu.due_date ? new Date(fu.due_date).toLocaleDateString() : 'Not set'}
                      </div>
                    </div>
                  </div>

                  <span style={{ background: isOverdue ? 'var(--color-danger)' : isDueToday ? 'var(--color-warning)' : 'var(--color-primary)', color: 'white', padding: '4px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 800 }}>
                    {isOverdue ? '🔴 OVERDUE' : isDueToday ? '🟠 DUE TODAY' : '🔵 UPCOMING'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
