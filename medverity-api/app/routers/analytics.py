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

    # Calculate dynamic weekly distribution from real reminders data
    days_order = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    dynamic_weekly = {d: {"taken": 0, "missed": 0} for d in days_order}

    # Populate daily taken/missed based on reminders
    if supabase and user_id:
        try:
            for r in (rows or []):
                created_str = r.get("created_at")
                if created_str:
                    try:
                        from datetime import datetime
                        dt = datetime.fromisoformat(created_str.replace("Z", "+00:00"))
                        day_name = dt.strftime("%a")
                        if day_name in dynamic_weekly:
                            if r.get("status") == "taken":
                                dynamic_weekly[day_name]["taken"] += 1
                            else:
                                dynamic_weekly[day_name]["missed"] += 1
                    except Exception:
                        pass
        except Exception:
            pass

    # If all 0 (e.g. brand new user without history), provide meaningful real proportion based on current taken/missed
    has_activity = any(v["taken"] > 0 or v["missed"] > 0 for v in dynamic_weekly.values())
    if not has_activity and (taken_count > 0 or missed_count > 0):
        from datetime import datetime
        current_day = datetime.now().strftime("%a")
        if current_day in dynamic_weekly:
            dynamic_weekly[current_day]["taken"] = taken_count
            dynamic_weekly[current_day]["missed"] = missed_count

    weekly_data = [
        {"day": d, "taken": dynamic_weekly[d]["taken"], "missed": dynamic_weekly[d]["missed"]}
        for d in days_order
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
