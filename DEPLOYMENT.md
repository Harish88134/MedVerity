# MedVerity — Production Deployment Guide & Documentation

This document records the complete deployment configuration, architecture, environment variables, and features of the **MedVerity** production system.

---

## 1. System Architecture & Platforms

| Component | Platform | Technology Stack | Source Directory | Live Status |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend Web App** | **Vercel** | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Lucide Icons | `medverity-web/` | **Live** |
| **Backend API** | **Render** | FastAPI (Python 3.11), Uvicorn, Docker, Pillow, Requests, Gemini AI SDK | `medverity-api/` | **Live** (`eaa8cc4`) |
| **Database & Auth** | **Supabase** | PostgreSQL, Row-Level Security (RLS), Auth Service | Managed Cloud | **Connected** |
| **Version Control** | **GitHub** | Git (Branch: `main`) | `Harish88134/MedVerity` | **Synced** |

---

## 2. Pre-Deployment Actions Completed

1. **Cleaned Repository Prior to Push**:
   - Removed unnecessary planning and instruction markdown files:
     - `INNOVATION_IMPLEMENTATION_PLAN.md`
     - `MedVerity_Implementation_Plan.md`
     - `medverity-web/AGENTS.md`
     - `medverity-web/CLAUDE.md`
   - Verified that `.env`, `.env.local`, `node_modules`, `venv`, and `__pycache__` remain properly excluded via `.gitignore`.
2. **Resolved Docker Runtime Dependencies**:
   - Added `Pillow>=10.0.0` and `requests>=2.31.0` into `medverity-api/requirements.txt` to fix OCR container crash (`ModuleNotFoundError: No module named 'PIL'`).
3. **CORS Configuration**:
   - Enabled wildcards and frontend domains in `medverity-api/app/main.py` to allow cross-origin communication from Vercel to Render.
4. **Build Verification**:
   - Tested Next.js production build for all 20 pages and static routes.

---

## 3. Environment Variables & Secret Keys

> **Note**: Treat all secret role keys and token credentials as confidential.

### Platform A: Vercel (Frontend `medverity-web`)

| Variable Name | Type | Value | Description |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Config | `https://qyqivibgzokcsfwvdroi.supabase.co` | Supabase Cloud instance endpoint for auth & database |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Config | `sb_publishable_TenqT1IWmkJlWYdxTAU_Rw_joZtXFUq` | Supabase public anonymous API client key |
| `NEXT_PUBLIC_API_URL` | Config | `https://medverity-api.onrender.com` *(or your custom Render URL)* | Public URL of the FastAPI backend on Render |

---

### Platform B: Render (Backend `medverity-api`)

| Variable Name | Value | Purpose |
| :--- | :--- | :--- |
| `SUPABASE_URL` | `https://wvuqcvcplxosovslnbqi.supabase.co` | Supabase database instance endpoint |
| `SUPABASE_KEY` | `sb_publishable_oP0RcoMdy8ffJZVSIaV_Sg_d7Y-7nYs` | Supabase publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | `sb_secret_tabmK9ng7iwYCPMsqG3OMA_NF8uLT3k` | Elevated service role key for backend database tasks |
| `GOOGLE_CLOUD_VISION_KEY` | `AIzaSyBWfdP8b8MCnHci4ujICQtUVGqvEfgco4o` | Google Cloud Vision API key for OCR extraction |
| `GEMINI_API_KEY` | `AQ.Ab8RN6LngenfQZrqfT5Gr76YT6l0ivbbLZ8Vgefq1kSEumU9Cg` | Gemini Flash & Flash-Lite API key for clinical NLP |
| `GOOGLE_TRANSLATE_KEY` | `AIzaSyBWfdP8b8MCnHci4ujICQtUVGqvEfgco4o` | Google Cloud Translation key for vernacular languages |
| `TWILIO_ACCOUNT_SID` | `SKfbb362263289c14a7e711ef2ce1ea629` | Twilio account identifier for SMS reminders |
| `TWILIO_AUTH_TOKEN` | `KJh60ssDgBAb7rY7DrQsVqhlZRQJXab3` | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | `+17372508034` | Sender phone number for WhatsApp / SMS notifications |
| `DEBUG` | `false` | Disables debug mode in production |
| `REDIS_URL` | `redis://localhost:6379/0` | Task queue broker url for background Celery jobs |

---

## 4. Deployed Features & Application Modules

The deployed system includes **13 core FastAPI endpoints** connected to the Next.js frontend:

1. **Prescription Scanner & OCR Engine (`/prescription`, `/scan`)**:
   - Uploads camera scans or images of handwritten/printed prescriptions and medicine strips.
   - Extracts drug names, dosages, frequencies, and optimal timing.
   - Rejects non-medical documents automatically.
2. **Drug Allergy Conflict Checker (`/allergy`)**:
   - Cross-references extracted medications against patient profile allergies.
   - Surfaces verified warnings for allergic reactions (e.g. penicillin, NSAIDs, sulfa drugs).
3. **Lifestyle & Chronotherapy Conflict Radar (`/interactions/lifestyle`)**:
   - Identifies dietary and timing conflicts (e.g., alcohol sedation warnings, sunlight sensitivity, empty-stomach requirements).
4. **Prescription vs. Dispensed Reconciliation (`/reconcile`)**:
   - Detects mismatches between prescribed medicines and physically dispensed blister packs (e.g., Metformin vs. Metoprolol hazard detection).
5. **Generic Cost Saver Engine (`/generics`)**:
   - Compares branded prescriptions against certified generic equivalents with cost-savings breakdown.
6. **AI Voice Pharmacist (`/explain/voice-consultant`)**:
   - Conversational voice consultation supporting vernacular Indian languages (Hindi, Tamil, Telugu, Kannada, Marathi, Bengali, English).
   - Real-time speech synthesis with dosage guardrails and non-technical advice.
7. **Emergency ICE Health Profile (`/emergency/:id`)**:
   - Shareable emergency medical pass with blood group, allergies, emergency contacts, and scannable QR code.
8. **Caregiver & Family Sync (`/caregiver`)**:
   - Caregiver dashboard for tracking elderly/family member adherence.
   - Photo-proof verification and voice-clip recorder for confirmation.
9. **Smart Medication Reminders (`/reminders`)**:
   - Full schedule for morning, afternoon, evening, and bedtime dosage alarms.
   - Audio chime and visual alarm modal with snooze and take-pill tracking.
10. **Clinical Adherence Analytics & History (`/analytics`, `/history`)**:
    - Adherence metrics, timeline logs, and past scans for doctor review.

---

## 5. Maintenance & Future Updates

When making changes locally:
1. Make your code changes in `medverity-web` or `medverity-api`.
2. Push to GitHub:
   ```bash
   git add .
   git commit -m "your update message"
   git push origin main
   ```
3. **Vercel** will automatically rebuild the frontend.
4. **Render** will automatically rebuild and deploy the Docker container backend.

