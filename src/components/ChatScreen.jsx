import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, MicOff, Send, Volume2, ShieldAlert, PhoneCall, RefreshCw, 
  ChevronLeft, Image, HelpCircle, Package, UserPlus, AlertTriangle, 
  MessageSquare, Keyboard, CheckCircle, Info, Sparkles
} from 'lucide-react';
import { processVoiceIntent, getQuickReplyChips, splitAdminReplyText, EMERGENCY_NUMBERS } from '../utils/phcSaathiEngine';
import { db } from '../db/offlineDb';

export function ChatScreen({ user, phcData, onBack, onNavigate, lang = 'hi' }) {
  const [messages, setMessages] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [showKeyboard, setShowKeyboard] = useState(user?.role === 'admin');
  const [textInput, setTextInput] = useState('');
  const [sttFailCount, setSttFailCount] = useState(0);
  const [showPictureMenu, setShowPictureMenu] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [emergencyModal, setEmergencyModal] = useState(null);
  const [activeAudioId, setActiveAudioId] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const autoStopTimerRef = useRef(null);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Initialize or load chat session
  useEffect(() => {
    async function initSession() {
      try {
        let session = await db.chat_sessions
          .where('user_id')
          .equals(user?.id || 'demo-user')
          .first();

        if (!session) {
          const newId = crypto.randomUUID ? crypto.randomUUID() : `session-${Date.now()}`;
          session = {
            id: newId,
            phc_id: user?.phc_id || 'phc-001',
            user_id: user?.id || 'demo-user',
            channel: 'in_app',
            created_at: new Date().toISOString()
          };
          await db.chat_sessions.add(session);
        }
        setSessionId(session.id);

        // Fetch past messages
        const history = await db.chat_messages
          .where('session_id')
          .equals(session.id)
          .sortBy('created_at');

        if (history.length > 0) {
          setMessages(history);
        } else {
          // Default Welcome Message
          const welcomeMsg = {
            id: `msg-${Date.now()}`,
            session_id: session.id,
            sender_role: 'bot',
            input_mode: 'chip',
            intent: 'GREETING',
            text_body: lang === 'mr' ? 'नमस्कार! मी PHC साथी. बोला किंवा खालील बटणावर दाबा.' : 'Namaste! Main PHC Saathi hoon. Boliye ya neeche chip par tap kariye.',
            response_key: 'greeting_audio',
            tally_dots: 0,
            created_at: new Date().toISOString()
          };
          await db.chat_messages.add(welcomeMsg);
          setMessages([welcomeMsg]);
          speakText(welcomeMsg.text_body);
        }
      } catch (err) {
        console.warn('Session init fallback:', err);
      }
    }

    initSession();
  }, [user, lang]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  // Audio Text-to-Speech simulation (Web Speech API)
  const speakText = (text) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel(); // stop previous
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'mr' ? 'mr-IN' : 'hi-IN';
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  };

  // Save message to state and Dexie outbox
  const saveMessage = async (msg) => {
    const fullMsg = {
      id: msg.id || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      session_id: sessionId || 'default-session',
      sender_role: msg.sender_role,
      input_mode: msg.input_mode || 'chip',
      intent: msg.intent || null,
      text_body: msg.text_body,
      response_key: msg.response_key || null,
      picture_url: msg.picture_url || null,
      tally_dots: msg.tally_dots || 0,
      confirm_action: msg.confirm_action || null,
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, fullMsg]);
    try {
      await db.chat_messages.add(fullMsg);
    } catch (e) {
      console.warn('Dexie add msg error:', e);
    }
    return fullMsg;
  };

  // Handle bot response logic
  const handleUserSpeechOrText = async (text, inputMode = 'voice') => {
    if (!text || !text.trim()) return;

    // Save user message
    await saveMessage({
      sender_role: user?.role === 'admin' ? 'admin' : 'worker',
      input_mode: inputMode,
      text_body: text
    });

    setIsThinking(true);
    speakText("Soch raha hoon...");

    // Simulated delay for thinking state
    setTimeout(async () => {
      setIsThinking(false);
      const botRes = await processVoiceIntent(text, { role: user?.role || 'worker', lang });

      // Check emergency modal override
      if (botRes.intent === 'EMERGENCY') {
        setEmergencyModal({
          title: '🚨 Aapne Emergency Boli Hai',
          text: botRes.text_body
        });
        await saveMessage({
          sender_role: 'bot',
          input_mode: 'chip',
          intent: 'EMERGENCY',
          text_body: botRes.text_body,
          response_key: 'emergency_audio'
        });
        speakText(botRes.text_body);
        return;
      }

      // Check medical safety guardrail
      if (botRes.intent === 'MEDICAL_BLOCKED') {
        await saveMessage({
          sender_role: 'bot',
          input_mode: 'chip',
          intent: 'MEDICAL_BLOCKED',
          text_body: botRes.text_body,
          response_key: 'medical_blocked_audio',
          confirm_action: {
            type: 'CALL_NUMBERS',
            numbers: ['104', '108', '112']
          }
        });
        speakText(botRes.text_body);
        return;
      }

      // If Admin is sending reply, enforce 15-word max per bubble limit
      if (user?.role === 'admin' && inputMode === 'text') {
        const chunks = splitAdminReplyText(text, 15);
        for (const chunk of chunks) {
          await saveMessage({
            sender_role: 'admin',
            input_mode: 'text',
            text_body: chunk
          });
          speakText(chunk);
        }
        return;
      }

      // Normal Bot response
      const savedBotMsg = await saveMessage({
        sender_role: 'bot',
        input_mode: 'chip',
        intent: botRes.intent,
        text_body: botRes.text_body,
        picture_url: botRes.picture_url,
        tally_dots: botRes.tally_dots,
        confirm_action: botRes.confirm_action,
        response_key: `${botRes.intent.toLowerCase()}_audio`
      });

      speakText(botRes.text_body);
    }, 800);
  };

  // Mic STT handler
  const startListening = () => {
    if (isListening) {
      stopListening();
      return;
    }

    // Haptic feedback start
    if (navigator.vibrate) navigator.vibrate(50);
    setIsListening(true);

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      // Fallback if browser STT not supported
      setTimeout(() => {
        handleUserSpeechOrText('Paracetamol stock check karo', 'voice');
        stopListening();
      }, 1500);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = lang === 'mr' ? 'mr-IN' : 'hi-IN';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setSttFailCount(0);
        stopListening();
        handleUserSpeechOrText(transcript, 'voice');
      };

      recognition.onerror = () => {
        handleSttFailure();
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
      recognitionRef.current = recognition;

      // 10-second auto-stop
      autoStopTimerRef.current = setTimeout(() => {
        stopListening();
      }, 10000);

    } catch (e) {
      handleSttFailure();
    }
  };

  const stopListening = () => {
    // Haptic stop
    if (navigator.vibrate) navigator.vibrate([30, 30]);
    setIsListening(false);
    if (autoStopTimerRef.current) clearTimeout(autoStopTimerRef.current);
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }
  };

  const handleSttFailure = () => {
    stopListening();
    const newFailCount = sttFailCount + 1;
    setSttFailCount(newFailCount);

    if (newFailCount >= 2) {
      setShowPictureMenu(true);
      speakText("Aapki aawaz samajh nahi aayi. Kripya neeche photo choose karein.");
    } else {
      speakText("Dobaara boliye, aawaz saaf nahi aayi.");
    }
  };

  // Handle confirm card action (e.g. Yes to Stock Add, Yes to Escalate)
  const handleConfirmAction = async (msg, confirm) => {
    if (!confirm) {
      await saveMessage({
        sender_role: 'bot',
        input_mode: 'chip',
        text_body: 'Thik hai, cancel kar diya gaya hai.'
      });
      speakText('Thik hai, cancel kar diya.');
      return;
    }

    const action = msg.confirm_action;
    if (action?.type === 'STOCK_UPDATE') {
      try {
        await db.stock_movements.add({
          id: `sm-${Date.now()}`,
          phc_id: user?.phc_id || 'phc-001',
          medicine_name: action.medicine,
          quantity_change: action.change,
          reason: 'chat_adjustment',
          created_at: new Date().toISOString()
        });

        await saveMessage({
          sender_role: 'bot',
          input_mode: 'chip',
          intent: 'STOCK_UPDATED',
          text_body: `✅ ${action.medicine} ke ${action.change} units register kar diye (Reason: Chat Adjustment).`
        });
        speakText(`${action.medicine} update ho gaya.`);
      } catch (err) {
        console.error('Stock update err:', err);
      }
    } else if (action?.type === 'FOOTFALL_ADD') {
      await saveMessage({
        sender_role: 'bot',
        input_mode: 'chip',
        text_body: `✅ ${action.count} Naye OPD Patients system mein jud gaye hai.`
      });
      speakText('Patients count update ho gaya hai.');
    } else if (action?.type === 'ESCALATE_ADMIN') {
      await saveMessage({
        sender_role: 'bot',
        input_mode: 'chip',
        text_body: '🔔 Dr. Sahab ko notification bhej di gayi hai. Woh jald hi jawab denge.'
      });
      speakText('Doctor sahab ko notification bhej di hai.');
    }
  };

  const quickChips = getQuickReplyChips();

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      maxWidth: '500px',
      margin: '0 auto',
      backgroundColor: '#f8fafc',
      fontFamily: 'Noto Sans Devanagari, system-ui, sans-serif',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Top Header */}
      <header style={{
        background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
        color: '#ffffff',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={onBack}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              cursor: 'pointer'
            }}
          >
            <ChevronLeft size={22} />
          </button>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>💬 PHC Saathi</span>
              <span style={{ fontSize: '10px', background: '#f59e0b', color: '#000', padding: '2px 6px', borderRadius: '10px', fontWeight: '800' }}>
                HYBRID VOICE
              </span>
            </div>
            <div style={{ fontSize: '12px', opacity: 0.9 }}>
              {user?.role === 'admin' ? '🔑 Admin Assistant' : '👩‍⚕️ Health Worker Companion'}
            </div>
          </div>
        </div>

        {/* Offline / Online Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {!isOnline && (
            <span style={{ fontSize: '11px', background: '#ef4444', color: '#fff', padding: '3px 8px', borderRadius: '12px' }}>
              Offline (20 Top Intents Ready)
            </span>
          )}
          {user?.role === 'admin' && (
            <button
              onClick={() => setShowKeyboard(!showKeyboard)}
              style={{
                background: showKeyboard ? '#f59e0b' : 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: '8px',
                padding: '6px 10px',
                color: showKeyboard ? '#000' : '#fff',
                fontSize: '12px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer'
              }}
            >
              <Keyboard size={16} />
              {showKeyboard ? 'Hide KB' : 'Type'}
            </button>
          )}
        </div>
      </header>

      {/* Offline Banner alert if offline */}
      {!isOnline && (
        <div style={{
          backgroundColor: '#fef3c7',
          color: '#92400e',
          padding: '8px 16px',
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          borderBottom: '1px solid #fde68a'
        }}>
          <Info size={16} />
          <span>Abhi internet nahi hai, top 20 sawal local engine se instant chalenge.</span>
        </div>
      )}

      {/* Main Messages List */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        paddingBottom: '160px' // Space for floating mic & quick chips
      }}>
        {messages.map((msg) => {
          const isUser = msg.sender_role === 'worker' || (msg.sender_role === 'admin' && !msg.intent);
          const isAdminRole = msg.sender_role === 'admin';

          return (
            <div 
              key={msg.id} 
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isUser ? 'flex-end' : 'flex-start',
                width: '100%'
              }}
            >
              <div style={{
                maxWidth: '85%',
                padding: '12px 16px',
                borderRadius: isUser ? '18px 18px 2px 18px' : '18px 18px 18px 2px',
                backgroundColor: isUser 
                  ? (isAdminRole ? '#1e293b' : '#10b981') 
                  : '#ffffff',
                color: isUser ? '#ffffff' : '#1e293b',
                boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                border: isUser ? 'none' : '1px solid #e2e8f0',
                fontSize: '15px',
                lineHeight: '1.4'
              }}>
                {/* Role badge for admin */}
                {isAdminRole && (
                  <div style={{ fontSize: '10px', color: '#f59e0b', fontWeight: 'bold', marginBottom: '4px' }}>
                    👑 ADMIN RESPONSE (≤15 words bubble)
                  </div>
                )}

                {/* Picture Card if present */}
                {msg.picture_url && (
                  <div style={{ marginBottom: '8px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
                    <img src={msg.picture_url} alt="card" style={{ width: '100%', height: '120px', objectFit: 'cover' }} />
                  </div>
                )}

                {/* Main Text */}
                <div style={{ fontWeight: '500' }}>{msg.text_body}</div>

                {/* Tally Dots for numeral-illiterate users */}
                {msg.tally_dots > 0 && (
                  <div style={{
                    marginTop: '8px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '4px',
                    background: '#f1f5f9',
                    padding: '6px',
                    borderRadius: '8px'
                  }}>
                    {Array.from({ length: msg.tally_dots }).map((_, idx) => (
                      <span key={idx} style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor: '#10b981',
                        display: 'inline-block'
                      }} />
                    ))}
                    <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '6px' }}>
                      ({msg.tally_dots} Ginti Dots)
                    </span>
                  </div>
                )}

                {/* Audio Spoken Play Button on Bot Messages */}
                {!isUser && (
                  <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: '4px', borderTop: '1px solid #f1f5f9' }}>
                    <button
                      onClick={() => speakText(msg.text_body)}
                      style={{
                        background: '#e0f2fe',
                        color: '#0284c7',
                        border: 'none',
                        borderRadius: '16px',
                        padding: '4px 10px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      <Volume2 size={14} /> Suniye (Listen)
                    </button>
                    <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}

                {/* Confirm Action Buttons (e.g. Confirm Stock Add) */}
                {msg.confirm_action && (
                  <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleConfirmAction(msg, true)}
                      style={{
                        flex: 1,
                        background: '#10b981',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '8px',
                        fontWeight: 'bold',
                        fontSize: '13px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px'
                      }}
                    >
                      <CheckCircle size={16} /> Haan (Yes)
                    </button>
                    <button
                      onClick={() => handleConfirmAction(msg, false)}
                      style={{
                        flex: 1,
                        background: '#ef4444',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '8px',
                        fontWeight: 'bold',
                        fontSize: '13px',
                        cursor: 'pointer'
                      }}
                    >
                      Nahi (Cancel)
                    </button>
                  </div>
                )}

                {/* Call Emergency Numbers if Medical Guardrail triggered */}
                {msg.intent === 'MEDICAL_BLOCKED' && (
                  <div style={{ marginTop: '10px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {['104', '108', '112'].map(num => (
                      <a
                        key={num}
                        href={`tel:${num}`}
                        style={{
                          background: '#dc2626',
                          color: '#fff',
                          textDecoration: 'none',
                          padding: '6px 12px',
                          borderRadius: '16px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <PhoneCall size={12} /> Call {num}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Thinking / Soch raha hoon state */}
        {isThinking && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', padding: '10px 14px', borderRadius: '16px', width: 'fit-content', border: '1px solid #e2e8f0' }}>
            <Sparkles size={18} className="animate-spin" style={{ color: '#0d9488' }} />
            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 'bold' }}>Soch raha hoon...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Picture-based Quick Fallback Menu if 2x STT Fails */}
      {showPictureMenu && (
        <div style={{
          position: 'absolute',
          bottom: '140px',
          left: '16px',
          right: '16px',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '14px',
          boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
          border: '2px solid #f59e0b',
          zIndex: 20
        }}>
          <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#b45309', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>🖼️ Photo Choose Karein (Voice option fallback)</span>
            <button onClick={() => setShowPictureMenu(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '14px' }}>✕</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              onClick={() => {
                setShowPictureMenu(false);
                handleUserSpeechOrText('Paracetamol stock check karo', 'chip');
              }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '8px',
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              <Package size={24} color="#0d9488" />
              <span style={{ fontSize: '12px', fontWeight: 'bold', marginTop: '4px' }}>💊 Medicine Stock</span>
            </button>
            <button
              onClick={() => {
                setShowPictureMenu(false);
                handleUserSpeechOrText('5 naye OPD patient aaye', 'chip');
              }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '8px',
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              <UserPlus size={24} color="#16a34a" />
              <span style={{ fontSize: '12px', fontWeight: 'bold', marginTop: '4px' }}>🚶 Patient Register</span>
            </button>
          </div>
        </div>
      )}

      {/* Floating Quick Reply Chips Bar (Max 3 words, Icon + Text) */}
      <div style={{
        position: 'absolute',
        bottom: showKeyboard ? '75px' : '95px',
        left: 0,
        right: 0,
        display: 'flex',
        gap: '8px',
        overflowX: 'auto',
        padding: '8px 16px',
        scrollSnapType: 'x mandatory',
        zIndex: 15,
        backgroundColor: 'rgba(248, 250, 252, 0.95)',
        backdropFilter: 'blur(4px)'
      }}>
        {quickChips.map(chip => (
          <button
            key={chip.id}
            onClick={() => handleUserSpeechOrText(chip.text, 'chip')}
            style={{
              scrollSnapAlign: 'start',
              whiteSpace: 'nowrap',
              background: '#ffffff',
              border: '1.5px solid #0d9488',
              color: '#0f766e',
              padding: '8px 14px',
              borderRadius: '20px',
              fontWeight: 'bold',
              fontSize: '13px',
              boxShadow: '0 2px 6px rgba(13, 148, 136, 0.15)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              flexShrink: 0
            }}
          >
            <span>{chip.label}</span>
          </button>
        ))}
      </div>

      {/* Optional Keyboard Input Box (Shown for Admin or when Keyboard button clicked) */}
      {showKeyboard && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!textInput.trim()) return;
            handleUserSpeechOrText(textInput, 'text');
            setTextInput('');
          }}
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            backgroundColor: '#ffffff',
            borderTop: '1px solid #cbd5e1',
            zIndex: 15
          }}
        >
          <input
            type="text"
            placeholder={user?.role === 'admin' ? "Type response (≤15 words split)..." : "Boliye ya likhiye..."}
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: '20px',
              border: '1px solid #cbd5e1',
              fontSize: '14px',
              outline: 'none'
            }}
          />
          <button
            type="submit"
            style={{
              background: '#0d9488',
              color: '#fff',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <Send size={18} />
          </button>
        </form>
      )}

      {/* Primary Floating 88px Voice Mic Button (Worker Primary Interface) */}
      {!showKeyboard && (
        <div style={{
          position: 'absolute',
          bottom: '12px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 25,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px'
        }}>
          <button
            onClick={startListening}
            style={{
              width: '88px',
              height: '88px',
              borderRadius: '50%',
              background: isListening 
                ? 'radial-gradient(circle, #ef4444 0%, #dc2626 100%)' 
                : 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
              border: '4px solid #ffffff',
              boxShadow: isListening 
                ? '0 0 0 10px rgba(239, 68, 68, 0.3), 0 8px 25px rgba(0,0,0,0.3)' 
                : '0 6px 20px rgba(13, 148, 136, 0.4)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease-in-out',
              animation: isListening ? 'pulse 1.2s infinite' : 'none'
            }}
          >
            {isListening ? <MicOff size={40} /> : <Mic size={44} />}
          </button>
          <span style={{ fontSize: '11px', fontWeight: '800', color: isListening ? '#dc2626' : '#0f766e', background: '#fff', padding: '2px 8px', borderRadius: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
            {isListening ? 'SU N RAHA HOON...' : 'BOLIYE (TAP MIC)'}
          </span>
        </div>
      )}

      {/* Emergency Modal Override */}
      {emergencyModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '24px',
            padding: '24px',
            maxWidth: '400px',
            textAlign: 'center',
            border: '4px solid #dc2626',
            boxShadow: '0 10px 40px rgba(220, 38, 38, 0.5)'
          }}>
            <ShieldAlert size={64} color="#dc2626" style={{ margin: '0 auto 12px' }} />
            <h2 style={{ color: '#dc2626', fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>
              {emergencyModal.title}
            </h2>
            <p style={{ color: '#334155', fontSize: '14px', marginBottom: '20px', lineHeight: '1.5' }}>
              {emergencyModal.text}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <a
                href="tel:108"
                style={{
                  background: '#dc2626',
                  color: '#fff',
                  textDecoration: 'none',
                  padding: '14px',
                  borderRadius: '12px',
                  fontWeight: 'bold',
                  fontSize: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <PhoneCall size={20} /> CALL 108 AMBULANCE IMMEDIATELY
              </a>
              <a
                href="tel:104"
                style={{
                  background: '#2563eb',
                  color: '#fff',
                  textDecoration: 'none',
                  padding: '12px',
                  borderRadius: '12px',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <PhoneCall size={18} /> CALL 104 HEALTH HELPLINE
              </a>
              <button
                onClick={() => setEmergencyModal(null)}
                style={{
                  background: '#f1f5f9',
                  color: '#64748b',
                  border: 'none',
                  padding: '10px',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  marginTop: '10px',
                  cursor: 'pointer'
                }}
              >
                Close Alert Screen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
