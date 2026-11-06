# MedVerity API — Interactions & Lifestyle Radar Router

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, List
import json
import os
from app.services.lifestyle_radar_service import get_lifestyle_radar

router = APIRouter()

DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "db", "mock_safety_data.json")


def load_safety_data():
    if os.path.exists(DATA_PATH):
        try:
            with open(DATA_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {}


class LifestyleRadarRequest(BaseModel):
    medicine_name: str
    active_salts: Optional[List[str]] = None
    language: Optional[str] = "en"


@router.post("/lifestyle")
async def get_lifestyle_radar_post(req: LifestyleRadarRequest):
    """
    Phase 2: Computes Food, Sunlight & Lifestyle Conflict Radar + Chronotherapy Circadian Engine.
    """
    return get_lifestyle_radar(
        medicine_name=req.medicine_name,
        active_salts=req.active_salts,
        language=req.language or "en",
    )


@router.get("/lifestyle")
async def get_lifestyle_radar_get(
    medicine_name: str = "",
    language: str = "en",
):
    """
    Phase 2: GET endpoint for Food, Sunlight & Lifestyle Conflict Radar + Chronotherapy.
    """
    return get_lifestyle_radar(
        medicine_name=medicine_name,
        language=language,
    )


@router.get("")
async def get_interactions(medicine_name: str = "", language: str = "en"):
    """
    Get interactions (food, pregnancy, drugs) and lifestyle radar for a medicine.
    """
    if not medicine_name:
        return {}

    safety_data = load_safety_data()
    base_info = safety_data.get(medicine_name, None)

    # Compute dynamic lifestyle radar
    radar = get_lifestyle_radar(medicine_name=medicine_name, language=language)

    if base_info:
        base_info["lifestyle_radar"] = radar
        return base_info

    # Generate rich safety data dynamically from lifestyle radar
    food_interactions = []
    for c in radar.get("conflicts", []):
        food_interactions.append({
            "severity": "high" if c.get("severity") == "danger" else "medium" if c.get("severity") == "warning" else "low",
            "title": f"{c.get('icon', '')} {c.get('title')}",
            "description": f"{c.get('description')} ({c.get('action_advice')})",
        })

    is_high_risk = any(c.get("severity") == "danger" for c in radar.get("conflicts", []))

    return {
        "food_interactions": food_interactions,
        "pregnancy_lactation": [
            {
                "severity": "medium",
                "title": "Medical Consultation Advised",
                "description": f"Always verify safety with your obstetrician before taking {medicine_name} during pregnancy or breastfeeding.",
            }
        ],
        "drug_interactions": [],
        "high_risk": is_high_risk,
        "active_ingredients": [radar.get("matched_drug", medicine_name.lower())],
        "lifestyle_radar": radar,
    }
