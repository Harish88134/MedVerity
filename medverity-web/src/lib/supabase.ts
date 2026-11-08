// ── Real Supabase Client ──
// Uses @supabase/supabase-js when credentials are available,
// falls back to localStorage-based mock auth for development.

import { User } from '@/types';

// ─────────────────────────────────────────────────────────────
// Determine if we have real Supabase credentials
// ─────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const HAS_REAL_SUPABASE =
  SUPABASE_URL.startsWith('https://') &&
  SUPABASE_URL.includes('.supabase.co') &&
  SUPABASE_ANON_KEY.length > 20;

// ─────────────────────────────────────────────────────────────
// Lazy-load real Supabase client
// ─────────────────────────────────────────────────────────────
let _realClient: ReturnType<typeof import('@supabase/supabase-js').createClient> | null = null;

async function getRealClient() {
  if (_realClient) return _realClient;
  const { createClient } = await import('@supabase/supabase-js');
  _realClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return _realClient;
}

// ─────────────────────────────────────────────────────────────
// Mock auth helpers (localStorage — used as fallback)
// ─────────────────────────────────────────────────────────────
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

function getUsers(): Record<string, { user: User; password: string }> {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(USERS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveUsers(users: Record<string, { user: User; password: string }>): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

// ─────────────────────────────────────────────────────────────
// Helper to prevent hanging requests when Supabase is paused/offline
// ─────────────────────────────────────────────────────────────
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 3000): Promise<T> {
  let timer: any;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('Supabase network timeout')), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timer);
  }
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ─────────────────────────────────────────────────────────────
// Unified supabase export — API matches @supabase/supabase-js
// ─────────────────────────────────────────────────────────────
export const supabase = {
  auth: {
    async signUp(data: { name: string; email: string; password: string; preferred_language?: string }) {
      if (HAS_REAL_SUPABASE) {
        try {
          const client = await getRealClient();
          const result = await withTimeout(client.auth.signUp({
            email: data.email,
            password: data.password,
            options: {
              data: {
                name: data.name,
                preferred_language: data.preferred_language || 'en',
              },
            },
          }), 3000);

          if (!result.error && result.data?.user) {
            const user: User = {
              id: result.data.user.id || '',
              name: data.name,
              email: data.email,
              phone: (data as any).phone || '',
              preferred_language: data.preferred_language || 'en',
              role: 'patient',
              created_at: new Date().toISOString(),
            };
            const token = result.data.session?.access_token || '';
            setAuthState({ user, token });
            const users = getUsers();
            users[data.email] = { user, password: data.password };
            saveUsers(users);
            return { data: { user }, error: null };
          } else if (result.error) {
            const msg = result.error.message || '';
            const isNetworkError = msg.toLowerCase().includes('fetch') || msg.toLowerCase().includes('network') || msg.toLowerCase().includes('timeout');
            if (!isNetworkError) {
              return { error: { message: msg } };
            }
            console.warn('[Supabase] Sign up network/reachability issue ("' + msg + '"), using backend API & local store.');
          }
        } catch (e: any) {
          console.warn('[Supabase] Sign up network issue, falling back to backend API & local store:', e);
        }
      }

      // 1. Try Backend API (/auth/signup)
      try {
        const apiRes = await fetch(`${API_BASE}/auth/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: data.name,
            email: data.email,
            password: data.password,
            preferred_language: data.preferred_language || 'en',
          }),
        });
        if (apiRes.ok) {
          const apiData = await apiRes.json();
          const user: User = {
            id: apiData.user_id || crypto.randomUUID(),
            name: apiData.name || data.name,
            email: apiData.email || data.email,
            phone: apiData.phone || '',
            preferred_language: apiData.preferred_language || 'en',
            role: 'patient',
            created_at: new Date().toISOString(),
          };
          const token = apiData.token || `token-${user.id}`;
          setAuthState({ user, token });
          const users = getUsers();
          users[data.email] = { user, password: data.password };
          saveUsers(users);
          return { data: { user }, error: null };
        }
      } catch (e) {
        console.warn('[Auth] Backend API signup note:', e);
      }

      // 2. LocalStore fallback
      const users = getUsers();
      if (users[data.email]) {
        return { error: { message: 'A user with this email already exists.' } };
      }
      const user: User = {
        id: crypto.randomUUID(),
        name: data.name,
        email: data.email,
        phone: (data as any).phone || '',
        preferred_language: data.preferred_language || 'en',
        role: 'patient',
        created_at: new Date().toISOString(),
      };
      users[data.email] = { user, password: data.password };
      saveUsers(users);
      const token = `mock-token-${user.id}`;
      setAuthState({ user, token });
      return { data: { user }, error: null };
    },

    async signIn(data: { email: string; password: string }) {
      if (HAS_REAL_SUPABASE) {
        try {
          const client = await getRealClient();
          const result = await withTimeout(client.auth.signInWithPassword({
            email: data.email,
            password: data.password,
          }), 4000);

          if (result.error) {
            const msg = result.error.message || '';
            const isNetworkError = msg.toLowerCase().includes('fetch') || msg.toLowerCase().includes('network') || msg.toLowerCase().includes('timeout');
            // If Supabase specifically says invalid credentials, return the error immediately!
            if (!isNetworkError) {
              return { error: { message: msg || 'Invalid email or password.' } };
            }
          } else if (result.data?.user) {
            const meta = result.data.user?.user_metadata || {};
            const user: User = {
              id: result.data.user?.id || '',
              name: meta.name || '',
              email: data.email,
              phone: meta.phone || (result.data.user as any)?.phone || '',
              preferred_language: meta.preferred_language || 'en',
              role: 'patient',
              created_at: result.data.user?.created_at || new Date().toISOString(),
            };
            const token = result.data.session?.access_token || '';
            setAuthState({ user, token });
            return { data: { user }, error: null };
          }
        } catch (e: any) {
          const errMsg = e?.message || '';
          if (errMsg.toLowerCase().includes('invalid') || errMsg.toLowerCase().includes('credentials')) {
            return { error: { message: 'Invalid email or password.' } };
          }
          console.warn('[Supabase] Sign in network issue, falling back to backend & local store:', e);
        }
      }

      // 1. Try Backend API (/auth/login)
      try {
        const apiRes = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: data.email,
            password: data.password,
          }),
        });
        if (apiRes.ok) {
          const apiData = await apiRes.json();
          const user: User = {
            id: apiData.user_id || crypto.randomUUID(),
            name: apiData.name || '',
            email: apiData.email || data.email,
            phone: apiData.phone || '',
            preferred_language: apiData.preferred_language || 'en',
            role: 'patient',
            created_at: new Date().toISOString(),
          };
          const token = apiData.token || `token-${user.id}`;
          setAuthState({ user, token });
          return { data: { user }, error: null };
        } else {
          const errData = await apiRes.json().catch(() => ({}));
          return { error: { message: errData.detail || 'Invalid email or password.' } };
        }
      } catch (e) {
        console.warn('[Auth] Backend API login note:', e);
      }

      // 2. Mock fallback
      const users = getUsers();
      const record = users[data.email];
      if (!record || record.password !== data.password) {
        return { error: { message: 'Invalid email or password.' } };
      }
      const token = `mock-token-${record.user.id}`;
      setAuthState({ user: record.user, token });
      return { data: { user: record.user }, error: null };
    },

    async signOut() {
      if (HAS_REAL_SUPABASE) {
        try {
          const client = await getRealClient();
          await client.auth.signOut();
        } catch {}
      }
      setAuthState({ user: null, token: null });
      return { error: null };
    },

    async getUser() {
      if (HAS_REAL_SUPABASE) {
        try {
          const client = await getRealClient();
          const result = await client.auth.getUser();
          if (result.data?.user) {
            const meta = result.data.user.user_metadata || {};
            const user: User = {
              id: result.data.user.id,
              name: meta.name || '',
              email: result.data.user.email || '',
              phone: meta.phone || (result.data.user as any)?.phone || '',
              preferred_language: meta.preferred_language || 'en',
              role: 'patient',
              created_at: result.data.user.created_at || new Date().toISOString(),
            };
            setAuthState({ ...getAuthState(), user });
            return { data: { user }, error: null };
          }
        } catch {}
      }
      const state = getAuthState();
      return {
        data: { user: state.user },
        error: state.user ? null : { message: 'Not authenticated' },
      };
    },

    async updateUser(updates: Partial<User>) {
      if (HAS_REAL_SUPABASE) {
        try {
          const client = await getRealClient();
          await client.auth.updateUser({
            data: updates as Record<string, unknown>,
          });
        } catch {}
      }

      const state = getAuthState();
      if (!state.user) return { error: { message: 'Not authenticated' } };
      const updatedUser = { ...state.user, ...updates };
      setAuthState({ ...state, user: updatedUser });

      // Also update mock users store
      const users = getUsers();
      if (users[state.user.email]) {
        users[state.user.email].user = updatedUser;
        saveUsers(users);
      }
      return { data: { user: updatedUser }, error: null };
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
