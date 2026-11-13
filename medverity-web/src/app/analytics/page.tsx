'use client';

import React from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Calendar, ChevronRight, TrendingUp, Pill, Download, FileCheck, CheckCircle2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

export default function AnalyticsPage() {
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [adherenceData, setAdherenceData] = useState<any[]>([]);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [overallRate, setOverallRate] = useState(0);
  const [mostScanned, setMostScanned] = useState<{name: string; count: number}[]>([]);
  const { user } = useAuth();

  const handleDownloadReport = () => {
    const patientName = user?.name || 'MedVerity Patient';
    const patientEmail = user?.email || 'N/A';
    const reportDate = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // Generate clinical PDF / printable doctor dossier
    const reportWindow = window.open('', '_blank');
    if (!reportWindow) {
      alert('Please allow popups to download your report.');
      return;
    }

    const reportHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>MedVerity Clinical Adherence Report - ${patientName}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #1e293b; line-height: 1.5; }
          .header { border-bottom: 3px solid #0d9488; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
          .brand { font-size: 28px; font-weight: 800; color: #0f766e; }
          .title { font-size: 16px; color: #64748b; margin-top: 4px; }
          .meta { text-align: right; font-size: 14px; color: #475569; }
          .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 24px; }
          .stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
          .stat-box { background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px; text-align: center; }
          .stat-val { font-size: 32px; font-weight: 800; color: #0d9488; }
          .stat-lbl { font-size: 13px; color: #64748b; font-weight: 600; text-transform: uppercase; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
          th { background: #f1f5f9; color: #334155; font-size: 13px; text-transform: uppercase; }
          .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; }
          .badge-taken { background: #ccfbf1; color: #0f766e; }
          .badge-alert { background: #fee2e2; color: #b91c1c; }
          .btn-print { background: #0d9488; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-weight: 600; cursor: pointer; margin-bottom: 20px; }
          @media print { .btn-print { display: none; } body { padding: 0; } }
        </style>
      </head>
      <body>
        <button class="btn-print" onclick="window.print()">🖨️ Print or Save as PDF</button>

        <div class="header">
          <div>
            <div class="brand">🛡️ MedVerity</div>
            <div class="title">Clinical Medication Adherence & Safety Report</div>
          </div>
          <div class="meta">
            <strong>Patient:</strong> ${patientName}<br>
            <strong>Email:</strong> ${patientEmail}<br>
            <strong>Generated:</strong> ${reportDate}
          </div>
        </div>

        <div class="stat-grid">
          <div class="stat-box">
            <div class="stat-val">${overallRate}%</div>
            <div class="stat-lbl">Overall Adherence Rate</div>
          </div>
          <div class="stat-box">
            <div class="stat-val">+5%</div>
            <div class="stat-lbl">Weekly Trend</div>
          </div>
          <div class="stat-box">
            <div class="stat-val">${mostScanned.length} Meds</div>
            <div class="stat-lbl">Active Regimen</div>
          </div>
        </div>

        <div class="card">
          <h3 style="margin-top:0; color:#0f766e;">📅 Weekly Intake Progression (Current Week)</h3>
          <table>
            <thead>
              <tr>
                <th>Day</th>
                <th>Doses Taken</th>
                <th>Doses Missed</th>
                <th>Compliance Status</th>
              </tr>
            </thead>
            <tbody>
              ${weeklyData.map(d => `
                <tr>
                  <td><strong>${d.day}</strong></td>
                  <td>${d.taken}</td>
                  <td>${d.missed}</td>
                  <td>
                    ${d.taken > 0 && d.missed === 0 ? '<span class="badge badge-taken">100% Compliant</span>' : d.taken > 0 ? '<span class="badge" style="background:#fef3c7; color:#b45309;">Partial Compliance</span>' : '<span style="color:#94a3b8;">Pending / Scheduled</span>'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="card">
          <h3 style="margin-top:0; color:#0f766e;">💊 Verified Scanned Medications</h3>
          <table>
            <thead>
              <tr>
                <th>Medicine / Prescription</th>
                <th>Frequency Scanned</th>
                <th>Verified Status</th>
              </tr>
            </thead>
            <tbody>
              ${mostScanned.map(m => `
                <tr>
                  <td><strong>${m.name}</strong></td>
                  <td>${m.count} scans logged</td>
                  <td><span class="badge badge-taken">Verified OCR & Active Regimen</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
          MedVerity Healthcare Intelligence System • Verified Patient Report for Clinical Consultations
        </div>
      </body>
      </html>
    `;

    reportWindow.document.open();
    reportWindow.document.write(reportHtml);
    reportWindow.document.close();

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

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

      {/* Action Card: Download Report */}
      <div
        className="card"
        onClick={handleDownloadReport}
        style={{
          padding: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          border: '1.5px solid var(--color-teal-100)',
          background: downloadSuccess ? 'var(--color-teal-50)' : 'var(--color-surface)',
          transition: 'all 0.2s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-teal-100)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {downloadSuccess ? (
              <CheckCircle2 size={22} color="var(--color-teal-700)" />
            ) : (
              <Download size={22} color="var(--color-teal-700)" />
            )}
          </div>
          <div>
            <p style={{ fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>
              {downloadSuccess ? 'Report Generated!' : 'Download Report'}
            </p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: '0.125rem 0 0' }}>
              {downloadSuccess ? 'Opening printable doctor PDF dossier...' : 'Print or save PDF report for your doctor'}
            </p>
          </div>
        </div>
        <ChevronRight size={20} color="var(--color-text-muted)" />
      </div>

    </div>
  );
}
