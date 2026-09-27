import React, { useState, useEffect } from 'react';
import { db, WORKER_PROFILE_ID } from '../db/offlineDb';
import { ArrowLeft, CheckCircle, XCircle, Volume2, AlertTriangle } from 'lucide-react';
import { speakText, playSoundTone, triggerHaptic } from '../utils/audioEngine';
import { syncEngine } from '../utils/syncEngine';

export default function AttendanceScreen({ lang = 'hi', onBack }) {
  const [doctors, setDoctors] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [session, setSession] = useState('full_day'); // full_day | morning | evening

  const todayStr = new Date().toISOString().split('T')[0];

  const loadAttendance = async () => {
    try {
      const docList = await db.doctors.where('is_active').equals(1).toArray();
      const records = await db.doctor_attendance
        .where('attendance_date')
        .equals(todayStr)
        .toArray();

      const map = {};
      records.forEach(r => {
        if (r.session === session) {
          map[r.doctor_id] = r.status;
        }
      });

      setDoctors(docList);
      setAttendanceMap(map);
    } catch (err) {
      console.warn('Attendance load error:', err);
    }
  };

  useEffect(() => {
    loadAttendance();
  }, [session]);

  const handleToggleAttendance = async (doctor, currentStatus) => {
    try {
      let nextStatus = 'present';
      if (currentStatus === 'present') nextStatus = 'absent';
      else if (currentStatus === 'absent') nextStatus = 'present';

      if (nextStatus === 'present') {
        playSoundTone('add');
      } else {
        playSoundTone('subtract');
      }
      triggerHaptic([60]);

      // IndexedDB save
      await db.doctor_attendance.put({
        id: `att-${doctor.id}-${todayStr}-${session}`,
        doctor_id: doctor.id,
        attendance_date: todayStr,
        session: session,
        status: nextStatus,
        marked_by: WORKER_PROFILE_ID,
        marked_at: new Date().toISOString(),
        synced: 0
      });

      await loadAttendance();
      syncEngine.triggerSync();

      const statusText = nextStatus === 'present'
        ? (lang === 'mr' ? `${doctor.full_name} हजर` : lang === 'hi' ? `${doctor.full_name} उपस्थित` : `${doctor.full_name} Present`)
        : (lang === 'mr' ? `${doctor.full_name} गैरहजर` : lang === 'hi' ? `${doctor.full_name} अनुपस्थित` : `${doctor.full_name} Absent`);

      speakText(statusText, lang);
    } catch (err) {
      console.error('Attendance toggle error:', err);
    }
  };

  const handleBackWithCheck = () => {
    const unmarkedCount = doctors.length - Object.keys(attendanceMap).length;
    if (unmarkedCount > 0) {
      const warnMsg = lang === 'mr' ? `${unmarkedCount} डॉक्टरांची हजेरी बाकी आहे!` : lang === 'hi' ? `${unmarkedCount} डॉक्टरों की उपस्थिति बाकी है!` : `${unmarkedCount} doctors unmarked!`;
      speakText(warnMsg, lang);
    }
    onBack();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '90vh' }}>
      {/* Title Header */}
      <div style={{ background: 'var(--color-surface)', padding: '16px 20px', borderBottom: '2px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            onClick={handleBackWithCheck}
            style={{ width: '56px', height: '56px', borderRadius: '16px', border: 'none', background: 'var(--color-bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <ArrowLeft size={28} />
          </button>
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--color-warning)' }}>
              🩺 {lang === 'mr' ? 'डॉक्टर हजेरी' : lang === 'hi' ? 'डॉक्टर उपस्थिति' : 'Doctor Attendance'}
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: 600 }}>
              📅 {todayStr}
            </p>
          </div>
        </div>
      </div>

      {/* Session Pills (Full Day / Morning / Evening) */}
      <div style={{ display: 'flex', gap: '8px', padding: '12px 16px', background: 'var(--color-bg)' }}>
        <button
          className={`lang-chip ${session === 'full_day' ? 'active' : ''}`}
          onClick={() => setSession('full_day')}
        >
          ☀️ {lang === 'mr' ? 'पूर्ण दिवस' : lang === 'hi' ? 'पूरा दिन' : 'Full Day'}
        </button>
        <button
          className={`lang-chip ${session === 'morning' ? 'active' : ''}`}
          onClick={() => setSession('morning')}
        >
          🌅 {lang === 'mr' ? 'सकाळ' : lang === 'hi' ? 'सुबह' : 'Morning'}
        </button>
        <button
          className={`lang-chip ${session === 'evening' ? 'active' : ''}`}
          onClick={() => setSession('evening')}
        >
          🌇 {lang === 'mr' ? 'संध्याकाळ' : lang === 'hi' ? 'शाम' : 'Evening'}
        </button>
      </div>

      {/* Unmarked Warning Bar */}
      {doctors.length > Object.keys(attendanceMap).length && (
        <div style={{ margin: '8px 16px 0', background: 'var(--color-warning-bg)', border: '2px solid var(--color-warning)', padding: '10px 14px', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertTriangle size={24} color="var(--color-warning)" />
          <div style={{ fontSize: '14px', fontWeight: 800, color: '#744210' }}>
            {lang === 'mr' ? `⚠️ ${doctors.length - Object.keys(attendanceMap).length} डॉक्टरांची नोंदणी बाकी!` : lang === 'hi' ? `⚠️ ${doctors.length - Object.keys(attendanceMap).length} डॉक्टरों की उपस्थिति बाकी!` : `⚠️ ${doctors.length - Object.keys(attendanceMap).length} doctors unmarked!`}
          </div>
        </div>
      )}

      {/* Doctor Cards List */}
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {doctors.map(doc => {
          const status = attendanceMap[doc.id]; // 'present' | 'absent' | undefined

          return (
            <div key={doc.id} className="doctor-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img src={doc.photo_url} alt={doc.full_name} className="doctor-photo-circle" />
                <div className="doctor-details">
                  <h3>{doc.full_name}</h3>
                  <p>General Medicine</p>
                  <button
                    style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px', fontSize: '13px', fontWeight: 700 }}
                    onClick={() => speakText(doc.full_name, lang)}
                  >
                    <Volume2 size={16} />
                    <span>Listen Name</span>
                  </button>
                </div>
              </div>

              {/* Giant 80px Toggle Attendance Button */}
              <button
                className={`toggle-attendance-btn ${status || 'unmarked'}`}
                onClick={() => handleToggleAttendance(doc, status)}
              >
                {status === 'present' ? (
                  <>
                    <CheckCircle size={28} />
                    <span>{lang === 'mr' ? 'हजर (Present)' : lang === 'hi' ? 'उपस्थित' : 'Present'}</span>
                  </>
                ) : status === 'absent' ? (
                  <>
                    <XCircle size={28} />
                    <span>{lang === 'mr' ? 'गैरहजर (Absent)' : lang === 'hi' ? 'अनुपस्थित' : 'Absent'}</span>
                  </>
                ) : (
                  <>
                    <span>⚪ {lang === 'mr' ? 'नोंदवा (Mark)' : lang === 'hi' ? 'दर्ज करें' : 'Mark'}</span>
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
