'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  ScanLine,
  Clock,
  Bell,
  Users,
  BarChart3,
  ShieldAlert,
  Settings,
  HelpCircle,
  LogOut,
  Pill,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const NAV_ITEMS = [
  { href: '/analytics', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/scan', label: 'Scan Medicine', icon: ScanLine },
  { href: '/scan/reconcile', label: 'Pill Reconciler', icon: Pill },
  { href: '/history', label: 'History', icon: Clock },
  { href: '/reminders', label: 'Reminders', icon: Bell },
  { href: '/caregiver', label: 'Caregiver', icon: Users },
  { href: '/allergy-profile', label: 'Allergy Profile', icon: ShieldAlert },
  { href: '/settings/emergency-card', label: 'Emergency ICE Card', icon: HelpCircle },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { signOut } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut();
    router.push('/auth/login');
  };

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <aside className="app-sidebar" id="sidebar-nav">
      {/* Logo */}
      <div style={{
        padding: '1.5rem 1.25rem 0.5rem',
        borderBottom: '1px solid var(--color-border-light)',
        marginBottom: '0.5rem',
      }}>
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <div style={{
            width: '40px',
            height: '40px',
            background: 'var(--color-teal-600)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <ShieldAlert size={22} color="white" />
          </div>
          <div>
            <span style={{
              fontSize: '1.25rem',
              fontWeight: 700,
              color: 'var(--color-teal-700)',
              letterSpacing: '-0.02em',
            }}>
              MedVerity
            </span>
            <p style={{
              fontSize: '0.6875rem',
              color: 'var(--color-text-muted)',
              margin: 0,
              lineHeight: 1.2,
            }}>
              Understand. Take. Care.
            </p>
          </div>
        </Link>
      </div>

      {/* Nav Items */}
      <nav style={{ flex: 1, padding: '0.5rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              id={`sidebar-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.625rem 1rem',
                borderRadius: 'var(--radius-lg)',
                textDecoration: 'none',
                fontSize: '0.9375rem',
                fontWeight: active ? 600 : 400,
                color: active ? 'white' : 'var(--color-text-secondary)',
                background: active ? 'var(--color-teal-600)' : 'transparent',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.background = 'var(--color-teal-50)';
                  e.currentTarget.style.color = 'var(--color-teal-700)';
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--color-text-secondary)';
                }
              }}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Scan CTA Card */}
      <div style={{ padding: '0 0.75rem', marginBottom: '0.75rem' }}>
        <div style={{
          background: 'var(--color-teal-50)',
          borderRadius: 'var(--radius-xl)',
          padding: '1rem',
          border: '1px solid var(--color-teal-200)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Pill size={18} color="var(--color-teal-600)" />
            <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-teal-800)' }}>
              Scan a medicine
            </span>
          </div>
          <p style={{
            fontSize: '0.75rem',
            color: 'var(--color-text-secondary)',
            margin: '0 0 0.75rem',
            lineHeight: 1.5,
          }}>
            Get instant information in your language
          </p>
          <Link
            href="/scan"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
              padding: '0.5rem 1rem',
              background: 'var(--color-teal-600)',
              color: 'white',
              borderRadius: 'var(--radius-lg)',
              fontSize: '0.8125rem',
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'background 0.15s ease',
            }}
          >
            Scan Now →
          </Link>
        </div>
      </div>

      {/* Bottom actions */}
      <div style={{
        padding: '0.75rem',
        borderTop: '1px solid var(--color-border-light)',
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
      }}>
        <Link
          href="/help"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.625rem 1rem',
            borderRadius: 'var(--radius-lg)',
            textDecoration: 'none',
            fontSize: '0.9375rem',
            color: 'var(--color-text-secondary)',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--color-teal-50)';
            e.currentTarget.style.color = 'var(--color-teal-700)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--color-text-secondary)';
          }}
        >
          <HelpCircle size={20} />
          <span>Help</span>
        </Link>
        <button
          onClick={handleLogout}
          id="sidebar-logout"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.625rem 1rem',
            borderRadius: 'var(--radius-lg)',
            fontSize: '0.9375rem',
            color: 'var(--color-text-secondary)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            width: '100%',
            fontFamily: 'var(--font-sans)',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--color-danger-50)';
            e.currentTarget.style.color = 'var(--color-danger-600)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--color-text-secondary)';
          }}
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
