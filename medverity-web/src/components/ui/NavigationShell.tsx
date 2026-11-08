'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/ui/Sidebar';
import BottomNav from '@/components/ui/BottomNav';
import Header from '@/components/ui/Header';
import { useAuth } from '@/hooks/useAuth';
import VoicePharmacistModal from '@/components/voice/VoicePharmacistModal';
import { Mic } from 'lucide-react';

// Pages where we DON'T show the navigation shell
const NO_NAV_PAGES = ['/auth/login', '/auth/signup', '/onboarding'];

export default function NavigationShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);

  // Don't render nav on auth/onboarding pages, or while loading, or if not logged in
  const isNoNavPage = NO_NAV_PAGES.some(p => pathname.startsWith(p));
  const showNav = user && !loading && !isNoNavPage;

  if (!showNav) {
    return <>{children}</>;
  }

  return (
    <div className="app-layout">
      {/* Desktop sidebar — hidden on mobile */}
      <div className="hidden-mobile">
        <Sidebar />
      </div>

      {/* Mobile header — hidden on desktop */}
      <div className="hidden-desktop">
        <Header />
      </div>

      {/* Main content */}
      <main className="app-main" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', position: 'relative' }}>
        <div style={{ flex: 1 }}>
            {children}
        </div>

        {/* Global Floating Action Button for Voice Pharmacist */}
        <button
          onClick={() => setIsVoiceOpen(true)}
          style={{
            position: 'fixed',
            bottom: '5.5rem',
            right: '1.25rem',
            zIndex: 40,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.125rem',
            background: 'linear-gradient(135deg, var(--color-teal-600), var(--color-teal-800))',
            color: 'white',
            borderRadius: 'var(--radius-full)',
            border: '2px solid rgba(255, 255, 255, 0.4)',
            boxShadow: '0 6px 20px rgba(13, 148, 136, 0.45)',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: 700,
            transition: 'all 0.2s ease',
          }}
          title="Ask Voice Pharmacist in your mother tongue"
          aria-label="Open Voice Pharmacist"
        >
          <div
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Mic size={16} />
          </div>
          <span>Ask Pharmacist</span>
        </button>
        
        {/* Phase 6: Medical Disclaimer */}
        <footer style={{ 
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            textAlign: 'center', 
            padding: '1rem 1.5rem', 
            fontSize: '0.75rem', 
            color: 'var(--color-text-secondary)',
            marginTop: 'auto',
            borderTop: '1px solid var(--color-border-light)',
            background: 'var(--color-surface-secondary)',
            zIndex: 10,
            lineHeight: 1.4
        }}>
            <div style={{ flexShrink: 0, color: 'var(--color-warning-600)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
            </div>
            <div>
              <strong style={{ color: 'var(--color-text-primary)' }}>Medical Disclaimer:</strong> MedVerity is an AI tool, not a substitute for professional medical advice. Always consult a healthcare provider.
            </div>
        </footer>
      </main>

      {/* Mobile bottom nav — hidden on desktop */}
      <div className="hidden-desktop">
        <BottomNav />
      </div>

      {/* Global Voice Pharmacist Modal */}
      <VoicePharmacistModal
        isOpen={isVoiceOpen}
        onClose={() => setIsVoiceOpen(false)}
        medicineName="Your Prescribed Medicines"
      />
    </div>
  );
}
