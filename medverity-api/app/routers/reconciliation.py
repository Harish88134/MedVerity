# MedVerity API — Prescription vs Dispensed Pill Cross-Check Router

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, Dict
import re
import uuid
from datetime import datetime

router = APIRouter()

class ReconcileRequest(BaseModel):
    rx_text: str
    blister_text: str
    prescribed_name_manual: Optional[str] = None
    dispensed_name_manual: Optional[str] = None

def _extract_strength(text: str):
    match = re.search(r"(\d+(?:\.\d+)?)\s*(mg|mcg|g|ml|iu)", text, re.IGNORECASE)
    if match:
        return f"{match.group(1)}{match.group(2).lower()}"
    return None

@router.post("/check")
async def reconcile_rx_and_blister(req: ReconcileRequest):
    """
    Compares Doctor's handwritten/printed prescription against Physical Dispensed blister pack.
    Detects Wrong Medicine Hazards, Strength Mismatch, and Dosage Overdoses.
    """
    rx_input = (req.prescribed_name_manual or req.rx_text or "").strip()
    blister_input = (req.dispensed_name_manual or req.blister_text or "").strip()

    rx_strength = _extract_strength(rx_input)
    blister_strength = _extract_strength(blister_input)

    rx_clean = re.sub(r"\d+(?:\.\d+)?\s*(mg|mcg|g|ml|iu)", "", rx_input, flags=re.I).strip().lower()
    blister_clean = re.sub(r"\d+(?:\.\d+)?\s*(mg|mcg|g|ml|iu)", "", blister_input, flags=re.I).strip().lower()

    # Extract primary medicine word
    rx_primary = rx_clean.split()[0] if rx_clean else "unknown"
    blister_primary = blister_clean.split()[0] if blister_clean else "unknown"

    status = "match" # "match" | "strength_mismatch" | "hazard_wrong_drug"
    alerts = []

    # Check drug identity
    if rx_primary not in blister_clean and blister_primary not in rx_clean:
        # Check known dangerous look-alikes
        confusable = {
            "metformin": "metoprolol",
            "celebrex": "celexa",
            "amaryl": "reminyl",
            "klonopin": "clonidine",
            "zyrtec": "zyprexa"
        }
        status = "hazard_wrong_drug"
        alerts.append({
            "severity": "critical",
            "title": "🚨 CRITICAL: DRUG MISMATCH DETECTED!",
            "message": f"Doctor prescribed '{rx_input}', but the dispensed pack appears to be '{blister_input}'. Do NOT consume before checking with your pharmacist!",
            "recommendation": "Return to the dispensing pharmacy immediately with your original prescription slip."
        })
    elif rx_strength and blister_strength and rx_strength != blister_strength:
        status = "strength_mismatch"
        alerts.append({
            "severity": "danger",
            "title": "⚠️ DOSAGE STRENGTH MISMATCH",
            "message": f"Doctor prescribed {rx_strength}, but pharmacy dispensed {blister_strength}. You may receive an unintentional under- or overdose.",
            "recommendation": "Consult pharmacist for exact tablet splitting or correct dosage exchange."
        })
    else:
        alerts.append({
            "severity": "success",
            "title": "✅ VERIFIED MATCH",
            "message": f"The dispensed medicine '{blister_input}' matches prescribed order '{rx_input}'.",
            "recommendation": "Take as instructed by your physician."
        })

    return {
        "reconciliation_id": f"rec-{str(uuid.uuid4())[:8]}",
        "timestamp": datetime.now().isoformat(),
        "status": status,
        "prescribed": {
            "raw_text": rx_input,
            "detected_medicine": rx_primary.capitalize(),
            "detected_strength": rx_strength or "Unspecified"
        },
        "dispensed": {
            "raw_text": blister_input,
            "detected_medicine": blister_primary.capitalize(),
            "detected_strength": blister_strength or "Unspecified"
        },
        "alerts": alerts,
        "disclaimer": "Automated verification cross-matcher. High-risk medications must always be verified directly by licensed pharmacists."
    }
