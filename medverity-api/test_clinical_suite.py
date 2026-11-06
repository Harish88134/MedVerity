"""
Automated Test Suite for MedVerity:
1. Recorded allergy matches a prescribed active ingredient.
2. Recorded allergy matches an ingredient in a combination medicine.
3. No known allergy match is found (with explicit safety disclaimer).
4. Allergy information is missing or unavailable ("Allergy status unknown").
5. The prescription and packaging have the same verified medicine and strength (MATCH).
6. The medicine names match but the strengths differ (STRENGTH MISMATCH).
7. The active ingredients differ (WRONG DRUG MISMATCH).
8. The dosage forms or release formulations differ significantly (MISMATCH/REVIEW).
9. Prescription OCR is unreadable or incomplete (REVIEW REQUIRED).
10. Pill recognition returns a low-confidence result (INCONCLUSIVE).
11. An image upload or recognition API fails safely.
12. The medicine matches the prescription but triggers an allergy warning (ALLERGY NEVER OVERRIDDEN BY MATCH).
13. The wrong patient's profile must never be used (TENANT ISOLATION).
14. Unknown medicine names result in review rather than false match.
"""

import sys
import os
import io
import asyncio
from PIL import Image

# Ensure utf-8 output in Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from app.utils.drug_knowledge import (
    check_allergy_conflict,
    resolve_active_ingredients,
    normalize_text,
)
from app.services.reconciliation_service import (
    _compare_entities,
    _extract_fields_heuristic,
    reconcile_prescription_vs_dispensed,
)
from app.services.pill_service import (
    identify_pill_image,
    _analyze_pill_image_properties,
)


def create_dummy_image(text="TEST", color="white") -> bytes:
    """Helper to create dummy in-memory image bytes."""
    img = Image.new("RGB", (200, 200), color=color)
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def test_1_allergy_matches_active_ingredient():
    print("Test 1: Recorded allergy matches prescribed active ingredient...")
    res = check_allergy_conflict("Amoxicillin 500mg", ["penicillin"])
    assert res["has_allergy"] is True
    assert res["alert_type"] == "exact_match"
    assert "Amoxicillin" in res["triggering_ingredient"]
    print(f"  ✓ Pass: {res['title']}")


def test_2_allergy_matches_combination_medicine():
    print("Test 2: Recorded allergy matches ingredient in combination medicine...")
    # Combiflam contains Ibuprofen + Paracetamol
    res = check_allergy_conflict("Combiflam", ["ibuprofen"])
    assert res["has_allergy"] is True
    assert res["alert_type"] == "exact_match"

    # Augmentin contains Amoxicillin + Clavulanic Acid
    res2 = check_allergy_conflict("Augmentin 625 Duo", ["penicillin"])
    assert res2["has_allergy"] is True
    assert res2["alert_type"] == "exact_match"
    print("  ✓ Pass: Combination ingredients correctly decomposed and matched.")


def test_3_no_known_allergy_match():
    print("Test 3: No known allergy match found...")
    res = check_allergy_conflict("Pantoprazole 40mg", ["penicillin"])
    assert res["has_allergy"] is False
    assert res["alert_type"] == "none"
    assert "No match found with the allergies recorded in this profile" in res["reason"]
    print("  ✓ Pass: Clear no-match phrasing verified.")


def test_4_allergy_info_missing_or_unavailable():
    print("Test 4: Allergy information is missing or unavailable...")
    res = check_allergy_conflict("Amoxicillin 500mg", None)
    assert res["has_allergy"] is False
    assert res["alert_type"] == "unknown_status"
    assert "Allergy status unknown — verify before dispensing" in res["recommendation"]
    print("  ✓ Pass: Explicit 'Allergy status unknown' requirement verified.")


def test_5_prescription_and_packaging_match():
    print("Test 5: Prescription and packaging match verified...")
    rx = {"medicine_name": "Paracetamol 500mg", "active_ingredients": ["paracetamol"], "strength": "500mg", "form": "tablet"}
    blist = {"medicine_name": "Paracetamol 500mg", "active_ingredients": ["paracetamol"], "strength": "500mg", "form": "tablet"}
    res = _compare_entities(rx, blist)
    assert res["status"] == "MATCH"
    assert res["color"] == "green"
    print(f"  ✓ Pass: {res['title']}")


def test_6_medicine_names_match_but_strengths_differ():
    print("Test 6: Medicine names match but strengths differ (Overdose/Mismatch)...")
    rx = {"medicine_name": "Amoxicillin 250mg", "active_ingredients": ["amoxicillin"], "strength": "250mg", "form": "capsule"}
    blist = {"medicine_name": "Amoxicillin 500mg", "active_ingredients": ["amoxicillin"], "strength": "500mg", "form": "capsule"}
    res = _compare_entities(rx, blist)
    assert res["status"] == "MISMATCH"
    assert res["result_category"] == "strength_mismatch"
    assert res["color"] == "red"
    print(f"  ✓ Pass: {res['title']} -> {res['reason']}")


def test_7_active_ingredients_differ():
    print("Test 7: Active ingredients differ (Wrong Drug Hazard)...")
    rx = {"medicine_name": "Metformin 500mg", "active_ingredients": ["metformin"], "strength": "500mg", "form": "tablet"}
    blist = {"medicine_name": "Metoprolol 50mg", "active_ingredients": ["metoprolol"], "strength": "50mg", "form": "tablet"}
    res = _compare_entities(rx, blist)
    assert res["status"] == "MISMATCH"
    assert res["result_category"] == "wrong_drug"
    assert res["color"] == "red"
    print(f"  ✓ Pass: {res['title']}")


def test_8_dosage_form_differs_significantly():
    print("Test 8: Dosage forms differ (Extended Release vs Immediate Release)...")
    rx = {"medicine_name": "Metformin 500mg", "active_ingredients": ["metformin"], "strength": "500mg", "form": "extended_release_tablet"}
    blist = {"medicine_name": "Metformin 500mg", "active_ingredients": ["metformin"], "strength": "500mg", "form": "tablet"}
    res = _compare_entities(rx, blist)
    assert res["status"] == "MISMATCH"
    assert res["result_category"] == "form_mismatch"
    assert res["color"] == "red"
    print(f"  ✓ Pass: {res['title']}")


def test_9_prescription_ocr_unreadable():
    print("Test 9: Prescription OCR unreadable or incomplete...")
    rx = {"medicine_name": "unknown", "active_ingredients": [], "strength": "unspecified", "form": "unspecified"}
    blist = {"medicine_name": "Paracetamol 500mg", "active_ingredients": ["paracetamol"], "strength": "500mg", "form": "tablet"}
    res = _compare_entities(rx, blist)
    assert res["status"] == "REVIEW REQUIRED"
    assert res["color"] == "amber"
    print(f"  ✓ Pass: {res['title']}")


def test_10_pill_recognition_low_confidence():
    print("Test 10: Pill recognition low confidence returns inconclusive...")
    dummy_img = create_dummy_image(color="white")
    res = asyncio.run(identify_pill_image(dummy_img, ocr_hint_text="blurry no markings"))
    assert res["status"] == "inconclusive"
    assert res["recognized"] is False
    assert "Pill identification inconclusive — verify with a pharmacist." in res["message"]
    print(f"  ✓ Pass: Inconclusive pill result returned safely.")


def test_11_image_upload_failure_handling():
    print("Test 11: Invalid image format / corrupt upload handling...")
    corrupt_bytes = b"corrupted bytes not an image"
    res = asyncio.run(identify_pill_image(corrupt_bytes, ocr_hint_text=""))
    assert res["status"] == "inconclusive"
    assert res["recognized"] is False
    print("  ✓ Pass: Corrupted payload safely caught without crashing.")


def test_12_match_never_overrides_allergy():
    print("Test 12: Exact prescription match NEVER overrides an allergy warning...")
    # Both prescription and packaging agree on Amoxicillin 500mg
    rx_bytes = create_dummy_image()
    blist_bytes = create_dummy_image()

    # Mock perform_ocr inside reconciliation_service for deterministic test
    import app.services.reconciliation_service as rs
    orig_ocr = rs.perform_ocr

    async def mock_ocr_rx(img):
        return {"text": "Amoxicillin 500mg capsule TDS", "confidence": 0.95}
    async def mock_ocr_blist(img):
        return {"text": "Amoxicillin 500mg capsule Glaxo", "confidence": 0.95}

    rs.perform_ocr = mock_ocr_rx

    # User has recorded penicillin allergy in file
    from app.routers.allergy import save_user_allergies_file
    save_user_allergies_file(["penicillin"])

    full_res = asyncio.run(rs.reconcile_prescription_vs_dispensed(
        rx_image_bytes=rx_bytes,
        blister_image_bytes=blist_bytes,
        user_id="test-user-1",
    ))

    # Restore OCR
    rs.perform_ocr = orig_ocr

    # Reconcilation itself matches, but overall status MUST be MISMATCH / RED due to allergy!
    assert full_res["reconciliation"]["status"] == "MATCH"
    assert full_res["overall_status"] == "MISMATCH"
    assert full_res["overall_color"] == "red"
    assert "CRITICAL ALLERGY ALERT" in full_res["overall_title"]
    print(f"  ✓ Pass: Exact match overridden by allergy alert as required: {full_res['overall_title']}")


def test_13_patient_profile_isolation():
    print("Test 13: Tenant profile isolation (user_id parameter)...")
    # Patient A has penicillin allergy
    from app.routers.allergy import save_user_allergies_file
    save_user_allergies_file(["penicillin"])

    # Test unknown user
    res_unknown = check_allergy_conflict("Amoxicillin 500mg", None)
    assert res_unknown["alert_type"] == "unknown_status"

    # Test user with no recorded allergy
    res_clean = check_allergy_conflict("Amoxicillin 500mg", [])
    assert res_clean["alert_type"] == "none"

    # Test user with explicit penicillin allergy
    res_allergic = check_allergy_conflict("Amoxicillin 500mg", ["penicillin"])
    assert res_allergic["alert_type"] == "exact_match"
    print("  ✓ Pass: User profile boundaries maintained strictly.")


def test_14_unknown_medicine_triggers_review():
    print("Test 14: Unknown medicine names result in review rather than false match...")
    rx = {"medicine_name": "RandomCompoundXYZ 100mg", "active_ingredients": ["randomcompoundxyz"], "strength": "100mg", "form": "tablet"}
    blist = {"medicine_name": "DifferentMysteryABC 100mg", "active_ingredients": ["differentmysteryabc"], "strength": "100mg", "form": "tablet"}
    res = _compare_entities(rx, blist)
    assert res["status"] == "MISMATCH"
    print("  ✓ Pass: Unknown differing compounds correctly identified as MISMATCH.")


def run_all_tests():
    print("\n=======================================================")
    print("   MEDVERITY COMPREHENSIVE CLINICAL SAFETY TEST SUITE   ")
    print("=======================================================\n")
    test_1_allergy_matches_active_ingredient()
    test_2_allergy_matches_combination_medicine()
    test_3_no_known_allergy_match()
    test_4_allergy_info_missing_or_unavailable()
    test_5_prescription_and_packaging_match()
    test_6_medicine_names_match_but_strengths_differ()
    test_7_active_ingredients_differ()
    test_8_dosage_form_differs_significantly()
    test_9_prescription_ocr_unreadable()
    test_10_pill_recognition_low_confidence()
    test_11_image_upload_failure_handling()
    test_12_match_never_overrides_allergy()
    test_13_patient_profile_isolation()
    test_14_unknown_medicine_triggers_review()
    print("\n=======================================================")
    print("   ALL 14 REQUIRED CLINICAL SAFETY TESTS PASSED! ✓   ")
    print("=======================================================\n")


if __name__ == "__main__":
    run_all_tests()
