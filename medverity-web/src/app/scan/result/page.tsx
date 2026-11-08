'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { ArrowLeft, Heart, MoreVertical, CheckCircle2, Volume2, Play, Square, ChevronRight, Sun, Moon, Sunrise, AlertTriangle, MessageCircle, ScanLine, Bell, Loader2, ShieldAlert, Mic, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { getStoredLanguage } from '@/lib/supabase';
import { speak, stopSpeaking, isSpeaking as checkIsSpeaking } from '@/lib/speech';
import { ScanResult } from '@/types';
import LowConfidenceView from '@/components/scan/LowConfidenceView';
import VoicePharmacistModal from '@/components/voice/VoicePharmacistModal';
import LifestyleRadar from '@/components/medicine/LifestyleRadar';
import GenericCostSaver from '@/components/medicine/GenericCostSaver';

function ScanResultContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const scanId = searchParams.get('scan_id');
  const initialOcrText = searchParams.get('ocr_text');
  const initialConfidence = searchParams.get('confidence');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<ScanResult | null>(null);
  
  // High vs Low confidence mode
  const [mode, setMode] = useState<'high' | 'low'>('high');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [allergyWarning, setAllergyWarning] = useState<string | null>(null);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);

  // Fallback to high confidence if not provided, else parse
  const confidenceScore = initialConfidence ? parseFloat(initialConfidence) : 1.0;

  useEffect(() => {
    if (!scanId || !initialOcrText) {
       setError("Missing scan data.");
       setLoading(false);
       return;
    }

    // Determine initial mode based on confidence
    if (confidenceScore < 0.8) {
       setMode('low');
    }

    async function fetchExplanation(overrideText?: string) {
       setLoading(true);
       try {
         const lang = getStoredLanguage() || 'en';
         const textToExplain = overrideText || initialOcrText || '';
         
         const response = await apiClient.post<any>('/explain', {
            scan_id: scanId,
            ocr_text: textToExplain,
            target_language: lang
         });

         setData({
            ocr_text: textToExplain,
            confidence: confidenceScore,
            extraction: response.extraction,
            translated_text: response.translated_text,
            alternatives: response.alternatives
         });
         
         // Phase 3: Check Allergies
         const savedAllergies = localStorage.getItem('medverity_allergies');
         const userStr = localStorage.getItem('medverity_user');
         let userId = '';
         try { if (userStr) userId = JSON.parse(userStr)?.id || ''; } catch {}
         
         if (response.extraction?.medicine_name) {
             const queryParams = new URLSearchParams({
                 medicine_name: response.extraction.medicine_name,
             });
             if (savedAllergies) {
                 try {
                     queryParams.append('user_allergies', JSON.parse(savedAllergies).join(','));
                 } catch {}
             }
             if (userId) {
                 queryParams.append('user_id', userId);
             }
             const allergyRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/allergy/check?${queryParams.toString()}`);
             const allergyData = await allergyRes.json();
             if (allergyData.has_allergy) {
                 setAllergyWarning(allergyData.reason || (allergyData.matches || []).join(', '));
             } else if (allergyData.alert_type === 'unknown_status') {
                 setAllergyWarning('Allergy status unknown — verify before dispensing.');
             } else {
                 setAllergyWarning(null);
             }
         }
         
       } catch (err) {
         console.error(err);
         setError("Failed to analyze medicine data.");
       } finally {
         setLoading(false);
       }
    }

    fetchExplanation();
  }, [scanId, initialOcrText, confidenceScore]);

  // Handle Speech
  useEffect(() => {
    const interval = setInterval(() => {
      setIsSpeaking(checkIsSpeaking());
    }, 500);
    return () => {
      clearInterval(interval);
      stopSpeaking();
    };
  }, []);

  const toggleSpeech = () => {
    if (isSpeaking) {
      stopSpeaking();
    } else if (data) {
      const text = data.translated_text && data.translated_text !== data.extraction.medicine_name 
                   ? data.translated_text 
                   : data.extraction.medicine_name;
      const lang = getStoredLanguage() || 'en';
      // In a real app we'd construct a full sentence. For now just the name and uses.
      const fullText = `${text}. ${data.extraction.uses}`;
      speak(fullText, lang);
    }
  };

  const handleManualConfirm = async (medicineName: string) => {
    // When user confirms a low-confidence scan manually, we re-fetch with their provided name
    // This forces the NLP to extract data for the confirmed medicine
    try {
        setLoading(true);
        const lang = getStoredLanguage() || 'en';
        const response = await apiClient.post<any>('/explain', {
            scan_id: scanId,
            ocr_text: medicineName, // Use user's input as the OCR text effectively
            target_language: lang
        });

        setData({
            ocr_text: medicineName,
            confidence: 1.0, // Force high confidence now
            extraction: response.extraction,
            translated_text: response.translated_text
        });
        setMode('high');

        // Check allergies for confirmed medicine
        const savedAllergies = localStorage.getItem('medverity_allergies');
        const userStr = localStorage.getItem('medverity_user');
        let userId = '';
        try { if (userStr) userId = JSON.parse(userStr)?.id || ''; } catch {}
        
        const confirmedMedName = response.extraction?.medicine_name || medicineName;
        const queryParams = new URLSearchParams({ medicine_name: confirmedMedName });
        if (savedAllergies) {
            try { queryParams.append('user_allergies', JSON.parse(savedAllergies).join(',')); } catch {}
        }
        if (userId) {
            queryParams.append('user_id', userId);
        }
        const allergyRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/allergy/check?${queryParams.toString()}`);
        const allergyData = await allergyRes.json();
        if (allergyData.has_allergy) {
            setAllergyWarning(allergyData.reason || (allergyData.matches || []).join(', '));
        } else {
            setAllergyWarning(null);
        }
    } catch(err) {
        console.error(err);
        setError("Failed to fetch details for selected medicine.");
    } finally {
        setLoading(false);
    }
  };

  if (loading) {
      return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
              <Loader2 size={48} className="animate-spin" color="var(--color-teal-600)" style={{ marginBottom: '1rem' }} />
              <p style={{ color: 'var(--color-text-secondary)' }}>Analyzing medicine details...</p>
          </div>
      );
  }

  if (error || !data) {
       return (
          <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <AlertTriangle size={48} color="var(--color-danger-500)" style={{ margin: '0 auto 1rem' }} />
              <h3 style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Oops!</h3>
              <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>{error}</p>
              <Link href="/scan" className="btn-primary" style={{ display: 'inline-flex', width: 'auto' }}>
                  Try Again
              </Link>
          </div>
      );
  }

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', animation: 'var(--animate-fade-in)' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.75rem 1rem',
        borderBottom: '1px solid var(--color-border-light)',
      }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-primary)' }}>
          <ArrowLeft size={22} />
        </button>
        <h1 style={{ fontSize: '1.0625rem', fontWeight: 600 }}>Medicine Details</h1>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={() => alert("Save to favorites coming soon!")} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-primary)' }}>
            <Heart size={20} />
          </button>
          <button onClick={() => alert("More options coming soon!")} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-primary)' }}>
            <MoreVertical size={20} />
          </button>
        </div>
      </div>

      {mode === 'low' ? (
        <LowConfidenceView 
            confidence={data.confidence}
            bestGuess={data.extraction.medicine_name}
            alternatives={data.alternatives || []}
            onConfirm={handleManualConfirm}
        />
      ) : (
        <div style={{ padding: '1rem 1.25rem 2rem' }}>
            {/* Confidence banner */}
            <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.75rem 1rem',
            background: 'var(--color-teal-50)',
            borderRadius: 'var(--radius-lg)',
            marginBottom: '1.25rem',
            border: '1px solid var(--color-teal-200)',
            }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={22} color="var(--color-teal-600)" fill="var(--color-teal-600)" stroke="white" />
                <div>
                <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-teal-700)' }}>Scan Successful</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Medicine recognized with high confidence</p>
                </div>
            </div>
            <div style={{
                padding: '0.25rem 0.625rem',
                border: '1.5px solid var(--color-teal-500)',
                borderRadius: 'var(--radius-md)',
                textAlign: 'center',
            }}>
                <p style={{ fontWeight: 700, color: 'var(--color-teal-600)', fontSize: '1.125rem', lineHeight: 1.2 }}>{Math.round(data.confidence * 100)}%</p>
                <p style={{ fontSize: '0.625rem', color: 'var(--color-teal-600)' }}>Confidence</p>
            </div>
            </div>

            {/* Phase 3: Allergy Warning Banner */}
            {allergyWarning && (
                <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                    padding: '1rem',
                    background: 'var(--color-danger-50)',
                    borderRadius: 'var(--radius-lg)',
                    marginBottom: '1.25rem',
                    border: '1px solid var(--color-danger-200)',
                }}>
                    <AlertTriangle color="var(--color-danger-600)" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                        <p style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--color-danger-700)', marginBottom: '0.25rem' }}>
                            Allergy Warning
                        </p>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--color-danger-700)', opacity: 0.9 }}>
                            This medicine contains ingredients that match your allergy profile: <strong style={{ textTransform: 'capitalize' }}>{allergyWarning}</strong>. Do not consume without consulting a doctor.
                        </p>
                    </div>
                </div>
            )}

            {/* Medicine name + image */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', gap: '1rem' }}>
            <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>{data.extraction.medicine_name}</h2>
                {data.translated_text && data.translated_text !== data.extraction.medicine_name && (
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9375rem', marginBottom: '0.25rem' }}>{data.translated_text}</p>
                )}
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.8125rem', marginBottom: '0.75rem' }}>{data.extraction.category}</p>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                <span className="badge badge-teal">{data.extraction.category}</span>
                </div>
            </div>
            <div style={{
                width: '120px',
                height: '80px',
                borderRadius: 'var(--radius-lg)',
                background: 'var(--color-surface-secondary)',
                border: '1px solid var(--color-border-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem',
                flexShrink: 0,
            }}>
                💊
            </div>
            </div>

            {/* Voice Pharmacist & Audio bar */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              gap: '0.75rem',
              marginBottom: '0.75rem',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.875rem 1rem',
                background: 'var(--color-teal-600)',
                borderRadius: 'var(--radius-xl)',
                color: 'white',
              }}>
                <Volume2 size={22} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>Listen in your language</p>
                  <p style={{ fontSize: '0.75rem', opacity: 0.8 }}>Audio explanation available</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', opacity: 0.8 }}>
                  {isSpeaking ? (
                    <button onClick={toggleSpeech} style={{
                      width: '32px', height: '32px', borderRadius: '50%',
                      background: 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Square size={14} color="white" fill="white" />
                    </button>
                  ) : (
                    <button onClick={toggleSpeech} style={{
                      width: '32px', height: '32px', borderRadius: '50%',
                      background: 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Play size={16} color="white" fill="white" />
                    </button>
                  )}
                </div>
              </div>

              {/* 1-Tap Floating Ask Pharmacist Voice Q&A */}
              <button
                onClick={() => setIsVoiceModalOpen(true)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0.5rem 1rem',
                  background: 'linear-gradient(135deg, #0D9488, #0F766E)',
                  border: '1.5px solid var(--color-teal-400)',
                  borderRadius: 'var(--radius-xl)',
                  color: 'white',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(13, 148, 136, 0.3)',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Mic size={18} />
                  <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>Ask Voice</span>
                </div>
                <span style={{ fontSize: '0.6875rem', opacity: 0.9 }}>AI Pharmacist</span>
              </button>
            </div>

            {/* Phase 3: Safety Profile Link */}
            <Link href={`/scan/safety?medicine=${encodeURIComponent(data.extraction.medicine_name)}&scan_id=${scanId}`} style={{ display: 'block', textDecoration: 'none', marginBottom: '0.875rem' }}>
                <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <ShieldAlert color="var(--color-teal-600)" />
                        <div>
                            <p style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--color-text-primary)' }}>Safety Profile</p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>View interactions & warnings</p>
                        </div>
                    </div>
                    <ChevronRight size={20} color="var(--color-text-muted)" />
                </div>
            </Link>

            {/* Phase 2: Food, Sunlight & Lifestyle Conflict Radar + Chronotherapy */}
            <LifestyleRadar medicineName={data.extraction.medicine_name} />

            {/* What is it for */}
            <div className="card" style={{ padding: '1rem', marginBottom: '0.625rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--color-teal-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: '1.125rem' }}>💊</span>
                </div>
                <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 600, color: 'var(--color-teal-700)', fontSize: '0.9375rem', marginBottom: '0.25rem' }}>What is it for?</p>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.8125rem', lineHeight: 1.5 }}>
                    {data.extraction.uses}
                </p>
                </div>
                <ChevronRight size={18} color="var(--color-text-muted)" />
            </div>
            </div>

            {/* How to take */}
            <div className="card" style={{ padding: '1rem', marginBottom: '0.625rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--color-teal-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: '1.125rem' }}>📋</span>
                </div>
                <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 600, color: 'var(--color-teal-700)', fontSize: '0.9375rem', marginBottom: '0.25rem' }}>How to take?</p>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.8125rem', lineHeight: 1.5 }}>
                    {data.extraction.how_to_take}
                </p>
                </div>
                <ChevronRight size={18} color="var(--color-text-muted)" />
            </div>
            </div>

            {/* When to take */}
            <div style={{
            padding: '1rem',
            background: 'var(--color-warning-50)',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--color-warning-100)',
            marginBottom: '0.625rem',
            }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '1.125rem' }}>⏰</span>
                <div>
                <p style={{ fontWeight: 600, color: 'var(--color-warning-600)', fontSize: '0.9375rem' }}>When to take?</p>
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>Take {data.extraction.medicine_name} {data.extraction.frequency.toLowerCase()}.</p>
                </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                {[
                { icon: <Sunrise size={20} />, time: 'Morning', dose: data.extraction.dosage, meal: 'As directed', color: '#FCD34D' },
                { icon: <Sun size={20} />, time: 'Afternoon', dose: data.extraction.dosage, meal: 'As directed', color: '#FB923C' },
                { icon: <Moon size={20} />, time: 'Night', dose: data.extraction.dosage, meal: 'As directed', color: '#A78BFA' },
                ].map((slot) => (
                <div key={slot.time} style={{ textAlign: 'center' }}>
                    <div style={{
                    width: '40px', height: '40px', borderRadius: '50%', margin: '0 auto 0.375rem',
                    background: `${slot.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: slot.color,
                    }}>
                    {slot.icon}
                    </div>
                    <p style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{slot.time}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{slot.dose}</p>
                    <p style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>{slot.meal}</p>
                </div>
                ))}
            </div>
            </div>

            {/* Warnings */}
            {data.extraction.warnings.length > 0 && (
                <div style={{
                padding: '1rem',
                background: 'var(--color-danger-50)',
                borderRadius: 'var(--radius-xl)',
                border: '1px solid var(--color-danger-100)',
                marginBottom: '0.625rem',
                }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <AlertTriangle size={22} color="var(--color-danger-600)" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, color: 'var(--color-danger-600)', fontSize: '0.9375rem', marginBottom: '0.5rem' }}>Warnings & Precautions</p>
                    <ul style={{ color: 'var(--color-text-secondary)', fontSize: '0.8125rem', lineHeight: 1.8, paddingLeft: '1rem' }}>
                        {data.extraction.warnings.map((warn, i) => (
                            <li key={i}>{warn}</li>
                        ))}
                    </ul>
                    </div>
                    <ChevronRight size={18} color="var(--color-text-muted)" />
                </div>
                </div>
            )}

            {/* Phase 4: Generic Cost Saver */}
            {data.extraction?.medicine_name && (
              <GenericCostSaver medicineName={data.extraction.medicine_name} />
            )}

            {/* Ask Voice Pharmacist Interactive Card */}
            <div
              onClick={() => setIsVoiceModalOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.875rem',
                padding: '1.125rem',
                background: 'linear-gradient(135deg, var(--color-teal-50), #E6FFFA)',
                borderRadius: 'var(--radius-xl)',
                border: '1.5px solid var(--color-teal-300)',
                marginBottom: '1.5rem',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(13, 148, 136, 0.12)',
                transition: 'all 0.2s ease',
              }}
            >
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  background: 'var(--color-teal-600)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  flexShrink: 0,
                  boxShadow: '0 4px 12px rgba(13, 148, 136, 0.35)',
                }}
              >
                <Mic size={26} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.125rem' }}>
                  <p style={{ fontWeight: 700, color: 'var(--color-teal-800)', fontSize: '0.9375rem', margin: 0 }}>
                    Ask Voice Pharmacist
                  </p>
                  <span className="badge badge-teal" style={{ fontSize: '0.625rem', padding: '0.1rem 0.35rem' }}>
                    LIVE AUDIO
                  </span>
                </div>
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.4 }}>
                  Speak in Hindi, Telugu, Tamil, Bengali, Marathi, or English. Ask about food, missed doses, or safety.
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsVoiceModalOpen(true);
                }}
                className="btn-primary"
                style={{
                  padding: '0.5rem 0.875rem',
                  fontSize: '0.8125rem',
                  whiteSpace: 'nowrap',
                  borderRadius: 'var(--radius-full)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <Sparkles size={14} />
                Ask Now
              </button>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <Link href="/scan" className="btn-outline" style={{ textDecoration: 'none', textAlign: 'center' }}>
                <ScanLine size={18} />
                Scan Again
              </Link>
              <Link href="/reminders" className="btn-primary" style={{ textDecoration: 'none', textAlign: 'center' }}>
                <Bell size={18} />
                Set Reminder
              </Link>
            </div>
          </div>
        )}

      {/* Multilingual Voice Pharmacist Modal */}
      {data && (
        <VoicePharmacistModal
          isOpen={isVoiceModalOpen}
          onClose={() => setIsVoiceModalOpen(false)}
          medicineName={data.extraction?.medicine_name}
          category={data.extraction?.category}
        />
      )}
    </div>
  );
}

export default function ScanResultPage() {
    return (
        <Suspense fallback={<div style={{ padding: '3rem', textAlign: 'center' }}><Loader2 className="animate-spin" style={{ margin: '0 auto' }}/></div>}>
            <ScanResultContent />
        </Suspense>
    )
}
