import React from 'react';
import { Home, Pill, Footprints, UserCheck, ShieldAlert, Globe, Sun, Moon, Wifi, WifiOff, Volume2, MessageSquare, Compass } from 'lucide-react';
import { speakText, triggerHaptic } from '../utils/audioEngine';

export default function Sidebar({
  lang,
  setLang,
  role,
  setRole,
  activeModule,
  setActiveModule,
  isDaylight,
  setIsDaylight,
  isOnline,
  toggleSyncMode,
  pendingCount
}) {
  const handleNavClick = (moduleKey, spokenText) => {
    triggerHaptic([40]);
    setActiveModule(moduleKey);
    speakText(spokenText, lang);
  };

  const handleLangSelect = (newLang) => {
    triggerHaptic();
    setLang(newLang);
    const spokenName = newLang === 'mr' ? 'मराठी भाषा' : newLang === 'hi' ? 'हिंदी भाषा' : 'English language';
    speakText(spokenName, newLang);
  };

  return (
    <aside className="app-sidebar">
      {/* Brand Header */}
      <div className="sidebar-brand" onClick={() => handleNavClick('home', 'मुख्य स्क्रीन')}>
        <div className="brand-icon">🏥</div>
        <div className="brand-text">
          <h2>स्मार्ट PHC</h2>
          <p>Shirur Health Centre</p>
        </div>
      </div>

      {/* Profile Card */}
      <div className="sidebar-profile-card">
        <div className="avatar-circle">
          {role === 'admin' ? '🩺' : '👩‍⚕️'}
        </div>
        <div className="profile-info">
          <h4>{role === 'admin' ? 'Dr. Sandeep Sharma' : 'Kamla Pawar'}</h4>
          <span className={`role-badge-pill ${role}`}>
            {role === 'admin' ? 'PHC Admin' : 'Health Worker'}
          </span>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="sidebar-nav">
        <div className="nav-section-title">MAIN MODULES</div>

        <button
          className={`sidebar-nav-btn ${activeModule === 'home' ? 'active' : ''}`}
          onClick={() => handleNavClick('home', 'होम स्क्रीन')}
        >
          <Home size={22} />
          <span>{lang === 'mr' ? 'मुख्य स्क्रीन' : lang === 'hi' ? 'मुख्य स्क्रीन' : 'Home Dashboard'}</span>
        </button>

        <button
          className={`sidebar-nav-btn ${activeModule === 'care_nav' ? 'active' : ''}`}
          style={{ borderColor: activeModule === 'care_nav' ? 'var(--color-primary)' : 'transparent' }}
          onClick={() => handleNavClick('care_nav', 'केयर नेविगेशन')}
        >
          <Compass size={22} color="var(--color-primary)" />
          <span>🧭 {lang === 'mr' ? 'केअर नॅव्हिगेशन' : lang === 'hi' ? 'केयर नेविगेशन' : 'Care Navigation'}</span>
        </button>

        <button
          className={`sidebar-nav-btn stock ${activeModule === 'stock' ? 'active' : ''}`}
          onClick={() => handleNavClick('stock', 'दवा स्टॉक')}
        >
          <Pill size={22} />
          <span>💊 {lang === 'mr' ? 'औषध साठा' : lang === 'hi' ? 'दवा स्टॉक' : 'Medicine Stock'}</span>
        </button>

        <button
          className={`sidebar-nav-btn footfall ${activeModule === 'footfall' ? 'active' : ''}`}
          onClick={() => handleNavClick('footfall', 'मरीज गिनती')}
        >
          <Footprints size={22} />
          <span>🚶 {lang === 'mr' ? 'रुग्ण संख्या' : lang === 'hi' ? 'मरीज गिनती' : 'Patient Footfall'}</span>
        </button>

        <button
          className={`sidebar-nav-btn attendance ${activeModule === 'attendance' ? 'active' : ''}`}
          onClick={() => handleNavClick('attendance', 'डॉक्टर उपस्थिति')}
        >
          <UserCheck size={22} />
          <span>🩺 {lang === 'mr' ? 'डॉक्टर हजेरी' : lang === 'hi' ? 'डॉक्टर उपस्थिति' : 'Doctor Attendance'}</span>
        </button>

        <button
          className={`sidebar-nav-btn ${activeModule === 'chat' ? 'active' : ''}`}
          style={{ borderColor: activeModule === 'chat' ? '#0d9488' : 'transparent' }}
          onClick={() => handleNavClick('chat', 'PHC साथी चैट')}
        >
          <MessageSquare size={22} color="#0d9488" />
          <span>💬 {lang === 'mr' ? 'PHC साथी (चॅट)' : lang === 'hi' ? 'PHC साथी (चैट)' : 'PHC Saathi Chat'}</span>
        </button>

        <div className="nav-section-title" style={{ marginTop: '16px' }}>MANAGEMENT</div>

        <button
          className={`sidebar-nav-btn admin ${activeModule === 'admin' ? 'active' : ''}`}
          onClick={() => {
            setRole('admin');
            handleNavClick('admin', 'एडमिन पोर्टल');
          }}
        >
          <ShieldAlert size={22} />
          <span>⚙️ {lang === 'mr' ? 'प्रशासक (Admin)' : lang === 'hi' ? 'प्रशासक (Admin)' : 'In-charge Admin'}</span>
        </button>
      </nav>

      {/* Sidebar Controls Footer */}
      <div className="sidebar-footer">
        {/* Sync Badge */}
        <button
          className={`sidebar-sync-badge ${!isOnline ? 'offline' : pendingCount > 0 ? 'pending' : 'synced'}`}
          onClick={toggleSyncMode}
        >
          {isOnline ? (
            pendingCount > 0 ? (
              <span>🟡 Pending ({pendingCount})</span>
            ) : (
              <>
                <Wifi size={16} />
                <span>🟢 Cloud Synced</span>
              </>
            )
          ) : (
            <>
              <WifiOff size={16} />
              <span>🔴 Offline Queue</span>
            </>
          )}
        </button>

        {/* Language Flag Switcher */}
        <div className="sidebar-lang-pills">
          <button className={`lang-flag-btn ${lang === 'hi' ? 'active' : ''}`} onClick={() => handleLangSelect('hi')}>
            🇮🇳 HI
          </button>
          <button className={`lang-flag-btn ${lang === 'mr' ? 'active' : ''}`} onClick={() => handleLangSelect('mr')}>
            🚩 MR
          </button>
          <button className={`lang-flag-btn ${lang === 'en' ? 'active' : ''}`} onClick={() => handleLangSelect('en')}>
            🇬🇧 EN
          </button>
        </div>

        {/* High Contrast Toggle */}
        <button className="sidebar-daylight-btn" onClick={() => setIsDaylight(!isDaylight)}>
          {isDaylight ? <Sun size={18} color="orange" /> : <Moon size={18} />}
          <span>{isDaylight ? 'Sunlight Mode' : 'Standard Theme'}</span>
        </button>
      </div>
    </aside>
  );
}
