'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function HomePage() {
  const { user, loading, hasCompletedOnboarding } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace('/auth/login');
    } else if (!hasCompletedOnboarding) {
      router.replace('/onboarding');
    } else {
      router.replace('/scan');
    }
  }, [user, loading, hasCompletedOnboarding, router]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'var(--color-surface-secondary)',
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1rem',
        animation: 'var(--animate-pulse-soft)',
      }}>
        <div style={{
          width: '56px',
          height: '56px',
          background: 'var(--color-teal-600)',
          borderRadius: 'var(--radius-xl)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
        </div>
        <p style={{
          color: 'var(--color-text-muted)',
          fontSize: '0.9375rem',
        }}>
          Loading MedVerity...
        </p>
      </div>
    </div>
  );
}
