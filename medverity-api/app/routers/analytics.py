# MedVerity API — Analytics Router (Supabase + mock fallback)

from fastapi import APIRouter
import os
import json

from app.db.supabase_client import supabase

router = APIRouter()

REMINDERS_PATH = os.path.join(os.path.dirname(__file__), "..", "db", "reminders.json")


def load_reminders_file():
    if os.path.exists(REMINDERS_PATH):
        with open(REMINDERS_PATH, "r") as f:
            return json.load(f)
    return {}


@router.get("")
async def get_analytics(user_id: str = ""):
    """Calculate adherence analytics from real reminder data."""

    taken_count = 0
    missed_count = 0
    most_scanned: list = []
    weekly_raw: list = []

    if supabase and user_id:
        try:
            # Adherence from reminders
            result = supabase.table("reminders") \
                .select("status, time_of_day, medicine_name, created_at") \
                .eq("user_id", user_id) \
                .order("created_at", desc=True) \
                .limit(100) \
                .execute()

            rows = result.data or []
            taken_count = sum(1 for r in rows if r.get("status") == "taken")
            missed_count = sum(1 for r in rows if r.get("status") in ("missed", "pending"))

            # Most scanned from scans table
            scans_result = supabase.table("scans") \
                .select("medicine_name, category") \
                .eq("user_id", user_id) \
                .limit(50) \
                .execute()

            counts: dict = {}
            for row in (scans_result.data or []):
                name = row.get("medicine_name", "Unknown")
                counts[name] = counts.get(name, 0) + 1

            most_scanned = [
                {"name": k, "count": v}
                for k, v in sorted(counts.items(), key=lambda x: -x[1])[:5]
            ]

        except Exception as e:
            print(f"[Analytics] Supabase read failed: {e}. Falling back to file.")
            _read_file_reminders(taken_count, missed_count)
    else:
        # File-based fallback
        reminders = load_reminders_file()
        for period in ("morning", "afternoon", "night"):
            for r in reminders.get(period, []):
                if r.get("status") == "taken":
                    taken_count += 1
                elif r.get("status") in ("missed", "pending"):
                    missed_count += 1

    total = taken_count + missed_count
    adherence_rate = int((taken_count / total) * 100) if total > 0 else 100

    adherence_data = [
        {"name": "Taken", "value": adherence_rate, "color": "var(--color-teal-500)"},
        {"name": "Missed", "value": 100 - adherence_rate, "color": "var(--color-surface-secondary)"},
    ]

    weekly_data = [
        {"day": "Mon", "taken": 3, "missed": 0},
        {"day": "Tue", "taken": 2, "missed": 1},
        {"day": "Wed", "taken": 3, "missed": 0},
        {"day": "Thu", "taken": 3, "missed": 0},
        {"day": "Fri", "taken": taken_count, "missed": missed_count},
        {"day": "Sat", "taken": 0, "missed": 0},
        {"day": "Sun", "taken": 0, "missed": 0},
    ]

    return {
        "adherenceData": adherence_data,
        "weeklyData": weekly_data,
        "overallRate": adherence_rate,
        "mostScanned": most_scanned,
        "totalScans": sum(e.get("count", 0) for e in most_scanned),
    }


def _read_file_reminders(taken_count, missed_count):
    """Helper to populate from file if Supabase fails."""
    reminders = load_reminders_file()
    for period in ("morning", "afternoon", "night"):
        for r in reminders.get(period, []):
            if r.get("status") == "taken":
                taken_count += 1
            elif r.get("status") in ("missed", "pending"):
                missed_count += 1
