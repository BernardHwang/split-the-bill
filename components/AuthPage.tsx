'use client';

import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';

interface AuthPageProps {
  onLogin: (username: string) => Promise<void>;
  loading: boolean;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onLogin, loading }) => {
  const [username, setUsername] = useState('');

  const handleLogin = async () => {
    if (username.trim()) {
      await onLogin(username);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-gray-800 mb-2 text-center">Bill Splitter</h1>
        <p className="text-gray-600 text-center mb-8">Split bills easily with friends</p>

        <div className="space-y-4">
          <input
            type="text"
            placeholder="Enter your name"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
          <button
            onClick={handleLogin}
            disabled={loading || !username.trim()}
            className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={18} className="animate-spin" />}
            {loading ? 'Logging in...' : 'Continue as Guest'}
          </button>
        </div>
      </div>
    </div>
  );
};
