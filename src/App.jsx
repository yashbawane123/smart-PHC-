import React, { useState, useEffect } from 'react';
import { seedInitialData } from './db/offlineDb';
import { syncEngine } from './utils/syncEngine';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import LanguageGate from './components/LanguageGate';
import WorkerHome from './components/WorkerHome';
import StockScreen from './components/StockScreen';
import FootfallScreen from './components/FootfallScreen';
import AttendanceScreen from './components/AttendanceScreen';
import AdminDashboard from './components/AdminDashboard';
import AnalyticsCharts from './components/AnalyticsCharts';
import FloatingDock from './components/FloatingDock';
import PHCSaathiAssistant from './components/PHCSaathiAssistant';
import { ChatScreen } from './components/ChatScreen';
import CareNavScreen from './components/CareNavScreen';
import FollowUpNotificationBanner from './components/FollowUpNotificationBanner';
import { Globe } from 'lucide-react';

export default function App() {
  const [lang, setLang] = useState('hi'); // hi | mr | en
  const [role, setRole] = useState('worker'); // worker | admin
  const [activeModule, setActiveModule] = useState('home'); // home | stock | footfall | attendance | admin | language_gate
  const [isDaylight, setIsDaylight] = useState(false);
  const [isSeeded, setIsSeeded] = useState(false);

  const [syncState, setSyncState] = useState({ isOnline: syncEngine.isOnline, isSyncing: false });
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    seedInitialData().then(() => {
      setIsSeeded(true);
    });
  }, []);

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

  useEffect(() => {
    if (isDaylight) {
      document.body.classList.add('daylight-mode');
    } else {
      document.body.classList.remove('daylight-mode');
    }
  }, [isDaylight]);

  const toggleSyncMode = () => {
    const nextState = !syncState.isOnline;
    syncEngine.setSimulatedOnline(nextState);
  };

  if (!isSeeded) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', gap: '16px', background: 'var(--color-bg)' }}>
        <div style={{ fontSize: '48px', animation: 'spin 1s linear infinite' }}>🏥</div>
        <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-primary)' }}>Loading Smart PHC Portal...</div>
      </div>
    );
  }

  return (
    <div className="desktop-layout">
      {/* 1. Left Sidebar Navigation (Desktop/Tablet) */}
      <Sidebar
        lang={lang}
        setLang={setLang}
        role={role}
        setRole={setRole}
        activeModule={activeModule}
        setActiveModule={setActiveModule}
        isDaylight={isDaylight}
        setIsDaylight={setIsDaylight}
        isOnline={syncState.isOnline}
        toggleSyncMode={toggleSyncMode}
        pendingCount={pendingCount}
      />

      {/* 2. Main Workspace Container */}
      <div className="main-workspace">
        {/* Mobile Header Bar */}
        <Header
          lang={lang}
          setLang={setLang}
          role={role}
          setRole={setRole}
          isDaylight={isDaylight}
          setIsDaylight={setIsDaylight}
          activeModule={activeModule}
          setActiveModule={setActiveModule}
        />

        {/* Top Dismissible Follow-Up Notification Banner */}
        <FollowUpNotificationBanner lang={lang} />

        {/* View Router */}
        <div style={{ flex: 1, paddingBottom: '80px' }}>
          {activeModule === 'language_gate' && (
            <LanguageGate
              onSelectLanguage={(selectedLang) => {
                setLang(selectedLang);
                setActiveModule('home');
              }}
            />
          )}

          {activeModule === 'home' && (
            <>
              <WorkerHome
                lang={lang}
                onSelectModule={(moduleKey) => setActiveModule(moduleKey)}
              />
              <AnalyticsCharts lang={lang} />
            </>
          )}

          {activeModule === 'care_nav' && (
            <CareNavScreen
              lang={lang}
              onBack={() => setActiveModule('home')}
            />
          )}

          {activeModule === 'stock' && (
            <StockScreen
              lang={lang}
              onBack={() => setActiveModule('home')}
            />
          )}

          {activeModule === 'footfall' && (
            <FootfallScreen
              lang={lang}
              onBack={() => setActiveModule('home')}
            />
          )}

          {activeModule === 'attendance' && (
            <AttendanceScreen
              lang={lang}
              onBack={() => setActiveModule('home')}
            />
          )}

          {activeModule === 'admin' && (
            <AdminDashboard
              lang={lang}
              onBack={() => setActiveModule('home')}
            />
          )}

          {activeModule === 'chat' && (
            <ChatScreen
              user={{ id: 'user-001', role: role, phc_id: 'phc-001' }}
              phcData={{ name: 'Smart PHC Sub-Center' }}
              lang={lang}
              onBack={() => setActiveModule('home')}
              onNavigate={(mod) => setActiveModule(mod)}
            />
          )}
        </div>

        {/* Floating Dock Quick Action Bar */}
        <FloatingDock
          lang={lang}
          activeModule={activeModule}
          setActiveModule={setActiveModule}
          setRole={setRole}
        />

        {/* PHC Saathi Voice-First Assistant */}
        <PHCSaathiAssistant
          lang={lang}
          onNavigate={(mod) => setActiveModule(mod)}
        />
      </div>
    </div>
  );
}
