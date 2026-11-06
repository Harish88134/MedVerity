"""
MedVerity API — Supabase Client
Initializes and exposes a shared Supabase client for all routers/services.
"""
from supabase import create_client, Client
from app.config import settings

supabase: Client | None = None

if settings.SUPABASE_URL and settings.SUPABASE_KEY:
    try:
        supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        print("[Supabase] Client initialized successfully.")
    except Exception as e:
        print(f"[Supabase] Failed to initialize client: {e}")
else:
    print("[Supabase] No credentials found — running without Supabase.")

# Keep backward-compat alias
supabase_client = supabase
