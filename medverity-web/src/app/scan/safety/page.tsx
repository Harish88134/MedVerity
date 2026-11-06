'use client';

import React, { useEffect, useState } from 'react';
import { ArrowLeft, AlertTriangle, Baby, Utensils, Activity, ShieldAlert, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import LifestyleRadar from '@/components/medicine/LifestyleRadar';

interface Interaction {
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
}

interface SafetyData {
  food_interactions: Interaction[];
  pregnancy_lactation: Interaction[];
  drug_interactions: Interaction[];
  high_risk: boolean;
  active_ingredients: string[];
}

const SeverityBadge = ({ severity }: { severity: string }) => {
  if (severity === 'high') {
    return <span className="badge" style={{ background: 'var(--color-danger-100)', color: 'var(--color-danger-700)' }}>High Risk</span>;
  }
  if (severity === 'medium') {
    return <span className="badge" style={{ background: 'var(--color-warning-100)', color: 'var(--color-warning-700)' }}>Moderate</span>;
  }
  return <span className="badge" style={{ background: 'var(--color-success-100)', color: 'var(--color-success-700)' }}>Low Risk</span>;
};

function SafetyInformationContent() {
  const searchParams = useSearchParams();
  const medicineName = searchParams?.get('medicine') || '';
  const scanId = searchParams?.get('scan_id') || '';

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SafetyData | null>(null);

  useEffect(() => {
    if (!medicineName) return;

    const fetchSafety = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/interactions?medicine_name=${encodeURIComponent(medicineName)}`);
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchSafety();
  }, [medicineName]);

  return (
    <div className="page-container" style={{ maxWidth: '540px', paddingBottom: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem', position: 'relative' }}>
        <Link href={`/scan/result?scan_id=${scanId}&ocr_text=${encodeURIComponent(medicineName)}&confidence=1.0`} style={{ color: 'var(--color-text-primary)' }}>
          <ArrowLeft size={22} />
        </Link>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 600, flex: 1, textAlign: 'center', marginRight: '22px' }}>
          Safety Information
        </h1>
      </div>

      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>{medicineName}</h2>
      
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <Loader2 className="animate-spin" size={32} color="var(--color-teal-500)" />
        </div>
      ) : !data || (!data.food_interactions.length && !data.pregnancy_lactation.length && !data.drug_interactions.length) ? (
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <ShieldAlert size={32} color="var(--color-success-500)" style={{ margin: '0 auto 1rem' }} />
          <h3>No major safety warnings found</h3>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
            However, always consult your doctor for personalized medical advice.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Phase 2: Food, Sunlight & Lifestyle Conflict Radar + Chronotherapy */}
          <LifestyleRadar medicineName={medicineName} />
          
          {data.high_risk && (
            <div style={{ background: 'var(--color-danger-50)', border: '1px solid var(--color-danger-200)', borderRadius: 'var(--radius-lg)', padding: '1rem', display: 'flex', gap: '0.75rem' }}>
              <AlertTriangle color="var(--color-danger-600)" />
              <div>
                <h3 style={{ color: 'var(--color-danger-700)', fontWeight: 600, marginBottom: '0.25rem' }}>High Risk Medicine</h3>
                <p style={{ color: 'var(--color-danger-700)', fontSize: '0.875rem', opacity: 0.9 }}>
                  This medicine has significant safety warnings. Please review carefully.
                </p>
              </div>
            </div>
          )}

          {data.drug_interactions.length > 0 && (
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <Activity color="var(--color-warning-600)" />
                <h3 style={{ fontWeight: 600 }}>Drug Interactions</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {data.drug_interactions.map((interaction, i) => (
                  <div key={i} style={{ paddingBottom: i !== data.drug_interactions.length - 1 ? '1rem' : 0, borderBottom: i !== data.drug_interactions.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{interaction.title}</span>
                      <SeverityBadge severity={interaction.severity} />
                    </div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>{interaction.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.pregnancy_lactation.length > 0 && (
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <Baby color="var(--color-teal-600)" />
                <h3 style={{ fontWeight: 600 }}>Pregnancy & Lactation</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {data.pregnancy_lactation.map((interaction, i) => (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{interaction.title}</span>
                      <SeverityBadge severity={interaction.severity} />
                    </div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>{interaction.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.food_interactions.length > 0 && (
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <Utensils color="var(--color-teal-600)" />
                <h3 style={{ fontWeight: 600 }}>Food Interactions</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {data.food_interactions.map((interaction, i) => (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{interaction.title}</span>
                      <SeverityBadge severity={interaction.severity} />
                    </div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>{interaction.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SafetyInformationPage() {
  return (
    <React.Suspense fallback={
      <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
        <Loader2 className="animate-spin" size={32} color="var(--color-teal-500)" />
      </div>
    }>
      <SafetyInformationContent />
    </React.Suspense>
  );
}
