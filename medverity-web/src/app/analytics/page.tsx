'use client';

import React from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Calendar, ChevronRight, TrendingUp, Pill } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

export default function AnalyticsPage() {
  const [adherenceData, setAdherenceData] = useState<any[]>([]);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [overallRate, setOverallRate] = useState(0);
  const [mostScanned, setMostScanned] = useState<{name: string; count: number}[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const url = user?.id
          ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/analytics?user_id=${encodeURIComponent(user.id)}`
          : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/analytics`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.adherenceData) setAdherenceData(data.adherenceData);
        if (data.weeklyData) setWeeklyData(data.weeklyData);
        if (data.overallRate !== undefined) setOverallRate(data.overallRate);
        if (data.mostScanned) setMostScanned(data.mostScanned);
      } catch (err) {
        console.error(err);
      }
    }
    fetchAnalytics();
  }, [user]);
  return (
    <div className="page-container" style={{ maxWidth: '640px', paddingBottom: '5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.375rem', fontWeight: 700 }}>Analytics</h1>
        <button style={{ background: 'var(--color-surface-secondary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '0.5rem 0.75rem', color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
          <Calendar size={16} />
          This Week
        </button>
      </div>

      {/* Overall Adherence */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.25rem' }}>Overall Adherence</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>Your medicine intake rate</p>
          
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-teal-700)', background: 'var(--color-teal-50)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-full)', fontSize: '0.875rem', fontWeight: 600 }}>
            <TrendingUp size={16} />
            +5% from last week
          </div>
        </div>

        <div style={{ width: '120px', height: '120px', position: 'relative' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={adherenceData}
                innerRadius={45}
                outerRadius={60}
                startAngle={90}
                endAngle={-270}
                dataKey="value"
                stroke="none"
              >
                {adherenceData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div style={{ position: 'absolute', top: '0', left: '0', right: '0', bottom: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-teal-600)' }}>{overallRate}%</span>
          </div>
        </div>
      </div>

      {/* Weekly Trend */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.5rem' }}>Weekly Trend</h2>
        <div style={{ height: '200px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} />
              <Tooltip 
                cursor={{ fill: 'var(--color-surface-secondary)' }}
                contentStyle={{ borderRadius: 'var(--radius-md)', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              />
              <Bar dataKey="taken" stackId="a" fill="var(--color-teal-500)" radius={[0, 0, 4, 4]} />
              <Bar dataKey="missed" stackId="a" fill="var(--color-border)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--color-teal-500)' }} /> Taken
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--color-border)' }} /> Missed
          </div>
        </div>
      </div>

      {/* Most Scanned Medicines */}
      {mostScanned.length > 0 && (
        <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Pill size={18} color="var(--color-teal-600)" /> Most Scanned
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {mostScanned.map((item, i) => (
              <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--color-teal-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-teal-700)', flexShrink: 0 }}>{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 500, fontSize: '0.9375rem', color: 'var(--color-text-primary)' }}>{item.name}</p>
                </div>
                <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>{item.count}×</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Card */}
      <div className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
        <div>
          <p style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>Download Report</p>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Share with your doctor</p>
        </div>
        <ChevronRight size={20} color="var(--color-text-muted)" />
      </div>

    </div>
  );
}
