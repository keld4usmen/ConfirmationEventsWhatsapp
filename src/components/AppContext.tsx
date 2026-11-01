'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type Role = 'PLATFORM_ADMIN' | 'VENUE_OWNER' | 'VENUE_MANAGER' | 'VENUE_SCANNER' | 'ORGANIZER' | 'ATTENDEE';

export interface UserPersona {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl?: string;
}

export interface TenantInfo {
  id: string;
  name: string;
  slug: string;
  domain: string;
  stripeAccountId?: string;
}

interface AppContextType {
  currentUser: UserPersona;
  currentTenant: TenantInfo;
  users: UserPersona[];
  tenants: TenantInfo[];
  switchUser: (userId: string) => void;
  switchTenant: (tenantSlug: string) => void;
}

const defaultUsers: UserPersona[] = [
  { id: 'admin-1', name: 'Platform Super Admin', email: 'admin@saas.com', role: 'PLATFORM_ADMIN', avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150' },
  { id: 'owner-1', name: 'Eleanor Vance (Venue Owner)', email: 'owner@grandhorizon.com', role: 'VENUE_OWNER', avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150' },
  { id: 'manager-1', name: 'Marcus Brody (Venue Manager)', email: 'manager@grandhorizon.com', role: 'VENUE_MANAGER', avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150' },
  { id: 'scanner-1', name: 'David Gatekeeper (Gate Scanner)', email: 'scanner@grandhorizon.com', role: 'VENUE_SCANNER', avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150' },
  { id: 'organizer-1', name: 'Arthur Pendelton (Event Organizer)', email: 'organizer@symphony.com', role: 'ORGANIZER', avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150' },
  { id: 'attendee-1', name: 'Sarah Johnson (Attendee)', email: 'sarah.johnson@gmail.com', role: 'ATTENDEE', avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150' },
];

const defaultTenants: TenantInfo[] = [
  { id: 'tenant-1', name: 'Grand Horizon Center', slug: 'grand-horizon', domain: 'grand-horizon.platform.com', stripeAccountId: 'acct_1GrandHorizon9988' },
  { id: 'tenant-2', name: 'Royal Music Auditorium', slug: 'royal-auditorium', domain: 'tickets.royalauditorium.com', stripeAccountId: 'acct_1RoyalAuditorium7766' },
];

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserPersona>(defaultUsers[1]); // Default to Venue Owner
  const [currentTenant, setCurrentTenant] = useState<TenantInfo>(defaultTenants[0]);

  const switchUser = (userId: string) => {
    const found = defaultUsers.find((u) => u.id === userId);
    if (found) setCurrentUser(found);
  };

  const switchTenant = (tenantSlug: string) => {
    const found = defaultTenants.find((t) => t.slug === tenantSlug);
    if (found) setCurrentTenant(found);
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        currentTenant,
        users: defaultUsers,
        tenants: defaultTenants,
        switchUser,
        switchTenant,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
