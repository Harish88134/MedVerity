'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Search, Plus, X, ShieldAlert, Check } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

const ALLERGY_ICONS = ['💊', '🧪', '🚫'];

export default function AllergyProfilePage() {
  const [allergies, setAllergies] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [showSaved, setShowSaved] = useState(false);
  const { user } = useAuth();

  // Load on mount
  useEffect(() => {
    async function fetchAllergies() {
      try {
        const url = user?.id
          ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/allergy?user_id=${encodeURIComponent(user.id)}`
          : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/allergy`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data.allergies) {
             setAllergies(data.allergies);
             localStorage.setItem('medverity_allergies', JSON.stringify(data.allergies));
          }
        }
      } catch (e) {
        console.error('Failed to fetch allergies', e);
        // Fallback to local storage
        const saved = localStorage.getItem('medverity_allergies');
        if (saved) {
          try {
            setAllergies(JSON.parse(saved));
          } catch (e) {
            console.error(e);
          }
        }
      }
    }
    fetchAllergies();
  }, [user]);

  const addAllergy = () => {
    const name = inputValue.trim();
    if (name && !allergies.includes(name)) {
      const updated = [...allergies, name];
      setAllergies(updated);
      setInputValue('');
      setShowSaved(false);
      try {
        localStorage.setItem('medverity_allergies', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
    }
  };

  const removeAllergy = (name: string) => {
    const updated = allergies.filter(a => a !== name);
    setAllergies(updated);
    setShowSaved(false);
    try {
      localStorage.setItem('medverity_allergies', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async () => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/allergy`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ allergies, user_id: user?.id || '' })
      });
    } catch (e) {
      console.error('Failed to save allergies to backend', e);
    }
    localStorage.setItem('medverity_allergies', JSON.stringify(allergies));
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 3000);
  };

  return (
    <div className="page-container" style={{ maxWidth: '540px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '1.5rem', position: 'relative' }}>
        <Link href="/settings" style={{ position: 'absolute', left: 0, top: '0.25rem', color: 'var(--color-text-primary)' }}>
          <ArrowLeft size={22} />
        </Link>
        <h1 style={{ fontSize: '1.375rem', fontWeight: 700 }}>My Allergy Profile</h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginTop: '0.375rem' }}>
          We&apos;ll warn you if a scanned medicine matches these
        </p>
      </div>

      {/* Search input */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={18} style={{
            position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)',
            color: 'var(--color-text-muted)',
          }} />
          <input
            className="input-field"
            style={{ paddingLeft: '2.75rem' }}
            placeholder="Add an allergy e.g. Penicillin"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addAllergy()}
          />
        </div>
        <button
          onClick={addAllergy}
          style={{
            width: '44px', height: '44px', borderRadius: 'var(--radius-lg)',
            background: 'var(--color-teal-700)', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}
        >
          <Plus size={20} color="white" />
        </button>
      </div>

      {/* Allergies list */}
      {allergies.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontWeight: 600, marginBottom: '0.75rem' }}>
            Your Allergies ({allergies.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {allergies.map((allergy, i) => (
              <div key={allergy} style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.875rem 1rem', borderRadius: 'var(--radius-xl)',
                border: '1.5px solid var(--color-danger-100)', background: 'var(--color-surface)',
              }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%',
                  background: 'var(--color-danger-50)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontSize: '1rem' }}>{ALLERGY_ICONS[i % ALLERGY_ICONS.length]}</span>
                </div>
                <span style={{ flex: 1, fontWeight: 500, fontSize: '0.9375rem' }}>{allergy}</span>
                <button onClick={() => removeAllergy(allergy)} style={{
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger-500)',
                  padding: '0.25rem',
                }}>
                  <X size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Divider */}
      {allergies.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }} />
          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>OR</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }} />
        </div>
      )}

      {/* Empty state illustration */}
      <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
        <div style={{
          width: '120px', height: '120px', borderRadius: '50%', margin: '0 auto 1.25rem',
          background: 'var(--color-teal-50)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <ShieldAlert size={48} color="var(--color-teal-400)" />
        </div>
        <h3 style={{ fontWeight: 600, marginBottom: '0.5rem' }}>
          {allergies.length > 0 ? 'All set!' : 'No allergies added yet'}
        </h3>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', lineHeight: 1.5, maxWidth: '300px', margin: '0 auto' }}>
          {allergies.length > 0
            ? 'We\'ll check your allergies every time you scan a medicine.'
            : 'Add any medicines or substances you\'re allergic to so we can keep you safe.'}
        </p>
      </div>

      {/* Save button */}
      <button 
        className="btn-primary" 
        style={{ marginTop: '1rem', background: showSaved ? 'var(--color-success-600)' : 'var(--color-teal-600)' }}
        onClick={handleSave}
      >
        {showSaved ? (
          <>
            <Check size={18} />
            Profile Saved!
          </>
        ) : (
          <>
            <ShieldAlert size={18} />
            Save Profile
          </>
        )}
      </button>
    </div>
  );
}
