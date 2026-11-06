'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert, Check } from 'lucide-react';
import { SUPPORTED_LANGUAGES, Language } from '@/types';
import { setStoredLanguage } from '@/lib/supabase';

export default function OnboardingPage() {
  const [selectedLang, setSelectedLang] = useState<string>('');
  const router = useRouter();

  const handleContinue = () => {
    if (!selectedLang) return;
    setStoredLanguage(selectedLang);
    router.push('/scan');
  };

  const handleSkip = () => {
    setStoredLanguage('en');
    router.push('/scan');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: '#FFFFFF',
    }}>
      {/* Skip button */}
      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        padding: '1rem 1.25rem 0',
      }}>
        <button
          onClick={handleSkip}
          id="onboarding-skip"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--color-teal-600)',
            fontWeight: 600,
            fontSize: '0.9375rem',
            fontFamily: 'var(--font-sans)',
          }}
        >
          Skip
        </button>
      </div>

      {/* Hero illustration area */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '1rem 2rem 1.5rem',
      }}>
        <div style={{
          width: '100%',
          maxWidth: '320px',
          aspectRatio: '4/3',
          background: 'linear-gradient(135deg, var(--color-teal-50) 0%, #E0F7F5 40%, #F0FDFA 100%)',
          borderRadius: 'var(--radius-2xl)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Decorative circles */}
          <div style={{
            position: 'absolute',
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            background: 'rgba(13, 148, 136, 0.06)',
            top: '-20px',
            left: '-20px',
          }} />
          <div style={{
            position: 'absolute',
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'rgba(13, 148, 136, 0.08)',
            bottom: '-10px',
            right: '-10px',
          }} />
          
          {/* Central logo/icon group */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.75rem',
            position: 'relative',
            zIndex: 1,
          }}>
            {/* Family figures */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.25rem' }}>
              {['👴', '👩', '👦', '👨', '👵'].map((emoji, i) => (
                <span key={i} style={{ fontSize: '2rem' }}>{emoji}</span>
              ))}
            </div>
            {/* Medicine bottle with logo */}
            <div style={{
              width: '64px',
              height: '80px',
              background: 'white',
              borderRadius: 'var(--radius-xl)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid var(--color-teal-200)',
            }}>
              <div style={{
                width: '24px',
                height: '24px',
                background: 'var(--color-teal-500)',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '0.25rem',
              }}>
                <ShieldAlert size={14} color="white" />
              </div>
              <span style={{
                fontSize: '0.5rem',
                fontWeight: 700,
                color: 'var(--color-teal-700)',
                letterSpacing: '-0.02em',
              }}>
                MedVerity
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        padding: '0 1.5rem 2rem',
        display: 'flex',
        flexDirection: 'column',
        maxWidth: '480px',
        margin: '0 auto',
        width: '100%',
      }}>
        <h1 style={{
          fontSize: '1.625rem',
          fontWeight: 700,
          color: 'var(--color-text-primary)',
          textAlign: 'center',
          marginBottom: '0.5rem',
        }}>
          Choose your language
        </h1>
        <p style={{
          color: 'var(--color-text-secondary)',
          textAlign: 'center',
          fontSize: '0.9375rem',
          marginBottom: '1.5rem',
          lineHeight: 1.5,
        }}>
          We&apos;ll explain your medicines in the language you&apos;re comfortable with
        </p>

        {/* Language grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0.75rem',
          flex: 1,
        }}>
          {SUPPORTED_LANGUAGES.map((lang: Language) => {
            const isSelected = selectedLang === lang.code;
            return (
              <button
                key={lang.code}
                id={`lang-${lang.code}`}
                onClick={() => setSelectedLang(lang.code)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '1.25rem 1rem',
                  background: isSelected ? 'var(--color-teal-50)' : 'var(--color-surface)',
                  border: `2px solid ${isSelected ? 'var(--color-teal-500)' : 'var(--color-border-light)'}`,
                  borderRadius: 'var(--radius-xl)',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.2s ease',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                {/* Selection indicator */}
                <div style={{
                  position: 'absolute',
                  top: '0.625rem',
                  right: '0.625rem',
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  border: isSelected ? 'none' : '2px solid var(--color-border)',
                  background: isSelected ? 'var(--color-teal-500)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                }}>
                  {isSelected && <Check size={14} color="white" strokeWidth={3} />}
                </div>

                {/* Script letter */}
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: isSelected ? 'var(--color-teal-100)' : 'var(--color-surface-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.375rem',
                  fontWeight: 700,
                  color: 'var(--color-teal-600)',
                  transition: 'all 0.2s ease',
                }}>
                  {lang.script}
                </div>

                {/* Native name */}
                <span style={{
                  fontSize: '1rem',
                  fontWeight: 600,
                  color: 'var(--color-text-primary)',
                }}>
                  {lang.nativeName}
                </span>

                {/* English name */}
                <span style={{
                  fontSize: '0.8125rem',
                  color: 'var(--color-text-secondary)',
                  marginTop: '-0.25rem',
                }}>
                  {lang.name}
                </span>
              </button>
            );
          })}
        </div>

        {/* Continue button */}
        <button
          onClick={handleContinue}
          disabled={!selectedLang}
          id="onboarding-continue"
          className="btn-primary"
          style={{ marginTop: '1.5rem' }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
