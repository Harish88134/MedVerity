'use client';

import React, { useState, useEffect } from 'react';
import {
  Sun,
  Moon,
  Clock,
  AlertTriangle,
  ShieldAlert,
  Info,
  CheckCircle,
  Bell,
  Utensils,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { getStoredLanguage } from '@/lib/supabase';

export interface ConflictItem {
  id: string;
  category: 'dairy' | 'caffeine' | 'citrus' | 'alcohol' | 'sunlight' | 'potassium' | string;
  severity: 'danger' | 'warning' | 'advisory';
  icon: string;
  title: string;
  description: string;
  action_advice: string;
  time_separation: string;
}

export interface ChronotherapyData {
  recommended_slot: string;
  recommended_time: string;
  clock_icon: string;
  efficacy_boost: string;
  scientific_rationale: string;
}

export interface FoodRuleData {
  type: string;
  title: string;
  description: string;
}

export interface LifestyleRadarData {
  medicine_name: string;
  matched_drug: string;
  language: string;
  food_rule: FoodRuleData;
  conflicts: ConflictItem[];
  chronotherapy: ChronotherapyData;
  has_specific_data: boolean;
}

interface LifestyleRadarProps {
  medicineName: string;
  activeSalts?: string[];
  initialLanguage?: string;
  onSetReminder?: (time: string, medName: string) => void;
}

export default function LifestyleRadar({
  medicineName,
  activeSalts,
  initialLanguage,
  onSetReminder,
}: LifestyleRadarProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(true);
  const [radar, setRadar] = useState<LifestyleRadarData | null>(null);
  const [expandedConflict, setExpandedConflict] = useState<string | null>(null);

  const currentLang = initialLanguage || (typeof window !== 'undefined' ? getStoredLanguage() : 'en') || 'en';

  useEffect(() => {
    let isMounted = true;
    if (!medicineName) return;

    const fetchRadar = async () => {
      setLoading(true);
      try {
        const res = await apiClient.post<LifestyleRadarData>('/interactions/lifestyle', {
          medicine_name: medicineName,
          active_salts: activeSalts,
          language: currentLang,
        });
        if (isMounted) {
          setRadar(res);
        }
      } catch (err) {
        console.warn('[LifestyleRadar] Failed to fetch radar, using client fallback', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchRadar();
    return () => {
      isMounted = false;
    };
  }, [medicineName, currentLang, activeSalts]);

  if (loading) {
    return (
      <div
        className="card"
        style={{
          padding: '1.25rem',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          marginBottom: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'var(--color-surface-secondary)',
              animation: 'pulse 1.5s infinite',
            }}
          />
          <div
            style={{
              width: '180px',
              height: '16px',
              background: 'var(--color-surface-secondary)',
              borderRadius: 'var(--radius-md)',
              animation: 'pulse 1.5s infinite',
            }}
          />
        </div>
        <div
          style={{
            height: '80px',
            background: 'var(--color-surface-secondary)',
            borderRadius: 'var(--radius-lg)',
            animation: 'pulse 1.5s infinite',
          }}
        />
      </div>
    );
  }

  if (!radar) return null;

  const isNightTime =
    radar.chronotherapy.recommended_slot === 'bedtime' ||
    radar.chronotherapy.recommended_time.toLowerCase().includes('pm') ||
    radar.chronotherapy.recommended_time.toLowerCase().includes('bed');

  const handleCreateReminder = () => {
    if (onSetReminder) {
      onSetReminder(radar.chronotherapy.recommended_time, medicineName);
    } else {
      // Direct jump to reminders with query
      router.push(`/reminders?prefill_med=${encodeURIComponent(medicineName)}&prefill_time=${encodeURIComponent(radar.chronotherapy.recommended_time)}`);
    }
  };

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'danger':
        return {
          bg: '#FEF2F2',
          border: '#F87171',
          text: '#991B1B',
          badgeBg: '#DC2626',
          badgeText: '#FFFFFF',
          badgeLabel: 'DANGER CONFLICT',
        };
      case 'warning':
        return {
          bg: '#FFFBEB',
          border: '#FBBF24',
          text: '#92400E',
          badgeBg: '#F59E0B',
          badgeText: '#FFFFFF',
          badgeLabel: 'MODERATE CAUTION',
        };
      default:
        return {
          bg: '#EFF6FF',
          border: '#60A5FA',
          text: '#1E40AF',
          badgeBg: '#3B82F6',
          badgeText: '#FFFFFF',
          badgeLabel: 'ADVISORY',
        };
    }
  };

  return (
    <div style={{ marginBottom: '1.25rem' }}>
      {/* ── Section Title Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.625rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.25rem' }}>🥗</span>
          <div>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, margin: 0, color: 'var(--color-text-primary)' }}>
              Food, Sun & Lifestyle Radar
            </h3>
            <p style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)', margin: 0 }}>
              Chronotherapy & dietary interaction shield
            </p>
          </div>
        </div>
        <span
          style={{
            fontSize: '0.6875rem',
            fontWeight: 700,
            padding: '0.15rem 0.5rem',
            borderRadius: 'var(--radius-full)',
            background: 'rgba(13, 148, 136, 0.1)',
            color: 'var(--color-teal-700)',
            border: '1px solid rgba(13, 148, 136, 0.25)',
          }}
        >
          Phase 2 Radar
        </span>
      </div>

      {/* ── 1. Chronotherapy (Circadian Timing) Hero Card ── */}
      <div
        style={{
          background: isNightTime
            ? 'linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)'
            : 'linear-gradient(135deg, #0F766E 0%, #0D9488 100%)',
          borderRadius: 'var(--radius-xl)',
          padding: '1rem',
          color: 'white',
          boxShadow: isNightTime
            ? '0 6px 20px rgba(49, 46, 129, 0.25)'
            : '0 6px 20px rgba(13, 148, 136, 0.25)',
          position: 'relative',
          overflow: 'hidden',
          marginBottom: '0.75rem',
        }}
      >
        {/* Subtle Decorative Glow Circle */}
        <div
          style={{
            position: 'absolute',
            top: '-25px',
            right: '-25px',
            width: '110px',
            height: '110px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.08)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.25rem',
              }}
            >
              {isNightTime ? <Moon size={20} color="#FDE047" fill="#FDE047" /> : <Sun size={20} color="#FDE047" />}
            </div>
            <div>
              <span
                style={{
                  fontSize: '0.625rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  opacity: 0.85,
                  fontWeight: 700,
                }}
              >
                Optimal Circadian Timing
              </span>
              <h4 style={{ fontSize: '1.125rem', fontWeight: 800, margin: '0.1rem 0 0 0' }}>
                {radar.chronotherapy.recommended_time}
              </h4>
            </div>
          </div>

          {/* Efficacy Boost Pill */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.22)',
              border: '1px solid rgba(255, 255, 255, 0.35)',
              padding: '0.25rem 0.5rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.6875rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              whiteSpace: 'nowrap',
            }}
          >
            <Sparkles size={12} color="#FDE047" />
            <span>{radar.chronotherapy.efficacy_boost}</span>
          </div>
        </div>

        {/* Scientific Rationale */}
        <p
          style={{
            fontSize: '0.75rem',
            lineHeight: 1.5,
            opacity: 0.92,
            margin: '0.625rem 0 0.75rem 0',
          }}
        >
          {radar.chronotherapy.scientific_rationale}
        </p>

        {/* Quick Action Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255, 255, 255, 0.15)', paddingTop: '0.625rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.6875rem', opacity: 0.85 }}>
            <Utensils size={13} />
            <span><strong>Food:</strong> {radar.food_rule.title}</span>
          </div>

          <button
            onClick={handleCreateReminder}
            style={{
              background: 'white',
              color: isNightTime ? '#1E1B4B' : '#0F766E',
              border: 'none',
              borderRadius: 'var(--radius-lg)',
              padding: '0.3rem 0.75rem',
              fontSize: '0.6875rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
              transition: 'transform 0.1s ease',
            }}
          >
            <Bell size={12} />
            <span>Set Reminder</span>
          </button>
        </div>
      </div>

      {/* ── 2. Lifestyle & Dietary Conflict Radar Cards ── */}
      {radar.conflicts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {radar.conflicts.map((conflict) => {
            const style = getSeverityStyle(conflict.severity);
            const isExpanded = expandedConflict === conflict.id;

            return (
              <div
                key={conflict.id}
                onClick={() => setExpandedConflict(isExpanded ? null : conflict.id)}
                style={{
                  background: style.bg,
                  border: `1.5px solid ${style.border}`,
                  borderRadius: 'var(--radius-xl)',
                  padding: '0.75rem 0.875rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: 'var(--radius-md)',
                        background: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.25rem',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                        flexShrink: 0,
                      }}
                    >
                      {conflict.icon}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span
                          style={{
                            background: style.badgeBg,
                            color: style.badgeText,
                            fontSize: '0.5625rem',
                            fontWeight: 800,
                            padding: '0.1rem 0.35rem',
                            borderRadius: 'var(--radius-sm)',
                            letterSpacing: '0.04em',
                          }}
                        >
                          {style.badgeLabel}
                        </span>
                        <span
                          style={{
                            fontSize: '0.6875rem',
                            fontWeight: 700,
                            color: style.text,
                            background: 'rgba(255,255,255,0.6)',
                            padding: '0.1rem 0.35rem',
                            borderRadius: 'var(--radius-sm)',
                          }}
                        >
                          {conflict.time_separation}
                        </span>
                      </div>
                      <h5 style={{ fontSize: '0.8125rem', fontWeight: 700, color: style.text, margin: '0.2rem 0 0 0' }}>
                        {conflict.title}
                      </h5>
                    </div>
                  </div>

                  <div style={{ color: style.text }}>
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>

                {/* Expanded Action Advice & Pharmacology Explanation */}
                {isExpanded && (
                  <div style={{ marginTop: '0.625rem', paddingTop: '0.625rem', borderTop: `1px dashed ${style.border}` }}>
                    <p style={{ fontSize: '0.75rem', lineHeight: 1.5, color: style.text, margin: '0 0 0.5rem 0' }}>
                      {conflict.description}
                    </p>
                    <div
                      style={{
                        background: 'white',
                        padding: '0.5rem 0.625rem',
                        borderRadius: 'var(--radius-md)',
                        border: `1px solid ${style.border}`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: style.text,
                      }}
                    >
                      <Info size={14} style={{ flexShrink: 0 }} />
                      <span>{conflict.action_advice}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
