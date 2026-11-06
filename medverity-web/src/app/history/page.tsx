'use client';

import React, { useEffect, useState } from 'react';
import { Clock, Search, Filter, Loader2, ArrowLeft, Mic, Sparkles, FileText } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import VoicePharmacistModal from '@/components/voice/VoicePharmacistModal';

interface HistoryItem {
  id: string;
  type?: 'single' | 'prescription';
  medicine_name: string;
  date: string;
  category: string;
  confidence: number;
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [voiceModalMed, setVoiceModalMed] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    async function fetchHistory() {
      try {
        const url = user?.id
          ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/history?user_id=${encodeURIComponent(user.id)}`
          : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/history`;
        const res = await fetch(url);
        const json = await res.json();
        setHistory(json.history || []);
      } catch (err) {
        console.error("Failed to load history", err);
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, [user]);

  return (
    <div className="page-container" style={{ maxWidth: '640px', paddingBottom: '5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.375rem', fontWeight: 700 }}>Scan History</h1>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={() => alert("Search coming soon!")} style={{ background: 'var(--color-surface-secondary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '0.5rem', color: 'var(--color-text-primary)', cursor: 'pointer' }}>
            <Search size={18} />
          </button>
          <button onClick={() => alert("Filters coming soon!")} style={{ background: 'var(--color-surface-secondary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '0.5rem', color: 'var(--color-text-primary)', cursor: 'pointer' }}>
            <Filter size={18} />
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <Loader2 className="animate-spin" size={32} color="var(--color-teal-600)" />
        </div>
      ) : history.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <Clock size={48} color="var(--color-text-muted)" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ color: 'var(--color-text-secondary)' }}>No scan history yet</h3>
        </div>
      ) : (
        <div style={{ position: 'relative', paddingLeft: '1.25rem' }}>
          {/* Timeline Line */}
          <div style={{
            position: 'absolute',
            left: '12px',
            top: '8px',
            bottom: '0',
            width: '2px',
            background: 'var(--color-border-light)',
            zIndex: 0
          }} />

          {history.map((item, index) => {
            const dateObj = new Date(item.date);
            return (
              <div key={item.id} style={{ position: 'relative', marginBottom: '1.5rem', paddingLeft: '1.5rem' }}>
                {/* Timeline Dot */}
                <div style={{
                  position: 'absolute',
                  left: '-5px',
                  top: '8px',
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: item.type === 'prescription' ? 'var(--color-warning-500)' : 'var(--color-teal-500)',
                  boxShadow: `0 0 0 4px var(--color-surface)`,
                  zIndex: 1
                }} />

                {/* Content Card */}
                <div style={{ position: 'relative' }}>
                  <Link 
                    href={item.type === 'prescription' ? `/scan/prescription/result?prescription_id=${item.id}` : `/scan/result?scan_id=${item.id}&ocr_text=${encodeURIComponent(item.medicine_name)}&confidence=${item.confidence}`} 
                    style={{ textDecoration: 'none' }}
                  >
                    <div className="card" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'transform 0.2s ease, box-shadow 0.2s ease', cursor: 'pointer' }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: '0.25rem', fontWeight: 500 }}>
                          {format(dateObj, "MMM d, yyyy • h:mm a")}
                        </p>
                        <h3 style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--color-text-primary)', marginBottom: '0.125rem' }}>
                          {item.medicine_name}
                        </h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                          <span className="badge badge-teal">{item.category}</span>
                          {item.type === 'prescription' ? (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              background: 'var(--color-warning-50)',
                              border: '1px solid var(--color-warning-300)',
                              borderRadius: 'var(--radius-full)',
                              padding: '0.2rem 0.55rem',
                              fontSize: '0.6875rem',
                              fontWeight: 600,
                              color: 'var(--color-warning-800)',
                            }}>
                              <FileText size={11} />
                              Prescription Check
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setVoiceModalMed(item.medicine_name);
                              }}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                background: 'var(--color-teal-50)',
                                border: '1px solid var(--color-teal-300)',
                                borderRadius: 'var(--radius-full)',
                                padding: '0.2rem 0.55rem',
                                fontSize: '0.6875rem',
                                fontWeight: 600,
                                color: 'var(--color-teal-800)',
                                cursor: 'pointer',
                              }}
                            >
                              <Mic size={11} />
                              Ask Voice
                            </button>
                          )}
                        </div>
                      </div>
                      <div style={{ width: '48px', height: '48px', background: item.type === 'prescription' ? 'var(--color-warning-50)' : 'var(--color-surface-secondary)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', flexShrink: 0 }}>
                        {item.type === 'prescription' ? '📋' : '💊'}
                      </div>
                    </div>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Multilingual Voice Pharmacist Modal */}
      <VoicePharmacistModal
        isOpen={!!voiceModalMed}
        onClose={() => setVoiceModalMed(null)}
        medicineName={voiceModalMed || 'Your Medicine'}
      />
    </div>
  );
}
