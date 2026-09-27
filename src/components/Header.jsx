import React, { useEffect, useState } from 'react';
import { Wifi, WifiOff, Sun, Moon, ShieldAlert, UserCheck, Volume2 } from 'lucide-react';
import { syncEngine } from '../utils/syncEngine';
import { speakText, triggerHaptic } from '../utils/audioEngine';

export default function Header({
  lang,
  setLang,
  role,
  setRole,
  isDaylight,
  setIsDaylight,
  activeModule,
  setActiveModule
}) {
  const [syncState, setSyncState] = useState({ isOnline: syncEngine.isOnline, isSyncing: false });
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const updatePending = async () => {
      const count = await syncEngine.getPendingCount();
      setPendingCount(count);
    };

    updatePending();
    const unsubscribe = syncEngine.subscribe(state => {
      setSyncState(state);
      updatePending();
    });

    const interval = setInterval(updatePending, 3000);
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const toggleSyncMode = () => {
    triggerHaptic();
    const nextState = !syncState.isOnline;
    syncEngine.setSimulatedOnline(nextState);
    speakText(nextState ? 'ऑनलाइन कनेक्ट हुआ' : 'ऑफ़लाइन मोड सक्रिय', lang);
  };

  const handleLangChange = newLang => {
    triggerHaptic();
    setLang(newLang);
    const spokenName = newLang === 'mr' ? 'मराठी भाषा' : newLang === 'hi' ? 'हिंदी भाषा' : 'English Language';
    speakText(spokenName, newLang);
  };

  const handleRoleToggle = () => {
    triggerHaptic();
    const nextRole = role === 'worker' ? 'admin' : 'worker';
    setRole(nextRole);
    if (nextRole === 'admin') {
      setActiveModule('admin');
      speakText('एडमिन मोड ऑन', lang);
    } else {
      setActiveModule('home');
      speakText('हेल्थ वर्कर मोड', lang);
    }
  };

  return (
    <header className="app-header">
      <div className="header-left">
        <div
          className="logo-badge"
          onClick={() => {
            setActiveModule('home');
            speakText('मुख्य स्क्रीन', lang);
          }}
          title="Home"
        >
          🏥
        </div>
        <div className="header-title-box">
          <h1>स्मार्ट PHC</h1>
          <p>{role === 'admin' ? 'Dr. Sandeep (Admin)' : 'Kamla Pawar (Worker)'}</p>
        </div>
      </div>

      <div className="header-actions">
        {/* Offline / Online Sync Toggle Badge */}
        <button
          className={`sync-badge ${!syncState.isOnline ? 'offline' : pendingCount > 0 ? 'pending' : 'synced'}`}
          onClick={toggleSyncMode}
          title="Click to toggle Online/Offline simulation"
        >
          <span className="sync-dot" />
          {syncState.isOnline ? (
            pendingCount > 0 ? (
              <span>🟡 {pendingCount}</span>
            ) : (
              <Wifi size={16} />
            )
          ) : (
            <WifiOff size={16} />
          )}
        </button>

        {/* Language Selector Flags */}
        <button
          className={`lang-chip ${lang === 'hi' ? 'active' : ''}`}
          onClick={() => handleLangChange('hi')}
          title="Hindi"
        >
          🇮🇳 HI
        </button>

        <button
          className={`lang-chip ${lang === 'mr' ? 'active' : ''}`}
          onClick={() => handleLangChange('mr')}
          title="Marathi"
        >
          🚩 MR
        </button>

        {/* Role Switcher */}
        <button
          className={`role-badge ${role === 'admin' ? 'admin' : ''}`}
          onClick={handleRoleToggle}
          title="Switch role"
        >
          {role === 'admin' ? <ShieldAlert size={16} /> : <UserCheck size={16} />}
          <span>{role === 'admin' ? 'Admin' : 'Worker'}</span>
        </button>

        {/* Daylight Mode Toggle */}
        <button
          className="lang-chip"
          onClick={() => setIsDaylight(!isDaylight)}
          title="Toggle High Contrast Daylight Mode"
        >
          {isDaylight ? <Sun size={18} color="orange" /> : <Moon size={18} />}
        </button>
      </div>
    </header>
  );
}
