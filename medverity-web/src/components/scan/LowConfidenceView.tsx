'use client';

import React, { useState } from 'react';
import { AlertTriangle, HelpCircle, Search, Info } from 'lucide-react';

interface Alternative {
  name: string;
  description: string;
}

interface LowConfidenceViewProps {
  confidence: number;
  imageUrl?: string;
  bestGuess: string;
  alternatives?: Alternative[];
  onConfirm: (medicineName: string) => void;
}

export default function LowConfidenceView({
  confidence,
  imageUrl,
  bestGuess,
  alternatives = [],
  onConfirm
}: LowConfidenceViewProps) {
  const [selectedAlt, setSelectedAlt] = useState<string>('');
  const [manualInput, setManualInput] = useState<string>('');

  const handleSelection = (val: string) => {
    setSelectedAlt(val);
    setManualInput('');
  };

  const handleManualInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setManualInput(e.target.value);
    setSelectedAlt('');
  };

  const handleConfirm = () => {
    const finalValue = manualInput.trim() || selectedAlt;
    if (finalValue) {
      onConfirm(finalValue);
    }
  };

  const canSubmit = manualInput.trim().length > 0 || selectedAlt.length > 0;

  return (
    <div style={{ padding: '1rem 1.25rem 2rem', animation: 'var(--animate-fade-in)' }}>
      {/* Warning banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.75rem 1rem',
        background: 'var(--color-warning-50)',
        borderRadius: 'var(--radius-lg)',
        marginBottom: '1.25rem',
        border: '1px solid var(--color-warning-100)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
          <AlertTriangle size={24} color="var(--color-warning-600)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <p style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--color-text-primary)' }}>Low Confidence Scan</p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>We&apos;re not fully sure about this reading</p>
          </div>
        </div>
        <div style={{
          padding: '0.375rem 0.5rem',
          border: '1.5px solid var(--color-warning-100)',
          borderRadius: 'var(--radius-md)',
          textAlign: 'center',
          background: 'var(--color-surface)',
        }}>
          <p style={{ fontWeight: 700, color: 'var(--color-warning-600)', fontSize: '1rem', lineHeight: 1.2 }}>{Math.round(confidence * 100)}%</p>
          <p style={{ fontSize: '0.625rem', color: 'var(--color-warning-600)' }}>Confidence</p>
        </div>
      </div>

      {/* Best Guess Section */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{
          width: '100px',
          height: '100px',
          borderRadius: 'var(--radius-lg)',
          background: 'var(--color-surface-secondary)',
          border: '1px solid var(--color-border)',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {imageUrl ? (
            <img src={imageUrl} alt="Scanned medicine" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: '2rem' }}>💊</span>
          )}
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <h3 style={{ fontWeight: 600, fontSize: '1rem' }}>Did we get this right?</h3>
            <HelpCircle size={16} color="var(--color-text-muted)" />
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>Best guess</p>
          <p style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>{bestGuess}</p>
        </div>
      </div>

      {/* Alternatives List */}
      {alternatives.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <p style={{ fontWeight: 600, fontSize: '0.9375rem', marginBottom: '0.75rem' }}>Or is it one of these?</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {alternatives.map((alt, idx) => (
              <label 
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '1rem',
                  border: `1px solid ${selectedAlt === alt.name ? 'var(--color-teal-500)' : 'var(--color-border)'}`,
                  borderRadius: 'var(--radius-lg)',
                  background: selectedAlt === alt.name ? 'var(--color-teal-50)' : 'var(--color-surface)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <input 
                  type="radio" 
                  name="alternative" 
                  value={alt.name} 
                  checked={selectedAlt === alt.name}
                  onChange={() => handleSelection(alt.name)}
                  style={{
                     marginRight: '1rem',
                     width: '1.25rem',
                     height: '1.25rem',
                     accentColor: 'var(--color-teal-600)'
                  }}
                />
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 500, fontSize: '0.9375rem', color: 'var(--color-text-primary)' }}>{alt.name}</p>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>{alt.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Manual Input */}
      <div style={{ marginBottom: '1.5rem' }}>
        <p style={{ fontWeight: 600, fontSize: '0.9375rem', marginBottom: '0.75rem' }}>None of these, let me type the name manually</p>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{
            position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)',
            color: 'var(--color-text-muted)',
          }} />
          <input
            type="text"
            className="input-field"
            style={{ paddingLeft: '2.75rem', paddingRight: '1rem', height: '3rem' }}
            placeholder="Type medicine name here"
            value={manualInput}
            onChange={handleManualInput}
          />
        </div>
      </div>

      {/* Info Banner */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
        padding: '1rem',
        background: '#F0F9FF',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid #BAE6FD',
        marginBottom: '1.5rem',
      }}>
        <Info size={20} color="#0284C7" style={{ flexShrink: 0 }} />
        <p style={{ fontSize: '0.8125rem', color: '#0369A1', lineHeight: 1.5 }}>
          For your safety, please confirm with your pharmacist if unsure.
        </p>
      </div>

      {/* Confirm Button */}
      <button 
        className="btn-primary" 
        onClick={handleConfirm}
        disabled={!canSubmit}
        style={{
          opacity: canSubmit ? 1 : 0.6,
          cursor: canSubmit ? 'pointer' : 'not-allowed',
          padding: '1rem',
          height: '3.5rem'
        }}
      >
        Confirm and continue
      </button>
      
      <p style={{ textAlign: 'center', fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginTop: '1rem' }}>
        Please select or enter a medicine name to continue
      </p>
    </div>
  );
}
