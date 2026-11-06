# MedVerity — Implementation Plan

## 1. Final Tech Stack

| Layer | Tool | Purpose |
|---|---|---|
| Frontend | React (Next.js) + Tailwind CSS | Web app UI, PWA |
| Charts | Recharts | Analytics dashboard visuals |
| Icons | Lucide React | Consistent icon set |
| OCR | Google ML Kit / Cloud Vision API + Tesseract.js (fallback) | Extract text from medicine strip/prescription images |
| NLP | Gemini API | Structure extracted text into drug name, dosage, frequency, duration (returned as JSON) |
| Translation | Bhashini API (or Google Cloud Translation) | Vernacular translation |
| Text-to-Speech | Web Speech API | Vernacular audio playback |
| Backend | FastAPI (Python) | REST API, orchestrates OCR/NLP/translation calls |
| Task Scheduling | Celery + Redis | Dosage reminder scheduling |
| Database + Auth | Supabase (PostgreSQL) | Users, caregiver links, prescriptions, allergies, reminders |
| SMS (stretch) | Twilio | SMS reminder fallback |
| Deployment | Vercel (frontend) + Render (backend) | Live hosted URL |

---

## 2. System Architecture

```
┌─────────────────────────────────────────────┐
│  FRONTEND — Next.js (React) PWA               │
│  Scan · Result · History · Reminders ·        │
│  Caregiver · Analytics · Allergy · Onboarding │
└───────────────────┬───────────────────────────┘
                     │ REST API (JSON)
┌───────────────────▼───────────────────────────┐
│  BACKEND — FastAPI (Python)                   │
│  /auth  /scan  /extract  /explain             │
│  /reminders  /allergy-check  /interactions    │
│  /caregiver  /history  /analytics             │
└─────┬──────────┬───────────┬──────────┬───────┘
      │          │           │          │
   ┌──▼──┐   ┌───▼───┐   ┌───▼────┐  ┌──▼───┐
   │ OCR │   │  NLP  │   │Transla-│  │ TTS  │
   │ Svc │   │(Gemini│   │tion Svc│  │ (Web │
   │     │   │ API)  │   │(Bhashini)│Speech)│
   └─────┘   └───────┘   └────────┘  └──────┘
      │
┌─────▼─────────────────────────────────────────┐
│  DATABASE — Supabase (PostgreSQL)             │
│  users, caregiver_links, scans, reminders,    │
│  allergies, drug_db, interaction_rules        │
└─────────────────────────────────────────────────┘
```

---

## 3. Folder Structure

### Frontend (`medverity-web/`)

```
medverity-web/
├── public/
│   ├── icons/                     # PWA icons, manifest icons
│   └── manifest.json              # PWA manifest
├── src/
│   ├── app/                       # Next.js app router
│   │   ├── layout.tsx
│   │   ├── page.tsx                # Landing / redirect to onboarding
│   │   ├── onboarding/
│   │   │   └── page.tsx            # Language selection screen
│   │   ├── scan/
│   │   │   ├── page.tsx            # Camera capture screen
│   │   │   └── result/
│   │   │       └── page.tsx        # Medicine details / low-confidence fallback
│   │   ├── history/
│   │   │   └── page.tsx            # Medicine history timeline
│   │   ├── reminders/
│   │   │   └── page.tsx            # Reminders list
│   │   ├── caregiver/
│   │   │   ├── page.tsx            # Caregiver dashboard
│   │   │   └── link/
│   │   │       └── page.tsx        # QR / invite linking flow
│   │   ├── analytics/
│   │   │   └── page.tsx            # Analytics dashboard
│   │   ├── allergy-profile/
│   │   │   └── page.tsx            # Allergy profile setup
│   │   └── settings/
│   │       └── page.tsx
│   ├── components/
│   │   ├── ui/                     # Buttons, cards, badges (shared design system)
│   │   ├── scan/
│   │   │   ├── CameraCapture.tsx
│   │   │   └── ConfidenceBadge.tsx
│   │   ├── dashboard/
│   │   │   ├── MetricCard.tsx
│   │   │   └── AdherenceChart.tsx
│   │   ├── caregiver/
│   │   │   ├── FamilyMemberCard.tsx
│   │   │   └── AlertsPanel.tsx
│   │   └── reminders/
│   │       └── ReminderCard.tsx
│   ├── lib/
│   │   ├── api.ts                  # API client (calls FastAPI backend)
│   │   ├── supabase.ts             # Supabase client init
│   │   └── speech.ts               # Web Speech API wrapper
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   └── useReminders.ts
│   ├── types/
│   │   └── index.ts                # Shared TypeScript types
│   └── styles/
│       └── globals.css
├── .env.local                      # API keys (frontend-safe only)
├── next.config.js
├── tailwind.config.js
└── package.json
```

### Backend (`medverity-api/`)

```
medverity-api/
├── app/
│   ├── main.py                     # FastAPI app entrypoint
│   ├── config.py                   # Env vars, settings
│   ├── routers/
│   │   ├── auth.py
│   │   ├── scan.py                 # /scan, /extract endpoints
│   │   ├── explain.py              # NLP + translation + TTS orchestration
│   │   ├── reminders.py
│   │   ├── allergy.py              # Allergy check endpoints
│   │   ├── interactions.py         # Drug-drug / food / pregnancy checks
│   │   ├── caregiver.py            # Linking, family dashboard data
│   │   ├── history.py
│   │   └── analytics.py
│   ├── services/
│   │   ├── ocr_service.py          # Calls Google Vision/ML Kit or Tesseract
│   │   ├── nlp_service.py          # Calls Gemini API, parses structured JSON
│   │   ├── translation_service.py  # Calls Bhashini/Google Translate
│   │   ├── drug_db_service.py      # Matches extracted names against drug DB
│   │   ├── safety_service.py       # Allergy + interaction rule logic
│   │   └── reminder_service.py     # Celery task definitions
│   ├── models/
│   │   ├── user.py
│   │   ├── scan.py
│   │   ├── reminder.py
│   │   ├── allergy.py
│   │   └── drug.py
│   ├── db/
│   │   ├── supabase_client.py
│   │   └── schema.sql              # Table definitions
│   └── utils/
│       ├── confidence.py           # Confidence threshold logic
│       └── validators.py
├── data/
│   └── curated_drug_dataset.json   # 30–50 medicines with interactions (stretch feature)
├── celery_worker.py                 # Celery entrypoint for reminders
├── requirements.txt
├── .env                             # API keys (backend, never exposed to client)
└── Dockerfile                       # For Render deployment
```

---

## 4. Database Schema (Core Tables)

```
users
  id, name, phone/email, preferred_language, role (patient/caregiver), created_at

caregiver_links
  id, caregiver_id (FK users), patient_id (FK users), status (pending/active), created_at

scans
  id, user_id (FK), image_url, ocr_confidence, extracted_text,
  medicine_name, dosage, frequency, duration, scanned_at

allergies
  id, user_id (FK), allergy_name, created_at

drug_db
  id, generic_name, brand_names[], uses, side_effects,
  food_interactions[], pregnancy_note, dosage_limit

interaction_rules
  id, drug_a_id (FK), drug_b_id (FK), risk_level, description

reminders
  id, user_id (FK), scan_id (FK), medicine_name, time, frequency,
  status (upcoming/taken/missed), channel (app/sms)
```

---

## 5. API Endpoints (Backend Contract)

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/auth/signup`, `/auth/login` | User authentication |
| POST | `/scan` | Upload image → returns OCR text + confidence score |
| POST | `/explain` | Takes OCR text → NLP extraction + translation + structured explanation |
| GET | `/history` | User's scan history (timeline) |
| POST | `/reminders` | Create a reminder from scan data |
| GET | `/reminders` | List today's/upcoming reminders |
| POST | `/allergy` | Add/remove allergy |
| GET | `/allergy-check?medicine_id=` | Check scanned medicine against user's allergies |
| GET | `/interactions?medicine_id=&user_id=` | Check food/pregnancy/drug-drug warnings |
| POST | `/caregiver/invite` | Generate QR/send invite |
| POST | `/caregiver/accept` | Accept caregiver link |
| GET | `/caregiver/dashboard` | Aggregated family adherence data |
| GET | `/analytics` | Adherence trend, most-scanned medicines, category breakdown |

---

## 6. Build Order & Timeline (Suggested 4–5 Week Plan)

**Week 1 — Foundation**
- Set up repos (frontend + backend), Supabase project, API keys (Google Cloud, Gemini, Bhashini)
- Auth (signup/login) + basic navigation shell matching mockup sidebar/bottom nav
- Onboarding language selection screen

**Week 2 — Core Scan Flow**
- Camera capture UI → OCR service integration → confidence score returned
- NLP service (Gemini) → structured extraction (drug name, dosage, frequency)
- Translation + TTS → medicine result screen (high-confidence path)
- Low-confidence fallback screen (manual confirm/select flow)

**Week 3 — Safety Features**
- Allergy profile screen + allergy-check logic wired into scan result
- Drug database (curated dataset) + drug-drug interaction logic
- Food/alcohol + pregnancy warning screen (stretch, if on schedule)

**Week 4 — Reminders, History, Analytics**
- Reminder creation + Celery scheduling + reminders screen
- History timeline screen (query scans by date)
- Analytics dashboard (adherence trend, most-scanned, category breakdown)

**Week 5 — Caregiver + Polish + Deploy**
- Caregiver linking (QR/invite) + caregiver dashboard
- SMS fallback (Twilio, if time allows)
- Deploy frontend (Vercel) + backend (Render), connect to Supabase
- End-to-end testing with real medicine boxes, bug fixes, UI polish to match mockups

---

## 7. API Keys / Accounts to Set Up First (Day 1)

- Google Cloud account → enable Vision API + Translation API
- Google AI Studio → Gemini API key
- Bhashini API access (Govt of India, free for developers) — apply early, may take time to approve
- Supabase project (free tier)
- Twilio trial account (stretch feature)
- Vercel + Render accounts (deployment)

---

## 8. What to Reuse From the Mockups

- Color palette: teal primary, white surfaces, red for danger/allergy, amber for warnings, purple for pregnancy — carry these exact roles into Tailwind config as custom colors
- Bottom nav (mobile): Scan, History, Reminders, Caregiver, Profile
- Sidebar (desktop): pick ONE final version (resolve the inconsistency between the two dashboard mockups) — recommend: Dashboard, Scan Medicine, History, Reminders, Caregiver, Analytics, Allergy Profile, Settings
- Card-based layout with rounded corners and soft shadows throughout

---

## 9. Notes on Scope Honesty

- "Ask a Doctor" / live chat — not part of core build unless explicitly planned; can be a simple mailto/contact link instead, or listed as future roadmap
- Handwritten prescriptions — supported best-effort via OCR confidence + manual fallback, not a fully solved feature
- Food/pregnancy/interaction data — limited to a small curated dataset (30–50 medicines), not a comprehensive medical database; always paired with a doctor-consultation disclaimer

# MedVerity — Prescription Verification Feature
## Implementation Plan + Antigravity Build Prompt

---

## PART 1: IMPLEMENTATION PLAN

### 1. Feature Overview

**Name:** Prescription Verification ("Is This Right For Me?" Check)

**What it does:** When a user scans a full prescription (multiple medicines, not a single strip), the system extracts every medicine listed and cross-checks each one against that specific patient's profile — saved allergies, currently active medicines/reminders, and pregnancy/breastfeeding status — then returns a single safety verdict screen showing what's clear and what needs the doctor/pharmacist to confirm.

**Important framing constraint:** This is a safety pattern-matcher, not a diagnostic tool. It never states a prescription is "correct" or "incorrect" — only flags known conflicts (allergy, drug-drug, pregnancy) against existing stored data, always paired with a "confirm with your doctor/pharmacist" disclaimer.

---

### 2. Why This Is Low-Risk to Build

This feature does **not** require new intelligence — it's an orchestration layer over services that already exist and work in the codebase:

| Existing component | Reused for |
|---|---|
| `nlp_service.py` | Extracting structured medicine data (name, dosage, frequency) |
| `GET /allergy/check` | Matching a medicine against the user's saved allergies |
| `GET /interactions` | Drug-drug, food, and pregnancy conflict checking |
| `drug_db` table + `mock_safety_data.json` | Dosage limits and interaction lookups |
| User profile (`users` table) | Pregnancy/breastfeeding flag, preferred language |
| `reminders` / `history` tables | "Currently active medicines" for drug-drug cross-check |

The only genuinely new work is: (a) extracting **multiple** medicines from one prescription image instead of one, and (b) a new endpoint that loops the existing checks across that list and returns a combined verdict.

---

### 3. New Backend Work

**3.1 Extend NLP extraction for multi-medicine prescriptions**
- File: `medverity-api/app/services/nlp_service.py`
- Add a new function `extract_multiple_medicines(ocr_text: str) -> list[MedicineEntry]`
- Reuse the existing single-medicine extraction prompt/logic, but instruct Gemini to detect and return an array of medicine entries when the input text contains more than one drug line (typical of a prescription vs. a single strip)
- Each `MedicineEntry` should carry the same fields as the existing single-medicine result: `medicine_name`, `dosage`, `frequency`, `duration`, `category`

**3.2 New endpoint: `POST /prescription/verify`**
- File: `medverity-api/app/routers/prescription.py` (new file)
- Request body: `{ user_id: str, image: file }` (or `{ user_id: str, ocr_text: str }` if OCR already run via existing `/scan`)
- Logic:
  1. Run OCR (`ocr_service.py`) on the prescription image
  2. Run `extract_multiple_medicines()` to get the list of medicines
  3. For each medicine in the list, call the existing allergy-check and interactions logic (as internal function calls, not HTTP round-trips, for performance)
  4. Pull the user's currently active medicines from `reminders`/`history` for drug-drug cross-checking between prescription items AND against what they're already taking
  5. Build a combined response object (see schema below)
- Response schema:
```json
{
  "prescription_id": "uuid",
  "scanned_at": "timestamp",
  "medicines": [
    {
      "medicine_name": "Paracetamol 650mg",
      "status": "clear",
      "flags": []
    },
    {
      "medicine_name": "Ibuprofen 400mg",
      "status": "warning",
      "flags": [
        { "type": "drug_interaction", "with": "Metformin 500mg", "risk_level": "medium", "description": "..." }
      ]
    },
    {
      "medicine_name": "Amoxicillin 500mg",
      "status": "danger",
      "flags": [
        { "type": "allergy_match", "allergy": "Penicillin", "description": "..." }
      ]
    }
  ],
  "summary": {
    "clear_count": 2,
    "warning_count": 1,
    "danger_count": 1
  }
}
```

**3.3 Database changes**
- New table: `prescription_scans` to persist verification results (so they appear in history)
```sql
prescription_scans (
  id UUID PK,
  user_id UUID FK,
  image_url TEXT,
  medicines JSONB,       -- the full medicines array from the response above
  summary JSONB,
  scanned_at TIMESTAMPTZ
)
```
- No changes needed to `allergies`, `interaction_rules`, or `drug_db` — reused as-is

---

### 4. New Frontend Work

**4.1 New screen: Prescription Scan entry point**
- File: `medverity-web/src/app/scan/prescription/page.tsx`
- Reuses the existing camera capture component (`CameraCapture.tsx` / existing scan page logic) but routes to the new `/prescription/verify` endpoint instead of `/scan` + `/explain`
- Add an entry point: either a toggle on the existing scan screen ("Scanning a single medicine" vs "Scanning a prescription"), or a separate nav item — recommend a toggle to avoid adding new nav complexity

**4.2 New screen: Prescription Verification Result**
- File: `medverity-web/src/app/scan/prescription/result/page.tsx`
- Layout: list of medicines, each as a card with a status icon (✅ clear / ⚠️ warning / 🚫 danger), matching the visual language already used in the allergy-match banner and safety page
- Each flagged card expands (reuse existing accordion/expand pattern from `scan/safety/page.tsx`) to show the specific conflict and a "View details" link
- Footer disclaimer: "Always confirm with your doctor or pharmacist before starting a new prescription." — reuse existing disclaimer component if one exists, otherwise copy exact wording from `scan/safety/page.tsx`

**4.3 Components to reuse (do not rebuild)**
- Confidence/status badges — same pattern as `scan/result/page.tsx`
- Allergy alert banner styling — same pattern as current scan result allergy match
- Expand/collapse warning cards — same pattern as `scan/safety/page.tsx`

---

### 5. Build Order

1. Extend `nlp_service.py` with multi-medicine extraction — test independently with a sample prescription image before wiring to UI
2. Build `POST /prescription/verify` endpoint, calling existing allergy/interaction logic internally
3. Add `prescription_scans` table
4. Build the prescription scan entry screen (reuse camera component)
5. Build the verification result screen
6. Wire result screen into `history/page.tsx` so prescription checks also show up in the timeline
7. Test end-to-end with: (a) a clean prescription with no conflicts, (b) one with a known allergy match, (c) one with a drug-drug conflict against an active reminder

---

### 6. Scope Boundaries (keep this honest)

- This feature does **not** diagnose, validate dosage correctness against the patient's condition, or replace a pharmacist's review — it only flags conflicts against data already in the system (allergies, known interactions, existing medicines)
- If a medicine isn't found in `drug_db`/`mock_safety_data.json`, it should be shown as `status: "unknown"` with a note to confirm manually — never silently marked "clear"
- Multi-medicine OCR accuracy will be lower than single-strip scanning (more text, more layout variation) — this should route into the existing low-confidence fallback flow per medicine line where needed, not block the whole prescription

---

## PART 2: ANTIGRAVITY BUILD PROMPT

Paste the section below into Antigravity.

---

### PROMPT

I want to add a new feature to MedVerity called **Prescription Verification**. Here's the full implementation plan — please follow it closely and confirm your understanding before starting, since this touches both the NLP extraction logic and adds a new endpoint and new screens.

**Feature summary:** When a user scans a full prescription (multiple medicines), the system should extract every medicine on it, then cross-check each one against that specific patient's existing data — saved allergies, currently active medicines (from reminders/history), and pregnancy/breastfeeding status — and return a single verdict screen showing which medicines are clear and which need the doctor/pharmacist to confirm something.

**Critical constraint:** This must never claim a prescription is "correct" or "incorrect" — it only flags known conflicts against existing stored data (allergy matches, drug-drug interactions, pregnancy flags), always paired with a "confirm with your doctor or pharmacist" disclaimer. If a medicine isn't found in the drug database, mark it as "unknown — confirm manually," never as "clear."

**Please reuse existing logic wherever possible rather than rebuilding:**
- Reuse the allergy-check logic currently in the allergy router/service
- Reuse the interaction-checking logic currently in the interactions router/service
- Reuse the existing low-confidence fallback pattern for any medicine line that can't be extracted with confidence
- Reuse existing UI components for status badges, warning cards, and the allergy alert banner — match the current visual style, don't introduce a new design pattern

**Backend work:**
1. Add a new function in the NLP service to extract multiple medicines from one prescription's OCR text (returning an array of medicine entries, not just one)
2. Add a new endpoint `POST /prescription/verify` that: runs OCR on the prescription image, extracts the medicine list, and for each medicine calls the existing allergy-check and interaction-check logic internally (not via HTTP round-trip), then returns a combined response with a per-medicine status (clear / warning / danger / unknown) and flags explaining why
3. Also cross-check each prescribed medicine against the user's currently active medicines (from their reminders/history), not just against medicines within the same prescription
4. Add a new `prescription_scans` table to persist results so they show up in the user's history timeline

**Frontend work:**
1. Add a way to scan a prescription (multiple medicines) as distinct from scanning a single medicine strip — a toggle on the existing scan screen is preferred over a new nav item, to avoid adding navigation complexity
2. Build a new result screen that lists each medicine from the prescription with a status icon and expandable detail showing the specific conflict, matching the existing visual language used on the safety/interactions screen
3. Wire this into the existing history page so prescription checks appear in the timeline alongside single-medicine scans

**Before you start, please confirm:**
- Your understanding of the distinction between this feature and the existing single-medicine scan flow
- Whether the current NLP service can realistically be extended to extract multiple medicines from one image, or whether you'd recommend a different approach given what's already in the codebase
- Any architectural concerns with adding a new table vs. extending the existing `scans` table instead

Then proceed in this order: (1) multi-medicine NLP extraction, tested independently, (2) the verify endpoint, (3) the database table, (4) the scan entry screen, (5) the result screen, (6) history integration, (7) end-to-end testing with a clean prescription, one with an allergy match, and one with a drug-drug conflict against an active reminder.
