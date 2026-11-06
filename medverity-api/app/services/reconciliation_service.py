"""
MedVerity — Comprehensive Prescription vs. Dispensed Medicine Reconciliation Engine
Implements:
1. Multi-field independent entity extraction:
   - Medicine name (Brand / Generic)
   - Active ingredients (including combination salts)
   - Strength / concentration (normalized metric values, e.g., 250mg, 500mg)
   - Dosage form (tablet, capsule, syrup, injection)
   - Prescribed dose & frequency
   - Route of administration
2. Field-by-field verification logic:
   - MATCH: Critical fields agree (medicine active chemical identity and strength match)
   - MISMATCH: Active ingredient discrepancy or dosage strength mismatch
   - REVIEW REQUIRED: Low confidence, illegible text, form discrepancy, or incomplete clinical data
3. Integration of:
   - Pill recognition candidate analysis
   - Patient-specific allergy screening (an exact match MUST NEVER override an allergy warning)
"""

import json
import re
from typing import Optional, List, Dict
import google.generativeai as genai
from app.config import settings
from app.services.ocr_service import perform_ocr
from app.services.pill_service import identify_pill_image
from app.utils.drug_knowledge import (
    resolve_active_ingredients,
    check_allergy_conflict,
    normalize_text,
    DRUG_REFERENCE_DATABASE,
)
from app.routers.allergy import load_user_allergies_file
from app.db.supabase_client import supabase

if settings.GEMINI_API_KEY:
    try:
        genai.configure(api_key=settings.GEMINI_API_KEY)
    except Exception:
        pass


def _standardize_strength(raw_str: str) -> Optional[str]:
    """Standardize dosage strength into unified metric representations (e.g. 500mg, 25mcg, 10ml)."""
    if not raw_str:
        return None
    s = raw_str.lower().strip()
    match = re.search(r"(\d+(?:\.\d+)?)\s*(mg|mcg|g|ml|iu|%)?", s)
    if not match:
        return None
    val = match.group(1)
    unit = match.group(2) or "mg"
    try:
        f_val = float(val)
        if f_val.is_integer():
            val = str(int(f_val))
    except Exception:
        pass
    return f"{val}{unit}"


def _standardize_form(raw_form: str) -> str:
    """Standardize dosage forms (e.g., tablet, capsule, syrup, injection)."""
    if not raw_form:
        return "unspecified"
    f = raw_form.lower().strip()
    if any(w in f for w in ["tab", "tablet"]):
        if any(w in f for w in ["sr", "er", "extended", "sustained"]):
            return "extended_release_tablet"
        return "tablet"
    if any(w in f for w in ["cap", "capsule"]):
        return "capsule"
    if any(w in f for w in ["syr", "syrup", "suspension", "liquid"]):
        return "syrup"
    if any(w in f for w in ["inj", "injection"]):
        return "injection"
    if any(w in f for w in ["drop", "drops"]):
        return "drops"
    return f


def _extract_fields_heuristic(ocr_text: str, source_type: str = "prescription") -> dict:
    """Extract clinical fields using robust regex and dictionary patterns from OCR text."""
    text_norm = normalize_text(ocr_text)

    # 1. Identify medicine candidates
    detected_med = "unknown"
    active_ingredients = []
    category = "Prescription Medicine"

    for key, spec in DRUG_REFERENCE_DATABASE.items():
        if key in text_norm or spec["brand_name"].lower() in text_norm or spec["generic_name"].lower() in text_norm:
            detected_med = spec["brand_name"]
            active_ingredients = list(spec["active_ingredients"])
            category = spec["category"]
            break

    # If not in reference db, check first meaningful line
    if detected_med == "unknown":
        lines = [l.strip() for l in ocr_text.split("\n") if len(l.strip()) > 3]
        for line in lines:
            line_l = line.lower()
            if not any(skip in line_l for skip in ["dr.", "hospital", "clinic", "date", "rx", "patient", "phone", "mfg", "exp", "batch", "strip"]):
                detected_med = line[:40].strip()
                active_ingredients = resolve_active_ingredients(detected_med)
                break

    # 2. Extract strength
    strength_match = re.search(r"\b(\d+(?:\.\d+)?)\s*(mg|mcg|g|ml|iu)\b", ocr_text, re.IGNORECASE)
    detected_strength = f"{strength_match.group(1)}{strength_match.group(2).lower()}" if strength_match else "unspecified"

    # 3. Extract form
    detected_form = "unspecified"
    for form_word in ["tablet", "tablets", "tab", "capsule", "capsules", "cap", "syrup", "suspension", "injection", "drops"]:
        if re.search(rf"\b{form_word}\b", ocr_text, re.IGNORECASE):
            detected_form = _standardize_form(form_word)
            break

    # 4. Extract frequency & route
    freq = "unspecified"
    for f_pattern in ["once daily", "twice a day", "three times a day", "thrice daily", "tds", "bd", "od", "sos", "after meals", "at bedtime"]:
        if f_pattern in text_norm:
            freq = f_pattern.title()
            break

    route = "oral"
    if "topical" in text_norm or "ointment" in text_norm:
        route = "topical"
    elif "injection" in text_norm or "iv" in text_norm:
        route = "injectable"

    return {
        "medicine_name": detected_med,
        "active_ingredients": active_ingredients if active_ingredients else resolve_active_ingredients(detected_med),
        "strength": detected_strength,
        "form": detected_form,
        "frequency": freq,
        "route": route,
        "category": category,
    }


def _compare_entities(rx: dict, blister: dict) -> dict:
    """
    Compare prescribed entity vs dispensed packaging entity field-by-field.
    Outcomes:
    - MATCH: All critical fields agree.
    - MISMATCH: Confirmed discrepancy (wrong drug, dosage strength mismatch, or major form mismatch).
    - REVIEW REQUIRED: Incomplete text, unreadable input, low confidence, or missing critical info.
    """
    rx_med = rx.get("medicine_name", "unknown")
    blist_med = blister.get("medicine_name", "unknown")

    rx_unreadable = (rx_med == "unknown" or len(rx.get("active_ingredients", [])) == 0)
    blist_unreadable = (blist_med == "unknown" or len(blister.get("active_ingredients", [])) == 0)

    # Comparison Table Data
    comparison_table = [
        {
            "field": "Medicine / Brand",
            "prescribed": rx_med,
            "dispensed": blist_med,
            "status": "match" if rx_med.lower() == blist_med.lower() else "different",
        },
        {
            "field": "Active Ingredient(s)",
            "prescribed": ", ".join(rx.get("active_ingredients", [])) or "Unknown",
            "dispensed": ", ".join(blister.get("active_ingredients", [])) or "Unknown",
            "status": "pending",
        },
        {
            "field": "Dosage Strength",
            "prescribed": rx.get("strength", "unspecified"),
            "dispensed": blister.get("strength", "unspecified"),
            "status": "pending",
        },
        {
            "field": "Dosage Form",
            "prescribed": rx.get("form", "unspecified"),
            "dispensed": blister.get("form", "unspecified"),
            "status": "pending",
        },
    ]

    # Case 1: Unreadable OCR
    if rx_unreadable or blist_unreadable:
        return {
            "status": "REVIEW REQUIRED",
            "result_category": "unreadable_input",
            "color": "amber",
            "title": "Review Required: Incomplete or Unreadable Labels",
            "reason": (
                "Prescription or dispensed packaging text could not be clearly read with operational confidence. "
                "Do not assume equivalence."
            ),
            "recommendation": "Pause dispensing. Manually verify prescription with licensed pharmacist.",
            "discrepancies": ["OCR confidence is below operational threshold or text is unreadable."],
            "comparison_table": comparison_table,
        }

    # Case 2: Ingredient Alignment
    rx_ingredients = set(normalize_text(i) for i in rx.get("active_ingredients", []))
    blist_ingredients = set(normalize_text(i) for i in blister.get("active_ingredients", []))

    # Evaluate chemical compound overlap
    overlap = rx_ingredients.intersection(blist_ingredients)
    ingredients_match = (rx_ingredients == blist_ingredients) or (len(overlap) > 0 and len(rx_ingredients) == len(blist_ingredients))

    comparison_table[1]["status"] = "match" if ingredients_match else "mismatch"

    if not ingredients_match:
        discrepancy_msg = (
            f"Prescription requires [{', '.join(rx.get('active_ingredients', []))}], "
            f"but dispensed item contains [{', '.join(blister.get('active_ingredients', []))}]."
        )
        comparison_table[1]["status"] = "mismatch"
        return {
            "status": "MISMATCH",
            "result_category": "wrong_drug",
            "color": "red",
            "title": "🚨 CRITICAL MISMATCH: Active Ingredient Discrepancy",
            "reason": discrepancy_msg,
            "recommendation": "DO NOT DISPENSE OR INGEST. Return medicine to pharmacy immediately with prescription.",
            "discrepancies": [discrepancy_msg],
            "comparison_table": comparison_table,
        }

    # Case 3: Strength Mismatch
    rx_str = _standardize_strength(rx.get("strength", ""))
    blist_str = _standardize_strength(blister.get("strength", ""))

    if rx_str and blist_str and rx_str != blist_str:
        comparison_table[2]["status"] = "mismatch"
        discrepancy_msg = f"Doctor ordered {rx_str}, but pharmacy dispensed {blist_str} (Strength Mismatch)."
        return {
            "status": "MISMATCH",
            "result_category": "strength_mismatch",
            "color": "red",
            "title": "⚠️ DOSAGE STRENGTH MISMATCH",
            "reason": discrepancy_msg,
            "recommendation": "DO NOT DISPENSE. Exchange for the exact prescribed strength to prevent under- or overdose.",
            "discrepancies": [discrepancy_msg],
            "comparison_table": comparison_table,
        }
    elif not rx_str or not blist_str or rx_str == "unspecified" or blist_str == "unspecified":
        comparison_table[2]["status"] = "review_required"
        discrepancy_msg = "Dosage strength is unspecified on either prescription or packaging label."
        return {
            "status": "REVIEW REQUIRED",
            "result_category": "unspecified_strength",
            "color": "amber",
            "title": "Review Required: Unverified Strength",
            "reason": discrepancy_msg,
            "recommendation": "Verify exact numerical strength with pharmacist before administration.",
            "discrepancies": [discrepancy_msg],
            "comparison_table": comparison_table,
        }
    else:
        comparison_table[2]["status"] = "match"

    # Case 4: Form & Release Formulation
    rx_form = _standardize_form(rx.get("form", ""))
    blist_form = _standardize_form(blister.get("form", ""))

    if rx_form != "unspecified" and blist_form != "unspecified" and rx_form != blist_form:
        # Check if one is extended release while other is immediate
        if "extended" in rx_form or "extended" in blist_form:
            comparison_table[3]["status"] = "mismatch"
            discrepancy_msg = f"Modified-release formulation discrepancy: Prescribed {rx_form} vs Dispensed {blist_form}."
            return {
                "status": "MISMATCH",
                "result_category": "form_mismatch",
                "color": "red",
                "title": "⚠️ RELEASE FORMULATION MISMATCH",
                "reason": discrepancy_msg,
                "recommendation": "Modified-release pills have different pharmacokinetics. Consult prescriber before switching.",
                "discrepancies": [discrepancy_msg],
                "comparison_table": comparison_table,
            }
        else:
            comparison_table[3]["status"] = "review_required"
            discrepancy_msg = f"Dosage form differs: Prescribed '{rx_form}', Dispensed '{blist_form}'."
            return {
                "status": "REVIEW REQUIRED",
                "result_category": "form_review",
                "color": "amber",
                "title": "Review Required: Dosage Form Variation",
                "reason": discrepancy_msg,
                "recommendation": "Verify clinical equivalence of dosage form with pharmacist.",
                "discrepancies": [discrepancy_msg],
                "comparison_table": comparison_table,
            }
    else:
        comparison_table[3]["status"] = "match"

    # Case 5: Verified Match
    return {
        "status": "MATCH",
        "result_category": "verified_match",
        "color": "green",
        "title": "✅ Prescribed & Dispensed Medicines Agree",
        "reason": f"Available critical fields (Active ingredient [{', '.join(rx_ingredients)}] and strength {rx_str}) match.",
        "recommendation": "The available checks found no identified discrepancy. Note: This check does not replace clinical dispensing oversight.",
        "discrepancies": [],
        "comparison_table": comparison_table,
    }


async def reconcile_prescription_vs_dispensed(
    rx_image_bytes: bytes,
    blister_image_bytes: bytes,
    pill_image_bytes: Optional[bytes] = None,
    user_id: Optional[str] = None,
) -> dict:
    """
    Main integrated workflow:
    1. Authenticate / load patient profile & registered allergies.
    2. OCR both prescription and packaging.
    3. Extract & normalize structured clinical fields independently.
    4. Optional Pill Recognition candidate identification.
    5. Compare prescription vs dispensed medicine.
    6. Run Patient Allergy Check against verified active ingredients.
    7. Formulate final safety verdict:
       - An exact prescription match MUST NEVER override an allergy alert!
    """
    # Step 1: Patient Profile & Allergies
    patient_allergies = None
    if user_id:
        if supabase:
            try:
                res = supabase.table("allergies").select("allergy_name").eq("user_id", user_id).execute()
                patient_allergies = [r["allergy_name"] for r in (res.data or [])]
            except Exception as e:
                print(f"[Reconcile] Supabase allergy load failed: {e}. Falling back to file.")
                patient_allergies = load_user_allergies_file()
        else:
            patient_allergies = load_user_allergies_file()
    else:
        patient_allergies = None

    # Step 2: OCR Extraction
    rx_ocr = await perform_ocr(rx_image_bytes)
    blist_ocr = await perform_ocr(blister_image_bytes)

    rx_text = rx_ocr.get("text", "")
    blist_text = blist_ocr.get("text", "")

    # Step 3: Extract & normalize clinical fields
    rx_entity = _extract_fields_heuristic(rx_text, "prescription")
    blister_entity = _extract_fields_heuristic(blist_text, "packaging")

    # Step 4: Optional Pill Recognition
    pill_result = None
    if pill_image_bytes and len(pill_image_bytes) > 0:
        pill_result = await identify_pill_image(pill_image_bytes, ocr_hint_text=blist_text)

    # Step 5: Reconciliation check
    recon_result = _compare_entities(rx_entity, blister_entity)

    # Step 6: Allergy check against verified active ingredients of dispensed & prescribed
    evaluated_med = blister_entity["medicine_name"] if blister_entity["medicine_name"] != "unknown" else rx_entity["medicine_name"]
    allergy_result = check_allergy_conflict(evaluated_med, patient_allergies)

    # Step 7: Synthesize Overall Safety Verdict
    # Rule: An exact prescription match must NEVER override an allergy warning.
    overall_status = recon_result["status"]
    overall_color = recon_result["color"]
    overall_title = recon_result["title"]
    overall_reason = recon_result["reason"]
    overall_recommendation = recon_result["recommendation"]

    if allergy_result["alert_type"] == "exact_match":
        overall_status = "MISMATCH"
        overall_color = "red"
        overall_title = f"🚨 CRITICAL ALLERGY ALERT: {allergy_result['matched_allergy']}"
        overall_reason = (
            f"Allergy conflict detected! {allergy_result['reason']} "
            f"(Note: Prescription and packaging match does NOT make this safe)."
        )
        overall_recommendation = "PAUSE DISPENSING IMMEDIATELY. Seek urgent prescriber review."
    elif allergy_result["alert_type"] == "cross_allergy":
        if overall_color != "red":
            overall_status = "REVIEW REQUIRED"
            overall_color = "amber"
            overall_title = f"⚠️ POTENTIAL CROSS-ALLERGY: {allergy_result['matched_allergy']}"
            overall_reason = allergy_result["reason"]
            overall_recommendation = allergy_result["recommendation"]
    elif allergy_result["alert_type"] == "unknown_status":
        if overall_color != "red":
            overall_status = "REVIEW REQUIRED"
            overall_color = "amber"
            overall_title = "Allergy Status Unknown — Verify Before Dispensing"
            overall_reason = "Patient allergy records are unavailable. Do not assume medicine is safe."
            overall_recommendation = "Allergy status unknown — verify before dispensing."

    return {
        "overall_status": overall_status,   # "MATCH" | "MISMATCH" | "REVIEW REQUIRED"
        "overall_color": overall_color,     # "green" | "red" | "amber"
        "overall_title": overall_title,
        "overall_reason": overall_reason,
        "overall_recommendation": overall_recommendation,
        "reconciliation": recon_result,
        "allergy_check": allergy_result,
        "pill_recognition": pill_result,
        "rx_ocr_text": rx_text,
        "blister_ocr_text": blist_text,
        "rx_entity": rx_entity,
        "blister_entity": blister_entity,
        "patient_profile": {
            "user_id": user_id or "anonymous",
            "recorded_allergies": patient_allergies if patient_allergies is not None else "Unknown / Not recorded",
            "allergy_status": "loaded" if patient_allergies is not None else "unknown",
        },
        "disclaimer": (
            "MedVerity automated reconciliation is a clinical decision-support aid. "
            "It does not replace professional pharmacist dispensing oversight or physician judgment."
        ),
    }
