# 🏥 Smart PHC Portal & Care Coordination AI Agent

## 🧭 Care Navigation Agent Architecture

```
[Document Upload] ➔ [Gemini 2.5 Flash Extraction] ➔ [Care Timeline (Facts & Assumptions)]
                                                              │
                                       ┌──────────────────────┴──────────────────────┐
                                       ▼                                             ▼
                          [📋 Appointment Prep Checklist]               [🩺 Printable Doctor Briefing]
```

### 1. Architectural Pipeline
1. **Document Upload**: Medical records (JPG/PNG/WEBP/PDF) are uploaded to Supabase Storage (`patient-docs`) and logged in IndexedDB (`patient_documents`).
2. **AI Extraction Engine**: Supabase Edge Function (`extract-document`) parses the document using **Gemini 2.5 Flash** to extract clinical facts and coordination assumptions.
3. **Longitudinal Care Timeline**: Clinical events are rendered in chronological order with visual indicators for facts vs. inferences.
4. **Appointment Preparation**: Scans upcoming visits, flags pending test results as missing documents, and tracks open follow-ups.
5. **Doctor Briefing**: Generates a 1-page printable summary (`window.print()`) for the Medical Officer with single-tap batch verification.

### 2. Fact vs. Assumption (Human-in-the-Loop Design)
- **`FACT` (Green Badge)**: Information explicitly written in the document (test results, dosages, appointment dates). Locked with `confidence = 1.0`.
- **`ASSUMPTION` (Yellow Badge)**: Clinical inferences (e.g. repeated test recommended, follow-up needed). Requires explicit staff verification (`[✓ Confirm]` or `[Mark All Verified]`) to convert into verified records. Soft-delete (`deleted = true`) is used on rejection for complete audit traceability.

### 3. How to Run Demo
1. **Database Schema & Demo Seed**:
   - Run `supabase_setup_schema.sql` in your Supabase SQL Editor.
   - Run `supabase/seed_demo.sql` to populate demo patient **Ramesh Kumar** (52y Male, Rampur), 3 documents, 7 timeline events, and 2 follow-ups.
2. **Deploy AI Edge Function**:
   ```bash
   supabase functions deploy extract-document
   supabase secrets set GEMINI_API_KEY="AIzaSyYourGeminiKey"
   ```
3. **Run Web Portal**:
   ```bash
   npm run dev
   ```

### 4. ⚠️ Medical Disclaimer
> **IMPORTANT**: The Care Navigation Agent is designed for **CARE COORDINATION AND ADMINISTRATIVE ASSISTANCE ONLY**. It **NEVER** provides medical diagnosis, treatment advice, or clinical opinions. All inferred assumptions require verification by qualified healthcare personnel.

---

## 🚀 Supabase Edge Function Deployment & AI Extraction Setup

### 1. Deploy the `extract-document` AI Engine Edge Function
Make sure you are logged into your Supabase account via CLI:
```bash
# Log in to Supabase CLI (if not already logged in)
supabase login

# Link project (replace <your-project-ref> with your actual Supabase project ID)
supabase link --project-ref <your-project-ref>

# Deploy the extract-document edge function
supabase functions deploy extract-document
```

### 2. Configure Environment Secret (`GEMINI_API_KEY`)
Set your Gemini API Key in Supabase Secrets so the Edge Function can invoke `gemini-2.5-flash`:
```bash
supabase secrets set GEMINI_API_KEY="AIzaSyYourActualGeminiApiKeyHere"
```

### 3. Local Development & `.env` Setup
Create or update `.env` in your project root with your Supabase credentials:
```env
VITE_SUPABASE_URL=https://your-supabase-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-actual-anon-key
```

To run and test the Edge Function locally with Supabase CLI:
```bash
supabase functions serve extract-document --env-file .env
```


---

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.


Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
