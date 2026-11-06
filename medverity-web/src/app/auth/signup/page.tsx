'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { ShieldAlert, Mail, Lock, Eye, EyeOff, User } from 'lucide-react';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    const result = await signUp(name, email, password);
    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.push('/onboarding');
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
            marginBottom: '1rem',
            boxShadow: '0 4px 16px rgba(13, 148, 136, 0.3)',
          }}>
            <ShieldAlert size={32} color="white" />
          </div>
          <h1 style={{
            fontSize: '1.75rem',
            fontWeight: 700,
            color: 'var(--color-teal-700)',
            letterSpacing: '-0.02em',
          }}>
            MedVerity
          </h1>
          <p style={{
            color: 'var(--color-text-muted)',
            fontSize: '0.875rem',
            marginTop: '0.25rem',
          }}>
            Understand. Take. Care.
          </p>
        </div>

        {/* Form Card */}
        <div className="card" style={{ padding: '2rem' }}>
          <h2 style={{
            fontSize: '1.375rem',
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            marginBottom: '0.375rem',
          }}>
            Create an account
          </h2>
          <p style={{
            color: 'var(--color-text-secondary)',
            fontSize: '0.875rem',
            marginBottom: '1.5rem',
          }}>
            Start understanding your medicines today
          </p>

          {error && (
            <div style={{
              padding: '0.75rem 1rem',
              background: 'var(--color-danger-50)',
              border: '1px solid var(--color-danger-100)',
              borderRadius: 'var(--radius-lg)',
              color: 'var(--color-danger-600)',
              fontSize: '0.875rem',
              marginBottom: '1rem',
              animation: 'var(--animate-scale-in)',
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label htmlFor="signup-name" style={{
                display: 'block',
                fontSize: '0.8125rem',
                fontWeight: 500,
                color: 'var(--color-text-secondary)',
                marginBottom: '0.375rem',
              }}>
                Full name
              </label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{
                  position: 'absolute',
                  left: '0.875rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--color-text-muted)',
                }} />
                <input
                  id="signup-name"
                  type="text"
                  className="input-field"
                  style={{ paddingLeft: '2.75rem' }}
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="signup-email" style={{
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
                  id="signup-email"
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

            <div>
              <label htmlFor="signup-password" style={{
                display: 'block',
                fontSize: '0.8125rem',
                fontWeight: 500,
                color: 'var(--color-text-secondary)',
                marginBottom: '0.375rem',
              }}>
                Password
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
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  className="input-field"
                  style={{ paddingLeft: '2.75rem', paddingRight: '2.75rem' }}
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
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
              <label htmlFor="signup-confirm" style={{
                display: 'block',
                fontSize: '0.8125rem',
                fontWeight: 500,
                color: 'var(--color-text-secondary)',
                marginBottom: '0.375rem',
              }}>
                Confirm password
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
                  id="signup-confirm"
                  type={showPassword ? 'text' : 'password'}
                  className="input-field"
                  style={{ paddingLeft: '2.75rem' }}
                  placeholder="Repeat your password"
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
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p style={{
            textAlign: 'center',
            color: 'var(--color-text-secondary)',
            fontSize: '0.875rem',
            marginTop: '1.5rem',
          }}>
            Already have an account?{' '}
            <Link href="/auth/login" style={{
              color: 'var(--color-teal-600)',
              fontWeight: 600,
              textDecoration: 'none',
            }}>
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
