'use client';

import React, { useState, useMemo } from 'react';
import {
  Plus,
  Users,
  Receipt,
  DollarSign,
  ChevronRight,
  Trash2,
  PieChart,
  LogOut,
  LayoutGrid,
} from 'lucide-react';
import { Bill, Friend } from '@/hooks/useData';

interface DashboardPageProps {
  bills: Bill[];
  friends: Friend[];
  onAddFriend: () => void;
  onAddBill: () => void;
  onViewFriends: () => void;
  onLogout: () => void;
  onDeleteBill: (billId: string) => void;
  onManageBill: (bill: Bill) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  bills,
  friends,
  onAddFriend,
  onAddBill,
  onViewFriends,
  onLogout,
  onDeleteBill,
  onManageBill,
}) => {
  const totalAmount = useMemo(() => bills.reduce((sum, b) => sum + b.amount, 0), [bills]);
  const totalBills = bills.length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Bill Splitter</h1>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-lg transition"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Total Bills</p>
                <p className="text-3xl font-bold text-gray-800">{totalBills}</p>
              </div>
              <Receipt size={32} className="text-blue-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Total Amount</p>
                <p className="text-3xl font-bold text-gray-800">${totalAmount.toFixed(2)}</p>
              </div>
              <DollarSign size={32} className="text-green-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Friends</p>
                <p className="text-3xl font-bold text-gray-800">{friends.length}</p>
              </div>
              <Users size={32} className="text-purple-500" />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={onAddBill}
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition"
          >
            <Plus size={20} />
            Add Bill
          </button>
          <button
            onClick={onAddFriend}
            className="bg-purple-500 hover:bg-purple-600 text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition"
          >
            <Users size={20} />
            Add Friend
          </button>
          <button
            onClick={onViewFriends}
            className="bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition"
          >
            <LayoutGrid size={20} />
            View Friends
          </button>
        </div>

        {/* Bills List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <PieChart size={24} />
              Recent Bills
            </h2>
          </div>
          <div className="divide-y divide-gray-200">
            {bills.length === 0 ? (
              <div className="p-6 text-center text-gray-500">No bills yet. Add one to get started!</div>
            ) : (
              bills.map((bill) => (
                <div key={bill.id} className="p-4 hover:bg-gray-50 transition flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800">{bill.description}</p>
                    <p className="text-sm text-gray-500">Paid by {bill.paidBy}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-lg font-bold text-green-600">${bill.amount.toFixed(2)}</p>
                    <button
                      onClick={() => onManageBill(bill)}
                      className="p-2 hover:bg-blue-100 rounded-lg transition"
                    >
                      <ChevronRight size={20} className="text-blue-500" />
                    </button>
                    <button
                      onClick={() => onDeleteBill(bill.id)}
                      className="p-2 hover:bg-red-100 rounded-lg transition"
                    >
                      <Trash2 size={20} className="text-red-500" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
