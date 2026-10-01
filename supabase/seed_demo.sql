-- =====================================================================
-- SMART PHC CARE NAVIGATION AGENT - DEMO SEED DATA (REALISTIC DEMO ONLY)
-- DISCLAIMER: All data below is simulated/fake for demonstration purposes.
-- =====================================================================

-- 1. Insert Demo Patient: Ramesh Kumar
insert into patients (id, name, age, gender, phone, village, created_at)
values (
  '11111111-1111-4111-a111-111111111111',
  'Ramesh Kumar',
  52,
  'Male',
  '98XXXXXX01',
  'Rampur',
  now()
) on conflict (id) do nothing;

-- 2. Insert 3 Demo Documents
insert into patient_documents (id, patient_id, file_url, doc_type, extracted_text, status, uploaded_at)
values
(
  '22222222-2222-4222-a222-222222222221',
  '11111111-1111-4111-a111-111111111111',
  'demo://documents/blood_report_02sep2026.pdf',
  'report',
  'Blood Test Report, 02 Sep 2026: HbA1c 8.2% (written normal range 4-5.6), Fasting glucose 142 mg/dL',
  'done',
  '2026-09-02 09:30:00+00'
),
(
  '22222222-2222-4222-a222-222222222222',
  '11111111-1111-4111-a111-111111111111',
  'demo://documents/prescription_05sep2026.jpg',
  'prescription',
  'Dr. Anita Desai, 05 Sep 2026: Tab Metformin 500mg BD x 30 days, advised HbA1c repeat after 3 months',
  'done',
  '2026-09-05 11:15:00+00'
),
(
  '22222222-2222-4222-a222-222222222223',
  '11111111-1111-4111-a111-111111111111',
  'demo://documents/appointment_05oct2026.png',
  'appointment',
  'PHC follow-up appointment slip, 05 Oct 2026, 10:00 AM, bring previous reports',
  'done',
  '2026-09-05 11:30:00+00'
) on conflict (id) do nothing;

-- 3. Insert 7 Timeline Events (5 Facts, 2 Assumptions)
insert into patient_timeline_events (id, patient_id, event_date, event_type, title, details, source_type, confidence, confirmed_by_human, source_document_id, created_at)
values
(
  '33333333-3333-4333-a333-333333333331',
  '11111111-1111-4111-a111-111111111111',
  '2026-09-02',
  'test',
  'HbA1c test',
  'HbA1c 8.2% (ref 4-5.6)',
  'fact',
  1.0,
  true,
  '22222222-2222-4222-a222-222222222221',
  '2026-09-02 09:35:00+00'
),
(
  '33333333-3333-4333-a333-333333333332',
  '11111111-1111-4111-a111-111111111111',
  '2026-09-02',
  'test',
  'Fasting glucose',
  '142 mg/dL',
  'fact',
  1.0,
  true,
  '22222222-2222-4222-a222-222222222221',
  '2026-09-02 09:36:00+00'
),
(
  '33333333-3333-4333-a333-333333333333',
  '11111111-1111-4111-a111-111111111111',
  '2026-09-05',
  'prescription',
  'Metformin 500mg',
  'BD x 30 days, prescribed by Dr. Anita Desai',
  'fact',
  1.0,
  true,
  '22222222-2222-4222-a222-222222222222',
  '2026-09-05 11:20:00+00'
),
(
  '33333333-3333-4333-a333-333333333334',
  '11111111-1111-4111-a111-111111111111',
  '2026-09-05',
  'appointment',
  'PHC Consultation',
  'With Dr. Anita Desai',
  'fact',
  1.0,
  true,
  '22222222-2222-4222-a222-222222222222',
  '2026-09-05 11:22:00+00'
),
(
  '33333333-3333-4333-a333-333333333335',
  '11111111-1111-4111-a111-111111111111',
  '2026-09-05',
  'diagnosis_note',
  'Possible diabetes management case',
  'HbA1c above range on report — chronic condition follow-up may be needed',
  'assumption',
  0.7,
  false,
  '22222222-2222-4222-a222-222222222222',
  '2026-09-05 11:25:00+00'
),
(
  '33333333-3333-4333-a333-333333333336',
  '11111111-1111-4111-a111-111111111111',
  '2026-09-05',
  'test',
  'HbA1c repeat pending',
  'Prescription advises repeat after 3 months — result document not yet in records',
  'assumption',
  0.9,
  false,
  '22222222-2222-4222-a222-222222222222',
  '2026-09-05 11:26:00+00'
),
(
  '33333333-3333-4333-a333-333333333337',
  '11111111-1111-4111-a111-111111111111',
  '2026-10-05',
  'appointment',
  'PHC Follow-up',
  '10:00 AM, bring previous reports',
  'fact',
  1.0,
  true,
  '22222222-2222-4222-a222-222222222223',
  '2026-09-05 11:35:00+00'
) on conflict (id) do nothing;

-- 4. Insert 2 Follow-up Items
insert into follow_ups (id, patient_id, title, due_date, status, related_event_id, created_at)
values
(
  '44444444-4444-4444-a444-444444444441',
  '11111111-1111-4111-a111-111111111111',
  'HbA1c repeat due (ordered 05 Sep)',
  '2026-12-05',
  'pending',
  '33333333-3333-4333-a333-333333333336',
  '2026-09-05 11:30:00+00'
),
(
  '44444444-4444-4444-a444-444444444442',
  '11111111-1111-4111-a111-111111111111',
  'Follow-up appointment: PHC Follow-up',
  '2026-10-05',
  'pending',
  '33333333-3333-4333-a333-333333333337',
  '2026-09-05 11:35:00+00'
) on conflict (id) do nothing;
