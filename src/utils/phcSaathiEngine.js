// PHC Saathi — Intent Engine & Pre-Approved Response Dictionary

import { db, DEFAULT_PHC_ID } from '../db/offlineDb';

// Pre-Approved Audio Response Dictionary (Native-Speaker Spoken Phrases)
export const SAATHI_RESPONSES = {
  hi: {
    medical_redirect: "मैं दवाई का स्टॉक और उपस्थिति दर्ज कर सकता हूँ, इलाज नहीं। कृपया १०४ पर कॉल करें या डॉक्टर से मिलें।",
    emergency_trigger: "आपातकालीन स्थिति! कृपया तुरंत १०८ एम्बुलेंस या ११२ पर कॉल करें।",
    confirm_prompt: "क्या आप इसे सेव करना चाहते हैं? पुष्टि के लिए हरा बटन दबाएं।",
    action_cancelled: "कार्य रद्द कर दिया गया।",
    saved_success: "जानकारी दर्ज कर दी गई है।",
    help_guide: "स्मार्ट पीएचसी साथी में आपका स्वागत है। दवा स्टॉक गिनने के लिए दवा का नाम बोलें, या मरीज संख्या दर्ज करने के लिए विभाग बोलें।",
    escalated: "आपकी सूचना एडमिन को भेज दी गई है।",
    alert_explain_low: "यह दवाई का स्टॉक सीमा से कम हो गया है। कृपया अपने सुपरवाइजर को तुरंत रीऑर्डर के लिए सूचित करें।",
    alert_explain_expiry: "यह दवा जल्द ही एक्सपायर होने वाली है। पहले इस्तेमाल करें।"
  },
  mr: {
    medical_redirect: "मी औषधाचा साठा आणि उपस्थिती नोंदवू शकतो, उपचार नाही. कृपया १०४ वर कॉल करा किंवा डॉक्टरांना भेटा.",
    emergency_trigger: "तातडीची परिस्थिती! कृपया लगेच १०८ रुग्णवाहिका किंवा ११२ वर कॉल करा.",
    confirm_prompt: "तुम्हाला हे जतन करायचे आहे का? पुष्टीसाठी हिरवे बटण दाबा.",
    action_cancelled: "कृती रद्द केली.",
    saved_success: "माहिती यशस्वीरित्या नोंदवली गेली.",
    help_guide: "स्मार्ट पीएचसी साथी मध्ये आपले स्वागत आहे. औषध मोजण्यासाठी औषधाचे नाव बोला, किंवा रुग्ण मोजण्यासाठी विभाग बोला.",
    escalated: "आपली माहिती ॲडमिनकडे पाठवली आहे.",
    alert_explain_low: "या औषधाचा साठा कमी झाला आहे. कृपया पर्यवेक्षकांना लगेच नवीन ऑर्डर देण्यास सांगा.",
    alert_explain_expiry: "हे औषध लवकरच एक्सपायर होणार आहे. आधी वापरा."
  },
  en: {
    medical_redirect: "I can help track stock and attendance, not medical diagnosis. Please call 104 or consult a doctor.",
    emergency_trigger: "Emergency detected! Please immediately call 108 Ambulance or 112.",
    confirm_prompt: "Do you want to confirm this action? Tap the green button to save.",
    action_cancelled: "Action cancelled.",
    saved_success: "Information recorded successfully.",
    help_guide: "Welcome to PHC Saathi. Speak medicine name to count stock, or department for footfall.",
    escalated: "Issue escalated to admin.",
    alert_explain_low: "Stock is below threshold. Please inform your supervisor to reorder immediately.",
    alert_explain_expiry: "Medicine expiring soon. Use existing batch first."
  }
};

// Emergency & Medical Keywords for Safety Guardrail
const EMERGENCY_KEYWORDS = [
  'chest pain', 'bleeding', 'blood', 'heart', 'pregnant', 'accident', 'emergency',
  'दर्द', 'खून', 'सीने', 'गर्भवती', 'आपत्कालीन', 'दुर्घटना',
  'छातीत दुखणे', 'रक्तस्त्राव', 'अपघात'
];

const MEDICAL_TREATMENT_KEYWORDS = [
  'treatment', 'dosage', 'illness', 'disease', 'fever cure', 'medicine for',
  'इलाज', 'बीमारी', 'दवा किसलिए', 'उपचार', 'खुराक', 'निदान',
  'औषध कशासाठी', 'औषधाचा डोस'
];

/**
 * Lightweight Intent Classifier for Voice Inputs
 */
export async function processSaathiIntent(transcript, lang = 'hi') {
  const text = transcript.toLowerCase().trim();
  const dict = SAATHI_RESPONSES[lang] || SAATHI_RESPONSES.hi;

  // 1. SAFETY GUARDRAIL: Check Emergency Keywords
  const isEmergency = EMERGENCY_KEYWORDS.some(k => text.includes(k));
  if (isEmergency) {
    return {
      intent: 'EMERGENCY_RESCUE',
      responseText: dict.emergency_trigger,
      showEmergencyModal: true,
      needsConfirmation: false
    };
  }

  // 2. SAFETY GUARDRAIL: Check Medical Advice Keywords
  const isMedicalQuery = MEDICAL_TREATMENT_KEYWORDS.some(k => text.includes(k));
  if (isMedicalQuery) {
    return {
      intent: 'MEDICAL_SAFETY_REDIRECT',
      responseText: dict.medical_redirect,
      showEmergencyModal: true,
      needsConfirmation: false
    };
  }

  // Fetch local DB entities for matching
  const medicines = await db.medicines.where('is_active').equals(1).toArray();
  const stocks = await db.medicine_stock.toArray();
  const departments = await db.departments.toArray();
  const doctors = await db.doctors.where('is_active').equals(1).toArray();

  // 3. INTENT: STOCK_QUERY ("dawai X kitni bachi hai?")
  const matchedMed = medicines.find(m =>
    text.includes(m.name_en.toLowerCase()) ||
    (m.name_hi && text.includes(m.name_hi.toLowerCase())) ||
    (m.name_mr && text.includes(m.name_mr.toLowerCase())) ||
    (m.name_en.toLowerCase().includes('paracetamol') && (text.includes('paracetamol') || text.includes('पैरासिटामॉल') || text.includes('पॅरासिटामॉल'))) ||
    (m.name_en.toLowerCase().includes('ors') && text.includes('ors')) ||
    (m.name_en.toLowerCase().includes('cough') && text.includes('cough'))
  );

  if (matchedMed && (text.includes('kitni') || text.includes('kitna') || text.includes('stock') || text.includes('साठा') || text.includes('किती') || text.includes('बची') || text.includes('है'))) {
    const st = stocks.find(s => s.medicine_id === matchedMed.id);
    const qty = st?.quantity || 0;
    const isLow = qty <= matchedMed.threshold;

    let responseText = '';
    const medName = lang === 'mr' ? matchedMed.name_mr || matchedMed.name_en : lang === 'hi' ? matchedMed.name_hi || matchedMed.name_en : matchedMed.name_en;

    if (lang === 'mr') {
      responseText = `${medName}: ${qty} ${matchedMed.unit}. ${isLow ? 'साठा कमी आहे, नवीन ऑर्डर करा.' : 'साठा उपलब्ध आहे.'}`;
    } else if (lang === 'hi') {
      responseText = `${medName}: ${qty} ${matchedMed.unit}। ${isLow ? 'स्टॉक समाप्त होने वाला है, नया ऑर्डर करें।' : 'स्टॉक पर्याप्त है।'}`;
    } else {
      responseText = `${medName}: ${qty} ${matchedMed.unit}. ${isLow ? 'Stock is running low.' : 'Stock is adequate.'}`;
    }

    return {
      intent: 'STOCK_QUERY',
      responseText,
      matchedMed,
      quantity: qty,
      needsConfirmation: false
    };
  }

  // 4. INTENT: STOCK_ADD / STOCK_REMOVE
  if (matchedMed && (text.includes('add') || text.includes('जोड़ो') || text.includes('जोडल्या') || text.includes('दिया') || text.includes('दिले') || text.includes('कम') || text.includes('घटाओ'))) {
    // Extract number from speech
    const numbers = text.match(/\d+/g);
    const amount = numbers ? parseInt(numbers[0]) : 5;
    const isDecrease = text.includes('दिया') || text.includes('दिले') || text.includes('कम') || text.includes('घटाओ') || text.includes('remove');
    const delta = isDecrease ? -amount : amount;

    const medName = lang === 'mr' ? matchedMed.name_mr || matchedMed.name_en : lang === 'hi' ? matchedMed.name_hi || matchedMed.name_en : matchedMed.name_en;
    const responseText = lang === 'mr' ? `${medName} मध्ये ${amount} ${isDecrease ? 'कमी' : 'जोडण्याची'} पुष्टी करा.` : lang === 'hi' ? `${medName} में ${amount} ${isDecrease ? 'घटाने' : 'जोड़ने'} की पुष्टि करें।` : `Confirm ${isDecrease ? 'removing' : 'adding'} ${amount} ${medName}.`;

    return {
      intent: isDecrease ? 'STOCK_REMOVE' : 'STOCK_ADD',
      responseText,
      pendingAction: {
        type: 'stock_write',
        medicine: matchedMed,
        delta: delta,
        reason: 'voice_adjustment'
      },
      needsConfirmation: true
    };
  }

  // 5. INTENT: FOOTFALL_ADD ("OPD mein 5 patient aur aaye")
  const matchedDept = departments.find(d =>
    text.includes(d.name_en.toLowerCase()) ||
    text.includes(d.name_hi.toLowerCase()) ||
    text.includes(d.name_mr.toLowerCase()) ||
    (text.includes('opd') && d.id.includes('opd')) ||
    (text.includes('टीकाकरण') && d.id.includes('imm'))
  );

  if (matchedDept && (text.includes('patient') || text.includes('मरीज') || text.includes('रुग्ण') || text.includes('aaye') || text.includes('आले'))) {
    const numbers = text.match(/\d+/g);
    const count = numbers ? parseInt(numbers[0]) : 1;
    const deptName = lang === 'mr' ? matchedDept.name_mr : lang === 'hi' ? matchedDept.name_hi : matchedDept.name_en;

    const responseText = lang === 'mr' ? `${deptName} मध्ये ${count} नवीन रुग्ण नोंदवायचे का?` : lang === 'hi' ? `${deptName} में ${count} नए मरीज दर्ज करें?` : `Record ${count} patients in ${deptName}?`;

    return {
      intent: 'FOOTFALL_ADD',
      responseText,
      pendingAction: {
        type: 'footfall_write',
        department: matchedDept,
        count: count
      },
      needsConfirmation: true
    };
  }

  // 6. INTENT: ATTENDANCE_MARK ("Dr. Sandeep present mark karo")
  const matchedDoc = doctors.find(doc => text.includes(doc.full_name.toLowerCase()) || text.includes(doc.full_name.split(' ')[1]?.toLowerCase() || '---'));

  if (matchedDoc && (text.includes('present') || text.includes('absent') || text.includes('उपस्थित') || text.includes('अनुपस्थित') || text.includes('हजर') || text.includes('गैरहजर'))) {
    const isAbsent = text.includes('absent') || text.includes('अनुपस्थित') || text.includes('गैरहजर');
    const status = isAbsent ? 'absent' : 'present';

    const responseText = lang === 'mr' ? `${matchedDoc.full_name} यांना ${status === 'present' ? 'हजर' : 'गैरहजर'} नोंदवायचे का?` : lang === 'hi' ? `${matchedDoc.full_name} को ${status === 'present' ? 'उपस्थित' : 'अनुपस्थित'} दर्ज करें?` : `Mark ${matchedDoc.full_name} as ${status}?`;

    return {
      intent: 'ATTENDANCE_MARK',
      responseText,
      pendingAction: {
        type: 'attendance_write',
        doctor: matchedDoc,
        status: status
      },
      needsConfirmation: true
    };
  }

  // 7. INTENT: HELP / TRAINING ("kaise karte hain?")
  if (text.includes('help') || text.includes('kaise') || text.includes('कैसे') || text.includes('कसे') || text.includes('मदत')) {
    return {
      intent: 'HELP_TRAINING',
      responseText: dict.help_guide,
      needsConfirmation: false
    };
  }

  // Fallback: General Stock / Help Query
  return {
    intent: 'UNKNOWN_FALLBACK',
    responseText: lang === 'mr' ? 'माफ करा, मी समजलो नाही. कृपया पुन्हा बोला किंवा स्क्रीन वापरा.' : lang === 'hi' ? 'क्षमा करें, मैं समझ नहीं पाया। कृपया दोबारा बोलें या बटन का उपयोग करें।' : 'Sorry, I did not catch that. Please speak again or tap buttons.',
    needsConfirmation: false
  };
}

/**
 * Log intent interaction into chat_logs table (DPDP Compliant - audio is NOT stored)
 */
export async function logSaathiInteraction(intent, inputText, responseKey) {
  try {
    await db.chat_logs.add({
      id: `chat-${Date.now()}`,
      user_id: 'user-kamla-01',
      phc_id: DEFAULT_PHC_ID,
      intent: intent,
      input_text: inputText || '',
      response_key: responseKey || '',
      created_at: new Date().toISOString()
    });
  } catch (err) {
    console.warn('Chat log write exception:', err);
  }
}
