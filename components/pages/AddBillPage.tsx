'use client';

import React, { useState, useMemo } from 'react';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { User } from 'firebase/auth';
import { Friend } from '@/hooks/useData';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';

interface AddBillPageProps {
  friends: Friend[];
  onCancel: () => void;
  onBack: () => void;
  authenticatedUser?: User | null;
  onCreateBill?: (billData: {
    description: string;
    amount: number;
    paidBy: string;
    splitAmong: string[];
    splitType: 'equal' | 'custom';
    itemizedAmounts?: Record<string, number>;
    taxPercentage?: number;
    tipsPercentage?: number;
  }) => Promise<void>;
}

export default function AddBillPage({
  friends,
  onCancel,
  onBack,
  authenticatedUser,
  onCreateBill,
}: AddBillPageProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [splitType, setSplitType] = useState<'equal' | 'custom'>('equal');
  const [taxIsPercent, setTaxIsPercent] = useState(true);
  const [tipsIsPercent, setTipsIsPercent] = useState(true);
  
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    paidBy: '',
    splitAmong: [] as string[],
    // taxValue and tipsValue: represent either percent (if taxIsPercent true) or absolute amount
    taxValue: '',
    tipsValue: '',
    itemizedAmounts: {} as Record<string, number>,
  });

  const allParticipants = useMemo(() => {
    const result = authenticatedUser ? [{ id: authenticatedUser.uid, name: authenticatedUser.displayName || 'You' }] : [];
    return [...result, ...friends];
  }, [authenticatedUser, friends]);

  const toggleFriend = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      splitAmong: prev.splitAmong.includes(id)
        ? prev.splitAmong.filter((fid) => fid !== id)
        : [...prev.splitAmong, id],
    }));
  };

  const handleItemAmountChange = (userId: string, amount: string) => {
    setFormData((prev) => ({
      ...prev,
      itemizedAmounts: {
        ...prev.itemizedAmounts,
        [userId]: amount ? parseFloat(amount) : 0,
      },
    }));
  };

  const calculateTotals = () => {
    const baseAmount = parseFloat(formData.amount) || 0;
    const taxRaw = parseFloat(formData.taxValue) || 0;
    const tipsRaw = parseFloat(formData.tipsValue) || 0;
    const taxAmount = taxIsPercent ? (baseAmount * taxRaw) / 100 : taxRaw;
    const tipsAmount = tipsIsPercent ? (baseAmount * tipsRaw) / 100 : tipsRaw;
    const totalAmount = baseAmount + taxAmount + tipsAmount;
    return { baseAmount, taxAmount, tipsAmount, totalAmount };
  };

  const calculatePerPersonAmount = () => {
    if (splitType === 'equal') {
      const { totalAmount } = calculateTotals();
      return formData.splitAmong.length > 0 ? totalAmount / formData.splitAmong.length : 0;
    } else {
      const itemizedTotal = Object.values(formData.itemizedAmounts).reduce((a, b) => a + b, 0);
      const { taxAmount, tipsAmount } = calculateTotals();
      const totalTaxAndTips = taxAmount + tipsAmount;
      
      if (itemizedTotal > 0) {
        return {
          distribution: formData.splitAmong.map(userId => ({
            userId,
            itemAmount: formData.itemizedAmounts[userId] || 0,
            share: ((formData.itemizedAmounts[userId] || 0) / itemizedTotal) * totalTaxAndTips,
            total: (formData.itemizedAmounts[userId] || 0) + ((formData.itemizedAmounts[userId] || 0) / itemizedTotal) * totalTaxAndTips,
          })),
          totalTaxAndTips,
        };
      }
      return { distribution: [], totalTaxAndTips: 0 };
    }
  };

  const handleFinish = async () => {
    try {
      setLoading(true);
      if (onCreateBill) {
        const billData: any = {
          description: formData.description,
          amount: parseFloat(formData.amount),
          paidBy: formData.paidBy,
          splitAmong: formData.splitAmong,
          splitType: splitType,
        };

        if (splitType === 'custom') {
          billData.itemizedAmounts = formData.itemizedAmounts;
        }

        // Convert tax/tips absolute amounts to percentages for storage when not percent
        const base = parseFloat(formData.amount) || 0;
        const taxRaw = parseFloat(formData.taxValue) || 0;
        const tipsRaw = parseFloat(formData.tipsValue) || 0;
        const taxPercent = taxIsPercent ? taxRaw : (base > 0 ? (taxRaw / base) * 100 : 0);
        const tipsPercent = tipsIsPercent ? tipsRaw : (base > 0 ? (tipsRaw / base) * 100 : 0);

        if (taxRaw) billData.taxPercentage = Math.round(taxPercent * 100) / 100;
        if (tipsRaw) billData.tipsPercentage = Math.round(tipsPercent * 100) / 100;

        await onCreateBill(billData);
      }
      onBack();
    } catch (error) {
      console.error('Error creating bill:', error);
      alert('Failed to create bill');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-4 md:space-y-6">
      {/* Progress */}
      <div className="flex items-center gap-4">
        {[1,2,3].map((s) => (
          <div key={s} className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${step===s ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
              {s}
            </div>
            {s < 3 && <div className={`w-8 h-0.5 ${step> s ? 'bg-indigo-600' : 'bg-gray-200'}`}></div>}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 md:gap-4">
        <button
          onClick={onCancel}
          className="p-2 hover:bg-gray-200 rounded-full transition-colors flex-shrink-0"
        >
          <ArrowLeft size={20} className="text-gray-900" />
        </button>
        <h1 className="text-lg md:text-xl font-bold text-gray-900">Create New Bill</h1>
      </div>

      {step === 1 && (
        <div className="space-y-4 md:space-y-6 animate-in fade-in">
          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold">Choose split type</h2>
            <div className="space-y-3">
              <label className={`flex items-center p-3 border-2 rounded-xl cursor-pointer transition-all ${splitType === 'equal' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'}`}>
                <input type="radio" checked={splitType === 'equal'} onChange={() => setSplitType('equal')} className="w-4 h-4" />
                <span className="ml-3 font-medium">Split Equally</span>
              </label>
              <label className={`flex items-center p-3 border-2 rounded-xl cursor-pointer transition-all ${splitType === 'custom' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'}`}>
                <input type="radio" checked={splitType === 'custom'} onChange={() => setSplitType('custom')} className="w-4 h-4" />
                <span className="ml-3 font-medium">Custom Split (items + tax + tips)</span>
              </label>
            </div>
          </Card>
          <div className="flex gap-3">
            <Button className="flex-1" onClick={() => onCancel()} variant="outline">Cancel</Button>
            <Button className="flex-1" onClick={() => setStep(2)}>Next</Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6 animate-in fade-in">
          <Card className="p-6 space-y-4">
            <Input label="Description" placeholder="e.g. Dinner at Mario's" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} autoFocus />
            <Input label="Amount ($)" type="number" placeholder="0.00" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Paid by</label>
              <select value={formData.paidBy} onChange={(e) => setFormData({ ...formData, paidBy: e.target.value })} className="w-full p-3 bg-white text-gray-900 border border-gray-300 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none">
                <option value="">Select a person</option>
                {authenticatedUser && (<option value={authenticatedUser.uid}>{authenticatedUser.displayName || 'You'}</option>)}
                {friends.map((friend) => (<option key={friend.id} value={friend.id}>{friend.name}</option>))}
              </select>
            </div>
          </Card>

          <div>
            <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4">Select people to split with</h2>
            <Card className="p-6">
              <div className="space-y-2">
                {authenticatedUser && (
                  <button onClick={() => toggleFriend(authenticatedUser.uid)} className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${formData.splitAmong.includes(authenticatedUser.uid) ? 'border-indigo-500 bg-indigo-50' : 'border-gray-100 hover:bg-gray-50'}`}>
                    <div className="w-8 h-8 rounded-full bg-indigo-200 flex items-center justify-center text-xs font-bold text-indigo-700">{(authenticatedUser.displayName || 'You').charAt(0).toUpperCase()}</div>
                    <span className="flex-1 text-left font-medium">{authenticatedUser.displayName || 'You'}</span>
                    {formData.splitAmong.includes(authenticatedUser.uid) && (<CheckCircle size={20} className="text-indigo-600" />)}
                  </button>
                )}
                {friends.length === 0 && (<p className="text-center text-gray-400 py-4">No friends added.</p>)}
                {friends.map((f) => (
                  <button key={f.id} onClick={() => toggleFriend(f.id)} className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${formData.splitAmong.includes(f.id) ? 'border-indigo-500 bg-indigo-50' : 'border-gray-100 hover:bg-gray-50'}`}>
                    <div className="w-8 h-8 rounded-full bg-indigo-200 flex items-center justify-center text-xs font-bold text-indigo-700">{f.name.charAt(0).toUpperCase()}</div>
                    <span className="flex-1 text-left font-medium">{f.name}</span>
                    {formData.splitAmong.includes(f.id) && (<CheckCircle size={20} className="text-indigo-600" />)}
                  </button>
                ))}
              </div>
            </Card>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setStep(1)} disabled={loading}>Back</Button>
            <Button className="flex-1" disabled={formData.splitAmong.length === 0 || !formData.amount || !formData.paidBy || loading} onClick={() => setStep(3)}>Next</Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6 animate-in fade-in">
          <div>
            <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4">
              How to split?
            </h2>
          </div>

          {/* Split Type Selection */}
          <Card className="p-6 space-y-4">
            <div className="space-y-3">
              <label className="flex items-center p-3 border-2 rounded-xl cursor-pointer transition-all" style={{borderColor: splitType === 'equal' ? '#4f46e5' : '#e5e7eb', backgroundColor: splitType === 'equal' ? '#eef2ff' : 'white'}}>
                <input
                  type="radio"
                  checked={splitType === 'equal'}
                  onChange={() => setSplitType('equal')}
                  className="w-4 h-4"
                />
                <span className="ml-3 font-medium text-gray-900">Split Equally</span>
              </label>

              <label className="flex items-center p-3 border-2 rounded-xl cursor-pointer transition-all" style={{borderColor: splitType === 'custom' ? '#4f46e5' : '#e5e7eb', backgroundColor: splitType === 'custom' ? '#eef2ff' : 'white'}}>
                <input
                  type="radio"
                  checked={splitType === 'custom'}
                  onChange={() => setSplitType('custom')}
                  className="w-4 h-4"
                />
                <span className="ml-3 font-medium text-gray-900">Custom Split (by items + tax + tips)</span>
              </label>
            </div>
          </Card>

          {/* Equal Split Summary */}
          {splitType === 'equal' && (
            <Card className="p-6 bg-indigo-50 border border-indigo-200">
              <p className="text-sm text-gray-600 mb-2">Each person pays:</p>
              <p className="text-2xl font-bold text-indigo-600">
                ${((calculatePerPersonAmount() as number) || 0).toFixed(2)}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Total: ${calculateTotals().totalAmount.toFixed(2)} ÷ {formData.splitAmong.length} people
              </p>
            </Card>
          )}

          {/* Custom Split */}
          {splitType === 'custom' && (
            <div className="space-y-4">
              <Card className="p-4 space-y-4 bg-gray-50">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium">Tax</label>
                    <div className="mt-2 flex gap-2">
                      <button type="button" onClick={() => setTaxIsPercent(true)} className={`px-3 py-2 rounded-lg border ${taxIsPercent ? 'bg-indigo-50 border-indigo-300' : 'bg-white border-gray-200'}`}>%</button>
                      <button type="button" onClick={() => setTaxIsPercent(false)} className={`px-3 py-2 rounded-lg border ${!taxIsPercent ? 'bg-indigo-50 border-indigo-300' : 'bg-white border-gray-200'}`}>$</button>
                      <input type="number" placeholder={taxIsPercent ? '0 %' : '0.00'} value={formData.taxValue} onChange={(e) => setFormData({ ...formData, taxValue: e.target.value })} className="flex-1 p-2 border rounded-lg" />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Tips</label>
                    <div className="mt-2 flex gap-2">
                      <button type="button" onClick={() => setTipsIsPercent(true)} className={`px-3 py-2 rounded-lg border ${tipsIsPercent ? 'bg-indigo-50 border-indigo-300' : 'bg-white border-gray-200'}`}>%</button>
                      <button type="button" onClick={() => setTipsIsPercent(false)} className={`px-3 py-2 rounded-lg border ${!tipsIsPercent ? 'bg-indigo-50 border-indigo-300' : 'bg-white border-gray-200'}`}>$</button>
                      <input type="number" placeholder={tipsIsPercent ? '0 %' : '0.00'} value={formData.tipsValue} onChange={(e) => setFormData({ ...formData, tipsValue: e.target.value })} className="flex-1 p-2 border rounded-lg" />
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-6 space-y-4">
                <p className="text-sm font-semibold text-gray-700">Item amounts for each person</p>
                <div className="space-y-3">
                  {formData.splitAmong.map((userId) => {
                    const participant = allParticipants.find(p => p.id === userId);
                    const amount = formData.itemizedAmounts[userId] || 0;
                    return (
                      <div key={userId} className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-indigo-200 flex items-center justify-center text-xs font-bold text-indigo-700 flex-shrink-0">
                          {participant?.name?.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-gray-700 flex-1 min-w-0">
                          {participant?.name}
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="text-sm text-gray-500">$</span>
                          <input
                            type="number"
                            placeholder="0.00"
                            value={amount || ''}
                            onChange={(e) =>
                              handleItemAmountChange(userId, e.target.value)
                            }
                            className="w-20 p-2 text-sm bg-white border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Custom Split Summary */}
              {(() => {
                const summary = calculatePerPersonAmount();
                if (typeof summary === 'object' && summary && 'distribution' in summary && summary.distribution.length > 0) {
                  const { totalAmount } = calculateTotals();
                  return (
                    <Card className="p-6 bg-indigo-50 border border-indigo-200">
                      <p className="text-sm font-semibold text-gray-700 mb-3">Breakdown:</p>
                      <div className="space-y-2 mb-3">
                        {summary.distribution.map((item) => {
                          const participant = allParticipants.find(p => p.id === item.userId);
                          return (
                            <div key={item.userId} className="flex justify-between text-sm">
                              <span className="text-gray-700">{participant?.name}</span>
                              <span className="font-semibold text-gray-900">
                                ${item.total.toFixed(2)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="border-t border-indigo-300 pt-2">
                        <p className="text-xs text-gray-500 mb-1">Total: ${totalAmount.toFixed(2)}</p>
                        <p className="text-xs text-gray-500">Base: ${summary.distribution.reduce((sum, d) => sum + d.itemAmount, 0).toFixed(2)} + Tax & Tips: ${summary.totalTaxAndTips.toFixed(2)}</p>
                      </div>
                    </Card>
                  );
                }
                return null;
              })()}
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setStep(2)}
              disabled={loading}
            >
              Back
            </Button>
            <Button
              className="flex-1"
              disabled={loading || (splitType === 'custom' && Object.values(formData.itemizedAmounts).every(v => v === 0))}
              onClick={handleFinish}
            >
              {loading ? 'Creating...' : 'Create Bill'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
