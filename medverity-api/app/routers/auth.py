# MedVerity API — Auth Router (Supabase Auth + Profile Storage)

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from typing import Optional, Dict
import json
import os
from app.db.supabase_client import supabase

router = APIRouter()

USERS_PATH = os.path.join(os.path.dirname(__file__), "..", "db", "users.json")


def load_users() -> Dict[str, dict]:
    if os.path.exists(USERS_PATH):
        try:
            with open(USERS_PATH, "r") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}


def save_users(data: dict):
    os.makedirs(os.path.dirname(USERS_PATH), exist_ok=True)
    with open(USERS_PATH, "w") as f:
        json.dump(data, f, indent=2)


class SignupRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    phone: Optional[str] = None
    preferred_language: str = "en"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ProfileUpdateRequest(BaseModel):
    user_id: str
    name: Optional[str] = None
    phone: Optional[str] = None
    preferred_language: Optional[str] = None
    role: Optional[str] = None


class AuthResponse(BaseModel):
    message: str
    user_id: str | None = None
    token: str | None = None
    name: str | None = None
    email: str | None = None
    phone: str | None = None
    preferred_language: str | None = None


@router.post("/signup", response_model=AuthResponse)
async def signup(request: SignupRequest):
    """Register a new user via Supabase Auth (or local store)."""
    # 1. Update local users store
    users = load_users()
    user_id = f"user-{len(users) + 1}"
    user_record = {
        "id": user_id,
        "name": request.name,
        "email": request.email,
        "phone": request.phone or "",
        "preferred_language": request.preferred_language,
        "role": "patient",
    }
    users[request.email] = user_record
    save_users(users)

    if supabase:
        try:
            result = supabase.auth.sign_up({
                "email": request.email,
                "password": request.password,
                "options": {
                    "data": {
                        "name": request.name,
                        "phone": request.phone or "",
                        "preferred_language": request.preferred_language,
                    }
                },
            })
            if result.user:
                user_id = str(result.user.id)
                user_record["id"] = user_id
                users[request.email] = user_record
                save_users(users)
                return AuthResponse(
                    message="User created successfully.",
                    user_id=user_id,
                    token=result.session.access_token if result.session else None,
                    name=request.name,
                    email=request.email,
                    phone=request.phone,
                    preferred_language=request.preferred_language,
                )
        except Exception as e:
            print(f"[Auth] Supabase sign up skipped/failed: {e}. Using local store.")

    return AuthResponse(
        message="User registered successfully.",
        user_id=user_id,
        token=f"token-{user_id}",
        name=request.name,
        email=request.email,
        phone=request.phone,
        preferred_language=request.preferred_language,
    )


@router.post("/login", response_model=AuthResponse)
async def login(request: LoginRequest):
    """Authenticate existing user via Supabase Auth or local store."""
    users = load_users()
    local_user = users.get(request.email)

    if supabase:
        try:
            result = supabase.auth.sign_in_with_password({
                "email": request.email,
                "password": request.password,
            })
            if result.user and result.session:
                user_meta = result.user.user_metadata or {}
                return AuthResponse(
                    message="Login successful",
                    user_id=str(result.user.id),
                    token=result.session.access_token,
                    name=user_meta.get("name", local_user.get("name", "") if local_user else ""),
                    email=result.user.email,
                    phone=user_meta.get("phone", local_user.get("phone", "") if local_user else ""),
                    preferred_language=user_meta.get("preferred_language", "en"),
                )
            else:
                raise HTTPException(status_code=401, detail="Invalid email or password.")
        except HTTPException:
            raise
        except Exception as e:
            err_str = str(e).lower()
            if "invalid" in err_str or "credential" in err_str or "password" in err_str:
                raise HTTPException(status_code=401, detail="Invalid email or password.")
            print(f"[Auth] Supabase login error: {e}. Falling back to local store check.")

    if local_user:
        # Check password if local user has password record
        stored_pw = local_user.get("password")
        if stored_pw and stored_pw != request.password:
            raise HTTPException(status_code=401, detail="Invalid email or password.")
        return AuthResponse(
            message="Login successful",
            user_id=local_user.get("id"),
            token=f"token-{local_user.get('id')}",
            name=local_user.get("name"),
            email=local_user.get("email"),
            phone=local_user.get("phone"),
            preferred_language=local_user.get("preferred_language", "en"),
        )

    # Reject non-existing users with invalid credentials
    raise HTTPException(status_code=401, detail="Invalid email or password.")


@router.put("/profile")
async def update_profile(payload: ProfileUpdateRequest):
    """Dynamically update user profile (name, phone number, language, role)."""
    users = load_users()

    # Find existing user record by ID or create new
    matched_key = None
    for key, val in users.items():
        if val.get("id") == payload.user_id:
            matched_key = key
            break

    if not matched_key:
        matched_key = payload.user_id
        users[matched_key] = {"id": payload.user_id}

    user_data = users[matched_key]
    if payload.name is not None:
        user_data["name"] = payload.name
    if payload.phone is not None:
        user_data["phone"] = payload.phone
    if payload.preferred_language is not None:
        user_data["preferred_language"] = payload.preferred_language
    if payload.role is not None:
        user_data["role"] = payload.role

    save_users(users)
    print(f"[Auth] Updated profile for user {payload.user_id}: phone={payload.phone}")

    # Try updating Supabase users table as well
    if supabase:
        try:
            supabase.table("users").upsert({
                "id": payload.user_id,
                "name": user_data.get("name", ""),
                "phone": user_data.get("phone", ""),
                "preferred_language": user_data.get("preferred_language", "en"),
                "role": user_data.get("role", "patient"),
            }).execute()
        except Exception as e:
            print(f"[Auth] Supabase table update note: {e}")

    return {
        "success": True,
        "message": "Profile updated successfully",
        "user": user_data,
    }


@router.get("/profile/{user_id}")
async def get_profile(user_id: str):
    """Retrieve user profile by user_id."""
    users = load_users()
    for val in users.values():
        if val.get("id") == user_id:
            return {"user": val}

    if supabase:
        try:
            res = supabase.table("users").select("*").eq("id", user_id).execute()
            if res.data:
                return {"user": res.data[0]}
        except Exception:
            pass

    return {"user": {"id": user_id, "name": "", "phone": "", "preferred_language": "en"}}


@router.post("/logout")
async def logout():
    """Sign out user."""
    if supabase:
        try:
            supabase.auth.sign_out()
        except Exception:
            pass
    return {"message": "Logged out successfully"}
