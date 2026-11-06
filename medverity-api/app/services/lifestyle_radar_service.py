# MedVerity API — Food, Sunlight & Lifestyle Conflict Radar + Chronotherapy Service
from __future__ import annotations
import json
import os
import re
from typing import Any, Dict, List, Optional

RULES_FILE_PATH = os.path.join(os.path.dirname(__file__), "..", "db", "lifestyle_rules.json")


def _load_rules() -> Dict[str, Any]:
    if os.path.exists(RULES_FILE_PATH):
        try:
            with open(RULES_FILE_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
                return data.get("drug_rules", {})
        except Exception as e:
            print(f"[Lifestyle Service] Failed to load rules file: {e}")
    return {}


def _match_drug_key(medicine_name: str, active_salts: Optional[List[str]] = None) -> Optional[str]:
    """Matches a medicine name or active ingredients against known rules."""
    rules = _load_rules()
    query = (medicine_name or "").lower()
    if active_salts:
        query += " " + " ".join(s.lower() for s in active_salts)

    # 1. Direct key match
    for key in rules.keys():
        if key in query:
            return key

    # 2. Generic names or Brand names match
    for key, data in rules.items():
        generics = [g.lower() for g in data.get("generic_names", [])]
        brands = [b.lower() for b in data.get("brand_names", [])]
        for name in generics + brands:
            if re.search(rf"\b{re.escape(name)}\b", query):
                return key

    # 3. Drug Class Suffixes
    suffix_map = {
        "prazole": "pantoprazole",
        "statin": "atorvastatin",
        "cycline": "doxycycline",
        "sartan": "telmisartan",
        "tizine": "cetirizine",
        "adine": "cetirizine",
        "formin": "metformin",
        "ferrous": "iron",
        "iron": "iron",
        "amox": "amoxicillin",
        "cillin": "amoxicillin",
        "profen": "paracetamol",
        "thyrox": "levothyroxine",
    }
    for suffix, mapped_key in suffix_map.items():
        if suffix in query and mapped_key in rules:
            return mapped_key

    return None


def get_lifestyle_radar(
    medicine_name: str,
    active_salts: Optional[List[str]] = None,
    language: str = "en",
) -> Dict[str, Any]:
    """
    Computes food conflicts, sunlight photosensitivity, beverage warnings,
    and circadian chronotherapy timing for any prescription or OTC drug.
    """
    lang = language.lower() if language else "en"
    if lang not in ["en", "te", "hi", "ta"]:
        lang = "en"

    rules = _load_rules()
    matched_key = _match_drug_key(medicine_name, active_salts)

    if matched_key and matched_key in rules:
        entry = rules[matched_key]
        
        # Localize Food Rule
        food_rule_raw = entry.get("food_rule", {})
        food_rule = {
            "type": food_rule_raw.get("type", "flexible"),
            "title": food_rule_raw.get("title", {}).get(lang) or food_rule_raw.get("title", {}).get("en", "With Food"),
            "description": food_rule_raw.get("description", {}).get(lang) or food_rule_raw.get("description", {}).get("en", ""),
        }

        # Localize Conflicts
        conflicts = []
        for c in entry.get("conflicts", []):
            conflicts.append({
                "id": c.get("id"),
                "category": c.get("category"),
                "severity": c.get("severity", "warning"),
                "icon": c.get("icon", "⚠️"),
                "title": c.get("title", {}).get(lang) or c.get("title", {}).get("en", "Conflict Alert"),
                "description": c.get("description", {}).get(lang) or c.get("description", {}).get("en", ""),
                "action_advice": c.get("action_advice", {}).get(lang) or c.get("action_advice", {}).get("en", "Consult pharmacist"),
                "time_separation": c.get("time_separation", "Check with Doctor"),
            })

        # Localize Chronotherapy
        chrono_raw = entry.get("chronotherapy", {})
        chronotherapy = {
            "recommended_slot": chrono_raw.get("recommended_slot", "morning_with_food"),
            "recommended_time": chrono_raw.get("recommended_time", "Morning with breakfast"),
            "clock_icon": chrono_raw.get("clock_icon", "⏰"),
            "efficacy_boost": chrono_raw.get("efficacy_boost", {}).get(lang) or chrono_raw.get("efficacy_boost", {}).get("en", "Optimal Clinical Absorption"),
            "scientific_rationale": chrono_raw.get("scientific_rationale", {}).get(lang) or chrono_raw.get("scientific_rationale", {}).get("en", "Follow prescribed regimen."),
        }

        return {
            "medicine_name": medicine_name,
            "matched_drug": matched_key,
            "language": lang,
            "food_rule": food_rule,
            "conflicts": conflicts,
            "chronotherapy": chronotherapy,
            "has_specific_data": True,
        }

    # Safe Generic Clinical Fallback
    fallback_titles = {
        "en": "General Safe Administration",
        "te": "సాధారణ సురక్షిత వినియోగం",
        "hi": "सामान्य सुरक्षित उपयोग",
        "ta": "பொதுவான பாதுகாப்பான பயன்பாடு",
    }
    fallback_desc = {
        "en": f"Take {medicine_name} with a full glass of water. Maintain consistent daily timing.",
        "te": f"{medicine_name} ను నిండు గ్లాసు నీటితో క్రమం తప్పకుండా ప్రతిరోజూ ఒకే సమయానికి తీసుకోండి.",
        "hi": f"{medicine_name} को पूरे गिलास पानी के साथ रोजाना एक ही समय पर लें।",
        "ta": f"{medicine_name} மருந்தை முழு டம்ளர் தண்ணீருடன் தினமும் ஒரே நேரத்தில் உட்கொள்ளவும்.",
    }
    fallback_alcohol_title = {
        "en": "General Alcohol Caution",
        "te": "ఆల్కహాల్ జాగ్రత్త",
        "hi": "शराब से सावधानी",
        "ta": "மது அருந்துதல் எச்சரிக்கை",
    }
    fallback_alcohol_desc = {
        "en": "Alcohol may alter hepatic metabolism or cause drowsiness when combined with medications.",
        "te": "మందులతో ఆల్కహాల్ కలపడం వల్ల కాలేయంపై ప్రభావం పడవచ్చు లేదా మత్తు రావచ్చు.",
        "hi": "दवाओं के साथ शराब पीने से लीवर पर असर या अत्यधिक सुस्ती हो सकती है।",
        "ta": "மருந்துகளுடன் மது அருந்துவது கல்லீரலை பாதிக்கலாம் அல்லது தூக்கத்தை ஏற்படுத்தலாம்.",
    }
    fallback_boost = {
        "en": "Consistent Daily Timing Boost",
        "te": "నిర్దిష్ట సమయ నియమం",
        "hi": "नियमित समय पर लेने का लाभ",
        "ta": "சீரான நேர பயன்பாட்டு நன்மை",
    }
    fallback_rationale = {
        "en": "Taking your daily dose at the exact same hour maintains constant therapeutic drug levels in your blood stream.",
        "te": "ప్రతిరోజూ ఒకే సమయానికి వేసుకోవడం వల్ల రక్తంలో మందు ప్రభావం సమానంగా ఉంటుంది.",
        "hi": "रोजाना एक निश्चित समय पर लेने से दवा का प्रभाव पूरे दिन बना रहता है।",
        "ta": "தினமும் ஒரே நேரத்தில் எடுப்பது உடலில் மருந்தின் அளவை சீராக வைத்திருக்கும்.",
    }

    return {
        "medicine_name": medicine_name,
        "matched_drug": "general",
        "language": lang,
        "food_rule": {
            "type": "flexible",
            "title": fallback_titles.get(lang, fallback_titles["en"]),
            "description": fallback_desc.get(lang, fallback_desc["en"]),
        },
        "conflicts": [
            {
                "id": "alcohol_general",
                "category": "alcohol",
                "severity": "advisory",
                "icon": "🍷",
                "title": fallback_alcohol_title.get(lang, fallback_alcohol_title["en"]),
                "description": fallback_alcohol_desc.get(lang, fallback_alcohol_desc["en"]),
                "action_advice": "Limit or avoid alcohol during treatment.",
                "time_separation": "Advisory",
            }
        ],
        "chronotherapy": {
            "recommended_slot": "morning_with_food",
            "recommended_time": "Morning (9:00 AM)",
            "clock_icon": "⏰",
            "efficacy_boost": fallback_boost.get(lang, fallback_boost["en"]),
            "scientific_rationale": fallback_rationale.get(lang, fallback_rationale["en"]),
        },
        "has_specific_data": False,
    }
