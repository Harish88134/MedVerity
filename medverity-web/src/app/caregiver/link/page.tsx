'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, QrCode, Copy, Share2, Info, Check, ExternalLink, RefreshCw, Smartphone, Send } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '@/hooks/useAuth';

export default function CaregiverLinkPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [origin, setOrigin] = useState('');
  const [copied, setCopied] = useState(false);
  const [token, setToken] = useState<string>('');
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
      setCanShare(!!navigator.share);
      setToken(Math.random().toString(36).substring(2, 9));
    }
  }, []);

  const patientName = user?.name || 'Patient';
  const patientId = user?.id || 'demo-patient';
  
  // Real dynamic invite URL
  const baseUrl = origin || 'http://localhost:3000';
  const inviteUrl = `${baseUrl}/caregiver/accept?patient_id=${encodeURIComponent(patientId)}&name=${encodeURIComponent(patientName)}${token ? `&token=${token}` : ''}`;

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(inviteUrl);
      } else {
        // Fallback for older browsers / non-secure contexts
        const textarea = document.createElement('textarea');
        textarea.value = inviteUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error('Failed to copy to clipboard', err);
      // Fallback alert
      prompt('Copy your caregiver invite link:', inviteUrl);
    }
  };

  const handleShareWhatsApp = () => {
    const text = `Hi! I'm inviting you to be my caregiver on MedVerity so you can monitor my medicine schedule and adherence:\n\n${inviteUrl}`;
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `MedVerity Caregiver Invite from ${patientName}`,
          text: `Connect with ${patientName} on MedVerity to monitor medication schedule and health alerts.`,
          url: inviteUrl,
        });
      } catch (err) {
        // User cancelled or share failed
        console.log('Share dismissed', err);
      }
    } else {
      handleCopyLink();
    }
  };

  const handleRegenerate = () => {
    setToken(Math.random().toString(36).substring(2, 9));
    setCopied(false);
  };

  return (
    <div className="page-container" style={{ maxWidth: '640px', paddingBottom: '5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={() => router.back()}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-primary)',
              display: 'flex',
              alignItems: 'center',
              padding: '0.25rem',
            }}
            aria-label="Back"
          >
            <ArrowLeft size={22} />
          </button>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Link Caregiver</h1>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
              Invite a family member or nurse to monitor your medications
            </p>
          </div>
        </div>

        <button
          onClick={handleRegenerate}
          title="Generate fresh invite code"
          style={{
            background: 'var(--color-surface-secondary)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-full)',
            padding: '0.45rem 0.75rem',
            fontSize: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            cursor: 'pointer',
            color: 'var(--color-text-secondary)',
          }}
        >
          <RefreshCw size={13} />
          New Code
        </button>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        {/* Real Dynamic QR Code Card */}
        <div style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-2xl)',
          padding: '2rem 1.5rem',
          boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
          border: '1.5px solid var(--color-border-light)',
          maxWidth: '360px',
          margin: '0 auto 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}>
          <div style={{
            background: 'white',
            padding: '1rem',
            borderRadius: 'var(--radius-xl)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
            border: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <QRCodeSVG
              value={inviteUrl}
              size={210}
              level="H"
              includeMargin={false}
              fgColor="#0f766e"
            />
          </div>

          <div style={{ marginTop: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-teal-700)', fontWeight: 600, fontSize: '0.875rem' }}>
            <Smartphone size={16} />
            <span>Scan with phone camera to connect</span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.375rem' }}>
            Works with iPhone Camera, Android Camera, Google Lens, or WhatsApp
          </p>
        </div>

        {/* Link Field with Quick Copy */}
        <div style={{ marginBottom: '1.25rem', padding: '0 0.5rem' }}>
          <label style={{
            fontSize: '0.8125rem',
            fontWeight: 600,
            color: 'var(--color-text-secondary)',
            display: 'block',
            textAlign: 'left',
            marginBottom: '0.375rem',
          }}>
            Caregiver Invite Link
          </label>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: 'var(--color-surface-secondary)',
            border: copied ? '1.5px solid var(--color-success-500)' : '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '0.5rem 0.75rem',
            gap: '0.5rem',
            transition: 'all 0.2s ease',
          }}>
            <input
              type="text"
              readOnly
              value={inviteUrl}
              style={{
                flex: 1,
                border: 'none',
                background: 'transparent',
                fontSize: '0.8125rem',
                color: 'var(--color-text-primary)',
                fontFamily: 'monospace',
                outline: 'none',
              }}
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <button
              onClick={handleCopyLink}
              style={{
                background: copied ? 'var(--color-success-600)' : 'var(--color-teal-600)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                padding: '0.4rem 0.85rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease',
              }}
            >
              {copied ? (
                <>
                  <Check size={14} />
                  Copied!
                </>
              ) : (
                <>
                  <Copy size={14} />
                  Copy
                </>
              )}
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0 0.5rem' }}>
          {/* Share via WhatsApp */}
          <button
            onClick={handleShareWhatsApp}
            style={{
              background: '#25D366',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-xl)',
              padding: '0.875rem 1rem',
              fontWeight: 600,
              fontSize: '0.9375rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 12px rgba(37, 211, 102, 0.25)',
              transition: 'transform 0.15s ease',
            }}
          >
            <Send size={18} />
            Share via WhatsApp
          </button>

          {/* Native Share / Copy Button */}
          {canShare && (
            <button
              onClick={handleNativeShare}
              className="btn-outline"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.875rem 1rem',
                borderRadius: 'var(--radius-xl)',
                fontWeight: 600,
              }}
            >
              <Share2 size={18} />
              Share via Other Apps...
            </button>
          )}

          {/* Test / Preview Accept Page in Browser */}
          <a
            href={inviteUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.375rem',
              fontSize: '0.8125rem',
              color: 'var(--color-teal-700)',
              fontWeight: 500,
              textDecoration: 'none',
              marginTop: '0.25rem',
            }}
          >
            <span>Preview Caregiver Accept Screen</span>
            <ExternalLink size={13} />
          </a>
        </div>
      </div>

      {/* Permissions / Privacy Notice */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
        padding: '1rem',
        background: 'var(--color-teal-50)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-teal-100)',
      }}>
        <Info size={20} color="var(--color-teal-600)" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-teal-900)', marginBottom: '0.125rem' }}>
            Safe & Private Caregiver Access
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-teal-800)', lineHeight: 1.5 }}>
            Your caregiver will only have visibility into your medicine schedule, adherence percentage, and missed dose alerts. They will never have access to billing or account passwords, and you can revoke access at any time in Settings.
          </p>
        </div>
      </div>
    </div>
  );
}
