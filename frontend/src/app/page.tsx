'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { LoginModal } from '@/components/LoginModal';
import { OverviewView } from '@/components/OverviewView';
import { BusinessesView } from '@/components/BusinessesView';
import { CardsView } from '@/components/CardsView';
import { ProductionStationView } from '@/components/ProductionStationView';
import { RedirectTesterView } from '@/components/RedirectTesterView';
import { AuditLogsView } from '@/components/AuditLogsView';
import { SalesPortalView } from '@/components/SalesPortalView';
import { AdminUser, Business } from '@/types';
import { getStoredToken, getStoredUser, clearStoredToken } from '@/lib/api';

export default function Home() {
  const [activeTab, setActiveTab] = useState('overview');
  const [user, setUser] = useState<AdminUser | null>(null);

  // Cross-component shortcuts
  const [initialBusinessForBatch, setInitialBusinessForBatch] = useState<Business | null>(null);
  const [isCreateBusinessInitially, setIsCreateBusinessInitially] = useState(false);
  const [isBatchOpenInitially, setIsBatchOpenInitially] = useState(false);

  useEffect(() => {
    try {
      const token = getStoredToken();
      const storedUser = getStoredUser();
      if (token && storedUser) {
        setUser(storedUser);
      }
    } catch (err) {
      console.error('Session restoration error:', err);
    }

    const handleUnauthorized = () => {
      setUser(null);
    };
    window.addEventListener('octo:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('octo:unauthorized', handleUnauthorized);
  }, []);

  const handleLogout = () => {
    clearStoredToken();
    setUser(null);
  };

  const handleOpenNewBusiness = () => {
    setIsCreateBusinessInitially(true);
    setActiveTab('businesses');
  };

  const handleOpenBatchIssue = () => {
    setIsBatchOpenInitially(true);
    setActiveTab('cards');
  };

  const handleIssueCardsForBusiness = (business: Business) => {
    setInitialBusinessForBatch(business);
    setIsBatchOpenInitially(true);
    setActiveTab('cards');
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* 1. If not logged in: Show Login Modal */}
      {!user ? (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex items-center justify-center">
          <LoginModal onSuccess={(loggedInUser) => setUser(loggedInUser)} />
        </main>
      ) : user.role === 'SALES' ? (
        /* 2. If Sales Role: Render Dedicated Separate Sales Dashboard (as requested) */
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <SalesPortalView user={user} onLogout={handleLogout} />
        </main>
      ) : (
        /* 3. If Admin Role: Render Complete Admin Platform */
        <>
          <Navbar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            user={user}
            onLogout={handleLogout}
          />

          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {activeTab === 'overview' && (
              <OverviewView
                onNavigate={(tab) => setActiveTab(tab)}
                onOpenNewBusiness={handleOpenNewBusiness}
                onOpenBatchIssue={handleOpenBatchIssue}
              />
            )}
            {activeTab === 'businesses' && (
              <BusinessesView
                onIssueCardsForBusiness={handleIssueCardsForBusiness}
                isCreateOpenInitially={isCreateBusinessInitially}
                onCloseCreateInitially={() => setIsCreateBusinessInitially(false)}
              />
            )}
            {activeTab === 'cards' && (
              <CardsView
                initialBusinessForBatch={initialBusinessForBatch}
                onClearInitialBusiness={() => {
                  setInitialBusinessForBatch(null);
                  setIsBatchOpenInitially(false);
                }}
                isBatchOpenInitially={isBatchOpenInitially}
              />
            )}
            {activeTab === 'production' && <ProductionStationView />}
            {activeTab === 'redirect' && <RedirectTesterView />}
            {activeTab === 'audit' && <AuditLogsView />}
          </main>
        </>
      )}

      {/* Brand Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/60 py-6 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/Logo-OCTO-TAP.png" alt="OCTO Tap Logo" className="w-5 h-5 object-contain" />
            <span className="font-extrabold text-white">OCTO Tap</span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-400">v1.0</span>
          </div>
          <div className="text-slate-400 text-[11px]">
            Smart business tools, connected
          </div>
        </div>
      </footer>
    </div>
  );
}
