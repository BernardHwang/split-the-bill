'use client';

import React from 'react';
import { Receipt, LayoutGrid, Users, LogOut, Menu, X, Plus } from 'lucide-react';
import { User } from 'firebase/auth';
import { Button } from '@/components/ui/Button';

interface NavButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}

const NavButton: React.FC<NavButtonProps> = ({
  active,
  onClick,
  icon,
  children,
}) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${
      active
        ? 'bg-indigo-50 text-indigo-600'
        : 'text-gray-600 hover:bg-gray-50'
    }`}
  >
    {icon}
    {children}
  </button>
);

interface MobileNavButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

const MobileNavButton: React.FC<MobileNavButtonProps> = ({
  active,
  onClick,
  icon,
  label,
}) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${
      active ? 'text-indigo-600' : 'text-gray-400'
    }`}
  >
    {icon}
    <span className="text-[10px] font-medium">{label}</span>
  </button>
);

interface MainLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  logout: () => void;
  user?: User | null;
}

export default function MainLayout({
  children,
  activeTab,
  onTabChange,
  logout,
  user,
}: MainLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const handleNavClick = (tab: string) => {
    onTabChange(tab);
    setMobileMenuOpen(false);
  };

  const userName = user?.displayName || user?.email || 'User';
  const userInitial = userName.charAt(0).toUpperCase();
  const userPhotoUrl = user?.photoURL;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-40">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">
              <Receipt size={18} />
            </div>
            <span className="font-bold text-lg text-gray-900">SplitIt</span>
          </div>
          <button
            onClick={logout}
            className="m-4 text-sm flex flex-row items-center text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <LogOut size={16} className='mr-2'/> Sign Out
          </button>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 p-6 fixed h-full z-10">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">
            <Receipt size={18} />
          </div>
          <span className="font-bold text-xl text-gray-900">SplitIt</span>
        </div>

        <nav className="space-y-2 flex-1">
          <NavButton
            active={activeTab === 'dashboard'}
            onClick={() => onTabChange('dashboard')}
            icon={<LayoutGrid size={20} />}
          >
            Dashboard
          </NavButton>
          <NavButton
            active={activeTab === 'people'}
            onClick={() => onTabChange('people')}
            icon={<Users size={20} />}
          >
            Friends
          </NavButton>
          <NavButton
            active={activeTab === 'add-bill'}
            onClick={() => onTabChange('add-bill')}
            icon={<Plus size={20} />}
          >
            New Bill
          </NavButton>
        </nav>

        <div className="border-t pt-4 space-y-4">
          {/* User Info */}
          <div className="flex items-center gap-3 px-2">
            <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                {userInitial}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-semibold text-gray-900 truncate leading-tight">{userName}</p>
              <p className="text-xs text-gray-600 truncate leading-tight mt-0.5">{user?.email}</p>
            </div>
          </div>

          <Button
            variant="ghost"
            onClick={logout}
            className="w-full justify-start text-sm"
          >
            <LogOut size={16} /> Sign Out
          </Button>
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
        <div className="flex justify-around items-center p-2">
          <MobileNavButton
            active={activeTab === 'dashboard'}
            onClick={() => handleNavClick('dashboard')}
            icon={<LayoutGrid size={20} />}
            label="Home"
          />
          <button
            onClick={() => handleNavClick('add-bill')}
            className="flex flex-col items-center justify-center w-12 h-12 rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 transition-colors duration-200 -mt-6"
          >
            <Plus size={24} />
          </button>
          <MobileNavButton
            active={activeTab === 'people'}
            onClick={() => handleNavClick('people')}
            icon={<Users size={20} />}
            label="Friends"
          />
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 md:pl-64 pt-14 md:pt-0 pb-20 md:pb-6">
        <div className="p-4 pt-10 md:p-8 max-w-3xl mx-auto w-full">{children}</div>
      </main>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black bg-opacity-20 z-30 top-14"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}

