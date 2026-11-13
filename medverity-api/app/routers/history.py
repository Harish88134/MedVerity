# MedVerity API — History Router (Supabase + mock fallback)

from fastapi import APIRouter
from datetime import datetime, timedelta

from app.db.supabase_client import supabase

router = APIRouter()


import os
import json

SCANS_PATH = os.path.join(os.path.dirname(__file__), "..", "db", "user_scans_history.json")


@router.get("")
async def get_history(user_id: str = ""):
    """Get scan history timeline for a user."""
    # Check local user scans history first if available
    if os.path.exists(SCANS_PATH):
        try:
            with open(SCANS_PATH, "r") as f:
                saved_scans = json.load(f)
                if user_id:
                    matched = [s for s in saved_scans if s.get("user_id") == user_id]
                    if matched:
                        return {"history": matched}
                elif saved_scans:
                    return {"history": saved_scans}
        except Exception:
            pass

    if supabase and user_id:
        try:
            result_scans = supabase.table("scans") \
                .select("id, medicine_name, scanned_at, category, ocr_confidence") \
                .eq("user_id", user_id) \
                .order("scanned_at", desc=True) \
                .limit(50) \
                .execute()
                
            result_prescriptions = supabase.table("prescription_scans") \
                .select("id, medicines, scanned_at") \
                .eq("user_id", user_id) \
                .order("scanned_at", desc=True) \
                .limit(50) \
                .execute()

            history = []
            for row in (result_scans.data or []):
                history.append({
                    "id": row["id"],
                    "type": "single",
                    "medicine_name": row.get("medicine_name", "Unknown"),
                    "date": row.get("scanned_at", datetime.now().isoformat()),
                    "category": row.get("category", "Medicine"),
                    "confidence": row.get("ocr_confidence", 0.9),
                })
                
            for row in (result_prescriptions.data or []):
                meds = row.get("medicines", [])
                name = f"Prescription ({len(meds)} medicines)"
                history.append({
                    "id": row["id"],
                    "type": "prescription",
                    "medicine_name": name,
                    "date": row.get("scanned_at", datetime.now().isoformat()),
                    "category": "Prescription",
                    "confidence": 1.0,
                })
                
            history.sort(key=lambda x: x["date"], reverse=True)
            return {"history": history[:50]}
        except Exception as e:
            print(f"[History] Supabase read failed: {e}. Returning mock data.")

    # Mock fallback for development
    now = datetime.now()
    return {
        "history": [
            {
                "id": "hist-1",
                "type": "single",
                "medicine_name": "Paracetamol 650 mg",
                "date": now.isoformat(),
                "category": "Pain Relief",
                "confidence": 0.98,
            },
            {
                "id": "hist-rx-1",
                "type": "prescription",
                "medicine_name": "Prescription (3 medicines)",
                "date": (now - timedelta(days=1)).isoformat(),
                "category": "Prescription",
                "confidence": 1.0,
            },
            {
                "id": "hist-2",
                "type": "single",
                "medicine_name": "Metformin 500mg",
                "date": (now - timedelta(days=2)).isoformat(),
                "category": "Antidiabetic",
                "confidence": 0.58,
            },
            {
                "id": "hist-3",
                "type": "single",
                "medicine_name": "Amoxicillin 250mg",
                "date": (now - timedelta(days=5)).isoformat(),
                "category": "Antibiotic",
                "confidence": 0.92,
            },
        ]
    }
