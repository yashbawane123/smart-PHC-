import React from 'react';
import { Home, Pill, Footprints, UserCheck, Volume2, ShieldAlert } from 'lucide-react';
import { speakText, triggerHaptic } from '../utils/audioEngine';

export default function FloatingDock({ lang, activeModule, setActiveModule, setRole }) {
  const handleDockTap = (moduleKey, spokenText) => {
    triggerHaptic([40]);
    setActiveModule(moduleKey);
    speakText(spokenText, lang);
  };

  return (
    <div className="floating-dock">
      <button
        className={`dock-item ${activeModule === 'home' ? 'active' : ''}`}
        onClick={() => handleDockTap('home', 'होम स्क्रीन')}
        title="Home"
      >
        <Home size={24} />
      </button>

      <button
        className={`dock-item ${activeModule === 'stock' ? 'active' : ''}`}
        onClick={() => handleDockTap('stock', 'दवा स्टॉक')}
        title="Medicine Stock"
      >
        <Pill size={24} />
      </button>

      <button
        className={`dock-item ${activeModule === 'footfall' ? 'active' : ''}`}
        onClick={() => handleDockTap('footfall', 'मरीज गिनती')}
        title="Patient Footfall"
      >
        <Footprints size={24} />
      </button>

      <button
        className={`dock-item ${activeModule === 'attendance' ? 'active' : ''}`}
        onClick={() => handleDockTap('attendance', 'डॉक्टर उपस्थिति')}
        title="Doctor Attendance"
      >
        <UserCheck size={24} />
      </button>

      <div className="dock-divider" />

      <button
        className="dock-item audio"
        onClick={() => {
          triggerHaptic([60]);
          speakText('स्मार्ट पीएचसी में आपका स्वागत है। आवाज से सहायता सक्रिय है।', lang);
        }}
        title="Audio Assistance Help"
      >
        <Volume2 size={24} />
      </button>
    </div>
  );
}
