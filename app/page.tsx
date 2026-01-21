'use client';

import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useData } from '@/hooks/useData';
import LoginPage from '@/components/pages/LoginPage';
import DashboardPage from '@/components/pages/DashboardPage';
import FriendsPage from '@/components/pages/FriendsPage';
import AddBillPage from '@/components/pages/AddBillPage';
import BillDetailPage from '@/components/pages/BillDetailPage';
import MainLayout from '@/components/layouts/MainLayout';

export default function App() {
  const { user, loading: authLoading, loginWithGoogle, logout } = useAuth();
  const { bills, friends, loading: dataLoading, deleteBill, updateBill, deleteFriend, createBill } = useData(user);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [billDetailId, setBillDetailId] = useState<string | null>(null);

  if (authLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLogin={loginWithGoogle} />;
  }

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setBillDetailId(null);
  };

  const renderContent = () => {
    if (billDetailId) {
      const bill = bills.find((b) => b.id === billDetailId);
      if (!bill) return null;
      return (
        <BillDetailPage
          bill={bill}
          friends={friends}
          onBack={() => setBillDetailId(null)}
          onUpdateBill={updateBill}
          onDeleteBill={deleteBill}
          authenticatedUser={user}
        />
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardPage
            bills={bills}
            friends={friends}
            onViewBill={setBillDetailId}
            onDeleteBill={deleteBill}
            onNavigateTo={handleTabChange}
            authenticatedUser={user}
          />
        );
      case 'people':
        return (
          <FriendsPage
            friends={friends}
            bills={bills}
            onDeleteFriend={deleteFriend}
            onNavigateToAddBill={() => handleTabChange('add-bill')}
            authenticatedUser={user}
          />
        );
      case 'add-bill':
        return (
          <AddBillPage
            friends={friends}
            onCancel={() => handleTabChange('dashboard')}
            onBack={() => handleTabChange('dashboard')}
            authenticatedUser={user}
            onCreateBill={createBill}
          />
        );
      default:
        return null;
    }
  };

  return (
    <MainLayout activeTab={activeTab} onTabChange={handleTabChange} logout={logout} user={user}>
      {renderContent()}
    </MainLayout>
  );
}
