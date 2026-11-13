// ── MedVerity Auth Client ──
// Uses FastAPI backend directly for fast, reliable, production authentication.
// Falls back gracefully to browser store if offline.

import { User } from '@/types';

const STORAGE_KEY = 'medverity_auth';
const USERS_KEY = 'medverity_users';
const LANGUAGE_KEY = 'medverity_language';

interface AuthState {
  user: User | null;
  token: string | null;
}

function getAuthState(): AuthState {
  if (typeof window === 'undefined') return { user: null, token: null };
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : { user: null, token: null };
  } catch {
    return { user: null, token: null };
  }
}

function setAuthState(state: AuthState): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getUsers(): Record<string, { user: User; password?: string; password_hash?: string }> {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(USERS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveUsers(users: Record<string, { user: User; password?: string; password_hash?: string }>): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ─────────────────────────────────────────────────────────────
// Unified auth export
// ─────────────────────────────────────────────────────────────
export const supabase = {
  auth: {
    async signUp(data: { name: string; email: string; password: string; preferred_language?: string; phone?: string }) {
      const normEmail = data.email.toLowerCase().trim();

      // 1. Direct FastAPI Backend Register
      try {
        const apiRes = await fetch(`${API_BASE}/auth/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: data.name.trim(),
            email: normEmail,
            password: data.password,
            phone: data.phone || '',
            preferred_language: data.preferred_language || 'en',
          }),
        });

        if (apiRes.ok) {
          const apiData = await apiRes.json();
          const user: User = {
            id: apiData.user_id || crypto.randomUUID(),
            name: apiData.name || data.name,
            email: normEmail,
            phone: apiData.phone || data.phone || '',
            preferred_language: apiData.preferred_language || data.preferred_language || 'en',
            role: 'patient',
            created_at: new Date().toISOString(),
          };
          const token = apiData.token || `token-${user.id}`;
          setAuthState({ user, token });

          const users = getUsers();
          users[normEmail] = { user, password: data.password };
          saveUsers(users);

          return { data: { user }, error: null };
        } else {
          const errData = await apiRes.json().catch(() => ({}));
          return { error: { message: errData.detail || 'Failed to sign up.' } };
        }
      } catch (networkErr) {
        console.warn('[Auth] Backend API offline during signup, using local device store:', networkErr);
      }

      // 2. Offline fallback
      const users = getUsers();
      if (users[normEmail]) {
        return { error: { message: 'An account with this email already exists.' } };
      }
      const user: User = {
        id: crypto.randomUUID(),
        name: data.name,
        email: normEmail,
        phone: data.phone || '',
        preferred_language: data.preferred_language || 'en',
        role: 'patient',
        created_at: new Date().toISOString(),
      };
      users[normEmail] = { user, password: data.password };
      saveUsers(users);
      const token = `token-${user.id}`;
      setAuthState({ user, token });
      return { data: { user }, error: null };
    },

    async signIn(data: { email: string; password: string }) {
      if (!data.email || !data.password) {
        return { error: { message: 'Please enter both email and password.' } };
      }

      const normEmail = data.email.toLowerCase().trim();

      // 1. Direct FastAPI Backend Authentication
      try {
        const apiRes = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: normEmail,
            password: data.password,
          }),
        });

        if (apiRes.ok) {
          const apiData = await apiRes.json();
          const user: User = {
            id: apiData.user_id || crypto.randomUUID(),
            name: apiData.name || '',
            email: apiData.email || normEmail,
            phone: apiData.phone || '',
            preferred_language: apiData.preferred_language || 'en',
            role: 'patient',
            created_at: new Date().toISOString(),
          };
          const token = apiData.token || `token-${user.id}`;
          setAuthState({ user, token });

          // Sync credentials locally for fast access
          const users = getUsers();
          users[normEmail] = { user, password: data.password };
          saveUsers(users);

          return { data: { user }, error: null };
        } else {
          const errData = await apiRes.json().catch(() => ({}));
          return { error: { message: errData.detail || 'Invalid email or password.' } };
        }
      } catch (networkErr) {
        console.warn('[Auth] Backend unreachable, checking offline local store:', networkErr);
      }

      // 2. Strict Offline Device Verification (Only if backend is unreachable)
      const users = getUsers();
      const record = users[normEmail];
      if (!record || (record.password && record.password !== data.password)) {
        return { error: { message: 'Invalid email or password.' } };
      }

      const token = `token-${record.user.id}`;
      setAuthState({ user: record.user, token });
      return { data: { user: record.user }, error: null };
    },

    async signOut() {
      setAuthState({ user: null, token: null });
      return { error: null };
    },

    async getUser() {
      const state = getAuthState();
      return {
        data: { user: state.user },
        error: state.user ? null : { message: 'Not authenticated' },
      };
    },

    async updateUser(updates: Partial<User>) {
      const state = getAuthState();
      if (!state.user) return { error: { message: 'Not authenticated' } };
      const updatedUser = { ...state.user, ...updates };
      setAuthState({ ...state, user: updatedUser });

      const normEmail = (state.user.email || '').toLowerCase().trim();
      const users = getUsers();
      if (users[normEmail]) {
        users[normEmail].user = updatedUser;
        saveUsers(users);
      }

      // Sync with FastAPI backend
      try {
        await fetch(`${API_BASE}/auth/profile`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: updatedUser.id,
            name: updatedUser.name,
            phone: updatedUser.phone,
            preferred_language: updatedUser.preferred_language,
            role: updatedUser.role,
          }),
        });
      } catch {}

      return { data: { user: updatedUser }, error: null };
    },

    async forgotPassword(email: string) {
      try {
        const res = await fetch(`${API_BASE}/auth/forgot-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.toLowerCase().trim() }),
        });
        const data = await res.json();
        if (!res.ok) {
          return { error: { message: data.detail || 'Failed to find account.' } };
        }
        return { data, error: null };
      } catch (err: any) {
        return { error: { message: err.message || 'Network error.' } };
      }
    },

    async verifySecurityAnswer(payload: { email: string; security_answer: string; registered_phone?: string }) {
      try {
        const res = await fetch(`${API_BASE}/auth/verify-security-answer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) {
          return { error: { message: data.detail || 'Security verification failed.' } };
        }
        return { data, error: null };
      } catch (err: any) {
        return { error: { message: err.message || 'Network error.' } };
      }
    },

    async resetPasswordWithSecurity(payload: { email: string; verification_token: string; new_password: string }) {
      try {
        const res = await fetch(`${API_BASE}/auth/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) {
          return { error: { message: data.detail || 'Failed to update password.' } };
        }
        return { data, error: null };
      } catch (err: any) {
        return { error: { message: err.message || 'Network error.' } };
      }
    },

    async changePassword(payload: { user_id: string; current_password: string; new_password: string }) {
      try {
        const res = await fetch(`${API_BASE}/auth/change-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) {
          return { error: { message: data.detail || 'Failed to change password.' } };
        }
        return { data, error: null };
      } catch (err: any) {
        return { error: { message: err.message || 'Network error.' } };
      }
    },
  },
};

// ─────────────────────────────────────────────────────────────
// Language preference helpers
// ─────────────────────────────────────────────────────────────
export function getStoredLanguage(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(LANGUAGE_KEY) || '';
}

export function setStoredLanguage(lang: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LANGUAGE_KEY, lang);
}
