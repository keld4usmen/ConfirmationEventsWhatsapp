'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from './AppContext';
import { 
  Building2, 
  Sparkles, 
  CalendarCheck, 
  Ticket, 
  QrCode, 
  ShieldCheck, 
  UserCheck, 
  ChevronDown,
  LayoutDashboard,
  Layers
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const { currentUser, currentTenant, users, tenants, switchUser, switchTenant } = useApp();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showTenantMenu, setShowTenantMenu] = useState(false);

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'PLATFORM_ADMIN': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'VENUE_OWNER': return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      case 'VENUE_MANAGER': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'VENUE_SCANNER': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'ORGANIZER': return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'ATTENDEE': return 'bg-slate-100 text-slate-800 border-slate-300';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <nav className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50 text-white shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex items-center space-x-2 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-indigo-600 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-emerald-400 bg-clip-text text-transparent">
                  EventCenter<span className="text-emerald-400 font-light">SaaS</span>
                </span>
                <span className="block text-[10px] text-slate-400 font-mono tracking-widest uppercase">Multi-Tenant Platform</span>
              </div>
            </Link>

            {/* Tenant Selector Switcher */}
            <div className="relative ml-4 hidden md:block">
              <button
                onClick={() => setShowTenantMenu(!showTenantMenu)}
                className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700/80 px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-200 transition-colors"
              >
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-medium">{currentTenant.name}</span>
                <span className="text-[10px] bg-slate-700 px-1.5 py-0.5 rounded text-slate-300 font-mono">
                  {currentTenant.slug}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {showTenantMenu && (
                <div className="absolute left-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-2 z-50 backdrop-blur-lg">
                  <div className="px-3 py-1 text-[11px] font-semibold uppercase text-slate-400 tracking-wider">
                    Switch Active Tenant
                  </div>
                  {tenants.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        switchTenant(t.slug);
                        setShowTenantMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-700/60 transition-colors ${
                        currentTenant.slug === t.slug ? 'bg-emerald-950/40 text-emerald-400 font-semibold' : 'text-slate-300'
                      }`}
                    >
                      <div>
                        <div>{t.name}</div>
                        <div className="text-[10px] text-slate-400">{t.domain}</div>
                      </div>
                      {currentTenant.slug === t.slug && <div className="w-2 h-2 rounded-full bg-emerald-400" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Navigation Links */}
          <div className="hidden lg:flex items-center space-x-1">
            <Link
              href="/"
              className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-colors ${
                pathname === '/' ? 'bg-emerald-500/15 text-emerald-400 font-semibold' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Overview</span>
            </Link>

            {/* Platform Admin */}
            {(currentUser.role === 'PLATFORM_ADMIN') && (
              <Link
                href="/admin"
                className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-colors ${
                  pathname === '/admin' ? 'bg-purple-500/15 text-purple-400 font-semibold' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-purple-400" />
                <span>Super Admin</span>
              </Link>
            )}

            {/* Layout Studio (Venue Owner/Manager) */}
            {(currentUser.role === 'PLATFORM_ADMIN' || currentUser.role === 'VENUE_OWNER' || currentUser.role === 'VENUE_MANAGER') && (
              <Link
                href="/studio"
                className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-colors ${
                  pathname === '/studio' ? 'bg-indigo-500/15 text-indigo-400 font-semibold' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>Layout Studio</span>
              </Link>
            )}

            {/* Bookings Queue */}
            {(currentUser.role !== 'VENUE_SCANNER') && (
              <Link
                href="/bookings"
                className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-colors ${
                  pathname === '/bookings' ? 'bg-amber-500/15 text-amber-400 font-semibold' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <CalendarCheck className="w-4 h-4 text-amber-400" />
                <span>Bookings</span>
              </Link>
            )}

            {/* Events Showcase & Seating Map */}
            <Link
              href="/events"
              className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-colors ${
                pathname === '/events' || pathname.startsWith('/events/') ? 'bg-emerald-500/15 text-emerald-400 font-semibold' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Ticket className="w-4 h-4 text-emerald-400" />
              <span>Events & Seats</span>
            </Link>

            {/* Gate Scanner */}
            {(currentUser.role === 'PLATFORM_ADMIN' || currentUser.role === 'VENUE_OWNER' || currentUser.role === 'VENUE_MANAGER' || currentUser.role === 'VENUE_SCANNER') && (
              <Link
                href="/scanner"
                className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-colors ${
                  pathname === '/scanner' ? 'bg-teal-500/15 text-teal-400 font-semibold' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <QrCode className="w-4 h-4 text-teal-400" />
                <span>Gate Scanner</span>
              </Link>
            )}

            {/* My Tickets */}
            <Link
              href="/my-tickets"
              className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-colors ${
                pathname === '/my-tickets' ? 'bg-cyan-500/15 text-cyan-400 font-semibold' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <UserCheck className="w-4 h-4 text-cyan-400" />
              <span>My Tickets</span>
            </Link>
          </div>

          {/* Persona RBAC Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700/80 p-1.5 pr-3 rounded-xl border border-slate-700 transition-all"
            >
              <img
                src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                alt={currentUser.name}
                className="w-8 h-8 rounded-lg object-cover ring-2 ring-emerald-500/40"
              />
              <div className="text-left hidden sm:block">
                <div className="text-xs font-semibold text-slate-100 flex items-center space-x-1">
                  <span>{currentUser.name.split(' ')[0]}</span>
                </div>
                <div className={`text-[10px] px-1.5 py-0.2 rounded border font-mono inline-block ${getRoleBadgeColor(currentUser.role)}`}>
                  {currentUser.role}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-72 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-2 z-50">
                <div className="px-3 py-1.5 border-b border-slate-700">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Interactive Persona Switcher (RBAC)
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Select a role persona to test authorization guards & features.
                  </div>
                </div>

                <div className="max-h-72 overflow-y-auto py-1">
                  {users.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        switchUser(u.id);
                        setShowUserMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center space-x-3 hover:bg-slate-700/70 transition-colors ${
                        currentUser.id === u.id ? 'bg-slate-700/50 font-semibold' : ''
                      }`}
                    >
                      <img
                        src={u.avatarUrl}
                        alt={u.name}
                        className="w-7 h-7 rounded-md object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-slate-200 truncate">{u.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{u.email}</div>
                      </div>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded border font-mono ${getRoleBadgeColor(u.role)}`}>
                        {u.role}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </nav>
  );
};
