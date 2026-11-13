'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { ShieldAlert, Mail, Lock, Eye, EyeOff, CheckCircle2, ArrowLeft, ArrowRight, ShieldCheck, KeyRound, HelpCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<'email' | 'security' | 'new_password'>('email');
  const [email, setEmail] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { forgotPassword, verifySecurityAnswer, resetPasswordWithSecurity } = useAuth();
  const router = useRouter();

  // Step 1: Look up account & security question
  const handleFindAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      const res = await forgotPassword(cleanEmail);
      if (res.error) {
        setError(res.error.message || 'No account found with this email.');
      } else {
        setSecurityQuestion(res.data?.security_question || 'What is your registered phone number?');
        setStep('security');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify security answer
  const handleVerifyAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      const res = await verifySecurityAnswer({
        email: cleanEmail,
        security_answer: securityAnswer,
        registered_phone: securityAnswer,
      });

      if (res.error) {
        setError(res.error.message || 'Verification failed. Please check your answer.');
      } else {
        setVerificationToken(res.data?.verification_token || '');
        setStep('new_password');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Set new password
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
      const cleanEmail = email.trim().toLowerCase();
      const res = await resetPasswordWithSecurity({
        email: cleanEmail,
        verification_token: verificationToken,
        new_password: newPassword,
      });

      if (res.error) {
        setError(res.error.message || 'Failed to update password.');
      } else {
        setSuccess('Password updated successfully! Redirecting to login...');
        setTimeout(() => {
          router.push('/auth/login');
        }, 1500);
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
            {step === 'email' && 'Find your account'}
            {step === 'security' && 'Security Verification'}
            {step === 'new_password' && 'Create new password'}
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

          {/* STEP 1: Enter Email */}
          {step === 'email' && (
            <form onSubmit={handleFindAccount} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.5, margin: 0 }}>
                Enter the email address registered with your MedVerity account to begin password recovery.
              </p>

              <div>
                <label htmlFor="lookup-email" style={{
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
                    id="lookup-email"
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
                {loading ? 'Finding account...' : (
                  <>
                    Continue
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
          )}

          {/* STEP 2: Security Verification */}
          {step === 'security' && (
            <form onSubmit={handleVerifyAnswer} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{
                background: 'var(--color-teal-50)',
                border: '1px solid var(--color-teal-200)',
                borderRadius: 'var(--radius-md)',
                padding: '0.875rem',
                display: 'flex',
                gap: '0.625rem',
                alignItems: 'flex-start',
              }}>
                <ShieldCheck size={20} color="var(--color-teal-600)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-teal-800)', margin: '0 0 0.25rem' }}>
                    Identity Verification
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-teal-700)', margin: 0, lineHeight: 1.4 }}>
                    To verify ownership of <strong>{email}</strong>, please answer your registered security prompt below.
                  </p>
                </div>
              </div>

              <div>
                <label htmlFor="sec-question" style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: 'var(--color-text-primary)',
                  marginBottom: '0.375rem',
                }}>
                  <HelpCircle size={15} color="var(--color-teal-600)" />
                  {securityQuestion}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="sec-answer"
                    type="text"
                    className="input-field"
                    placeholder="Enter your answer or registered phone"
                    value={securityAnswer}
                    onChange={(e) => setSecurityAnswer(e.target.value)}
                    required
                  />
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem', marginBottom: 0 }}>
                  Enter your registered phone number or the answer you provided during registration.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
                style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                {loading ? 'Verifying...' : (
                  <>
                    Verify Identity
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setStep('email')}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '0.8125rem',
                    color: 'var(--color-text-muted)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                  }}
                >
                  <ArrowLeft size={14} /> Try a different email
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: Set New Password */}
          {step === 'new_password' && (
            <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.5, margin: 0 }}>
                Identity confirmed! Enter your new password below.
              </p>

              <div>
                <label htmlFor="new-pw" style={{
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
                    id="new-pw"
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
                <label htmlFor="confirm-pw" style={{
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
                    id="confirm-pw"
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
                {loading ? 'Updating Password...' : 'Save New Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
