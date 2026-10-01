import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SYSTEM_PROMPT = `You are a medical document parser for CARE COORDINATION ONLY. Never provide diagnosis, treatment advice, or medical opinions.

Extract a JSON array of timeline events from the document. Each event object:
{ "event_date": "YYYY-MM-DD or null if not written",
  "event_type": "test | prescription | appointment | diagnosis_note",
  "title": "short title",
  "details": "relevant details with values as written",
  "source_type": "fact | assumption",
  "confidence": 0.0 to 1.0 }

CLASSIFICATION RULES (strict):
- source_type = "fact" ONLY for information EXPLICITLY written in the document: dates, test names, results with values, medicine names, dosages, doctor names, appointment times. Set confidence = 1.0 for facts.
- source_type = "assumption" ONLY for things that must be INFERRED, e.g.: the document is a prescription → assumption "follow-up may be needed"; a test was ordered → assumption "result document may be pending". Set confidence below 1.0 reflecting how certain the inference is.
- NEVER invent values, dates, or results.
- If the document is unreadable or not medical, return exactly:
  { "error": "unreadable" }

Return ONLY valid JSON. No markdown, no explanation.`;

serve(async (req: Request) => {
  // 1. Handle CORS Options Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || '';
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse Input Body
    const body = await req.json().catch(() => ({}));
    const { document_id } = body;

    if (!document_id) {
      return new Response(
        JSON.stringify({ error: 'document_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step a: Fetch document row from patient_documents
    const { data: doc, error: docError } = await supabase
      .from('patient_documents')
      .select('*')
      .eq('id', document_id)
      .single();

    if (docError || !doc) {
      return new Response(
        JSON.stringify({ error: 'Document not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If status is already 'done', return early
    if (doc.status === 'done') {
      return new Response(
        JSON.stringify({ message: 'Document already processed', status: 'done' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step b: Set status = 'extracting'
    await supabase
      .from('patient_documents')
      .update({ status: 'extracting' })
      .eq('id', document_id);

    // Step c & d: Download file / prepare input for Gemini
    let promptParts: any[] = [];
    let fileBytes: Uint8Array | null = null;

    if (doc.file_url) {
      try {
        let fileRes: Response;
        if (doc.file_url.startsWith('http://') || doc.file_url.startsWith('https://')) {
          fileRes = await fetch(doc.file_url);
        } else {
          // Download from patient-docs storage bucket
          const { data: storageData, error: storageErr } = await supabase
            .storage
            .from('patient-docs')
            .download(doc.file_url);
          if (storageErr || !storageData) throw storageErr || new Error('Storage download failed');
          fileRes = new Response(storageData);
        }

        const arrayBuf = await fileRes.arrayBuffer();
        fileBytes = new Uint8Array(arrayBuf);
      } catch (err) {
        console.warn('File fetch warning:', err);
      }
    }

    const fileUrlLower = (doc.file_url || '').toLowerCase();
    const isImage = fileUrlLower.endsWith('.jpg') || fileUrlLower.endsWith('.jpeg') ||
                    fileUrlLower.endsWith('.png') || fileUrlLower.endsWith('.webp') ||
                    (doc.doc_type && doc.doc_type.includes('image'));

    if (isImage && fileBytes && fileBytes.length > 0) {
      // Base64 encode image for Gemini Vision
      const base64Data = btoa(
        Array.from(fileBytes)
          .map(byte => String.fromCharCode(byte))
          .join('')
      );
      const mimeType = fileUrlLower.endsWith('.png') ? 'image/png' :
                       fileUrlLower.endsWith('.webp') ? 'image/webp' : 'image/jpeg';

      promptParts.push({
        inline_data: {
          mime_type: mimeType,
          data: base64Data
        }
      });
      promptParts.push({ text: "Extract clinical timeline events from this document according to instructions." });
    } else {
      // PDF or text document
      const extractedText = doc.extracted_text ||
        (fileBytes ? new TextDecoder().decode(fileBytes) : "No text content extracted.");
      promptParts.push({ text: `Document Text Content:\n${extractedText}` });
    }

    // Step e: Call Gemini API (gemini-2.5-flash)
    if (!geminiApiKey) {
      console.error('GEMINI_API_KEY environment variable is missing.');
      await supabase
        .from('patient_documents')
        .update({ status: 'error' })
        .eq('id', document_id);
      return new Response(
        JSON.stringify({ error: 'GEMINI_API_KEY is not configured on server' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;

    const geminiReqBody = {
      system_instruction: {
        parts: [{ text: SYSTEM_PROMPT }]
      },
      contents: [{ parts: promptParts }],
      generationConfig: {
        temperature: 0.1,
        response_mime_type: "application/json"
      }
    };

    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiReqBody)
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error('Gemini API Error:', geminiRes.status, errText);
      await supabase
        .from('patient_documents')
        .update({ status: 'error' })
        .eq('id', document_id);
      return new Response(
        JSON.stringify({ error: 'Gemini API call failed', details: errText }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const geminiData = await geminiRes.json();
    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Step 3: Parse and Validate Gemini Response
    let parsedJson: any;
    try {
      // Clean possible markdown code fence backticks if returned
      const cleanJsonStr = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedJson = JSON.parse(cleanJsonStr);
    } catch (parseErr) {
      console.error('JSON parse failed for Gemini response:', rawText);
      await supabase
        .from('patient_documents')
        .update({ status: 'error', extracted_text: rawText })
        .eq('id', document_id);

      return new Response(
        JSON.stringify({ error: 'parse_failed', raw_response: rawText }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for explicit unreadable error object
    if (parsedJson && parsedJson.error === 'unreadable') {
      await supabase
        .from('patient_documents')
        .update({ status: 'error', extracted_text: JSON.stringify(parsedJson) })
        .eq('id', document_id);

      return new Response(
        JSON.stringify({ error: 'unreadable' }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const rawEvents: any[] = Array.isArray(parsedJson) ? parsedJson :
                            (Array.isArray(parsedJson?.events) ? parsedJson.events : []);

    const validAllowedEventTypes = ['test', 'prescription', 'appointment', 'diagnosis_note'];
    const validAllowedSourceTypes = ['fact', 'assumption'];

    const validEvents: any[] = [];
    let assumptionsCount = 0;
    let followUpsCreated = 0;

    for (const ev of rawEvents) {
      // Strict Validation
      if (!ev || typeof ev !== 'object') continue;
      if (!ev.title || typeof ev.title !== 'string' || ev.title.trim() === '') {
        console.warn('Dropped event missing title:', ev);
        continue;
      }
      if (!validAllowedEventTypes.includes(ev.event_type)) {
        console.warn(`Dropped event invalid event_type: ${ev.event_type}`, ev);
        continue;
      }
      if (!validAllowedSourceTypes.includes(ev.source_type)) {
        console.warn(`Dropped event invalid source_type: ${ev.source_type}`, ev);
        continue;
      }

      if (ev.source_type === 'assumption') {
        assumptionsCount++;
      }

      const eventPayload = {
        patient_id: doc.patient_id,
        event_date: ev.event_date || new Date().toISOString().split('T')[0],
        event_type: ev.event_type,
        title: ev.title.trim(),
        details: ev.details || '',
        source_type: ev.source_type,
        confidence: typeof ev.confidence === 'number' ? ev.confidence : (ev.source_type === 'fact' ? 1.0 : 0.8),
        confirmed_by_human: false,
        source_document_id: document_id
      };

      // Insert valid event into patient_timeline_events
      const { data: insertedEvt, error: evtErr } = await supabase
        .from('patient_timeline_events')
        .insert(eventPayload)
        .select()
        .single();

      if (evtErr) {
        console.error('Failed to insert timeline event:', evtErr);
        continue;
      }

      validEvents.push(insertedEvt);

      // Auto-create follow-up if event_type = 'appointment'
      if (ev.event_type === 'appointment') {
        const { error: fuErr } = await supabase
          .from('follow_ups')
          .insert({
            patient_id: doc.patient_id,
            title: `Appointment follow-up: ${ev.title.trim()}`,
            due_date: ev.event_date || null,
            status: 'pending',
            related_event_id: insertedEvt.id
          });

        if (!fuErr) {
          followUpsCreated++;
        } else {
          console.error('Failed to insert auto follow-up:', fuErr);
        }
      }
    }

    // Step Update Document: status = 'done', extracted_text = raw Gemini response
    await supabase
      .from('patient_documents')
      .update({
        status: 'done',
        extracted_text: rawText
      })
      .eq('id', document_id);

    return new Response(
      JSON.stringify({
        events_count: validEvents.length,
        assumptions_count: assumptionsCount,
        follow_ups_created: followUpsCreated
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    console.error('Unhandled Edge Function Exception:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
