'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { ShieldAlert, Mail, KeyRound, Lock, Eye, EyeOff, CheckCircle2, ArrowLeft, ArrowRight, RefreshCw } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);

  const { forgotPassword, resetPassword } = useAuth();
  const router = useRouter();

  // Step 1: Request 6-digit verification code
  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await forgotPassword(email);
      if (res.error) {
        setError(res.error.message || 'Failed to send reset code.');
      } else {
        setSuccess('Verification code sent to your email.');
        if (res.data?.dev_code) {
          setDevCode(res.data.dev_code);
        }
        setStep('verify');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify code and set new password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    try {
      const res = await resetPassword({
        email,
        code,
        new_password: newPassword,
      });

      if (res.error) {
        setError(res.error.message || 'Failed to reset password.');
      } else {
        setSuccess('Password updated successfully! Redirecting to login...');
        setTimeout(() => {
          router.push('/auth/login');
        }, 1800);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, var(--color-teal-50) 0%, #FFFFFF 50%, var(--color-teal-50) 100%)',
      padding: '1.5rem',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '420px',
        animation: 'var(--animate-slide-up)',
      }}>
        {/* Logo */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginBottom: '2rem',
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            background: 'var(--color-teal-600)',
            borderRadius: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-md)',
            marginBottom: '0.75rem',
          }}>
            <ShieldAlert size={36} color="white" />
          </div>
          <h1 style={{
            fontSize: '1.75rem',
            fontWeight: 800,
            color: 'var(--color-teal-700)',
            letterSpacing: '-0.03em',
          }}>
            MedVerity
          </h1>
          <p style={{
            color: 'var(--color-text-secondary)',
            fontSize: '0.9375rem',
            marginTop: '0.25rem',
          }}>
            {step === 'request' ? 'Reset your password' : 'Enter verification code'}
          </p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: '2rem' }}>
          {error && (
            <div style={{
              background: 'var(--color-danger-50)',
              color: 'var(--color-danger-700)',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.875rem',
              marginBottom: '1rem',
            }}>
              {error}
            </div>
          )}

          {success && (
            <div style={{
              background: 'var(--color-success-50)',
              color: 'var(--color-success-700)',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.875rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              <CheckCircle2 size={16} />
              {success}
            </div>
          )}

          {step === 'request' ? (
            <form onSubmit={handleRequestCode} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.5, margin: 0 }}>
                Enter the email address registered with your account. We will send you a 6-digit verification code.
              </p>

              <div>
                <label htmlFor="reset-email" style={{
                  display: 'block',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  color: 'var(--color-text-secondary)',
                  marginBottom: '0.375rem',
                }}>
                  Email address
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={18} style={{
                    position: 'absolute',
                    left: '0.875rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--color-text-muted)',
                  }} />
                  <input
                    id="reset-email"
                    type="email"
                    className="input-field"
                    style={{ paddingLeft: '2.75rem' }}
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
                style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                {loading ? 'Sending Code...' : (
                  <>
                    Send Verification Code
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
                <Link
                  href="/auth/login"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    fontSize: '0.8125rem',
                    color: 'var(--color-text-muted)',
                    textDecoration: 'none',
                  }}
                >
                  <ArrowLeft size={14} /> Back to Sign In
                </Link>
              </div>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.5, margin: 0 }}>
                We sent a 6-digit verification code to <strong>{email}</strong>.
              </p>

              {devCode && (
                <div style={{
                  background: 'var(--color-teal-50)',
                  border: '1px dashed var(--color-teal-300)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.8125rem',
                  color: 'var(--color-teal-700)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <span>Your Code: <strong>{devCode}</strong></span>
                  <button
                    type="button"
                    onClick={() => setCode(devCode)}
                    style={{ background: 'none', border: 'none', color: 'var(--color-teal-600)', fontWeight: 600, cursor: 'pointer', fontSize: '0.75rem' }}
                  >
                    Auto-Fill
                  </button>
                </div>
              )}

              <div>
                <label htmlFor="reset-code" style={{
                  display: 'block',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  color: 'var(--color-text-secondary)',
                  marginBottom: '0.375rem',
                }}>
                  6-Digit Verification Code
                </label>
                <div style={{ position: 'relative' }}>
                  <KeyRound size={18} style={{
                    position: 'absolute',
                    left: '0.875rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--color-text-muted)',
                  }} />
                  <input
                    id="reset-code"
                    type="text"
                    maxLength={6}
                    className="input-field"
                    style={{ paddingLeft: '2.75rem', letterSpacing: '0.25em', fontWeight: 700 }}
                    placeholder="123456"
                    value={code}
                    onChange={(e) => setCode(e.target.value.trim())}
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="new-password" style={{
                  display: 'block',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  color: 'var(--color-text-secondary)',
                  marginBottom: '0.375rem',
                }}>
                  New Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} style={{
                    position: 'absolute',
                    left: '0.875rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--color-text-muted)',
                  }} />
                  <input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    className="input-field"
                    style={{ paddingLeft: '2.75rem', paddingRight: '2.75rem' }}
                    placeholder="At least 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '0.875rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--color-text-muted)',
                      padding: 0,
                    }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirm-password" style={{
                  display: 'block',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  color: 'var(--color-text-secondary)',
                  marginBottom: '0.375rem',
                }}>
                  Confirm New Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} style={{
                    position: 'absolute',
                    left: '0.875rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--color-text-muted)',
                  }} />
                  <input
                    id="confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    className="input-field"
                    style={{ paddingLeft: '2.75rem' }}
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
                style={{ marginTop: '0.5rem' }}
              >
                {loading ? 'Updating Password...' : 'Reset Password'}
              </button>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setStep('request')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-teal-600)',
                    fontSize: '0.8125rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                  }}
                >
                  <RefreshCw size={13} /> Change email / Resend
                </button>
                <Link
                  href="/auth/login"
                  style={{
                    fontSize: '0.8125rem',
                    color: 'var(--color-text-muted)',
                    textDecoration: 'none',
                  }}
                >
                  Cancel
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
