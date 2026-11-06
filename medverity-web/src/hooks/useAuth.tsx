'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User } from '@/types';
import { supabase, getStoredLanguage, setStoredLanguage } from '@/lib/supabase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (name: string, email: string, password: string, language?: string) => Promise<{ error?: string }>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<{ error?: string }>;
  hasCompletedOnboarding: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  // Check auth state on mount
  useEffect(() => {
    async function checkAuth() {
      try {
        const { data } = await supabase.auth.getUser();
        setUser(data.user);
        // Onboarding is complete when a language preference is set
        const lang = getStoredLanguage();
        // If user has a preferred_language set from Supabase, also accept that
        const effectiveLang = lang || (data.user as any)?.preferred_language;
        setHasCompletedOnboarding(!!effectiveLang);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, []);

  const signUp = useCallback(async (name: string, email: string, password: string, language?: string) => {
    const preferred_language = language || 'en';
    const { error } = await supabase.auth.signUp({ name, email, password, preferred_language });
    if (error) return { error: error.message };

    const { data } = await supabase.auth.getUser();
    setUser(data.user);
    // Don't auto-complete onboarding — let user pick language
    return {};
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signIn({ email, password });
    if (error) return { error: error.message };

    const { data } = await supabase.auth.getUser();
    setUser(data.user);
    const lang = getStoredLanguage() || (data.user as any)?.preferred_language;
    setHasCompletedOnboarding(!!lang);
    return {};
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setHasCompletedOnboarding(false);
  }, []);

  const updateProfile = useCallback(async (updates: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...updates } : null);

    if (updates.preferred_language) {
      setStoredLanguage(updates.preferred_language);
    }

    // 1. Persist to Supabase / LocalStorage client
    const res = await supabase.auth.updateUser(updates);

    // 2. Sync to Backend API /auth/profile
    try {
      const activeUser = user || (await supabase.auth.getUser()).data.user;
      if (activeUser?.id) {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/auth/profile`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: activeUser.id,
            name: updates.name ?? activeUser.name,
            phone: updates.phone ?? activeUser.phone,
            preferred_language: updates.preferred_language ?? activeUser.preferred_language,
            role: updates.role ?? activeUser.role,
          }),
        });
      }
    } catch (e) {
      console.warn('[useAuth] Backend profile sync note:', e);
    }

    return { error: res.error ? res.error.message : undefined };
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut, updateProfile, hasCompletedOnboarding }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
