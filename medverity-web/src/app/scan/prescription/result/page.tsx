'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { ArrowLeft, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Loader2, Info } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface Flag {
    type: string;
    allergy?: string;
    with?: string;
    risk_level?: string;
    description: string;
}

interface MedicineResult {
    medicine_name: string;
    status: 'clear' | 'warning' | 'danger' | 'unknown';
    flags: Flag[];
}

interface PrescriptionResult {
    prescription_id: string;
    scanned_at: string;
    medicines: MedicineResult[];
    summary: {
        clear_count: number;
        warning_count: number;
        danger_count: number;
    }
}

function PrescriptionResultContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const prescriptionId = searchParams.get('prescription_id');
    
    const [data, setData] = useState<PrescriptionResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [expandedCards, setExpandedCards] = useState<Record<number, boolean>>({});

    useEffect(() => {
        if (!prescriptionId) {
            setError("Missing prescription data.");
            setLoading(false);
            return;
        }

        try {
            // 1. Try reading the cached JSON from sessionStorage
            const cachedData = sessionStorage.getItem(`rx_${prescriptionId}`);
            if (cachedData) {
                setData(JSON.parse(cachedData));
                setLoading(false);
                return;
            }

            // 2. Fallback to API if sessionStorage is empty (e.g. page refresh or direct link)
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            fetch(`${apiUrl}/prescription/${prescriptionId}`)
                .then(res => res.json())
                .then(resData => {
                    if (resData && !resData.error && resData.medicines) {
                        setData(resData);
                    } else {
                        setError("Prescription data not found. Please scan again.");
                    }
                })
                .catch(fetchErr => {
                    console.error("API fetch error:", fetchErr);
                    setError("Prescription data not found. Please scan again.");
                })
                .finally(() => {
                    setLoading(false);
                });
            return;
        } catch (err) {
            console.error(err);
            setError("Failed to load prescription results.");
        } finally {
            setLoading(false);
        }
    }, [prescriptionId]);

    const toggleCard = (index: number) => {
        setExpandedCards(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
                <Loader2 size={48} className="animate-spin" color="var(--color-teal-600)" style={{ marginBottom: '1rem' }} />
                <p style={{ color: 'var(--color-text-secondary)' }}>Analyzing prescription safety...</p>
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

    const hasDanger = data.summary.danger_count > 0;
    const hasWarning = data.summary.warning_count > 0;

    return (
        <div style={{ maxWidth: '640px', margin: '0 auto', animation: 'var(--animate-fade-in)' }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                padding: '0.75rem 1rem',
                borderBottom: '1px solid var(--color-border-light)',
            }}>
                <button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-primary)', marginRight: '1rem' }}>
                    <ArrowLeft size={22} />
                </button>
                <h1 style={{ fontSize: '1.0625rem', fontWeight: 600 }}>Prescription Safety Check</h1>
            </div>

            <div style={{ padding: '1rem 1.25rem 2rem' }}>
                {/* Summary Banner */}
                <div style={{
                    padding: '1rem',
                    background: hasDanger ? 'var(--color-danger-50)' : hasWarning ? 'var(--color-warning-50)' : 'var(--color-teal-50)',
                    borderRadius: 'var(--radius-lg)',
                    marginBottom: '1.5rem',
                    border: `1px solid ${hasDanger ? 'var(--color-danger-200)' : hasWarning ? 'var(--color-warning-200)' : 'var(--color-teal-200)'}`,
                }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                        {hasDanger ? (
                            <AlertTriangle color="var(--color-danger-600)" style={{ flexShrink: 0 }} />
                        ) : hasWarning ? (
                            <AlertTriangle color="var(--color-warning-600)" style={{ flexShrink: 0 }} />
                        ) : (
                            <CheckCircle2 color="var(--color-teal-600)" style={{ flexShrink: 0 }} />
                        )}
                        <div>
                            <p style={{ 
                                fontWeight: 600, 
                                fontSize: '0.9375rem', 
                                color: hasDanger ? 'var(--color-danger-700)' : hasWarning ? 'var(--color-warning-700)' : 'var(--color-teal-700)',
                                marginBottom: '0.25rem' 
                            }}>
                                {hasDanger ? 'Critical Conflicts Detected' : hasWarning ? 'Action Required' : 'No Known Conflicts Detected'}
                            </p>
                            <p style={{ 
                                fontSize: '0.8125rem', 
                                color: hasDanger ? 'var(--color-danger-700)' : hasWarning ? 'var(--color-warning-700)' : 'var(--color-teal-700)', 
                                opacity: 0.9 
                            }}>
                                We checked {data.medicines.length} medicines against your profile.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Medicine List */}
                <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>Prescribed Medicines</h2>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
                    {data.medicines.map((med, index) => {
                        const isClear = med.status === 'clear';
                        const isWarning = med.status === 'warning';
                        const isDanger = med.status === 'danger';
                        const isUnknown = med.status === 'unknown';
                        const expanded = expandedCards[index];

                        return (
                            <div key={index} style={{
                                background: 'var(--color-surface)',
                                borderRadius: 'var(--radius-lg)',
                                border: `1px solid ${isDanger ? 'var(--color-danger-300)' : isWarning ? 'var(--color-warning-300)' : 'var(--color-border-light)'}`,
                                overflow: 'hidden',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                            }}>
                                <div 
                                    onClick={() => toggleCard(index)}
                                    style={{
                                        padding: '1rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        cursor: 'pointer',
                                        background: isDanger ? 'var(--color-danger-50)' : isWarning ? 'var(--color-warning-50)' : 'transparent'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        {isDanger ? <AlertTriangle size={20} color="var(--color-danger-600)" /> : 
                                         isWarning ? <AlertTriangle size={20} color="var(--color-warning-600)" /> : 
                                         isUnknown ? <Info size={20} color="var(--color-text-secondary)" /> :
                                         <CheckCircle2 size={20} color="var(--color-teal-600)" />}
                                        <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{med.medicine_name}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span style={{
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            padding: '0.2rem 0.5rem',
                                            borderRadius: 'var(--radius-full)',
                                            background: isDanger ? 'var(--color-danger-100)' : isWarning ? 'var(--color-warning-100)' : isUnknown ? 'var(--color-surface-secondary)' : 'var(--color-teal-100)',
                                            color: isDanger ? 'var(--color-danger-700)' : isWarning ? 'var(--color-warning-700)' : isUnknown ? 'var(--color-text-secondary)' : 'var(--color-teal-700)'
                                        }}>
                                            {med.status.toUpperCase()}
                                        </span>
                                        {med.flags.length > 0 && (
                                            expanded ? <ChevronUp size={18} color="var(--color-text-muted)" /> : <ChevronDown size={18} color="var(--color-text-muted)" />
                                        )}
                                    </div>
                                </div>
                                
                                {expanded && med.flags.length > 0 && (
                                    <div style={{ padding: '0 1rem 1rem 1rem', borderTop: '1px solid var(--color-border-light)' }}>
                                        <ul style={{ listStyle: 'none', padding: 0, margin: '0.75rem 0 0 0', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            {med.flags.map((flag, fIndex) => (
                                                <li key={fIndex} style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', background: flag.risk_level === 'danger' ? 'var(--color-danger-50)' : flag.risk_level === 'warning' ? 'var(--color-warning-50)' : 'var(--color-surface-secondary)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-light)' }}>
                                                    <div style={{ fontWeight: 700, color: flag.risk_level === 'danger' ? 'var(--color-danger-700)' : flag.risk_level === 'warning' ? 'var(--color-warning-700)' : 'var(--color-text-primary)', marginBottom: '0.2rem' }}>
                                                        {(flag as any).title || (flag.type === 'allergy' ? `🚨 Allergy Alert: ${flag.allergy}` : flag.type)}
                                                    </div>
                                                    <div>{flag.description}</div>
                                                    {(flag as any).recommendation && (
                                                        <div style={{ fontWeight: 600, marginTop: '0.25rem', color: flag.risk_level === 'danger' ? 'var(--color-danger-800)' : 'var(--color-teal-700)' }}>
                                                            📌 {(flag as any).recommendation}
                                                        </div>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Disclaimer */}
                <div style={{
                    padding: '1rem',
                    background: 'var(--color-surface-secondary)',
                    borderRadius: 'var(--radius-lg)',
                    textAlign: 'center'
                }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', lineHeight: 1.5, margin: 0 }}>
                        <strong>Disclaimer:</strong> Always confirm with your doctor or pharmacist before starting a new prescription. This tool checks against your saved profile but cannot replace professional medical advice.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function PrescriptionResultPage() {
    return (
        <Suspense fallback={<div style={{ padding: '3rem', textAlign: 'center' }}><Loader2 className="animate-spin" style={{ margin: '0 auto' }}/></div>}>
            <PrescriptionResultContent />
        </Suspense>
    )
}
