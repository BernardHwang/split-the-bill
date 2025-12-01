'use client';

import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input: React.FC<InputProps> = ({ label, ...props }) => (
  <div className="space-y-1">
    {label && (
      <label className="block text-sm font-medium text-gray-700">{label}</label>
    )}
    <input
      className="w-full p-3 bg-white border border-gray-300 text-gray-900 placeholder-gray-500 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none"
      {...props}
    />
  </div>
);
