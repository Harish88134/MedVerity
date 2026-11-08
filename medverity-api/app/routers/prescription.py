# MedVerity API — Prescription Verification Router
# Multi-medicine prescription scanning & clinical profile cross-check

from fastapi import APIRouter, File, UploadFile, Form, Request
from pydantic import BaseModel
from typing import List, Optional
import os
import json
import uuid
from datetime import datetime

from app.services.nlp_service import extract_prescription_medicines
from app.services.ocr_service import perform_ocr
from app.services.lifestyle_radar_service import get_lifestyle_radar
from app.routers.allergy import load_user_allergies_file
from app.routers.reminders import load_reminders

router = APIRouter()

PRESC_DB_PATH = os.path.join(os.path.dirname(__file__), "..", "db", "prescription_scans.json")
MOCK_SAFETY_PATH = os.path.join(os.path.dirname(__file__), "..", "db", "mock_safety_data.json")

def load_prescriptions():
    if os.path.exists(PRESC_DB_PATH):
        try:
            with open(PRESC_DB_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []
    return []

def save_prescriptions(data):
    os.makedirs(os.path.dirname(PRESC_DB_PATH), exist_ok=True)
    with open(PRESC_DB_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

def load_safety_data():
    if os.path.exists(MOCK_SAFETY_PATH):
        try:
            with open(MOCK_SAFETY_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

class PrescriptionVerifyRequest(BaseModel):
    ocr_text: Optional[str] = ""
    user_id: Optional[str] = ""
    user_allergies: Optional[str] = ""
    is_pregnant_or_lactating: Optional[bool] = False
    language: Optional[str] = "en"
    manual_medicines: Optional[List[str]] = None

async def _process_verification(
    ocr_text: str,
    user_id: str = "",
    user_allergies: str = "",
    is_pregnant_or_lactating: bool = False,
    language: str = "en",
    manual_medicines: Optional[List[str]] = None
) -> dict:
    # 1. Extract medicines via NLP or fallback
    extracted_meds = []
    is_valid_prescription = True
    error_message = None

    if manual_medicines:
        extracted_meds = [
            {
                "medicine_name": m,
                "dosage": "As directed",
                "frequency": "Daily",
                "duration": "As prescribed",
                "category": "Prescription Medicine",
                "uses": f"Prescribed clinical treatment for {m}",
            }
            for m in manual_medicines
        ]
    elif ocr_text and ocr_text.strip():
        is_valid, err, meds = await extract_prescription_medicines(ocr_text)
        is_valid_prescription = is_valid
        error_message = err
        extracted_meds = meds

    if not is_valid_prescription or not extracted_meds:
        presc_id = f"prx-{str(uuid.uuid4())[:8]}"
        now_iso = datetime.now().isoformat()
        return {
            "prescription_id": presc_id,
            "id": presc_id,
            "scanned_at": now_iso,
            "created_at": now_iso,
            "is_valid_prescription": False,
            "error": error_message or "No recognizable prescription or medicines detected in the uploaded image. Please upload a clear photo of an authentic doctor prescription or medicine strip.",
            "total_medicines": 0,
            "medicines": [],
            "summary": {
                "clear_count": 0,
                "warning_count": 0,
                "danger_count": 0,
            },
            "has_conflicts": False,
            "disclaimer": "The uploaded image could not be verified as an authentic medical prescription."
        }

    # 2. Gather patient profile & allergies securely
    from app.db.supabase_client import supabase
    from app.utils.drug_knowledge import check_allergy_conflict, resolve_active_ingredients

    patient_allergies = None
    if user_allergies:
        patient_allergies = [a.strip() for a in user_allergies.split(",") if a.strip()]
    elif user_id:
        if supabase:
            try:
                res = supabase.table("allergies").select("allergy_name").eq("user_id", user_id).execute()
                patient_allergies = [r["allergy_name"] for r in (res.data or [])]
            except Exception as e:
                print(f"[Prescription Verify] Supabase allergy query failed: {e}. Falling back to file.")
                patient_allergies = load_user_allergies_file()
        else:
            patient_allergies = load_user_allergies_file()
    else:
        # Fall back to locally stored profile if guest/unspecified
        patient_allergies = load_user_allergies_file() or None

    reminders_data = load_reminders()
    active_meds = []
    for tod in ("morning", "afternoon", "night"):
        for r in reminders_data.get(tod, []):
            if r.get("medicine_name"):
                active_meds.append(r["medicine_name"].lower())

    # 3. Cross check each medicine
    evaluated_medicines = []
    clear_count = 0
    warning_count = 0
    danger_count = 0

    for item in extracted_meds:
        med_name = item.get("medicine_name", "Unknown Medicine")
        med_lower = med_name.lower()
        active_ingredients = resolve_active_ingredients(med_name)
        
        status = "clear" # clear | warning | danger | unknown
        flags = []

        # Check allergy using clinical knowledge base
        allergy_eval = check_allergy_conflict(med_name, patient_allergies)
        if allergy_eval["alert_type"] == "exact_match":
            status = "danger"
            flags.append({
                "type": "allergy",
                "risk_level": "danger",
                "allergy": allergy_eval["matched_allergy"],
                "active_ingredient": allergy_eval["triggering_ingredient"],
                "title": allergy_eval["title"],
                "description": allergy_eval["reason"],
                "recommendation": allergy_eval["recommendation"]
            })
        elif allergy_eval["alert_type"] == "cross_allergy":
            if status != "danger":
                status = "warning"
            flags.append({
                "type": "allergy_cross",
                "risk_level": "warning",
                "allergy": allergy_eval["matched_allergy"],
                "active_ingredient": allergy_eval["triggering_ingredient"],
                "title": allergy_eval["title"],
                "description": allergy_eval["reason"],
                "recommendation": allergy_eval["recommendation"]
            })
        elif allergy_eval["alert_type"] == "unknown_status":
            if status == "clear":
                status = "unknown"
            flags.append({
                "type": "allergy_unknown",
                "risk_level": "unknown",
                "title": "Allergy Status Unknown",
                "description": allergy_eval["reason"],
                "recommendation": allergy_eval["recommendation"]
            })
        else:
            flags.append({
                "type": "allergy_verified",
                "risk_level": "clear",
                "title": "No Recorded Allergy Conflict",
                "description": allergy_eval["reason"],
                "recommendation": allergy_eval["recommendation"]
            })

        # Check active med interaction
        for active in active_meds:
            if active != med_lower and (
                ("amoxicillin" in med_lower and "methotrexate" in active) or
                ("aspirin" in med_lower and "ibuprofen" in active) or
                ("metformin" in med_lower and "contrast" in active)
            ):
                status = "danger"
                flags.append({
                    "type": "interaction",
                    "risk_level": "danger",
                    "with": active.capitalize(),
                    "description": f"Potential interaction with active medication: {active.capitalize()}"
                })

        # Check pregnancy / lactation
        if is_pregnant_or_lactating:
            if any(contra in med_lower for contra in ["doxycycline", "isotretinoin", "warfarin", "methotrexate", "aspirin", "atorvastatin"]):
                status = "danger"
                flags.append({
                    "type": "pregnancy",
                    "risk_level": "danger",
                    "description": "Caution: Contraindicated or restricted during pregnancy/breastfeeding."
                })

        # Lifestyle & chronotherapy radar
        radar = get_lifestyle_radar(med_name, language=language)
        for conf in radar.get("conflicts", []):
            if conf.get("severity") == "danger":
                if status != "danger":
                    status = "warning"
                flags.append({
                    "type": "lifestyle",
                    "risk_level": "warning",
                    "description": f"{conf.get('icon', '⚠️')} {conf.get('title')}: {conf.get('action_advice')}"
                })

        if status == "clear":
            clear_count += 1
        elif status == "warning":
            warning_count += 1
        else:
            danger_count += 1

        evaluated_medicines.append({
            "medicine_name": med_name,
            "status": status,
            "flags": flags,
            "dosage": item.get("dosage", "As directed"),
            "frequency": item.get("frequency", "Daily"),
            "category": item.get("category", "Prescription Medicine"),
            "optimal_timing": radar.get("optimal_timing", "Take as directed by doctor"),
        })

    presc_id = f"prx-{str(uuid.uuid4())[:8]}"
    now_iso = datetime.now().isoformat()

    scan_record = {
        "prescription_id": presc_id,
        "id": presc_id,
        "scanned_at": now_iso,
        "created_at": now_iso,
        "total_medicines": len(evaluated_medicines),
        "medicines": evaluated_medicines,
        "summary": {
            "clear_count": clear_count,
            "warning_count": warning_count,
            "danger_count": danger_count,
        },
        "has_conflicts": danger_count > 0,
        "disclaimer": "This is an automated safety pattern check against your recorded profile. It does not replace professional medical advice. Always confirm with your doctor or pharmacist."
    }

    scans = load_prescriptions()
    scans.insert(0, scan_record)
    save_prescriptions(scans[:50])

    return scan_record

@router.post("/verify")
async def verify_prescription(
    request: Request,
    image: Optional[UploadFile] = File(None),
    file: Optional[UploadFile] = File(None),
    user_id: Optional[str] = Form(""),
    is_pregnant: Optional[bool] = Form(False),
):
    """
    Accepts either multipart form-data (photo upload) or JSON body for prescription verification.
    """
    content_type = request.headers.get("content-type", "")
    
    # Handle JSON payload
    if "application/json" in content_type:
        try:
            body = await request.json()
        except Exception:
            raw_body = await request.body()
            try:
                body = json.loads(raw_body.decode("utf-8", errors="ignore"))
            except Exception:
                body = {}
        return await _process_verification(
            ocr_text=body.get("ocr_text", ""),
            user_id=body.get("user_id", ""),
            user_allergies=body.get("user_allergies", ""),
            is_pregnant_or_lactating=body.get("is_pregnant_or_lactating", False),
            language=body.get("language", "en"),
            manual_medicines=body.get("manual_medicines", None)
        )

    # Handle multipart form upload
    uploaded = image or file
    ocr_text = ""
    if uploaded:
        image_bytes = await uploaded.read()
        if len(image_bytes) > 0:
            ocr_res = await perform_ocr(image_bytes)
            ocr_text = ocr_res.get("text", "")

    form_data = await request.form()
    user_allergies_val = form_data.get("user_allergies", "")

    return await _process_verification(
        ocr_text=ocr_text,
        user_id=user_id or "",
        user_allergies=user_allergies_val or "",
        is_pregnant_or_lactating=bool(is_pregnant),
        language="en"
    )

@router.get("/history")
async def get_prescription_history():
    """Get previously verified prescriptions."""
    return {"prescriptions": load_prescriptions()}

@router.get("/{prescription_id}")
async def get_prescription_by_id(prescription_id: str):
    """Get single prescription result by ID."""
    scans = load_prescriptions()
    for s in scans:
        if s.get("prescription_id") == prescription_id or s.get("id") == prescription_id:
            return s
    return {"error": "Prescription not found"}
