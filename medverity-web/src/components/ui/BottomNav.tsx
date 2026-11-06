'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ScanLine,
  Clock,
  Bell,
  Users,
  User,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/scan', label: 'Scan', icon: ScanLine },
  { href: '/history', label: 'History', icon: Clock },
  { href: '/reminders', label: 'Reminders', icon: Bell },
  { href: '/caregiver', label: 'Caregiver', icon: Users },
  { href: '/settings', label: 'Profile', icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) => pathname.startsWith(href);

  return (
    <nav
      id="bottom-nav"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        background: 'var(--color-surface)',
        borderTop: '1px solid var(--color-border-light)',
        boxShadow: 'var(--shadow-nav)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        height: 'var(--spacing-bottomnav)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            id={`bottomnav-${item.label.toLowerCase()}`}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.25rem',
              padding: '0.5rem 0.75rem',
              textDecoration: 'none',
              color: active ? 'var(--color-teal-600)' : 'var(--color-text-muted)',
              transition: 'color 0.15s ease',
              minWidth: '60px',
            }}
          >
            <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
            <span style={{
              fontSize: '0.6875rem',
              fontWeight: active ? 600 : 400,
              lineHeight: 1,
            }}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
