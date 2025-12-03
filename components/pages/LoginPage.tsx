'use client';

import React from 'react';
import { Loader2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface LoginPageProps {
  onLogin: () => Promise<any>;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleGoogleLogin = async () => {
    try {
      setError(null);
      setLoading(true);
      await onLogin();
    } catch (err: any) {
      setError(err?.message || 'Failed to sign in. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl md:rounded-lg shadow-xl p-6 md:p-8 max-w-md w-full">
        <div className="text-center mb-6 md:mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="text-blue-600" size={32} />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">Bill Splitter</h1>
          <p className="text-sm md:text-base text-gray-600">Split bills easily with friends</p>
        </div>

        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
              {error}
            </div>
          )}
          
          <Button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full justify-center text-sm md:text-base py-2 md:py-3 bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 !shadow-none"
          >
            {loading && <Loader2 size={18} className="animate-spin" />}
            {loading ? 'Signing in...' : (
              <>
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="#1F2937" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#1F2937" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#1F2937" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#1F2937" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <p className='text-gray-700 hover:text-white'>Sign in with Google</p>
              </>
            )}
          </Button>

          <p className="text-xs text-gray-500 text-center">
            Sign in with your Google account to get started
          </p>
        </div>
      </div>
    </div>
  );
}
