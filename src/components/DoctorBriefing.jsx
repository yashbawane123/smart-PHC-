import React, { useState, useEffect } from 'react';
import { db } from '../db/offlineDb';
import { syncEngine } from '../utils/syncEngine';
import { speakText, triggerHaptic, playSoundTone } from '../utils/audioEngine';
import { agentBus } from '../utils/agentBus';
import AgentPipeline from './AgentPipeline';
import { 
  Printer, CheckCircle2, AlertTriangle, ShieldCheck, 
  Stethoscope, FileText, Clock, Check, User
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function DoctorBriefing({ patientId, lang = 'hi', onTimelineChange }) {
  const [patient, setPatient] = useState(null);
  const [recentEvents, setRecentEvents] = useState([]);
  const [pendingAssumptions, setPendingAssumptions] = useState([]);
  const [pendingFollowUps, setPendingFollowUps] = useState([]);
  const [docCount, setDocCount] = useState(0);
  const [missingDocs, setMissingDocs] = useState([]);

  const todayStr = new Date().toISOString().split('T')[0];

  const loadBriefingData = async () => {
    if (!patientId) return;

    try {
      const p = await db.patients.get(patientId);
      setPatient(p || null);

      const allEvents = await db.patient_timeline_events
        .where('patient_id')
        .equals(patientId)
        .toArray();
      const activeEvents = allEvents.filter(e => !e.deleted);
      activeEvents.sort((a, b) => new Date(b.event_date || b.created_at) - new Date(a.event_date || a.created_at));

      // Last 5 events
      setRecentEvents(activeEvents.slice(0, 5));

      // All unconfirmed assumptions
      const unconfirmed = activeEvents.filter(e => e.source_type === 'assumption' && !e.confirmed_by_human);
      setPendingAssumptions(unconfirmed);

      // Documents count
      const docs = await db.patient_documents.where('patient_id').equals(patientId).toArray();
      setDocCount(docs.length);

      // Pending Follow ups
      const followUps = await db.follow_ups.where('patient_id').equals(patientId).toArray();
      setPendingFollowUps(followUps.filter(f => f.status === 'pending'));

      // Missing Documents Scan
      const missing = [];
      const testKeywords = ['ordered', 'advised', 'recommended', 'cbc', 'hba1c', 'hb', 'test', 'scan', 'x-ray', 'xray', 'ecg', 'blood', 'urine', 'ultrasound'];

      activeEvents.forEach(evt => {
        const textStr = (evt.title + ' ' + (evt.details || '')).toLowerCase();
        if (testKeywords.some(kw => textStr.includes(kw))) {
          const hasResult = activeEvents.some(other => 
            other.id !== evt.id &&
            (other.title.toLowerCase().includes(evt.title.toLowerCase().slice(0, 8)) || (other.details && other.details.toLowerCase().includes('result')))
          );
          if (!hasResult) {
            missing.push({ id: evt.id, title: `Result Pending: ${evt.title}` });
          }
        }
      });
      setMissingDocs(missing);
      agentBus.emit('Summary Agent', `Generated 1-page pre-consultation briefing for ${p ? p.name : 'patient'}`, 'done', patientId);
    } catch (err) {
      console.warn('Error loading briefing data:', err);
    }
  };

  useEffect(() => {
    loadBriefingData();
  }, [patientId]);

  const handleMarkAllVerified = async () => {
    if (pendingAssumptions.length === 0) return;

    try {
      triggerHaptic([80]);
      playSoundTone('tap');

      for (const assump of pendingAssumptions) {
        await db.patient_timeline_events.update(assump.id, {
          confirmed_by_human: true,
          synced: 0
        });
      }

      agentBus.emit('Human Override', `Batch-verified ${pendingAssumptions.length} assumptions for ${patient ? patient.name : 'patient'}`, 'done', patientId);
      syncEngine.triggerSync();
      confetti({ particleCount: 50, spread: 60 });
      speakText(lang === 'mr' ? 'सर्व माहितीची पुष्टी झाली' : lang === 'hi' ? 'सभी धारणाएं सत्यापित की गईं' : 'All assumptions verified', lang);
      
      await loadBriefingData();
      onTimelineChange?.();
    } catch (err) {
      console.error('Error marking all verified:', err);
    }
  };

  const handlePrint = () => {
    triggerHaptic([40]);
    window.print();
  };

  return (
    <div className="printable-briefing-card" style={{ background: 'var(--color-surface)', borderRadius: '24px', padding: '28px', border: '2px solid var(--color-border)', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Compact Agent Pipeline Node Strip Header */}
      <div className="no-print">
        <AgentPipeline compact={true} />
      </div>

      {/* Action Header (Hidden in Print) */}
      <div className="no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ fontSize: '20px', fontWeight: 900, color: 'var(--color-primary-dark)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🩺 Doctor Consultation Briefing</span>
            <span style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary-dark)', fontSize: '11px', padding: '2px 8px', borderRadius: '999px', fontWeight: 800 }}>
              1-Page Summary
            </span>
          </h3>
          <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)', marginTop: '2px' }}>
            Printable pre-consultation record for Medical Officer
          </p>
        </div>

        <button
          type="button"
          className="btn-large btn-primary"
          onClick={handlePrint}
          style={{ height: '44px', padding: '0 18px', borderRadius: '14px', fontSize: '13px', fontWeight: 800 }}
        >
          <Printer size={18} />
          <span>Print Briefing</span>
        </button>
      </div>

      {/* Patient Header Box */}
      {patient && (
        <div style={{ background: '#F8FAFC', borderRadius: '18px', padding: '16px 20px', border: '1.5px solid #CBD5E1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#0F172A' }}>
              {patient.name}
            </div>
            <div style={{ fontSize: '13px', color: '#475569', fontWeight: 700, marginTop: '2px' }}>
              Age: {patient.age || 'N/A'} • Gender: {patient.gender} • Phone: {patient.phone} • Village: {patient.village}
            </div>
          </div>
          <div style={{ textAlign: 'right', fontSize: '12px', color: '#64748B', fontWeight: 700 }}>
            <div>Date: {new Date().toLocaleDateString()}</div>
            <div>Patient ID: {patient.id}</div>
          </div>
        </div>
      )}

      {/* Section 1: Recent Events */}
      <div>
        <h4 style={{ fontSize: '15px', fontWeight: 900, color: '#0F172A', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          📌 Recent Medical Events (Last 5)
        </h4>

        {recentEvents.length === 0 ? (
          <div style={{ fontSize: '13px', color: '#64748B', fontStyle: 'italic' }}>No recent events recorded.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recentEvents.map(evt => (
              <div key={evt.id} style={{ background: '#FFFFFF', padding: '10px 14px', borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '13px', fontWeight: 600 }}>
                <strong style={{ color: '#0284C7' }}>{evt.event_date ? new Date(evt.event_date).toLocaleDateString() : 'N/A'}</strong> — <span style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: 800, color: '#64748B' }}>[{evt.event_type}]</span> <strong>{evt.title}</strong>: {evt.details || 'No details written'}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 2: ⚠️ Needs Your Verification (Human-in-the-Loop Control) */}
      <div style={{ background: pendingAssumptions.length > 0 ? '#FFFBEB' : '#ECFDF5', borderRadius: '18px', padding: '16px 20px', border: `2px solid ${pendingAssumptions.length > 0 ? '#F59E0B' : '#10B981'}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '10px' }}>
          <h4 style={{ fontSize: '15px', fontWeight: 900, color: pendingAssumptions.length > 0 ? '#D97706' : '#059669', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={18} />
            <span>⚠️ Needs Your Verification ({pendingAssumptions.length})</span>
          </h4>

          {pendingAssumptions.length > 0 && (
            <button
              type="button"
              className="no-print"
              onClick={handleMarkAllVerified}
              style={{
                height: '38px',
                padding: '0 14px',
                borderRadius: '12px',
                border: 'none',
                background: '#10B981',
                color: 'white',
                fontWeight: 800,
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <CheckCircle2 size={16} />
              <span>Mark All Verified</span>
            </button>
          )}
        </div>

        {pendingAssumptions.length === 0 ? (
          <div style={{ fontSize: '13px', color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={18} />
            <span>All AI assumptions have been reviewed and verified by staff.</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {pendingAssumptions.map(evt => (
              <div key={evt.id} style={{ background: '#FFFFFF', padding: '10px 14px', borderRadius: '12px', border: '1px solid #FDE68A', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input type="checkbox" disabled readOnly checked={false} style={{ width: '16px', height: '16px' }} />
                <div style={{ flex: 1 }}>
                  <strong>{evt.title}</strong> ({Math.round((evt.confidence || 0.8) * 100)}% Confidence)
                  {evt.details && <div style={{ fontSize: '12px', color: '#64748B' }}>{evt.details}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 3: Pending Follow-ups & Missing Documents Split */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="briefing-split-grid">
        
        {/* Pending Follow-ups */}
        <div style={{ background: '#F8FAFC', borderRadius: '16px', padding: '14px', border: '1px solid #E2E8F0' }}>
          <h5 style={{ fontSize: '13px', fontWeight: 900, color: '#0F172A', marginBottom: '8px' }}>
            🔔 Pending Follow-ups ({pendingFollowUps.length})
          </h5>
          {pendingFollowUps.length === 0 ? (
            <div style={{ fontSize: '12px', color: '#64748B' }}>None</div>
          ) : (
            <ul style={{ paddingLeft: '18px', fontSize: '12px', fontWeight: 600, color: '#334155' }}>
              {pendingFollowUps.map(f => (
                <li key={f.id} style={{ marginBottom: '4px' }}>
                  <strong>{f.title}</strong> (Due: {f.due_date ? new Date(f.due_date).toLocaleDateString() : 'N/A'})
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Missing Documents */}
        <div style={{ background: '#F8FAFC', borderRadius: '16px', padding: '14px', border: '1px solid #E2E8F0' }}>
          <h5 style={{ fontSize: '13px', fontWeight: 900, color: '#0F172A', marginBottom: '8px' }}>
            📋 Missing / Pending Reports ({missingDocs.length})
          </h5>
          {missingDocs.length === 0 ? (
            <div style={{ fontSize: '12px', color: '#059669', fontWeight: 700 }}>All lab results attached</div>
          ) : (
            <ul style={{ paddingLeft: '18px', fontSize: '12px', fontWeight: 600, color: '#DC2626' }}>
              {missingDocs.map(m => (
                <li key={m.id} style={{ marginBottom: '4px' }}>
                  {m.title}
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>

      {/* Mandatory Footer Line */}
      <div style={{ marginTop: '10px', paddingTop: '14px', borderTop: '1px solid #E2E8F0', fontSize: '11px', color: '#64748B', fontWeight: 700, textAlign: 'center', lineHeight: 1.4 }}>
        Generated by Smart-PHC Care Navigation • Facts extracted from {docCount} document(s) • This summary does not provide diagnosis or treatment advice.
      </div>

      {/* Print-friendly CSS */}
      <style>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          .no-print, .app-sidebar, .app-header, .floating-dock, .saathi-floating-mic {
            display: none !important;
          }
          .printable-briefing-card {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
          }
          .briefing-split-grid {
            grid-template-columns: 1fr 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
