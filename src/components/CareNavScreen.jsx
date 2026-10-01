import React, { useState, useEffect } from 'react';
import { db } from '../db/offlineDb';
import { syncEngine } from '../utils/syncEngine';
import { speakText, triggerHaptic, playSoundTone } from '../utils/audioEngine';
import DocumentUpload from './DocumentUpload';
import CareTimeline from './CareTimeline';
import AppointmentPrep from './AppointmentPrep';
import DoctorBriefing from './DoctorBriefing';
import AgentPipeline from './AgentPipeline';
import { 
  User, UserPlus, ArrowLeft, Heart, Search, X, Check, Activity, Sparkles,
  Calendar, FileCheck, Stethoscope, Clock
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function CareNavScreen({ lang = 'hi', onBack }) {
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState('timeline'); // timeline | prep | briefing

  // New patient form state
  const [patientForm, setPatientForm] = useState({
    name: '',
    age: '',
    gender: 'Female',
    phone: '',
    village: 'Shirur Sub-District'
  });

  const loadPatients = async () => {
    try {
      const list = await db.patients.toArray();
      setPatients(list);
      if (list.length > 0 && !selectedPatientId) {
        setSelectedPatientId(list[0].id);
      }
    } catch (err) {
      console.warn('Error fetching patients list:', err);
    }
  };

  useEffect(() => {
    loadPatients();
  }, []);

  const handleCreatePatient = async (e) => {
    e.preventDefault();
    if (!patientForm.name.trim()) {
      alert(lang === 'mr' ? 'कृपया रुग्णाचे नाव प्रविष्ट करा' : lang === 'hi' ? 'कृपया मरीज का नाम दर्ज करें' : 'Please enter patient name');
      return;
    }

    try {
      triggerHaptic([60]);
      playSoundTone('tap');

      const newId = `pat-${Date.now()}`;
      const newPatientObj = {
        id: newId,
        name: patientForm.name.trim(),
        age: parseInt(patientForm.age) || 0,
        gender: patientForm.gender,
        phone: patientForm.phone.trim() || 'N/A',
        village: patientForm.village.trim() || 'Shirur Sub-District',
        created_at: new Date().toISOString(),
        synced: 0
      };

      await db.patients.add(newPatientObj);
      await loadPatients();
      setSelectedPatientId(newId);
      setShowAddModal(false);
      setPatientForm({ name: '', age: '', gender: 'Female', phone: '', village: 'Shirur Sub-District' });

      syncEngine.triggerSync();
      confetti({ particleCount: 50, spread: 60 });
      speakText(lang === 'mr' ? 'नवीन रुग्ण जोडला गेला' : lang === 'hi' ? 'नया मरीज जोड़ा गया' : 'New patient added', lang);
    } catch (err) {
      console.error('Create patient error:', err);
    }
  };

  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px' }}>
      
      {/* Top Banner Card: Patient Selection & Quick Registration */}
      <div style={{ background: 'var(--color-surface)', borderRadius: '24px', padding: '20px 24px', border: '2px solid var(--color-border)', boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        
        {/* Title & Back Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {onBack && (
            <button
              onClick={onBack}
              style={{ width: '48px', height: '48px', borderRadius: '16px', border: '1.5px solid var(--color-border)', background: 'var(--color-bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <ArrowLeft size={22} />
            </button>
          )}
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--color-primary-dark)', letterSpacing: '-0.3px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🧭 Care Navigation Agent</span>
              <span style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary-dark)', fontSize: '11px', padding: '2px 8px', borderRadius: '999px', fontWeight: 800 }}>
                AI-Powered
              </span>
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: 600, marginTop: '2px' }}>
              Longitudinal Health Records & Clinical Fact Extraction
            </p>
          </div>
        </div>

        {/* Patient Dropdown Selector & Quick Add Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--color-bg)', padding: '6px 12px', borderRadius: '16px', border: '1.5px solid var(--color-border)' }}>
            <User size={18} color="var(--color-primary)" />
            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              style={{ background: 'transparent', border: 'none', fontSize: '14px', fontWeight: 800, color: 'var(--color-text-main)', cursor: 'pointer', outline: 'none' }}
            >
              {patients.length === 0 ? (
                <option value="">No patients found</option>
              ) : (
                patients.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.age ? `${p.age}y` : ''} {p.gender}) • {p.village || 'Shirur'}
                  </option>
                ))
              )}
            </select>
          </div>

          <button
            type="button"
            className="btn-large btn-primary"
            onClick={() => setShowAddModal(true)}
            style={{ height: '48px', padding: '0 18px', borderRadius: '16px', fontSize: '13px', fontWeight: 800 }}
          >
            <UserPlus size={18} />
            <span>{lang === 'mr' ? '+ नवीन रुग्ण' : lang === 'hi' ? '+ नया मरीज' : '+ Add Patient'}</span>
          </button>
        </div>

      </div>

      {/* Live Care Navigation Multi-Agent Pipeline Visualizer */}
      <AgentPipeline />

      {/* Selected Patient Banner Details */}
      {selectedPatient && (
        <div style={{ background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)', color: 'white', borderRadius: '20px', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', boxShadow: 'var(--shadow-glow)', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
              👩‍⚕️
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 900 }}>{selectedPatient.name}</h3>
              <p style={{ fontSize: '12px', opacity: 0.9, fontWeight: 600 }}>
                {selectedPatient.age} Years • {selectedPatient.gender} • Phone: {selectedPatient.phone} • Village: {selectedPatient.village}
              </p>
            </div>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(8px)', padding: '6px 14px', borderRadius: '12px', fontSize: '12px', fontWeight: 800 }}>
            Patient ID: {selectedPatient.id}
          </div>
        </div>
      )}

      {/* Document Upload Component */}
      <DocumentUpload
        selectedPatientId={selectedPatientId}
        onSelectPatient={(id) => setSelectedPatientId(id)}
        onExtractionComplete={() => setRefreshTrigger(prev => prev + 1)}
        lang={lang}
      />

      {/* Navigation Tabs Bar */}
      <div style={{ background: 'var(--color-surface)', borderRadius: '18px', padding: '6px', border: '1px solid var(--color-border)', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setActiveTab('timeline')}
          style={{
            flex: 1,
            height: '46px',
            borderRadius: '14px',
            border: 'none',
            background: activeTab === 'timeline' ? 'var(--color-primary)' : 'transparent',
            color: activeTab === 'timeline' ? 'white' : 'var(--color-text-main)',
            fontWeight: 800,
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.15s ease'
          }}
        >
          <Calendar size={18} />
          <span>📅 Care Timeline</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('prep')}
          style={{
            flex: 1,
            height: '46px',
            borderRadius: '14px',
            border: 'none',
            background: activeTab === 'prep' ? 'var(--color-primary)' : 'transparent',
            color: activeTab === 'prep' ? 'white' : 'var(--color-text-main)',
            fontWeight: 800,
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.15s ease'
          }}
        >
          <FileCheck size={18} />
          <span>📋 Appointment Prep</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('briefing')}
          style={{
            flex: 1,
            height: '46px',
            borderRadius: '14px',
            border: 'none',
            background: activeTab === 'briefing' ? 'var(--color-primary)' : 'transparent',
            color: activeTab === 'briefing' ? 'white' : 'var(--color-text-main)',
            fontWeight: 800,
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.15s ease'
          }}
        >
          <Stethoscope size={18} />
          <span>🩺 Doctor Briefing</span>
        </button>
      </div>

      {/* Tab Content View */}
      {activeTab === 'timeline' && (
        <CareTimeline
          patientId={selectedPatientId}
          lang={lang}
          refreshTrigger={refreshTrigger}
        />
      )}

      {activeTab === 'prep' && (
        <AppointmentPrep
          patientId={selectedPatientId}
          lang={lang}
        />
      )}

      {activeTab === 'briefing' && (
        <DoctorBriefing
          patientId={selectedPatientId}
          lang={lang}
          onTimelineChange={() => setRefreshTrigger(prev => prev + 1)}
        />
      )}

      {/* Inline Modal for Creating New Patient */}
      {showAddModal && (
        <div className="sheet-overlay" onClick={() => setShowAddModal(false)}>
          <div className="saathi-modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <UserPlus size={24} color="var(--color-primary-dark)" />
                <h3 style={{ fontSize: '20px', fontWeight: 900, color: 'var(--color-primary-dark)' }}>
                  {lang === 'mr' ? 'नवीन रुग्ण नोंदणी' : lang === 'hi' ? 'नया मरीज पंजीकरण' : 'Register New Patient'}
                </h3>
              </div>
              <button style={{ border: 'none', background: '#E2E8F0', width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer' }} onClick={() => setShowAddModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreatePatient} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '10px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--color-text-muted)' }}>Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sunita Ramchandra Shinde"
                  value={patientForm.name}
                  onChange={e => setPatientForm({ ...patientForm, name: e.target.value })}
                  style={{ width: '100%', height: '48px', borderRadius: '14px', border: '1.5px solid var(--color-border)', padding: '0 14px', fontSize: '14px', fontWeight: 700, marginTop: '4px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--color-text-muted)' }}>Age (Years)</label>
                  <input
                    type="number"
                    placeholder="e.g. 28"
                    value={patientForm.age}
                    onChange={e => setPatientForm({ ...patientForm, age: e.target.value })}
                    style={{ width: '100%', height: '48px', borderRadius: '14px', border: '1.5px solid var(--color-border)', padding: '0 14px', fontSize: '14px', fontWeight: 700, marginTop: '4px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--color-text-muted)' }}>Gender</label>
                  <select
                    value={patientForm.gender}
                    onChange={e => setPatientForm({ ...patientForm, gender: e.target.value })}
                    style={{ width: '100%', height: '48px', borderRadius: '14px', border: '1.5px solid var(--color-border)', padding: '0 14px', fontSize: '14px', fontWeight: 700, marginTop: '4px' }}
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--color-text-muted)' }}>Phone Number</label>
                  <input
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={patientForm.phone}
                    onChange={e => setPatientForm({ ...patientForm, phone: e.target.value })}
                    style={{ width: '100%', height: '48px', borderRadius: '14px', border: '1.5px solid var(--color-border)', padding: '0 14px', fontSize: '14px', fontWeight: 700, marginTop: '4px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--color-text-muted)' }}>Village / Sub-District</label>
                  <input
                    type="text"
                    placeholder="e.g. Shirur"
                    value={patientForm.village}
                    onChange={e => setPatientForm({ ...patientForm, village: e.target.value })}
                    style={{ width: '100%', height: '48px', borderRadius: '14px', border: '1.5px solid var(--color-border)', padding: '0 14px', fontSize: '14px', fontWeight: 700, marginTop: '4px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '10px' }}>
                <button
                  type="button"
                  style={{ height: '52px', borderRadius: '16px', border: '1.5px solid var(--color-border)', background: 'var(--color-surface)', fontWeight: 800, cursor: 'pointer' }}
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="btn-large btn-primary"
                  style={{ height: '52px', borderRadius: '16px', fontSize: '15px', fontWeight: 800 }}
                >
                  Save Patient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
