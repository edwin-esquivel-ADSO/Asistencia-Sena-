'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Menu,
  X,
  QrCode,
  Users,
  History,
  Bell,
  LogOut,
  ShieldCheck,
  UserCheck,
  User,
  FileText
} from 'lucide-react';

interface NavItem {
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: React.ReactNode;
  badge?: number;
  highlight?: boolean;
}

interface NavbarProps {
  role: 'instructor' | 'coordinador' | 'aprendiz';
  userName?: string;
  pendingCount?: number;
  onOpenInbox?: () => void;
  onLogout?: () => void;
  customItems?: NavItem[];
}

export function Navbar({
  role,
  userName,
  pendingCount = 0,
  onOpenInbox,
  onLogout,
  customItems
}: NavbarProps) {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleLogout = async () => {
    if (onLogout) {
      onLogout();
      return;
    }
    const endpoint = role === 'aprendiz' ? '/api/auth/logout' : '/api/auth/logout';
    await fetch(endpoint, { method: 'POST' }).catch(() => {});
    router.push('/login');
    router.refresh();
  };

  const defaultInstructorItems: NavItem[] = [
    ...(onOpenInbox
      ? [
          {
            label: `Bandeja (${pendingCount})`,
            onClick: onOpenInbox,
            icon: <Bell size={16} />,
            badge: pendingCount,
            highlight: pendingCount > 0
          }
        ]
      : []),
    {
      label: 'Listado por ficha',
      href: '/instructor/aprendices',
      icon: <User size={16} />
    },
    {
      label: 'Historial & Informes',
      href: '/instructor/history',
      icon: <History size={16} />
    },
    {
      label: 'Salir',
      onClick: handleLogout,
      icon: <LogOut size={16} />
    }
  ];

  const defaultCoordinatorItems: NavItem[] = [
    {
      label: 'Panel Coordinador',
      href: '/coordinador/dashboard',
      icon: <ShieldCheck size={16} />
    },
    {
      label: 'Gestión Aprendices',
      href: '/instructor/aprendices',
      icon: <Users size={16} />
    },
    {
      label: 'Salir',
      onClick: handleLogout,
      icon: <LogOut size={16} />
    }
  ];

  const defaultAprendizItems: NavItem[] = [
    {
      label: 'Mi Asistencia',
      href: '/aprendiz/dashboard',
      icon: <UserCheck size={16} />
    },
    {
      label: 'Salir',
      onClick: handleLogout,
      icon: <LogOut size={16} />
    }
  ];

  const items: NavItem[] =
    customItems ||
    (role === 'instructor'
      ? defaultInstructorItems
      : role === 'coordinador'
      ? defaultCoordinatorItems
      : defaultAprendizItems);

  return (
    <>
      <header className="header-bar" style={{ position: 'sticky', top: 0, zIndex: 40 }}>
        {/* Brand */}
        <Link
          href={
            role === 'instructor'
              ? '/instructor/dashboard'
              : role === 'coordinador'
              ? '/coordinador/dashboard'
              : '/aprendiz/dashboard'
          }
          style={{ textDecoration: 'none' }}
        >
          <div className="brand-title">
            <QrCode size={26} style={{ color: '#39a900' }} />
            <span style={{ fontSize: '1.15rem' }}>Asistencia SENA</span>
            <span className="brand-badge" style={{ textTransform: 'capitalize' }}>
              {role}
            </span>
          </div>
        </Link>

        {/* Desktop Menu (hidden on mobile) */}
        <div
          className="navbar-desktop"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            flexWrap: 'nowrap'
          }}
        >
          {userName && (
            <span
              style={{
                fontSize: '0.85rem',
                color: '#cbd5e1',
                marginRight: '0.25rem',
                whiteSpace: 'nowrap'
              }}
            >
              {userName}
            </span>
          )}

          {items.map((item, idx) => {
            if (item.href) {
              return (
                <Link
                  key={idx}
                  href={item.href}
                  className="btn-secondary"
                  style={{
                    padding: '0.4rem 0.85rem',
                    fontSize: '0.825rem',
                    textDecoration: 'none'
                  }}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              );
            }
            return (
              <button
                key={idx}
                type="button"
                onClick={item.onClick}
                className="btn-secondary"
                style={{
                  padding: '0.4rem 0.85rem',
                  fontSize: '0.825rem',
                  position: 'relative'
                }}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-4px',
                      right: '-4px',
                      background: '#dc2626',
                      color: '#fff',
                      borderRadius: '50%',
                      padding: '1px 5px',
                      fontSize: '0.65rem',
                      fontWeight: 800
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Mobile Hamburger Toggle Button */}
        <button
          type="button"
          aria-label="Abrir menú de navegación"
          className="navbar-mobile-toggle"
          onClick={() => setDrawerOpen(true)}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#ffffff',
            padding: '0.5rem',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'none',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Menu size={22} />
        </button>
      </header>

      {/* Mobile Drawer (Slide-over) */}
      {drawerOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            justifyContent: 'flex-end'
          }}
        >
          {/* Overlay backdrop */}
          <div
            onClick={() => setDrawerOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(4px)'
            }}
          />

          {/* Drawer Content */}
          <div
            style={{
              position: 'relative',
              width: '80%',
              maxWidth: '300px',
              height: '100%',
              background: '#0f172a',
              color: '#ffffff',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '-4px 0 24px rgba(0,0,0,0.4)',
              zIndex: 101,
              animation: 'slideInRight 0.25s ease-out'
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem',
                borderBottom: '1px solid #334155',
                paddingBottom: '0.75rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <QrCode size={22} style={{ color: '#39a900' }} />
                <span style={{ fontWeight: 700, fontSize: '1rem' }}>Menú SENA</span>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer'
                }}
              >
                <X size={24} />
              </button>
            </div>

            {userName && (
              <div
                style={{
                  background: '#1e293b',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  marginBottom: '1.25rem'
                }}
              >
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Usuario</div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#f8fafc' }}>
                  {userName}
                </div>
                <span className="brand-badge" style={{ marginTop: '0.35rem', display: 'inline-block' }}>
                  {role}
                </span>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
              {items.map((item, idx) => {
                const handleClick = () => {
                  setDrawerOpen(false);
                  if (item.onClick) item.onClick();
                  if (item.href) router.push(item.href);
                };

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={handleClick}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      background: item.highlight ? 'rgba(57, 169, 0, 0.15)' : '#1e293b',
                      color: '#ffffff',
                      border: item.highlight ? '1px solid #39a900' : '1px solid #334155',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    {item.icon}
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span
                        style={{
                          background: '#dc2626',
                          color: '#fff',
                          borderRadius: '999px',
                          padding: '2px 8px',
                          fontSize: '0.75rem',
                          fontWeight: 700
                        }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
