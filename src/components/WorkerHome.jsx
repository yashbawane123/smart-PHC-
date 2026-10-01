import React, { useEffect, useState } from 'react';
import { Pill, UserCheck, Footprints, AlertTriangle, ChevronRight, Volume2, MessageSquare, Compass } from 'lucide-react';
import { db } from '../db/offlineDb';
import { speakText, VOICE_DICTIONARY, triggerHaptic } from '../utils/audioEngine';

export default function WorkerHome({ lang, onSelectModule }) {
  const [lowStockCount, setLowStockCount] = useState(0);
  const [todayFootfall, setTodayFootfall] = useState(0);

  useEffect(() => {
    const fetchQuickStats = async () => {
      try {
        const stocks = await db.medicine_stock.toArray();
        const medicines = await db.medicines.toArray();

        let lowCount = 0;
        stocks.forEach(st => {
          const med = medicines.find(m => m.id === st.medicine_id);
          if (med && (st.quantity <= med.threshold || st.quantity === 0)) {
            lowCount++;
          }
        });
        setLowStockCount(lowCount);

        const todayStr = new Date().toISOString().split('T')[0];
        const footfalls = await db.patient_footfall.where('visit_date').equals(todayStr).toArray();
        const total = footfalls.reduce((sum, f) => sum + f.count, 0);
        setTodayFootfall(total);
      } catch (err) {
        console.warn('Home stats fetch error:', err);
      }
    };

    fetchQuickStats();
  }, []);

  const handleTileClick = (moduleKey, audioDictKey) => {
    triggerHaptic([50]);
    const dict = VOICE_DICTIONARY[lang] || VOICE_DICTIONARY.hi;
    speakText(dict[audioDictKey] || moduleKey, lang);
    onSelectModule(moduleKey);
  };

  const handleLongPressSpeech = (audioDictKey) => {
    triggerHaptic([30]);
    const dict = VOICE_DICTIONARY[lang] || VOICE_DICTIONARY.hi;
    speakText(dict[audioDictKey], lang);
  };

  return (
    <div className="module-grid">
      {/* Welcome Banner */}
      <div style={{ background: 'var(--color-surface)', padding: '16px 20px', borderRadius: '20px', boxShadow: 'var(--shadow-sm)', border: '2px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-primary)' }}>
            {lang === 'mr' ? 'नमस्ते कमळाजी 👋' : lang === 'hi' ? 'नमस्ते कमिला जी 👋' : 'Hello Kamla 👋'}
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', fontWeight: 600 }}>
            {lang === 'mr' ? 'आजचे कामकाज सुरू करा' : lang === 'hi' ? 'आज का काम शुरू करें' : 'Start your daily tracking'}
          </p>
        </div>
        <button
          onClick={() => speakText(VOICE_DICTIONARY[lang]?.select_module || 'Select a module', lang)}
          style={{ background: 'var(--color-primary-bg)', border: 'none', width: '48px', height: '48px', borderRadius: '14px', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          title="Play instructions"
        >
          <Volume2 size={24} />
        </button>
      </div>

      {/* Low Stock Alert Strip if any */}
      {lowStockCount > 0 && (
        <div style={{ background: 'var(--color-warning-bg)', border: '2px solid var(--color-warning)', padding: '12px 18px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <AlertTriangle size={28} color="var(--color-warning)" />
          <div>
            <div style={{ fontWeight: 800, fontSize: '16px', color: '#B78103' }}>
              {lang === 'mr' ? `⚠️ ${lowStockCount} औषधांचा साठा कमी आहे!` : lang === 'hi' ? `⚠️ ${lowStockCount} दवाओं का स्टॉक कम है!` : `⚠️ ${lowStockCount} medicines low in stock!`}
            </div>
            <div style={{ fontSize: '13px', color: '#744210' }}>
              {lang === 'mr' ? 'तपासा आणि नवीन ऑर्डर करा' : lang === 'hi' ? 'स्टॉक तुरंत चेक करें' : 'Check stock screen'}
            </div>
          </div>
        </div>
      )}

      {/* Module 0: Care Navigation AI Agent */}
      <div
        className="module-tile footfall"
        style={{ borderColor: 'var(--color-primary)', background: 'linear-gradient(135deg, #FFFFFF 60%, #E0F2FE 100%)' }}
        onClick={() => handleTileClick('care_nav', 'care_nav_module')}
      >
        <div className="module-icon-box" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary-dark)' }}>
          <Compass size={48} />
        </div>
        <div className="module-info">
          <h2>🧭 {lang === 'mr' ? 'केअर नॅव्हिगेशन' : lang === 'hi' ? 'केयर नेविगेशन' : 'Care Navigation'}</h2>
          <p>{lang === 'mr' ? 'कागदपत्रे अपलोड करा व माहिती तपासा' : lang === 'hi' ? 'मेडिकल रिकॉर्ड व AI एक्सट्रैक्शन' : 'AI Medical Records & Timeline'}</p>
        </div>
        <ChevronRight size={32} color="var(--color-primary)" />
      </div>

      {/* Module 1: Medicine Stock */}
      <div
        className="module-tile stock"
        onClick={() => handleTileClick('stock', 'medicine_module')}
        onContextMenu={(e) => { e.preventDefault(); handleLongPressSpeech('medicine_module'); }}
      >
        <div className="module-icon-box">
          <Pill size={48} />
        </div>
        <div className="module-info">
          <h2>💊 {lang === 'mr' ? 'औषध साठा' : lang === 'hi' ? 'दवा स्टॉक' : 'Medicine Stock'}</h2>
          <p>{lang === 'mr' ? 'साठा जोडणे / कमी करणे' : lang === 'hi' ? 'दवा जोडें या घटायें' : 'Add / dispense medicine count'}</p>
        </div>
        <ChevronRight size={32} color="var(--color-safe)" />
      </div>

      {/* Module 2: Patient Footfall */}
      <div
        className="module-tile footfall"
        onClick={() => handleTileClick('footfall', 'footfall_module')}
        onContextMenu={(e) => { e.preventDefault(); handleLongPressSpeech('footfall_module'); }}
      >
        <div className="module-icon-box">
          <Footprints size={48} />
        </div>
        <div className="module-info">
          <h2>🚶 {lang === 'mr' ? 'रुग्ण संख्या' : lang === 'hi' ? 'मरीज गिनती' : 'Patient Footfall'}</h2>
          <p>
            {lang === 'mr' ? `आज एकूण: ${todayFootfall} रुग्ण` : lang === 'hi' ? `आज कुल: ${todayFootfall} मरीज` : `Today total: ${todayFootfall} patients`}
          </p>
        </div>
        <ChevronRight size={32} color="var(--color-primary)" />
      </div>

      {/* Module 3: Doctor Attendance */}
      <div
        className="module-tile attendance"
        onClick={() => handleTileClick('attendance', 'attendance_module')}
        onContextMenu={(e) => { e.preventDefault(); handleLongPressSpeech('attendance_module'); }}
      >
        <div className="module-icon-box">
          <UserCheck size={48} />
        </div>
        <div className="module-info">
          <h2>🩺 {lang === 'mr' ? 'डॉक्टर हजेरी' : lang === 'hi' ? 'डॉक्टर उपस्थिति' : 'Doctor Attendance'}</h2>
          <p>{lang === 'mr' ? 'हजर / गैरहजर नोंदवा' : lang === 'hi' ? 'उपस्थित / अनुपस्थित दर्ज करें' : 'Mark Present / Absent'}</p>
        </div>
        <ChevronRight size={32} color="var(--color-warning)" />
      </div>

      {/* Module 4: PHC Saathi Chat & Voice Assistant */}
      <div
        className="module-tile chat"
        style={{ borderLeft: '8px solid #0d9488' }}
        onClick={() => handleTileClick('chat', 'saathi_assistant')}
        onContextMenu={(e) => { e.preventDefault(); handleLongPressSpeech('saathi_assistant'); }}
      >
        <div className="module-icon-box" style={{ background: '#e6fffa', color: '#0d9488' }}>
          <MessageSquare size={48} />
        </div>
        <div className="module-info">
          <h2>💬 {lang === 'mr' ? 'PHC साथी (व्हॉइस/चॅट)' : lang === 'hi' ? 'PHC साथी (वॉयस/चैट)' : 'PHC Saathi (Voice/Chat)'}</h2>
          <p>{lang === 'mr' ? 'बोलून काम करा किंवा चॅट करा' : lang === 'hi' ? 'बोलकर काम करें या चैट करें' : 'Speak or tap quick chips'}</p>
        </div>
        <ChevronRight size={32} color="#0d9488" />
      </div>
    </div>
  );
}
