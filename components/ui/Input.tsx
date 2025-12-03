'use client';

import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input: React.FC<InputProps> = ({ label, ...props }) => (
  <div className="space-y-2">
    {label && (
      <label className="block text-sm font-semibold text-gray-900">{label}</label>
    )}
    <input
      className="w-full p-3 bg-white border-2 border-gray-300 text-gray-900 text-base placeholder-gray-400 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none"
      {...props}
    />
  </div>
);
