import Dexie from 'dexie';

export const db = new Dexie('SmartPHCTrackerDB');

db.version(1).stores({
  phcs: 'id, name',
  profiles: 'id, phc_id, role, full_name, preferred_language',
  departments: 'id, name_en, name_hi, name_mr, icon',
  medicines: 'id, phc_id, name_en, name_hi, name_mr, unit, threshold, is_active',
  medicine_stock: 'id, medicine_id, quantity, expiry_date, updated_at',
  stock_movements: 'id, medicine_id, change, reason, created_by, created_at, synced',
  patient_footfall: 'id, phc_id, department_id, visit_date, count, updated_at, synced',
  doctors: 'id, phc_id, full_name, department_id, is_active',
  doctor_attendance: 'id, doctor_id, attendance_date, session, status, marked_by, marked_at, synced',
  alerts: 'id, phc_id, type, medicine_id, status, created_at',
  sync_queue: '++id, table_name, action, payload, created_at',
  chat_logs: 'id, user_id, phc_id, intent, input_text, response_key, created_at',
  chat_sessions: 'id, phc_id, user_id, channel, created_at',
  chat_messages: 'id, session_id, sender_role, input_mode, intent, text_body, response_key, picture_url, created_at',
  patients: 'id, name, phone, village, synced',
  patient_documents: 'id, patient_id, doc_type, status, uploaded_at, synced',
  patient_timeline_events: 'id, patient_id, event_date, event_type, source_type, confirmed_by_human, source_document_id, synced',
  follow_ups: 'id, patient_id, due_date, status, related_event_id, synced'
});

export const DEFAULT_PHC_ID = 'phc-001-maharashtra';
export const WORKER_PROFILE_ID = 'user-modi-01';
export const ADMIN_PROFILE_ID = 'user-sandeep-admin';

export async function seedInitialData() {
  const medicineCount = await db.medicines.count();
  if (medicineCount === 0) {
    console.log('Seeding initial Smart PHC database...');

    await db.phcs.add({
      id: DEFAULT_PHC_ID,
      name: 'Primary Health Centre - Shirur',
      created_at: new Date().toISOString()
    });

    await db.profiles.bulkAdd([
      {
        id: WORKER_PROFILE_ID,
        phc_id: DEFAULT_PHC_ID,
        role: 'worker',
        full_name: 'modi melone',
        preferred_language: 'hi'
      },
      {
        id: ADMIN_PROFILE_ID,
        phc_id: DEFAULT_PHC_ID,
        role: 'admin',
        full_name: 'Dr. Sandeep Sharma',
        preferred_language: 'en'
      }
    ]);

    const deptIds = {
      opd: 'dept-opd-01',
      immunization: 'dept-imm-02',
      emergency: 'dept-emerg-03',
      maternity: 'dept-mat-04',
      pharmacy: 'dept-pharm-05'
    };

    await db.departments.bulkAdd([
      {
        id: deptIds.opd,
        name_en: 'General OPD',
        name_hi: 'सामान्य ओपीडी',
        name_mr: 'सामान्य ओपीडी',
        icon: 'stethoscope'
      },
      {
        id: deptIds.immunization,
        name_en: 'Immunization & Kids',
        name_hi: 'टीकाकरण एवं बाल स्वास्थ्य',
        name_mr: 'लसीकरण आणि बाल आरोग्य',
        icon: 'baby'
      },
      {
        id: deptIds.emergency,
        name_en: 'Emergency Care',
        name_hi: 'आपातकालीन सेवा',
        name_mr: 'तातडीची सेवा',
        icon: 'ambulance'
      },
      {
        id: deptIds.maternity,
        name_en: 'Maternity Care',
        name_hi: 'प्रसूति एवं महिला स्वास्थ्य',
        name_mr: 'प्रसुती आणि महिला आरोग्य',
        icon: 'heart-pulse'
      },
      {
        id: deptIds.pharmacy,
        name_en: 'Pharmacy & Lab',
        name_hi: 'दवाखाना एवं लैब',
        name_mr: 'औषधालय आणि प्रयोगशाळा',
        icon: 'flask-conical'
      }
    ]);

    const medIds = {
      paracetamol: 'med-paracetamol-01',
      ors: 'med-ors-02',
      amoxicillin: 'med-amox-03',
      ironFolic: 'med-iron-04',
      coughSyrup: 'med-syrup-05',
      vitaminC: 'med-vitaminc-06',
      cetirizine: 'med-cetirizine-07',
      azithromycin: 'med-azithro-08',
      calcium: 'med-calcium-09'
    };

    await db.medicines.bulkAdd([
      {
        id: medIds.paracetamol,
        phc_id: DEFAULT_PHC_ID,
        name_en: 'Paracetamol 500mg',
        name_hi: 'पैरासिटामॉल ५०० मिग्रा',
        name_mr: 'पॅरासिटामॉल ५०० मिग्रॅ',
        photo_url: '/images/paracetamol.png',
        unit: 'tablet',
        threshold: 100,
        is_active: true
      },
      {
        id: medIds.ors,
        phc_id: DEFAULT_PHC_ID,
        name_en: 'ORS Packet',
        name_hi: 'ओआरएस पैकेट',
        name_mr: 'ओआरएस पाकीट',
        photo_url: '/images/ors.png',
        unit: 'sachet',
        threshold: 50,
        is_active: true
      },
      {
        id: medIds.amoxicillin,
        phc_id: DEFAULT_PHC_ID,
        name_en: 'Amoxicillin 250mg',
        name_hi: 'एमोक्सिसिलिन २५० मिग्रा',
        name_mr: 'अ‍ॅमोक्सिसिलिन २५० मिग्रॅ',
        photo_url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&auto=format&fit=crop&q=80',
        unit: 'strip',
        threshold: 40,
        is_active: true
      },
      {
        id: medIds.ironFolic,
        phc_id: DEFAULT_PHC_ID,
        name_en: 'Iron & Folic Acid',
        name_hi: 'आयरन एवं फोलिक एसिड',
        name_mr: 'आयर्न आणि फोलिक अ‍ॅसिड',
        photo_url: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=400&auto=format&fit=crop&q=80',
        unit: 'strip',
        threshold: 50,
        is_active: true
      },
      {
        id: medIds.coughSyrup,
        phc_id: DEFAULT_PHC_ID,
        name_en: 'Cough Syrup 100ml',
        name_hi: 'खांसी की सिरप १०० मिली',
        name_mr: 'खोकल्याचे सिरप १०० मिली',
        photo_url: 'https://images.unsplash.com/photo-1550572017-edd951b55104?w=400&auto=format&fit=crop&q=80',
        unit: 'bottle',
        threshold: 20,
        is_active: true
      },
      {
        id: medIds.vitaminC,
        phc_id: DEFAULT_PHC_ID,
        name_en: 'Vitamin C 500mg',
        name_hi: 'विटामिन सी ५०० मिग्रा',
        name_mr: 'व्हिटॅमिन सी ५०० मिग्रॅ',
        photo_url: '/images/vitamin_c.png',
        unit: 'tablet',
        threshold: 50,
        is_active: true
      },
      {
        id: medIds.cetirizine,
        phc_id: DEFAULT_PHC_ID,
        name_en: 'Cetirizine 10mg',
        name_hi: 'सिटिरिज़िन १० मिग्रा',
        name_mr: 'सेटीरिझिन १० मिग्रॅ',
        photo_url: '/images/cetirizine.png',
        unit: 'strip',
        threshold: 30,
        is_active: true
      },
      {
        id: medIds.azithromycin,
        phc_id: DEFAULT_PHC_ID,
        name_en: 'Azithromycin 500mg',
        name_hi: 'एजिथ्रोमाइसिन ५०० मिग्रा',
        name_mr: 'अझिथ्रोमायसिन ५०० मिग्रॅ',
        photo_url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&auto=format&fit=crop&q=80',
        unit: 'strip',
        threshold: 25,
        is_active: true
      },
      {
        id: medIds.calcium,
        phc_id: DEFAULT_PHC_ID,
        name_en: 'Calcium & Vitamin D3',
        name_hi: 'कैल्शियम एवं विटामिन डी३',
        name_mr: 'कॅल्शियम आणि व्हिटॅमिन डी३',
        photo_url: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=400&auto=format&fit=crop&q=80',
        unit: 'strip',
        threshold: 40,
        is_active: true
      }
    ]);

    const todayStr = new Date().toISOString().split('T')[0];
    const expirySoon = new Date(Date.now() + 20 * 86400000).toISOString().split('T')[0]; // 20 days away

    await db.medicine_stock.bulkAdd([
      {
        id: 'stock-01',
        medicine_id: medIds.paracetamol,
        quantity: 420,
        expiry_date: null,
        updated_at: new Date().toISOString()
      },
      {
        id: 'stock-02',
        medicine_id: medIds.ors,
        quantity: 25, // LOW STOCK (< 50)
        expiry_date: null,
        updated_at: new Date().toISOString()
      },
      {
        id: 'stock-03',
        medicine_id: medIds.amoxicillin,
        quantity: 0, // OUT OF STOCK (RED)
        expiry_date: null,
        updated_at: new Date().toISOString()
      },
      {
        id: 'stock-04',
        medicine_id: medIds.ironFolic,
        quantity: 180,
        expiry_date: null,
        updated_at: new Date().toISOString()
      },
      {
        id: 'stock-05',
        medicine_id: medIds.coughSyrup,
        quantity: 12, // LOW STOCK (< 20)
        expiry_date: expirySoon, // EXPIRING SOON
        updated_at: new Date().toISOString()
      },
      {
        id: 'stock-06',
        medicine_id: medIds.vitaminC,
        quantity: 320,
        expiry_date: null,
        updated_at: new Date().toISOString()
      },
      {
        id: 'stock-07',
        medicine_id: medIds.cetirizine,
        quantity: 95,
        expiry_date: null,
        updated_at: new Date().toISOString()
      },
      {
        id: 'stock-08',
        medicine_id: medIds.azithromycin,
        quantity: 8, // LOW STOCK (< 25)
        expiry_date: null,
        updated_at: new Date().toISOString()
      },
      {
        id: 'stock-09',
        medicine_id: medIds.calcium,
        quantity: 210,
        expiry_date: null,
        updated_at: new Date().toISOString()
      }
    ]);

    const docIds = {
      sandeep: 'doc-sandeep-01',
      anita: 'doc-anita-02',
      rahul: 'doc-rahul-03'
    };

    await db.doctors.bulkAdd([
      {
        id: docIds.sandeep,
        phc_id: DEFAULT_PHC_ID,
        full_name: 'Dr. Sandeep Sharma',
        photo_url: '/images/dr_sandeep.png',
        department_id: deptIds.opd,
        is_active: true
      },
      {
        id: docIds.anita,
        phc_id: DEFAULT_PHC_ID,
        full_name: 'Dr. Anita Deshmukh',
        photo_url: '/images/dr_anita.png',
        department_id: deptIds.immunization,
        is_active: true
      },
      {
        id: docIds.rahul,
        phc_id: DEFAULT_PHC_ID,
        full_name: 'Dr. Rahul Verma',
        photo_url: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80',
        department_id: deptIds.emergency,
        is_active: true
      }
    ]);

    await db.doctor_attendance.bulkAdd([
      {
        id: 'att-01',
        doctor_id: docIds.sandeep,
        attendance_date: todayStr,
        session: 'full_day',
        status: 'present',
        marked_by: WORKER_PROFILE_ID,
        marked_at: new Date().toISOString(),
        synced: true
      }
    ]);

    await db.patient_footfall.bulkAdd([
      {
        id: 'ff-opd-today',
        phc_id: DEFAULT_PHC_ID,
        department_id: deptIds.opd,
        visit_date: todayStr,
        count: 24,
        updated_at: new Date().toISOString(),
        synced: true
      },
      {
        id: 'ff-imm-today',
        phc_id: DEFAULT_PHC_ID,
        department_id: deptIds.immunization,
        visit_date: todayStr,
        count: 14,
        updated_at: new Date().toISOString(),
        synced: true
      }
    ]);

    await db.alerts.bulkAdd([
      {
        id: 'alert-01',
        phc_id: DEFAULT_PHC_ID,
        type: 'low_stock',
        medicine_id: medIds.amoxicillin,
        status: 'open',
        created_at: new Date().toISOString()
      },
      {
        id: 'alert-02',
        phc_id: DEFAULT_PHC_ID,
        type: 'expiring_soon',
        medicine_id: medIds.coughSyrup,
        status: 'open',
        created_at: new Date().toISOString()
      }
    ]);

    // Seed Demo Patient: Ramesh Kumar
    const rameshId = '11111111-1111-4111-a111-111111111111';
    const docReportId = '22222222-2222-4222-a222-222222222221';
    const docRxId = '22222222-2222-4222-a222-222222222222';
    const docAppId = '22222222-2222-4222-a222-222222222223';

    await db.patients.add({
      id: rameshId,
      name: 'Ramesh Kumar',
      age: 52,
      gender: 'Male',
      phone: '98XXXXXX01',
      village: 'Rampur',
      created_at: new Date().toISOString(),
      synced: 1
    });

    await db.patient_documents.bulkAdd([
      {
        id: docReportId,
        patient_id: rameshId,
        file_url: 'demo://documents/blood_report_02sep2026.pdf',
        doc_type: 'report',
        extracted_text: 'Blood Test Report, 02 Sep 2026: HbA1c 8.2% (written normal range 4-5.6), Fasting glucose 142 mg/dL',
        status: 'done',
        uploaded_at: '2026-09-02T09:30:00.000Z',
        synced: 1
      },
      {
        id: docRxId,
        patient_id: rameshId,
        file_url: 'demo://documents/prescription_05sep2026.jpg',
        doc_type: 'prescription',
        extracted_text: 'Dr. Anita Desai, 05 Sep 2026: Tab Metformin 500mg BD x 30 days, advised HbA1c repeat after 3 months',
        status: 'done',
        uploaded_at: '2026-09-05T11:15:00.000Z',
        synced: 1
      },
      {
        id: docAppId,
        patient_id: rameshId,
        file_url: 'demo://documents/appointment_05oct2026.png',
        doc_type: 'appointment',
        extracted_text: 'PHC follow-up appointment slip, 05 Oct 2026, 10:00 AM, bring previous reports',
        status: 'done',
        uploaded_at: '2026-09-05T11:30:00.000Z',
        synced: 1
      }
    ]);

    await db.patient_timeline_events.bulkAdd([
      {
        id: '33333333-3333-4333-a333-333333333331',
        patient_id: rameshId,
        event_date: '2026-09-02',
        event_type: 'test',
        title: 'HbA1c test',
        details: 'HbA1c 8.2% (ref 4-5.6)',
        source_type: 'fact',
        confidence: 1.0,
        confirmed_by_human: true,
        source_document_id: docReportId,
        created_at: '2026-09-02T09:35:00.000Z',
        synced: 1
      },
      {
        id: '33333333-3333-4333-a333-333333333332',
        patient_id: rameshId,
        event_date: '2026-09-02',
        event_type: 'test',
        title: 'Fasting glucose',
        details: '142 mg/dL',
        source_type: 'fact',
        confidence: 1.0,
        confirmed_by_human: true,
        source_document_id: docReportId,
        created_at: '2026-09-02T09:36:00.000Z',
        synced: 1
      },
      {
        id: '33333333-3333-4333-a333-333333333333',
        patient_id: rameshId,
        event_date: '2026-09-05',
        event_type: 'prescription',
        title: 'Metformin 500mg',
        details: 'BD x 30 days, prescribed by Dr. Anita Desai',
        source_type: 'fact',
        confidence: 1.0,
        confirmed_by_human: true,
        source_document_id: docRxId,
        created_at: '2026-09-05T11:20:00.000Z',
        synced: 1
      },
      {
        id: '33333333-3333-4333-a333-333333333334',
        patient_id: rameshId,
        event_date: '2026-09-05',
        event_type: 'appointment',
        title: 'PHC Consultation',
        details: 'With Dr. Anita Desai',
        source_type: 'fact',
        confidence: 1.0,
        confirmed_by_human: true,
        source_document_id: docRxId,
        created_at: '2026-09-05T11:22:00.000Z',
        synced: 1
      },
      {
        id: '33333333-3333-4333-a333-333333333335',
        patient_id: rameshId,
        event_date: '2026-09-05',
        event_type: 'diagnosis_note',
        title: 'Possible diabetes management case',
        details: 'HbA1c above range on report — chronic condition follow-up may be needed',
        source_type: 'assumption',
        confidence: 0.7,
        confirmed_by_human: false,
        source_document_id: docRxId,
        created_at: '2026-09-05T11:25:00.000Z',
        synced: 1
      },
      {
        id: '33333333-3333-4333-a333-333333333336',
        patient_id: rameshId,
        event_date: '2026-09-05',
        event_type: 'test',
        title: 'HbA1c repeat pending',
        details: 'Prescription advises repeat after 3 months — result document not yet in records',
        source_type: 'assumption',
        confidence: 0.9,
        confirmed_by_human: false,
        source_document_id: docRxId,
        created_at: '2026-09-05T11:26:00.000Z',
        synced: 1
      },
      {
        id: '33333333-3333-4333-a333-333333333337',
        patient_id: rameshId,
        event_date: '2026-10-05',
        event_type: 'appointment',
        title: 'PHC Follow-up',
        details: '10:00 AM, bring previous reports',
        source_type: 'fact',
        confidence: 1.0,
        confirmed_by_human: true,
        source_document_id: docAppId,
        created_at: '2026-09-05T11:35:00.000Z',
        synced: 1
      }
    ]);

    await db.follow_ups.bulkAdd([
      {
        id: '44444444-4444-4444-a444-444444444441',
        patient_id: rameshId,
        title: 'HbA1c repeat due (ordered 05 Sep)',
        due_date: '2026-12-05',
        status: 'pending',
        related_event_id: '33333333-3333-4333-a333-333333333336',
        created_at: '2026-09-05T11:30:00.000Z',
        synced: 1
      },
      {
        id: '44444444-4444-4444-a444-444444444442',
        patient_id: rameshId,
        title: 'Follow-up appointment: PHC Follow-up',
        due_date: '2026-10-05',
        status: 'pending',
        related_event_id: '33333333-3333-4333-a333-333333333337',
        created_at: '2026-09-05T11:35:00.000Z',
        synced: 1
      }
    ]);

    console.log('Smart PHC database seeded successfully.');
  }
}


