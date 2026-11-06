# MedVerity — Generic & Jan Aushadhi Cost Saver Service
# Phase 4: Active salt decomposition + price comparison engine

import json
import os
import re
from typing import Optional

GENERIC_DB_PATH = os.path.join(os.path.dirname(__file__), "..", "db", "generic_drugs.json")

_db_cache: dict = {}


def _load_db() -> dict:
    global _db_cache
    if not _db_cache:
        if os.path.exists(GENERIC_DB_PATH):
            try:
                with open(GENERIC_DB_PATH, "r", encoding="utf-8") as f:
                    _db_cache = json.load(f)
            except Exception:
                _db_cache = {}
    return _db_cache


def _normalize(name: str) -> str:
    """Normalize medicine name for fuzzy matching."""
    return re.sub(r"[^a-z0-9 ]", "", name.lower().strip())


def find_generic_alternatives(medicine_name: str) -> Optional[dict]:
    """
    Main entry point.
    1. Tries exact match in the database (case-insensitive).
    2. Falls back to partial / fuzzy match on brand name or salt names.
    Returns the best match dict or None if not found.
    """
    db = _load_db()
    if not medicine_name:
        return None

    query = _normalize(medicine_name)

    # 1. Exact normalized match
    for key, entry in db.items():
        if _normalize(key) == query:
            return _build_result(entry)

    # 2. Partial match — medicine name contains key or key contains query
    for key, entry in db.items():
        norm_key = _normalize(key)
        if query in norm_key or norm_key in query:
            return _build_result(entry)

    # 3. Fuzzy salt-level match — check if any active salt appears in the query
    for key, entry in db.items():
        for salt in entry.get("active_salts", []):
            if _normalize(salt.split(" ")[0]) in query:  # match generic name portion
                return _build_result(entry)

    return None


def _build_result(entry: dict) -> dict:
    """
    Build the structured cost comparison response from a DB entry.
    """
    generics = entry.get("generic_equivalents", [])
    brand_price = entry.get("brand_price_per_strip", 0)
    active_salts = entry.get("active_salts", [])
    category = entry.get("category", "")
    therapeutic_class = entry.get("therapeutic_class", "")

    if not generics:
        return {
            "found": False,
            "brand_name": entry.get("brand_name", ""),
            "active_salts": active_salts,
            "category": category,
            "therapeutic_class": therapeutic_class,
            "message": "No generic equivalent found in our database. Ask your pharmacist for the generic salt equivalent.",
        }

    best_generic = min(generics, key=lambda g: g.get("jan_aushadhi_price", 9999))
    generic_price = best_generic.get("jan_aushadhi_price", 0)
    savings = brand_price - generic_price
    savings_pct = round((savings / brand_price) * 100) if brand_price > 0 else 0

    return {
        "found": True,
        "brand_name": entry.get("brand_name", ""),
        "brand_manufacturer": entry.get("manufacturer", ""),
        "brand_price_per_strip": brand_price,
        "active_salts": active_salts,
        "category": category,
        "therapeutic_class": therapeutic_class,
        "best_generic": {
            "name": best_generic.get("name", ""),
            "salts": best_generic.get("salts", active_salts),
            "jan_aushadhi_price": generic_price,
            "manufacturer": best_generic.get("manufacturer", "Jan Aushadhi"),
            "bioequivalence_certified": best_generic.get("bioequivalence_certified", True),
        },
        "all_generics": generics,
        "savings": {
            "amount_per_strip": savings,
            "percentage": savings_pct,
            "monthly_savings_estimate": savings * 3,  # assumes ~3 strips / month for chronic meds
            "annual_savings_estimate": savings * 36,
        },
        "disclaimer": (
            "Generic medicines contain the same active molecule(s) as the branded version and are "
            "required to meet identical bioequivalence standards by the Central Drugs Standard "
            "Control Organisation (CDSCO). Always consult your doctor or pharmacist before switching."
        ),
    }
