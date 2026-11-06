'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Menu,
  X,
  Bell,
  ShieldAlert,
  LayoutDashboard,
  ScanLine,
  Clock,
  Users,
  BarChart3,
  Settings,
  HelpCircle,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePathname } from 'next/navigation';

const MENU_ITEMS = [
  { href: '/analytics', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/scan', label: 'Scan Medicine', icon: ScanLine },
  { href: '/scan/reconcile', label: 'Pill Reconciler', icon: ShieldAlert },
  { href: '/history', label: 'History', icon: Clock },
  { href: '/reminders', label: 'Reminders', icon: Bell },
  { href: '/caregiver', label: 'Caregiver', icon: Users },
  { href: '/allergy-profile', label: 'Allergy Profile', icon: ShieldAlert },
  { href: '/settings/emergency-card', label: 'Emergency ICE Card', icon: HelpCircle },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { signOut } = useAuth();
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <>
      <header
        id="mobile-header"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.75rem 1rem',
          background: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-border-light)',
          position: 'sticky',
          top: 0,
          zIndex: 45,
        }}
      >
        {/* Hamburger */}
        <button
          onClick={() => setMenuOpen(true)}
          id="menu-toggle"
          aria-label="Open menu"
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '0.375rem',
            color: 'var(--color-text-primary)',
          }}
        >
          <Menu size={24} />
        </button>

        {/* Logo */}
        <Link href="/" style={{
          textDecoration: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            background: 'var(--color-teal-600)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <ShieldAlert size={18} color="white" />
          </div>
          <span style={{
            fontSize: '1.125rem',
            fontWeight: 700,
            color: 'var(--color-teal-700)',
            letterSpacing: '-0.02em',
          }}>
            MedVerity
          </span>
        </Link>

        {/* Notification bell */}
        <button
          onClick={() => alert("Notifications coming soon!")}
          aria-label="Notifications"
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '0.375rem',
            position: 'relative',
            color: 'var(--color-text-primary)',
          }}
        >
          <Bell size={22} />
          <span style={{
            position: 'absolute',
            top: '4px',
            right: '4px',
            width: '8px',
            height: '8px',
            background: 'var(--color-teal-500)',
            borderRadius: '50%',
            border: '2px solid white',
          }} />
        </button>
      </header>

      {/* Mobile slide-out menu overlay */}
      {menuOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
          }}
        >
          {/* Backdrop */}
          <div
            onClick={() => setMenuOpen(false)}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.4)',
              animation: 'var(--animate-fade-in)',
            }}
          />
          {/* Menu panel */}
          <div
            style={{
              position: 'relative',
              width: '280px',
              maxWidth: '80vw',
              background: 'var(--color-surface)',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              animation: 'var(--animate-slide-in-left)',
              boxShadow: '4px 0 16px rgba(0,0,0,0.1)',
            }}
          >
            {/* Close + logo */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1rem 1.25rem',
              borderBottom: '1px solid var(--color-border-light)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  background: 'var(--color-teal-600)',
                  borderRadius: 'var(--radius-lg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <ShieldAlert size={20} color="white" />
                </div>
                <span style={{
                  fontSize: '1.125rem',
                  fontWeight: 700,
                  color: 'var(--color-teal-700)',
                }}>
                  MedVerity
                </span>
              </div>
              <button
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  color: 'var(--color-text-secondary)',
                }}
              >
                <X size={22} />
              </button>
            </div>

            {/* Menu items */}
            <nav style={{
              flex: 1,
              padding: '0.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              overflowY: 'auto',
            }}>
              {MENU_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem 1rem',
                      borderRadius: 'var(--radius-lg)',
                      textDecoration: 'none',
                      fontSize: '0.9375rem',
                      fontWeight: active ? 600 : 400,
                      color: active ? 'white' : 'var(--color-text-secondary)',
                      background: active ? 'var(--color-teal-600)' : 'transparent',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Icon size={20} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Bottom */}
            <div style={{
              padding: '0.75rem',
              borderTop: '1px solid var(--color-border-light)',
            }}>
              <Link
                href="/help"
                onClick={() => setMenuOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-lg)',
                  textDecoration: 'none',
                  fontSize: '0.9375rem',
                  color: 'var(--color-text-secondary)',
                }}
              >
                <HelpCircle size={20} />
                <span>Help</span>
              </Link>
              <button
                onClick={() => { signOut(); setMenuOpen(false); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-lg)',
                  fontSize: '0.9375rem',
                  color: 'var(--color-text-secondary)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  width: '100%',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                <LogOut size={20} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
