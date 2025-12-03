'use client';

import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  className = '',
  children,
  ...props
}) => {
  const baseStyle =
    'px-4 py-3 rounded-xl font-semibold transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:active:scale-100';
  const variants = {
    primary:
      'bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700',
    secondary:
      'bg-indigo-50 text-indigo-700 hover:bg-indigo-100',
    outline:
      'border-2 border-gray-200 text-gray-700 hover:bg-gray-50',
    ghost: 'text-gray-700 hover:bg-gray-100 hover:text-gray-900',
    danger: 'bg-red-50 text-red-600 hover:bg-red-100',
  };

  return (
    <button
      className={`${baseStyle} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
