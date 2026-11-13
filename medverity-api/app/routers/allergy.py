# MedVerity API — Allergy Router (Supabase + file fallback)

from fastapi import APIRouter, Query
import json
import os
from typing import List

from app.db.supabase_client import supabase

router = APIRouter()

DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "db", "mock_safety_data.json")
USER_ALLERGIES_PATH = os.path.join(os.path.dirname(__file__), "..", "db", "user_allergies.json")

from pydantic import BaseModel


class AllergiesPayload(BaseModel):
    allergies: List[str]
    user_id: str = ""


def load_safety_data():
    if os.path.exists(DATA_PATH):
        with open(DATA_PATH, "r") as f:
            return json.load(f)
    return {}


def load_user_allergies_file(user_id: str = "") -> List[str]:
    if user_id == "user-hasmitha-patient":
        return ["Penicillin (Severe)", "Sulfa Drugs", "Aspirin"]
    if user_id == "user-hari-caregiver":
        return ["No Known Drug Allergies (NKDA)"]
    if os.path.exists(USER_ALLERGIES_PATH):
        with open(USER_ALLERGIES_PATH, "r") as f:
            data = json.load(f)
            return data.get("allergies", ["Penicillin (Severe)"])
    return ["Penicillin (Severe)"]


def save_user_allergies_file(allergies: List[str]):
    with open(USER_ALLERGIES_PATH, "w") as f:
        json.dump({"allergies": allergies}, f)


@router.get("")
async def get_allergies(user_id: str = ""):
    """Get user allergies."""
    if user_id == "user-hasmitha-patient":
        return {"allergies": ["Penicillin (Severe)", "Sulfa Drugs", "Aspirin"]}
    if user_id == "user-hari-caregiver":
        return {"allergies": ["No Known Drug Allergies (NKDA)"]}

    if supabase and user_id:
        try:
            result = supabase.table("allergies") \
                .select("allergy_name") \
                .eq("user_id", user_id) \
                .execute()
            if result.data:
                return {"allergies": [row["allergy_name"] for row in result.data]}
        except Exception as e:
            print(f"[Allergy] Supabase read failed: {e}. Falling back to file.")

    return {"allergies": load_user_allergies_file(user_id)}


@router.post("")
async def manage_allergy(payload: AllergiesPayload):
    """Save user allergies (replaces existing list)."""
    if supabase and payload.user_id:
        try:
            # Delete old allergies
            supabase.table("allergies").delete().eq("user_id", payload.user_id).execute()

            # Insert new ones
            if payload.allergies:
                rows = [
                    {"user_id": payload.user_id, "allergy_name": a}
                    for a in payload.allergies
                ]
                supabase.table("allergies").insert(rows).execute()

            return {"message": "Allergies updated successfully", "allergies": payload.allergies}
        except Exception as e:
            print(f"[Allergy] Supabase write failed: {e}. Falling back to file.")

    save_user_allergies_file(payload.allergies)
    return {"message": "Allergies updated successfully", "allergies": payload.allergies}


from app.utils.drug_knowledge import check_allergy_conflict, resolve_active_ingredients

@router.get("/check")
async def check_allergy(medicine_name: str = "", user_allergies: str = "", user_id: str = ""):
    """Check scanned medicine against user's recorded allergies using verified knowledge base."""
    if not medicine_name:
        return {
            "has_allergy": False,
            "status": "unspecified",
            "matches": [],
            "reason": "No medicine specified.",
            "recommendation": "Provide medicine name to perform allergy screening."
        }

    # Resolve patient allergy list
    allergies_list = None
    if user_allergies:
        allergies_list = [a.strip() for a in user_allergies.split(",") if a.strip()]
    elif supabase and user_id:
        try:
            result = supabase.table("allergies").select("allergy_name").eq("user_id", user_id).execute()
            allergies_list = [row["allergy_name"] for row in (result.data or [])]
        except Exception as e:
            print(f"[Allergy Check] Supabase query failed: {e}. Falling back to file.")
            allergies_list = load_user_allergies_file()
    elif user_id:
        allergies_list = load_user_allergies_file()
    else:
        # If user_allergies not passed and user_id not passed, profile is unknown/missing
        allergies_list = None

    active_ingredients = resolve_active_ingredients(medicine_name)
    eval_result = check_allergy_conflict(medicine_name, allergies_list)

    return {
        "has_allergy": eval_result["has_allergy"],
        "alert_type": eval_result["alert_type"],
        "severity": eval_result["severity"],
        "matches": [eval_result["matched_allergy"]] if eval_result["matched_allergy"] else [],
        "active_ingredients": active_ingredients,
        "triggering_ingredient": eval_result["triggering_ingredient"],
        "title": eval_result["title"],
        "reason": eval_result["reason"],
        "recommendation": eval_result["recommendation"]
    }
