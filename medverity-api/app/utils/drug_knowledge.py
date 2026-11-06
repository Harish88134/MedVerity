"""
MedVerity Drug & Allergy Knowledge Base
Provides:
- Comprehensive medicine brand & generic catalog (salts, forms, strengths, categories)
- Active ingredient resolution (including combinations and brand resolution)
- Allergy class hierarchy and synonyms (e.g. penicillin, cephalosporins, sulfonamides, NSAIDs, macrolides, fluoroquinolones, opioids, statins)
- Ingredient normalization utilities
"""

import re
from typing import List, Dict, Optional, Tuple, Set

# Comprehensive verified drug database
# Maps canonical keys to detailed drug specs
DRUG_REFERENCE_DATABASE: Dict[str, dict] = {
    "augmentin": {
        "brand_name": "Augmentin",
        "generic_name": "Amoxicillin and Clavulanate Potassium",
        "active_ingredients": ["amoxicillin", "clavulanic acid", "clavulanate"],
        "drug_classes": ["penicillin", "beta-lactam antibiotic", "antibiotic"],
        "forms": ["tablet", "suspension", "syrup"],
        "strengths": ["625mg", "375mg", "1000mg", "1g", "250mg", "500mg"],
        "category": "Antibiotic",
    },
    "amoxicillin": {
        "brand_name": "Amoxil",
        "generic_name": "Amoxicillin",
        "active_ingredients": ["amoxicillin"],
        "drug_classes": ["penicillin", "beta-lactam antibiotic", "antibiotic"],
        "forms": ["capsule", "tablet", "syrup"],
        "strengths": ["250mg", "500mg", "125mg"],
        "category": "Antibiotic",
    },
    "penicillin": {
        "brand_name": "Penicillin V / G",
        "generic_name": "Penicillin",
        "active_ingredients": ["penicillin", "benzylpenicillin", "phenoxymethylpenicillin"],
        "drug_classes": ["penicillin", "beta-lactam antibiotic", "antibiotic"],
        "forms": ["tablet", "injection"],
        "strengths": ["250mg", "500mg"],
        "category": "Antibiotic",
    },
    "ampicillin": {
        "brand_name": "Omnipen",
        "generic_name": "Ampicillin",
        "active_ingredients": ["ampicillin"],
        "drug_classes": ["penicillin", "beta-lactam antibiotic", "antibiotic"],
        "forms": ["capsule", "injection"],
        "strengths": ["250mg", "500mg"],
        "category": "Antibiotic",
    },
    "cephalexin": {
        "brand_name": "Keflex",
        "generic_name": "Cephalexin",
        "active_ingredients": ["cephalexin"],
        "drug_classes": ["cephalosporin", "beta-lactam antibiotic", "antibiotic"],
        "forms": ["capsule", "tablet"],
        "strengths": ["250mg", "500mg"],
        "category": "Antibiotic",
    },
    "cefixime": {
        "brand_name": "Zifi",
        "generic_name": "Cefixime",
        "active_ingredients": ["cefixime"],
        "drug_classes": ["cephalosporin", "beta-lactam antibiotic", "antibiotic"],
        "forms": ["tablet", "syrup"],
        "strengths": ["100mg", "200mg"],
        "category": "Antibiotic",
    },
    "paracetamol": {
        "brand_name": "Dolo / Crocin / Calpol / Tylenol",
        "generic_name": "Paracetamol",
        "active_ingredients": ["paracetamol", "acetaminophen"],
        "drug_classes": ["aniline analgesic", "antipyretic", "non-opioid analgesic"],
        "forms": ["tablet", "syrup", "infusion", "suppository"],
        "strengths": ["500mg", "650mg", "125mg", "250mg"],
        "category": "Analgesic / Antipyretic",
    },
    "dolo": {
        "brand_name": "Dolo 650",
        "generic_name": "Paracetamol",
        "active_ingredients": ["paracetamol", "acetaminophen"],
        "drug_classes": ["aniline analgesic", "antipyretic"],
        "forms": ["tablet"],
        "strengths": ["650mg"],
        "category": "Analgesic / Antipyretic",
    },
    "crocin": {
        "brand_name": "Crocin",
        "generic_name": "Paracetamol",
        "active_ingredients": ["paracetamol", "acetaminophen"],
        "drug_classes": ["aniline analgesic", "antipyretic"],
        "forms": ["tablet", "syrup"],
        "strengths": ["500mg", "650mg"],
        "category": "Analgesic / Antipyretic",
    },
    "calpol": {
        "brand_name": "Calpol",
        "generic_name": "Paracetamol",
        "active_ingredients": ["paracetamol", "acetaminophen"],
        "drug_classes": ["aniline analgesic", "antipyretic"],
        "forms": ["tablet", "suspension"],
        "strengths": ["250mg", "500mg", "650mg"],
        "category": "Analgesic / Antipyretic",
    },
    "ibuprofen": {
        "brand_name": "Brufen / Advil / Motrin",
        "generic_name": "Ibuprofen",
        "active_ingredients": ["ibuprofen"],
        "drug_classes": ["nsaid", "non-steroidal anti-inflammatory", "propionic acid derivative"],
        "forms": ["tablet", "capsule", "syrup"],
        "strengths": ["200mg", "400mg", "600mg"],
        "category": "NSAID Pain Reliever",
    },
    "combiflam": {
        "brand_name": "Combiflam",
        "generic_name": "Ibuprofen and Paracetamol",
        "active_ingredients": ["ibuprofen", "paracetamol"],
        "drug_classes": ["nsaid", "analgesic"],
        "forms": ["tablet"],
        "strengths": ["400mg+325mg", "400mg"],
        "category": "Combination NSAID / Analgesic",
    },
    "aspirin": {
        "brand_name": "Disprin / Ecosprin",
        "generic_name": "Aspirin",
        "active_ingredients": ["aspirin", "acetylsalicylic acid"],
        "drug_classes": ["nsaid", "salicylate", "antiplatelet"],
        "forms": ["tablet", "enteric coated tablet"],
        "strengths": ["75mg", "150mg", "325mg", "500mg"],
        "category": "NSAID / Antiplatelet",
    },
    "diclofenac": {
        "brand_name": "Voveran",
        "generic_name": "Diclofenac Sodium",
        "active_ingredients": ["diclofenac"],
        "drug_classes": ["nsaid", "acetic acid derivative"],
        "forms": ["tablet", "gel", "injection"],
        "strengths": ["50mg", "75mg", "100mg"],
        "category": "NSAID",
    },
    "pantoprazole": {
        "brand_name": "Pan 40 / Pantocid",
        "generic_name": "Pantoprazole",
        "active_ingredients": ["pantoprazole"],
        "drug_classes": ["proton pump inhibitor", "ppi", "antacid"],
        "forms": ["tablet", "injection"],
        "strengths": ["20mg", "40mg"],
        "category": "Antacid / PPI",
    },
    "pan": {
        "brand_name": "Pan 40",
        "generic_name": "Pantoprazole",
        "active_ingredients": ["pantoprazole"],
        "drug_classes": ["proton pump inhibitor", "ppi"],
        "forms": ["tablet"],
        "strengths": ["40mg"],
        "category": "Antacid / PPI",
    },
    "omeprazole": {
        "brand_name": "Omez / Prilosec",
        "generic_name": "Omeprazole",
        "active_ingredients": ["omeprazole"],
        "drug_classes": ["proton pump inhibitor", "ppi"],
        "forms": ["capsule", "tablet"],
        "strengths": ["20mg", "40mg"],
        "category": "Antacid / PPI",
    },
    "metformin": {
        "brand_name": "Glycomet / Glucophage",
        "generic_name": "Metformin Hydrochloride",
        "active_ingredients": ["metformin"],
        "drug_classes": ["biguanide", "antidiabetic"],
        "forms": ["tablet", "sr tablet", "extended release"],
        "strengths": ["500mg", "850mg", "1000mg"],
        "category": "Antidiabetic",
    },
    "glycomet": {
        "brand_name": "Glycomet 500 SR",
        "generic_name": "Metformin Hydrochloride",
        "active_ingredients": ["metformin"],
        "drug_classes": ["biguanide", "antidiabetic"],
        "forms": ["tablet", "sr tablet"],
        "strengths": ["500mg", "850mg", "1000mg"],
        "category": "Antidiabetic",
    },
    "metoprolol": {
        "brand_name": "Betaloc / Lopressor",
        "generic_name": "Metoprolol Succinate / Tartrate",
        "active_ingredients": ["metoprolol"],
        "drug_classes": ["beta blocker", "antihypertensive"],
        "forms": ["tablet", "er tablet"],
        "strengths": ["25mg", "50mg", "100mg"],
        "category": "Beta Blocker / Cardiovascular",
    },
    "atorvastatin": {
        "brand_name": "Atorva / Lipitor",
        "generic_name": "Atorvastatin Calcium",
        "active_ingredients": ["atorvastatin"],
        "drug_classes": ["statin", "hmg-coa reductase inhibitor", "lipid lowering"],
        "forms": ["tablet"],
        "strengths": ["10mg", "20mg", "40mg", "80mg"],
        "category": "Statin / Cholesterol",
    },
    "atorva": {
        "brand_name": "Atorva 20",
        "generic_name": "Atorvastatin Calcium",
        "active_ingredients": ["atorvastatin"],
        "drug_classes": ["statin", "lipid lowering"],
        "forms": ["tablet"],
        "strengths": ["10mg", "20mg", "40mg"],
        "category": "Statin / Cholesterol",
    },
    "telmisartan": {
        "brand_name": "Telma / Micardis",
        "generic_name": "Telmisartan",
        "active_ingredients": ["telmisartan"],
        "drug_classes": ["arb", "angiotensin receptor blocker", "antihypertensive"],
        "forms": ["tablet"],
        "strengths": ["20mg", "40mg", "80mg"],
        "category": "Blood Pressure (ARB)",
    },
    "telma": {
        "brand_name": "Telma 40",
        "generic_name": "Telmisartan",
        "active_ingredients": ["telmisartan"],
        "drug_classes": ["arb", "antihypertensive"],
        "forms": ["tablet"],
        "strengths": ["40mg", "80mg"],
        "category": "Blood Pressure (ARB)",
    },
    "cetirizine": {
        "brand_name": "Cetzine / Zyrtec",
        "generic_name": "Cetirizine Hydrochloride",
        "active_ingredients": ["cetirizine"],
        "drug_classes": ["antihistamine", "second-generation antihistamine"],
        "forms": ["tablet", "syrup"],
        "strengths": ["5mg", "10mg"],
        "category": "Antihistamine",
    },
    "cetzine": {
        "brand_name": "Cetzine 10",
        "generic_name": "Cetirizine Hydrochloride",
        "active_ingredients": ["cetirizine"],
        "drug_classes": ["antihistamine"],
        "forms": ["tablet"],
        "strengths": ["10mg"],
        "category": "Antihistamine",
    },
    "azithromycin": {
        "brand_name": "Azithral / Zithromax",
        "generic_name": "Azithromycin",
        "active_ingredients": ["azithromycin"],
        "drug_classes": ["macrolide", "macrolide antibiotic", "antibiotic"],
        "forms": ["tablet", "suspension"],
        "strengths": ["250mg", "500mg"],
        "category": "Macrolide Antibiotic",
    },
    "azithral": {
        "brand_name": "Azithral 500",
        "generic_name": "Azithromycin",
        "active_ingredients": ["azithromycin"],
        "drug_classes": ["macrolide", "macrolide antibiotic"],
        "forms": ["tablet"],
        "strengths": ["500mg"],
        "category": "Macrolide Antibiotic",
    },
    "doxycycline": {
        "brand_name": "Doxylab / Vibramycin",
        "generic_name": "Doxycycline Hyclate",
        "active_ingredients": ["doxycycline"],
        "drug_classes": ["tetracycline", "tetracycline antibiotic", "antibiotic"],
        "forms": ["capsule", "tablet"],
        "strengths": ["100mg"],
        "category": "Tetracycline Antibiotic",
    },
    "thyroxine": {
        "brand_name": "Thyronorm / Synthroid",
        "generic_name": "Thyroxine Sodium",
        "active_ingredients": ["thyroxine", "levothyroxine"],
        "drug_classes": ["thyroid hormone"],
        "forms": ["tablet"],
        "strengths": ["25mcg", "50mcg", "75mcg", "100mcg"],
        "category": "Thyroid Hormone",
    },
    "thyronorm": {
        "brand_name": "Thyronorm 50mcg",
        "generic_name": "Thyroxine Sodium",
        "active_ingredients": ["thyroxine", "levothyroxine"],
        "drug_classes": ["thyroid hormone"],
        "forms": ["tablet"],
        "strengths": ["25mcg", "50mcg", "75mcg", "100mcg"],
        "category": "Thyroid Hormone",
    },
    "ciprofloxacin": {
        "brand_name": "Ciplox / Cipro",
        "generic_name": "Ciprofloxacin",
        "active_ingredients": ["ciprofloxacin"],
        "drug_classes": ["fluoroquinolone", "quinolone antibiotic", "antibiotic"],
        "forms": ["tablet", "eye drop", "infusion"],
        "strengths": ["250mg", "500mg", "750mg"],
        "category": "Fluoroquinolone Antibiotic",
    },
    "cotrimoxazole": {
        "brand_name": "Bactrim / Septra",
        "generic_name": "Sulfamethoxazole and Trimethoprim",
        "active_ingredients": ["sulfamethoxazole", "trimethoprim"],
        "drug_classes": ["sulfonamide", "sulfa drug", "antibiotic"],
        "forms": ["tablet", "suspension"],
        "strengths": ["480mg", "960mg"],
        "category": "Sulfonamide Antibiotic",
    },
    "bactrim": {
        "brand_name": "Bactrim",
        "generic_name": "Sulfamethoxazole and Trimethoprim",
        "active_ingredients": ["sulfamethoxazole", "trimethoprim"],
        "drug_classes": ["sulfonamide", "sulfa drug", "antibiotic"],
        "forms": ["tablet"],
        "strengths": ["480mg", "960mg"],
        "category": "Sulfonamide Antibiotic",
    },
}

# Allergy Group & Synonym Mappings
# Maps recorded allergy strings/classes to related active ingredients and cross-reactive classes
ALLERGY_HIERARCHY: Dict[str, dict] = {
    "penicillin": {
        "synonyms": ["penicillin", "pencillin", "pencillain", "penicilin", "penicillins", "amoxicillin allergy"],
        "exact_ingredients": ["penicillin", "amoxicillin", "ampicillin", "piperacillin", "oxacillin", "cloxacillin", "benzylpenicillin", "phenoxymethylpenicillin"],
        "cross_reactive_classes": ["cephalosporin"],
        "cross_reactive_ingredients": ["cephalexin", "cefixime", "cefuroxime", "ceftriaxone", "cefaclor"],
        "description": "Beta-lactam penicillin class allergy. High risk of anaphylaxis or severe hypersensitivity.",
        "cross_advice": "Known cross-reactivity (3-5%) exists between penicillins and cephalosporins due to shared beta-lactam ring.",
    },
    "cephalosporin": {
        "synonyms": ["cephalosporin", "cephalosporins", "cefaclor", "cephalexin"],
        "exact_ingredients": ["cephalexin", "cefixime", "cefuroxime", "ceftriaxone", "cefaclor", "cefazolin"],
        "cross_reactive_classes": ["penicillin"],
        "cross_reactive_ingredients": ["amoxicillin", "ampicillin", "penicillin"],
        "description": "Cephalosporin antibiotic allergy.",
        "cross_advice": "Potential cross-reactivity with other beta-lactam antibiotics including penicillins.",
    },
    "nsaid": {
        "synonyms": ["nsaid", "nsaids", "aspirin", "painkillers", "ibuprofen", "diclofenac"],
        "exact_ingredients": ["ibuprofen", "aspirin", "acetylsalicylic acid", "diclofenac", "naproxen", "mefenamic acid", "etoricoxib", "celecoxib", "indomethacin"],
        "cross_reactive_classes": [],
        "cross_reactive_ingredients": [],
        "description": "Non-Steroidal Anti-Inflammatory Drug hypersensitivity (risk of bronchospasm, urticaria, or anaphylaxis).",
        "cross_advice": "Patients reactive to one NSAID frequently react across other COX-1 inhibiting NSAIDs.",
    },
    "sulfa": {
        "synonyms": ["sulfa", "sulfonamide", "sulfonamides", "sulpha", "bactrim allergy"],
        "exact_ingredients": ["sulfamethoxazole", "sulfasalazine", "sulfadiazine", "sulfisoxazole", "trimethoprim-sulfamethoxazole"],
        "cross_reactive_classes": [],
        "cross_reactive_ingredients": [],
        "description": "Sulfonamide antimicrobial allergy (risk of severe cutaneous reactions like Stevens-Johnson syndrome).",
        "cross_advice": "Avoid all sulfonamide-containing antimicrobial agents.",
    },
    "macrolide": {
        "synonyms": ["macrolide", "macrolides", "azithromycin allergy", "erythromycin allergy"],
        "exact_ingredients": ["azithromycin", "clarithromycin", "erythromycin", "roxithromycin"],
        "cross_reactive_classes": [],
        "cross_reactive_ingredients": [],
        "description": "Macrolide antibiotic hypersensitivity.",
        "cross_advice": "Cross-reactivity across other macrolides is highly common.",
    },
    "tetracycline": {
        "synonyms": ["tetracycline", "tetracyclines", "doxycycline allergy"],
        "exact_ingredients": ["doxycycline", "tetracycline", "minocycline"],
        "cross_reactive_classes": [],
        "cross_reactive_ingredients": [],
        "description": "Tetracycline class antibiotic hypersensitivity.",
        "cross_advice": "Avoid tetracycline derivatives.",
    },
    "fluoroquinolone": {
        "synonyms": ["fluoroquinolone", "quinolone", "ciprofloxacin allergy", "ofloxacin"],
        "exact_ingredients": ["ciprofloxacin", "levofloxacin", "ofloxacin", "moxifloxacin", "norfloxacin"],
        "cross_reactive_classes": [],
        "cross_reactive_ingredients": [],
        "description": "Fluoroquinolone antimicrobial hypersensitivity.",
        "cross_advice": "High cross-reactivity across all fluoroquinolone agents.",
    },
    "paracetamol": {
        "synonyms": ["paracetamol", "acetaminophen", "tylenol allergy"],
        "exact_ingredients": ["paracetamol", "acetaminophen"],
        "cross_reactive_classes": [],
        "cross_reactive_ingredients": [],
        "description": "Acetaminophen/Paracetamol hypersensitivity.",
        "cross_advice": "Check all multi-ingredient cold/fever medications for hidden paracetamol.",
    },
    "statin": {
        "synonyms": ["statin", "statins", "atorvastatin allergy"],
        "exact_ingredients": ["atorvastatin", "rosuvastatin", "simvastatin", "pravastatin"],
        "cross_reactive_classes": [],
        "cross_reactive_ingredients": [],
        "description": "HMG-CoA reductase inhibitor (statin) hypersensitivity or severe myopathy.",
        "cross_advice": "Consult prescriber before considering alternative lipid-lowering agents.",
    },
    "aspirin": {
        "synonyms": ["aspirin", "acetylsalicylic acid", "ecosprin allergy", "disprin allergy"],
        "exact_ingredients": ["aspirin", "acetylsalicylic acid"],
        "cross_reactive_classes": ["nsaid"],
        "cross_reactive_ingredients": ["ibuprofen", "diclofenac", "naproxen"],
        "description": "Aspirin/Salicylate allergy (including Aspirin-Exacerbated Respiratory Disease / AERD).",
        "cross_advice": "High risk of cross-reaction with other NSAIDs.",
    },
    "ibuprofen": {
        "synonyms": ["ibuprofen", "brufen allergy", "advil allergy"],
        "exact_ingredients": ["ibuprofen"],
        "cross_reactive_classes": ["nsaid"],
        "cross_reactive_ingredients": ["aspirin", "diclofenac", "naproxen"],
        "description": "Ibuprofen NSAID hypersensitivity.",
        "cross_advice": "Avoid other NSAIDs and combinations containing ibuprofen.",
    },
}


def normalize_text(text: str) -> str:
    """Strip punctuation, excessive whitespace, and lowercase text."""
    if not text:
        return ""
    t = text.lower().strip()
    # Normalize common typos
    t = re.sub(r"\bpencillain\b", "penicillin", t)
    t = re.sub(r"\bpencillin\b", "penicillin", t)
    t = re.sub(r"\bpenicilin\b", "penicillin", t)
    # Remove non-alphanumeric except spaces and +
    t = re.sub(r"[^\w\s\+]", " ", t)
    return re.sub(r"\s+", " ", t).strip()


def resolve_active_ingredients(medicine_name: str) -> List[str]:
    """
    Given a brand or generic medicine name (e.g., 'Augmentin 625 Duo', 'Combiflam', 'Dolo 650'),
    resolves the complete list of active chemical ingredients.
    """
    norm = normalize_text(medicine_name)
    if not norm:
        return []

    # Check reference database directly
    for key, spec in DRUG_REFERENCE_DATABASE.items():
        if key in norm or spec["brand_name"].lower() in norm or spec["generic_name"].lower() in norm:
            return list(spec["active_ingredients"])

    # Check for known active salt words directly in medicine name
    recognized: Set[str] = set()
    all_known_ingredients = set()
    for spec in DRUG_REFERENCE_DATABASE.values():
        all_known_ingredients.update(spec["active_ingredients"])

    for ing in all_known_ingredients:
        if ing in norm:
            recognized.add(ing)

    if recognized:
        return list(recognized)

    # Fallback to the stripped medicine stem
    clean_stem = re.sub(r"\b\d+(?:\.\d+)?\s*(mg|mcg|ml|g|iu|%)\b", "", norm).strip()
    clean_stem = re.sub(r"\b(tablet|tablets|tab|capsule|capsules|cap|syrup|oral|injection|sr|er)\b", "", clean_stem).strip()
    return [clean_stem] if clean_stem else [norm]


def check_allergy_conflict(medicine_name: str, patient_allergies: List[str]) -> dict:
    """
    Evaluates a medicine and its active ingredients against a list of patient allergies.
    Returns:
    - has_allergy: bool (True if confirmed or cross-allergy)
    - alert_type: 'exact_match' | 'cross_allergy' | 'none' | 'unknown_status'
    - severity: 'critical' | 'warning' | 'clear' | 'unknown'
    - matched_allergy: str
    - triggering_ingredient: str
    - title: str
    - reason: str
    - recommendation: str
    """
    if patient_allergies is None:
        return {
            "has_allergy": False,
            "alert_type": "unknown_status",
            "severity": "unknown",
            "matched_allergy": "",
            "triggering_ingredient": "",
            "title": "Allergy Status Unknown",
            "reason": "Patient allergy profile is missing or unavailable. Do not assume safe.",
            "recommendation": "Allergy status unknown — verify before dispensing.",
        }

    # Clean patient allergies
    cleaned_allergies = [normalize_text(a) for a in patient_allergies if a and str(a).strip()]

    if len(cleaned_allergies) == 0:
        return {
            "has_allergy": False,
            "alert_type": "none",
            "severity": "clear",
            "matched_allergy": "",
            "triggering_ingredient": "",
            "title": "No Recorded Allergy Conflict",
            "reason": "No match found with the allergies recorded in this profile.",
            "recommendation": "No match found with the allergies recorded in this profile. (Always confirm patient has no unrecorded allergies).",
        }

    ingredients = resolve_active_ingredients(medicine_name)
    med_norm = normalize_text(medicine_name)

    # 1. Exact Ingredient / Synonym Match
    for raw_allergy in cleaned_allergies:
        for group_name, group_data in ALLERGY_HIERARCHY.items():
            # Check if patient's allergy matches this group or synonym
            allergy_in_group = (
                raw_allergy == group_name or
                any(syn in raw_allergy or raw_allergy in syn for syn in group_data["synonyms"]) or
                any(exact in raw_allergy or raw_allergy in exact for exact in group_data["exact_ingredients"])
            )

            if allergy_in_group:
                # Check if ANY ingredient in the medicine matches this allergy group's exact ingredients
                for ing in ingredients:
                    if ing in group_data["exact_ingredients"] or any(exact in ing for exact in group_data["exact_ingredients"]):
                        return {
                            "has_allergy": True,
                            "alert_type": "exact_match",
                            "severity": "critical",
                            "matched_allergy": raw_allergy.capitalize(),
                            "triggering_ingredient": ing.capitalize(),
                            "title": f"🚨 CRITICAL ALLERGY ALERT: {raw_allergy.capitalize()}",
                            "reason": (
                                f"Prescribed medicine '{medicine_name}' contains active ingredient '{ing.capitalize()}', "
                                f"which matches patient's recorded allergy to '{raw_allergy.capitalize()}'. "
                                f"{group_data['description']}"
                            ),
                            "recommendation": "PAUSE DISPENSING IMMEDIATELY. Seek urgent verification from a qualified pharmacist or prescriber.",
                        }
                # Check direct name match
                if any(exact in med_norm for exact in group_data["exact_ingredients"]):
                    matched_ing = [ex for ex in group_data["exact_ingredients"] if ex in med_norm][0]
                    return {
                        "has_allergy": True,
                        "alert_type": "exact_match",
                        "severity": "critical",
                        "matched_allergy": raw_allergy.capitalize(),
                        "triggering_ingredient": matched_ing.capitalize(),
                        "title": f"🚨 CRITICAL ALLERGY ALERT: {raw_allergy.capitalize()}",
                        "reason": (
                            f"Prescribed medicine '{medicine_name}' contains or relates to '{matched_ing.capitalize()}', "
                            f"matching patient's recorded allergy to '{raw_allergy.capitalize()}'."
                        ),
                        "recommendation": "PAUSE DISPENSING IMMEDIATELY. Seek urgent verification from a qualified pharmacist or prescriber.",
                    }

        # Direct token overlap check (for allergies not in predefined hierarchy)
        for ing in ingredients:
            if raw_allergy in ing or ing in raw_allergy or raw_allergy in med_norm:
                return {
                    "has_allergy": True,
                    "alert_type": "exact_match",
                    "severity": "critical",
                    "matched_allergy": raw_allergy.capitalize(),
                    "triggering_ingredient": ing.capitalize(),
                    "title": f"🚨 CRITICAL ALLERGY ALERT: {raw_allergy.capitalize()}",
                    "reason": f"Medicine '{medicine_name}' matches patient's recorded allergy to '{raw_allergy.capitalize()}'.",
                    "recommendation": "PAUSE DISPENSING IMMEDIATELY. Seek verification from prescriber.",
                }

    # 2. Cross-Allergy / Precautionary Check
    for raw_allergy in cleaned_allergies:
        for group_name, group_data in ALLERGY_HIERARCHY.items():
            allergy_in_group = (
                raw_allergy == group_name or
                any(syn in raw_allergy or raw_allergy in syn for syn in group_data["synonyms"])
            )
            if allergy_in_group and group_data["cross_reactive_ingredients"]:
                for ing in ingredients:
                    if ing in group_data["cross_reactive_ingredients"]:
                        return {
                            "has_allergy": True,
                            "alert_type": "cross_allergy",
                            "severity": "warning",
                            "matched_allergy": raw_allergy.capitalize(),
                            "triggering_ingredient": ing.capitalize(),
                            "title": f"⚠️ POTENTIAL CROSS-ALLERGY: {raw_allergy.capitalize()}",
                            "reason": (
                                f"Patient has recorded allergy to '{raw_allergy.capitalize()}'. "
                                f"Prescribed '{medicine_name}' contains '{ing.capitalize()}'. "
                                f"{group_data.get('cross_advice', 'Cross-reactivity warning.')}"
                            ),
                            "recommendation": "Precautionary warning: Requires professional verification by pharmacist or prescriber before dispensing.",
                        }

    # 3. No match found
    return {
        "has_allergy": False,
        "alert_type": "none",
        "severity": "clear",
        "matched_allergy": "",
        "triggering_ingredient": "",
        "title": "No Recorded Allergy Conflict",
        "reason": "No match found with the allergies recorded in this profile.",
        "recommendation": "No match found with the allergies recorded in this profile. Confirm patient has no other unrecorded drug allergies.",
    }
