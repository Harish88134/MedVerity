# MedVerity API — Emergency "ICE" Card & Public ER Route Router

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, List
import json
import os
import uuid
from datetime import datetime

from app.routers.allergy import load_user_allergies_file
from app.routers.reminders import load_reminders

router = APIRouter()

ICE_PROFILES_PATH = os.path.join(os.path.dirname(__file__), "..", "db", "emergency_profiles.json")

def load_ice_profiles():
    if os.path.exists(ICE_PROFILES_PATH):
        try:
            with open(ICE_PROFILES_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def save_ice_profiles(data):
    os.makedirs(os.path.dirname(ICE_PROFILES_PATH), exist_ok=True)
    with open(ICE_PROFILES_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

class EmergencyProfileUpdate(BaseModel):
    full_name: str
    blood_group: str
    allergies: List[str]
    critical_meds: List[str]
    emergency_contact_name: str
    emergency_contact_phone: str
    organ_donor: Optional[bool] = False
    medical_notes: Optional[str] = ""

@router.get("/profile")
async def get_emergency_profile(user_id: str = "default_patient"):
    """Get patient's emergency ICE profile with auto-populated defaults."""
    profiles = load_ice_profiles()
    if user_id in profiles:
        return profiles[user_id]

    # Prepopulate from saved allergies & reminders
    user_allergies = load_user_allergies_file() or ["Penicillin (Severe)"]
    reminders_data = load_reminders()
    meds = []
    for tod in ("morning", "afternoon", "night"):
        for r in reminders_data.get(tod, []):
            if r.get("medicine_name"):
                meds.append(r["medicine_name"])
    
    if not meds:
        meds = ["Atorvastatin 20mg (Bedtime)", "Metformin 500mg (Morning)"]

    default_profile = {
        "id": "med-ice-101",
        "user_id": user_id,
        "full_name": "Harish K.",
        "blood_group": "O+ Positive",
        "allergies": user_allergies,
        "critical_meds": meds[:3],
        "emergency_contact_name": "Priya (Daughter)",
        "emergency_contact_phone": "+91 98765 43210",
        "organ_donor": True,
        "medical_notes": "Type 2 Diabetes, Mild Hypertension. Resuscitation: Full Code.",
        "updated_at": datetime.now().isoformat(),
    }
    profiles[user_id] = default_profile
    save_ice_profiles(profiles)
    return default_profile

@router.post("/profile")
async def update_emergency_profile(payload: EmergencyProfileUpdate, user_id: str = "default_patient"):
    """Update patient's emergency card details."""
    profiles = load_ice_profiles()
    updated = {
        "id": profiles.get(user_id, {}).get("id", f"med-ice-{str(uuid.uuid4())[:6]}"),
        "user_id": user_id,
        **payload.dict(),
        "updated_at": datetime.now().isoformat(),
    }
    profiles[user_id] = updated
    save_ice_profiles(profiles)
    return {"success": True, "profile": updated}

@router.get("/{profile_id}")
@router.get("/public/{profile_id}")
async def get_public_emergency_info(profile_id: str):
    """
    Lightweight, public, zero-auth endpoint accessed by first responders / paramedics
    when scanning the offline emergency QR code.
    """
    profiles = load_ice_profiles()
    prof = None
    for p in profiles.values():
        if p.get("id") == profile_id or p.get("user_id") == profile_id:
            prof = p
            break

    if not prof:
        prof = await get_emergency_profile(profile_id)

    # Format into frontend EmergencyData schema
    med_list = []
    for m in prof.get("critical_meds", []):
        if isinstance(m, str):
            med_list.append({"name": m, "dosage": "As prescribed", "frequency": "Daily"})
        elif isinstance(m, dict):
            med_list.append(m)

    return {
        "id": prof.get("id", profile_id),
        "patient_name": prof.get("full_name", "Verified Patient"),
        "blood_group": prof.get("blood_group", "O+ Positive"),
        "emergency_notes": prof.get("medical_notes", "Resuscitation: Full Code. Type 2 Diabetes."),
        "allergies": prof.get("allergies", ["Penicillin (Severe)"]),
        "critical_meds": med_list,
        "caregiver_phone": prof.get("emergency_contact_phone", "+91 98765 43210"),
        "organ_donor": prof.get("organ_donor", True),
    }

