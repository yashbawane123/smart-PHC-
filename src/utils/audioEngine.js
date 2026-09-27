// Audio & Voice Engine for Zero-Literacy Workers

let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// Web Audio API Synthesized Sound Effects (100% Offline Reliable)
export function playSoundTone(type = 'tap') {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === 'tap') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.08); // A5
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'add') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.06); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.12); // G5
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'subtract') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(659.25, now); // E5
      osc.frequency.setValueAtTime(523.25, now + 0.08); // C5
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      osc.start(now);
      osc.stop(now + 0.16);
    } else if (type === 'undo') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(330, now + 0.15);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (type === 'alert') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(440, now + 0.1);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    }
  } catch (err) {
    console.warn('Audio synthesis warning:', err);
  }
}

// Haptic feedback for tactile feel on tablets/phones
export function triggerHaptic(pattern = [40]) {
  if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
    try {
      window.navigator.vibrate(pattern);
    } catch {
      // Haptics not supported or blocked
    }
  }
}

// Web Speech API Voice Synthesis for Multi-lingual Audio Feedback
export function speakText(text, lang = 'hi', rate = 1.0) {
  if (!('speechSynthesis' in window)) {
    console.warn('Speech synthesis not supported in this browser.');
    return;
  }

  try {
    window.speechSynthesis.cancel(); // Stop ongoing speech

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.pitch = 1.0;

    const langCodeMap = {
      hi: 'hi-IN',
      mr: 'mr-IN',
      en: 'en-IN'
    };

    const targetLang = langCodeMap[lang] || 'hi-IN';
    utterance.lang = targetLang;

    // Try to find native voice
    const voices = window.speechSynthesis.getVoices();
    const matchedVoice = voices.find(v => v.lang === targetLang || v.lang.startsWith(lang));
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('Speech error:', err);
  }
}

// Pre-packaged voice key phrases for common zero-literacy actions
export const VOICE_DICTIONARY = {
  hi: {
    welcome: "स्मार्ट पीएचसी में आपका स्वागत है।",
    select_module: "दवा stock, मरीज संख्या, या डॉक्टर उपस्थिति चुनें।",
    medicine_module: "दवा स्टॉक मॉडयूल",
    footfall_module: "मरीज गिनती मॉडयूल",
    attendance_module: "डॉक्टर उपस्थिति मॉडयूल",
    added: "जोड़ा गया",
    subtracted: "घटाया गया",
    dispensed: "दवा दी गई",
    restocked: "नया स्टॉक आया",
    undone: "काम वापस लिया गया",
    stock_low: "चेतावनी! स्टॉक कम है।",
    stock_out: "खतरा! स्टॉक समाप्त हो गया है।",
    doctor_present: "डॉक्टर उपस्थित marked",
    doctor_absent: "डॉक्टर अनुपस्थित marked",
    new_day: "नया दिन शुरू हो गया।",
    synced: "सभी डेटा सर्वर पर सुरक्षित है।",
    offline: "ऑफ़लाइन मोड। डेटा टैबलेट में सुरक्षित है।"
  },
  mr: {
    welcome: "स्मार्ट पीएचसी मध्ये आपले स्वागत आहे.",
    select_module: "औषध स्टॉक, रुग्ण संख्या, किंवा डॉक्टर उपस्थिती निवडा.",
    medicine_module: "औषध स्टॉक विभाग",
    footfall_module: "रुग्ण संख्या विभाग",
    attendance_module: "डॉक्टर उपस्थिती विभाग",
    added: "जोडले",
    subtracted: "कमी केले",
    dispensed: "औषध दिले",
    restocked: "नवीन साठा आला",
    undone: "कृती मागे घेतली",
    stock_low: "सावधान! स्टॉक कमी आहे.",
    stock_out: "धोका! स्टॉक संपला आहे.",
    doctor_present: "डॉक्टर हजर",
    doctor_absent: "डॉक्टर गैरहजर",
    new_day: "नवीन दिवस सुरू झाला.",
    synced: "सर्व डेटा सुरक्षित सेव्ह झाला आहे.",
    offline: "ऑफलाईन मोड. डेटा सुरक्षित आहे."
  },
  en: {
    welcome: "Welcome to Smart PHC Tracker.",
    select_module: "Select Medicine Stock, Patient Count, or Doctor Attendance.",
    medicine_module: "Medicine Stock Module",
    footfall_module: "Patient Footfall Counter",
    attendance_module: "Doctor Attendance Module",
    added: "added",
    subtracted: "subtracted",
    dispensed: "Medicine dispensed",
    restocked: "Stock restocked",
    undone: "Action undone",
    stock_low: "Warning! Stock is low.",
    stock_out: "Danger! Out of stock.",
    doctor_present: "Doctor marked Present",
    doctor_absent: "Doctor marked Absent",
    new_day: "New day started.",
    synced: "All data synced safely.",
    offline: "Offline mode active."
  }
};

export function speakAction(key, lang = 'hi', count = null, itemName = '') {
  playSoundTone('add');
  triggerHaptic([50]);

  const dict = VOICE_DICTIONARY[lang] || VOICE_DICTIONARY.hi;
  let phrase = dict[key] || key;

  if (count !== null && itemName) {
    if (lang === 'hi') {
      phrase = `${itemName} ${count} ${dict.added || 'जोड़ा गया'}`;
    } else if (lang === 'mr') {
      phrase = `${itemName} ${count} ${dict.added || 'जोडले'}`;
    } else {
      phrase = `${count} ${itemName} ${dict.added || 'added'}`;
    }
  }

  speakText(phrase, lang);
}
