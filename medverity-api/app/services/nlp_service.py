"""
MedVerity NLP Service — Gemini Structured Extraction
Extracts structured medicine data and vernacular translations from OCR text
using Gemini Flash Lite with multi-model fallback and intelligent keyword recovery.
"""
import json
import re
import requests
from typing import Optional
import google.generativeai as genai
from app.config import settings

# Configure Gemini once at module load
if settings.GEMINI_API_KEY:
    try:
        genai.configure(api_key=settings.GEMINI_API_KEY)
    except Exception:
        pass

NLP_MODELS = [
    "gemini-3.5-flash-lite",
    "gemini-3-flash-preview",
    "gemini-3.5-flash",
]

LANGUAGE_NAMES = {
    "en": "English",
    "hi": "Hindi",
    "te": "Telugu",
    "ta": "Tamil",
    "bn": "Bengali",
    "mr": "Marathi",
    "gu": "Gujarati",
    "kn": "Kannada",
    "ml": "Malayalam",
    "pa": "Punjabi",
}

EXTRACTION_PROMPT = """
You are a medical AI assistant. Extract structured clinical information from the following medicine label / prescription OCR text.
Target language for explanation: {target_language}

Return a valid JSON object with EXACTLY these keys:
- medicine_name: string (English generic/brand name + strength, e.g. "Paracetamol 650mg", "Pantoprazole 40mg")
- dosage: string (e.g. "1 Tablet", "5 ml")
- frequency: string (e.g. "Twice a day", "After meals", "Once at bedtime")
- duration: string (e.g. "5 days", "Ongoing", "As needed")
- category: string (e.g. "Antibiotic", "OTC Medicine", "Prescription Medicine", "Pain Relief", "Antacid")
- uses: string (1–2 sentence summary of what this medicine treats; {lang_instruction})
- how_to_take: string (brief instruction for patient; {lang_instruction})
- warnings: array of strings (up to 3 concise safety points; {lang_instruction})
- translated_name: string (medicine name written or transliterated in {target_language})

If any field cannot be directly read from the text, infer accurate, standard medical information based on the recognized medicine.
Respond ONLY with a valid JSON object.

OCR Text:
{ocr_text}
"""


PRESCRIPTION_EXTRACTION_PROMPT = """
You are an expert clinical medical AI assistant specialized in reading doctor prescriptions and pharmacy dispensing records.
Your job is to read handwritten or printed doctor prescriptions, Rx slips, medication tables, or doctor note text.

FIRST: Verify whether the uploaded text is genuinely an authentic medical prescription, doctor order, hospital Rx slip, or medicine packaging.
If the text is NOT medical (for example: an academic similarity report, plagiarism check summary, invoice, generic code, receipts, random document, or unrelated text):
Respond with a JSON object:
{{
  "is_prescription": false,
  "error_message": "The uploaded image is not a recognized medical prescription or medication packaging. Please upload a clear photo of an authentic doctor prescription or medicine strip.",
  "medicines": []
}}

If the text IS an authentic prescription or medicine packaging:
Extract all prescribed medicines into a clean, structured table format.
Respond with a JSON object:
{{
  "is_prescription": true,
  "error_message": null,
  "medicines": [
    {{
      "medicine_name": "Generic or brand name + strength (e.g. Amoxicillin 500mg)",
      "dosage": "Exact dose (e.g. 1 Capsule, 1 Tablet, 5ml)",
      "frequency": "Frequency (e.g. Twice daily, 1-0-1, OD, BD, TDS)",
      "duration": "Course duration (e.g. 5 days, 10 days, Ongoing)",
      "category": "Medication category (e.g. Antibiotic, Antacid, Pain Relief)",
      "uses": "1-2 sentence patient-friendly explanation of why it is prescribed"
    }}
  ]
}}

Respond ONLY with a valid JSON object.

OCR Text:
{ocr_text}
"""

def is_likely_medical_text(text: str) -> bool:
    """Heuristic check to detect non-medical uploads (e.g. plagiarism reports, invoices, receipts)."""
    if not text or len(text.strip()) < 4:
        return False
    lower = text.lower()
    non_medical_patterns = [
        r'similarity', r'turnitin', r'plagiarism', r'submission id', r'matches, including',
        r'filtered from the report', r'overall similarity', r'repository', r'internet sources',
        r'student papers', r'receipt', r'invoice total', r'subtotal', r'bank statement',
        r'credit card', r'cvv', r'github\.com', r'def ', r'console\.log', r'<html'
    ]
    if any(re.search(pat, lower) for pat in non_medical_patterns):
        return False

    medical_patterns = [
        r'\b(?:tab|cap|syrup|syp|inj|tablet|capsule|ointment|drop|drops|suspension|cream|gel|lotion|inhaler)\b',
        r'\b\d+\s*(?:mg|mcg|ml|g|iu|%)\b',
        r'\b(?:od|bd|tds|tid|qid|sos|hs|ac|pc|qds)\b',
        r'\b(?:amoxicillin|augmentin|paracetamol|dolo|pantoprazole|metformin|azithromycin|cetirizine|ibuprofen|atorvastatin|telmisartan|crocin|aspirin|omeprazole|ciprofloxacin|levofloxacin|montelukast)\b',
        r'\b(?:rx|dr\.|doctor|clinic|hospital|patient|dispense|prescription|dosage|take\s+\d+|daily)\b'
    ]
    matches = sum(1 for p in medical_patterns if re.search(p, lower))
    return matches >= 1


async def extract_prescription_medicines(text: str) -> tuple[bool, Optional[str], list[dict]]:
    """
    Extract multiple medicines from prescription OCR text.
    Returns: (is_valid_prescription: bool, error_message: Optional[str], medicines: list[dict])
    """
    cleaned_text = (text or "").strip()
    if not cleaned_text:
        return False, "No readable text detected in the document.", []

    if not is_likely_medical_text(cleaned_text):
        return False, "The uploaded document is not a recognized medical prescription. Please upload an authentic doctor prescription or medicine package.", []

    if settings.GEMINI_API_KEY:
        prompt = PRESCRIPTION_EXTRACTION_PROMPT.format(ocr_text=cleaned_text)

        for model_name in NLP_MODELS:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={settings.GEMINI_API_KEY}"
                payload = {
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {
                        "temperature": 0.1,
                        "maxOutputTokens": 2048,
                        "response_mime_type": "application/json",
                    }
                }
                resp = requests.post(url, json=payload, timeout=12)
                if resp.status_code == 200:
                    cand = resp.json().get("candidates", [])
                    if cand:
                        raw = cand[0].get("content", {}).get("parts", [{}])[0].get("text", "").strip()
                        raw = re.sub(r"^```(?:json)?\s*", "", raw)
                        raw = re.sub(r"\s*```$", "", raw)
                        data = json.loads(raw)
                        
                        if isinstance(data, dict):
                            is_rx = data.get("is_prescription", True)
                            err_msg = data.get("error_message")
                            meds = data.get("medicines", [])
                            if not is_rx:
                                return False, err_msg or "Not an authentic prescription.", []
                            for item in meds:
                                _validate_and_sanitize_prescription_item(item)
                            print(f"[NLP] Successfully extracted {len(meds)} medicines from prescription with {model_name}")
                            return True, None, meds
                        elif isinstance(data, list):
                            for item in data:
                                _validate_and_sanitize_prescription_item(item)
                            return True, None, data
            except Exception as e:
                print(f"[NLP] Model {model_name} failed for prescription: {e}. Trying fallback model...")

    print("[NLP] Using smart prescription pattern extractor...")
    meds = _smart_prescription_fallback(cleaned_text)
    if meds:
        return True, None, meds
    return False, "No valid prescribed medications could be identified. Please ensure the prescription photo is clear.", []

def _validate_and_sanitize_prescription_item(data: dict):
    """Ensure required schema fields exist and are well-formed for prescription items."""
    required_fields = [
        "medicine_name", "dosage", "frequency", "duration",
        "category", "uses"
    ]
    for field in required_fields:
        if field not in data or not data[field]:
            data[field] = "Not specified"

async def extract_medicine_data(text: str, target_language: str = "en") -> dict:
    """
    Extract structured medicine data from OCR text.
    Uses Gemini Flash Lite with multi-model fallback; falls back to smart extraction if unavailable.
    """
    cleaned_text = (text or "").strip()
    if not cleaned_text:
        return _smart_fallback("Unknown Medicine", target_language)

    if settings.GEMINI_API_KEY:
        lang_name = LANGUAGE_NAMES.get(target_language, target_language or "English")
        lang_instruction = f"MUST be translated into {lang_name}" if target_language and target_language != "en" else "in simple English"

        prompt = EXTRACTION_PROMPT.format(
            ocr_text=cleaned_text,
            target_language=lang_name,
            lang_instruction=lang_instruction,
        )

        for model_name in NLP_MODELS:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={settings.GEMINI_API_KEY}"
                payload = {
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {
                        "temperature": 0.1,
                        "maxOutputTokens": 2048,
                        "response_mime_type": "application/json",
                    }
                }
                resp = requests.post(url, json=payload, timeout=12)
                if resp.status_code == 200:
                    cand = resp.json().get("candidates", [])
                    if cand:
                        raw = cand[0].get("content", {}).get("parts", [{}])[0].get("text", "").strip()
                        raw = re.sub(r"^```(?:json)?\s*", "", raw)
                        raw = re.sub(r"\s*```$", "", raw)
                        data = json.loads(raw)
                        _validate_and_sanitize(data)
                        print(f"[NLP] Successfully extracted data with {model_name}: {data.get('medicine_name')}")
                        return data
            except Exception as e:
                print(f"[NLP] Model {model_name} failed: {e}. Trying fallback model...")

    print("[NLP] All Gemini models failed or key missing. Using smart fallback.")
    return _smart_fallback(cleaned_text, target_language)


def _validate_and_sanitize(data: dict):
    """Ensure required schema fields exist and are well-formed."""
    required_fields = [
        "medicine_name", "dosage", "frequency", "duration",
        "category", "uses", "how_to_take", "warnings",
    ]
    for field in required_fields:
        if field not in data or not data[field]:
            data[field] = "Not specified" if field != "warnings" else []

    if not isinstance(data.get("warnings"), list):
        data["warnings"] = [str(data["warnings"])] if data.get("warnings") else []


def _smart_fallback(text: str, target_language: str = "en") -> dict:
    """Smart keyword and heuristic extraction when Gemini is completely unreachable."""
    text_lower = text.lower()

    # Dictionary of popular medicines
    database = [
        {
            "keys": ["paracetamol", "acetaminophen", "dolo", "crocin", "calpol"],
            "name": "Paracetamol 650mg",
            "category": "OTC Medicine",
            "dosage": "1 Tablet",
            "frequency": "After meals, every 6-8 hours",
            "duration": "As needed (up to 3-5 days)",
            "uses": "Relieves pain and reduces fever from headaches, body aches, colds, and flu.",
            "how_to_take": "Swallow whole with water after food. Do not exceed 4000mg per day.",
            "warnings": [
                "Do not exceed recommended dose to avoid liver harm.",
                "Avoid alcohol while taking this medication.",
                "Check other cold medicines for paracetamol to avoid overdose.",
            ],
        },
        {
            "keys": ["pantoprazole", "pantocid", "pan 40", "pan-d", "pantodac"],
            "name": "Pantoprazole 40mg",
            "category": "Prescription Medicine",
            "dosage": "1 Tablet",
            "frequency": "Once daily before breakfast",
            "duration": "As prescribed (typically 2-4 weeks)",
            "uses": "Reduces stomach acid, treats acid reflux (GERD), heartburn, and stomach ulcers.",
            "how_to_take": "Take 30-60 minutes before breakfast with a glass of water.",
            "warnings": [
                "Do not crush or chew gastro-resistant tablets.",
                "Consult doctor if symptoms persist after 2 weeks.",
                "May affect absorption of vitamin B12 with long-term use.",
            ],
        },
        {
            "keys": ["omeprazole", "omez", "prilosec"],
            "name": "Omeprazole 20mg",
            "category": "Prescription Medicine",
            "dosage": "1 Capsule",
            "frequency": "Once daily in the morning",
            "duration": "As prescribed",
            "uses": "Relieves acid reflux, indigestion, and promotes healing of stomach ulcers.",
            "how_to_take": "Swallow capsule whole with water before meals.",
            "warnings": [
                "Do not chew or open capsules.",
                "Take regularly at the same time each day.",
                "Inform doctor of persistent stomach pain.",
            ],
        },
        {
            "keys": ["metformin", "glycomet", "glucophage"],
            "name": "Metformin 500mg",
            "category": "Prescription Medicine",
            "dosage": "1 Tablet",
            "frequency": "Twice daily with meals",
            "duration": "Ongoing as directed by doctor",
            "uses": "Helps control blood sugar levels in type 2 diabetes.",
            "how_to_take": "Take with or right after meals to minimize stomach upset.",
            "warnings": [
                "Always take with food to prevent gastrointestinal upset.",
                "Avoid heavy alcohol consumption.",
                "Regular kidney function checks recommended.",
            ],
        },
        {
            "keys": ["amoxicillin", "augmentin", "amoxyclav", "mox"],
            "name": "Amoxicillin 500mg",
            "category": "Antibiotic",
            "dosage": "1 Capsule",
            "frequency": "Three times daily",
            "duration": "Complete full 5-7 day course",
            "uses": "Treats bacterial infections of the respiratory tract, throat, ear, and urinary tract.",
            "how_to_take": "Take evenly spaced throughout the day with water.",
            "warnings": [
                "Do not stop early even if you feel better.",
                "Do not take if allergic to penicillin.",
                "Drink plenty of fluids while taking antibiotics.",
            ],
        },
        {
            "keys": ["cetirizine", "cetzine", "okacet", "zyrtec"],
            "name": "Cetirizine 10mg",
            "category": "Antihistamine",
            "dosage": "1 Tablet",
            "frequency": "Once daily, preferably at bedtime",
            "duration": "As needed for allergy relief",
            "uses": "Relieves allergy symptoms like runny nose, sneezing, itchy eyes, and skin hives.",
            "how_to_take": "Take orally with water. Best taken at night as it may cause slight drowsiness.",
            "warnings": [
                "May cause mild drowsiness — avoid driving if drowsy.",
                "Avoid alcohol while taking antihistamines.",
                "Do not exceed one tablet in 24 hours.",
            ],
        },
        {
            "keys": ["azithromycin", "azithral", "azee"],
            "name": "Azithromycin 500mg",
            "category": "Antibiotic",
            "dosage": "1 Tablet",
            "frequency": "Once daily",
            "duration": "Typically 3 to 5 days as prescribed",
            "uses": "Treats bacterial respiratory, sinus, skin, and throat infections.",
            "how_to_take": "Take once daily, 1 hour before or 2 hours after a meal.",
            "warnings": [
                "Complete the full prescribed course.",
                "Do not take antacids containing aluminum or magnesium at the same time.",
                "Inform doctor of any irregular heartbeats.",
            ],
        },
        {
            "keys": ["ibuprofen", "combiflam", "brufen", "advil"],
            "name": "Ibuprofen 400mg",
            "category": "NSAID Pain Reliever",
            "dosage": "1 Tablet",
            "frequency": "Two to three times daily after food",
            "duration": "As needed (up to 3 days for acute pain)",
            "uses": "Relieves inflammation, dental pain, body aches, swelling, and fever.",
            "how_to_take": "Always take after food or with milk to protect your stomach.",
            "warnings": [
                "Never take on an empty stomach.",
                "Avoid if you have history of stomach ulcers.",
                "Do not combine with other NSAID painkillers.",
            ],
        },
        {
            "keys": ["atorvastatin", "lipitor", "atorva"],
            "name": "Atorvastatin 20mg",
            "category": "Cardiovascular Medicine",
            "dosage": "1 Tablet",
            "frequency": "Once daily at night",
            "duration": "Ongoing as prescribed",
            "uses": "Lowers LDL bad cholesterol and triglycerides, reducing risk of heart attack and stroke.",
            "how_to_take": "Take 1 tablet daily, preferably at bedtime, with or without food.",
            "warnings": [
                "Avoid large quantities of grapefruit juice.",
                "Report any unexplained muscle pain or weakness.",
                "Maintain healthy diet and regular doctor checkups.",
            ],
        },
        {
            "keys": ["telmisartan", "telma", "micardis"],
            "name": "Telmisartan 40mg",
            "category": "Blood Pressure Medicine",
            "dosage": "1 Tablet",
            "frequency": "Once daily in the morning",
            "duration": "Ongoing as prescribed",
            "uses": "Lowers high blood pressure and protects kidneys in cardiovascular patients.",
            "how_to_take": "Take at the same time every morning with water.",
            "warnings": [
                "Do not discontinue abruptly without consulting doctor.",
                "Monitor blood pressure regularly.",
                "Stay hydrated and avoid high-potassium supplements without advice.",
            ],
        },
    ]

    for item in database:
        if any(k in text_lower for k in item["keys"]):
            res = dict(item)
            del res["keys"]
            res["is_recognized_medicine"] = True
            return res

    # Check if text is non-medical
    if not is_likely_medical_text(text):
        return {
            "medicine_name": "Unrecognized Item",
            "dosage": "N/A",
            "frequency": "N/A",
            "duration": "N/A",
            "category": "Non-Medical Item",
            "uses": "The scanned image does not appear to be recognized medication or medicine packaging.",
            "how_to_take": "Do not consume unknown items. Please upload a clear photo of an authentic medicine label or prescription strip.",
            "warnings": [
                "Not identified as a recognized pharmaceutical product.",
                "Verify packaging or consult your pharmacist directly.",
            ],
            "is_recognized_medicine": False,
        }

    # Heuristic fallback: extract first clean non-metadata line as medicine name
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    candidate_name = None
    for line in lines:
        if re.search(r"^(exp|mfg|batch|mrp|rs|b\.no|lic|mfg\.lic|caution|warning|schedule)", line, re.I):
            continue
        if len(line) >= 3 and any(c.isalpha() for c in line):
            candidate_name = line[:45]
            break

    if not candidate_name:
        candidate_name = lines[0][:45] if lines else "Scanned Medicine"

    return {
        "medicine_name": candidate_name,
        "dosage": "As directed",
        "frequency": "As directed on label",
        "duration": "As prescribed",
        "category": "Prescription / OTC Medicine",
        "uses": f"Medication identified from packaging label ({candidate_name}). Please review package instructions or consult your doctor.",
        "how_to_take": "Follow the directions on the prescription label or packaging carefully.",
        "warnings": [
            "Confirm the medicine name and dosage with your pharmacist.",
            "Read the manufacturer leaflet inside the package.",
            "Consult a healthcare professional if you experience unexpected side effects.",
        ],
        "is_recognized_medicine": True,
    }


def _smart_prescription_fallback(text: str) -> list[dict]:
    """Smart keyword and pattern extraction for prescriptions when Gemini is offline."""
    text_lower = (text or "").lower()
    
    popular_meds = [
        {"keys": ["amoxicillin", "augmentin", "amoxyclav", "mox"], "name": "Amoxicillin 500mg", "dosage": "1 Capsule", "frequency": "Three times daily", "duration": "5 days", "category": "Antibiotic", "uses": "Treats bacterial infections of respiratory and throat tract."},
        {"keys": ["paracetamol", "acetaminophen", "dolo", "crocin", "calpol"], "name": "Paracetamol 650mg", "dosage": "1 Tablet", "frequency": "Twice daily after food", "duration": "3 days", "category": "Pain Relief", "uses": "Relieves mild to moderate pain and reduces fever."},
        {"keys": ["pantoprazole", "pantocid", "pan 40", "pan-d"], "name": "Pantoprazole 40mg", "dosage": "1 Tablet", "frequency": "Once daily before breakfast", "duration": "14 days", "category": "Antacid", "uses": "Prevents gastric acid irritation and heartburn."},
        {"keys": ["metformin", "glycomet", "glucophage"], "name": "Metformin 500mg", "dosage": "1 Tablet", "frequency": "Twice daily with meals", "duration": "Ongoing", "category": "Antidiabetic", "uses": "Helps control blood sugar levels in type 2 diabetes."},
        {"keys": ["cetirizine", "cetzine", "zyrtec"], "name": "Cetirizine 10mg", "dosage": "1 Tablet", "frequency": "Once daily at bedtime", "duration": "5 days", "category": "Antihistamine", "uses": "Relieves allergy symptoms like runny nose, sneezing, itchy eyes."},
        {"keys": ["azithromycin", "azithral", "zithromax"], "name": "Azithromycin 500mg", "dosage": "1 Tablet", "frequency": "Once daily before food", "duration": "3 days", "category": "Antibiotic", "uses": "Treats chest and throat bacterial infections."},
        {"keys": ["ibuprofen", "combiflam", "brufen"], "name": "Ibuprofen 400mg", "dosage": "1 Tablet", "frequency": "Twice daily after meals", "duration": "3 days", "category": "NSAID Pain Reliever", "uses": "Relieves inflammation, body aches, and fever."},
        {"keys": ["atorvastatin", "lipitor", "atorva"], "name": "Atorvastatin 20mg", "dosage": "1 Tablet", "frequency": "Once daily at night", "duration": "Ongoing", "category": "Cardiovascular Medicine", "uses": "Lowers cholesterol and prevents cardiovascular events."},
        {"keys": ["telmisartan", "telma", "micardis"], "name": "Telmisartan 40mg", "dosage": "1 Tablet", "frequency": "Once daily in morning", "duration": "Ongoing", "category": "Blood Pressure Medicine", "uses": "Controls blood pressure and protects cardiovascular health."},
    ]

    matches = []
    seen = set()

    for med in popular_meds:
        if any(k in text_lower for k in med["keys"]):
            if med["name"] not in seen:
                seen.add(med["name"])
                matches.append({
                    "medicine_name": med["name"],
                    "dosage": med.get("dosage", "1 Tablet"),
                    "frequency": med.get("frequency", "As directed"),
                    "duration": med.get("duration", "As prescribed"),
                    "category": med.get("category", "Prescription Medicine"),
                    "uses": med.get("uses", "Identified prescribed medication"),
                })

    # Pattern extraction for lines like "Tab Amoxicillin 500mg" or "1. Paracetamol 650mg"
    lines = [l.strip() for l in (text or "").split("\n") if l.strip()]
    for line in lines:
        rx_match = re.search(r'\b(?:tab|cap|syrup|inj|tablet|capsule|\d+\.)\s*([A-Za-z0-9\-]+(?:\s+\d+\s*(?:mg|mcg|ml|g))?)', line, re.IGNORECASE)
        if rx_match:
            candidate = rx_match.group(1).strip().capitalize()
            if candidate not in seen and len(candidate) >= 3 and not re.search(r'^(exp|mfg|batch|mrp|rs|b\.no)', candidate, re.IGNORECASE):
                seen.add(candidate)
                matches.append({
                    "medicine_name": candidate,
                    "dosage": "1 unit",
                    "frequency": "As directed by physician",
                    "duration": "As prescribed",
                    "category": "Prescription Medicine",
                    "uses": f"Prescribed medicine extracted from prescription: {candidate}",
                })

    if not matches:
        return []
    return matches
