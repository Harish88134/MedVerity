'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { ShieldAlert, Mail, Lock, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await signIn(email, password);
    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.push('/');
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
            Welcome back
          </h2>
          <p style={{
            color: 'var(--color-text-secondary)',
            fontSize: '0.875rem',
            marginBottom: '1.5rem',
          }}>
            Sign in to your account
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
              <label htmlFor="login-email" style={{
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
                  id="login-email"
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
              <label htmlFor="login-password" style={{
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
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className="input-field"
                  style={{ paddingLeft: '2.75rem', paddingRight: '2.75rem' }}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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

            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ marginTop: '0.5rem' }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p style={{
            textAlign: 'center',
            color: 'var(--color-text-secondary)',
            fontSize: '0.875rem',
            marginTop: '1.5rem',
          }}>
            Don&apos;t have an account?{' '}
            <Link href="/auth/signup" style={{
              color: 'var(--color-teal-600)',
              fontWeight: 600,
              textDecoration: 'none',
            }}>
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
