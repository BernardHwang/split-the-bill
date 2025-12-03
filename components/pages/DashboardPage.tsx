"use client";

import React, { useMemo } from "react";
import { Plus, Receipt, TrendingUp, TrendingDown } from "lucide-react";
import { User } from "firebase/auth";
import { Bill, Friend } from "@/hooks/useData";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

interface DashboardPageProps {
    bills: Bill[];
    friends: Friend[];
    onViewBill: (billId: string) => void;
    onDeleteBill: (billId: string) => void;
    onNavigateTo: (tab: string) => void;
    authenticatedUser?: User | null;
}

export default function DashboardPage({
    bills,
    friends,
    onViewBill,
    onDeleteBill,
    onNavigateTo,
    authenticatedUser,
}: DashboardPageProps) {
    const calculateAmounts = (bill: Bill, userId: string) => {
        if (bill.splitType === "equal") {
            return bill.amount / bill.splitAmong.length;
        } else {
            const baseAmount = bill.amount;
            const taxPercent = bill.taxPercentage || 0;
            const tipsPercent = bill.tipsPercentage || 0;

            const itemizedTotal = Object.values(
                bill.itemizedAmounts || {}
            ).reduce((a, b) => a + b, 0);
            const taxAmount = (baseAmount * taxPercent) / 100;
            const tipsAmount = (baseAmount * tipsPercent) / 100;
            const totalTaxAndTips = taxAmount + tipsAmount;

            const itemAmount = bill.itemizedAmounts?.[userId] || 0;
            const share =
                itemizedTotal > 0
                    ? (itemAmount / itemizedTotal) * totalTaxAndTips
                    : 0;
            return itemAmount + share;
        }
    };

    const totals = useMemo(() => {
        let totalUnpaid = 0;
        let totalPaid = 0;
        let totalPending = 0;

        bills.forEach((bill) => {
            if (!authenticatedUser) return;

            // If user is in splitAmong (they owe money)
            if (bill.splitAmong.includes(authenticatedUser.uid)) {
                const amount = calculateAmounts(bill, authenticatedUser.uid);
                const isPaid =
                    bill.paidStatus?.[authenticatedUser.uid] || false;
                const isPending =
                    bill.pendingStatus?.[authenticatedUser.uid] || false;

                if (isPaid) {
                    totalPaid += amount;
                } else if (isPending) {
                    totalPending += amount;
                    totalUnpaid += amount; // pending still counts as unpaid until confirmed
                } else {
                    totalUnpaid += amount;
                }
            }
        });

        return { totalUnpaid, totalPaid, totalPending };
    }, [bills, authenticatedUser]);

    const totalBills = bills.length;

    return (
        <div className="space-y-4 md:space-y-6">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-gray-900 leading-tight">
                        Overview
                    </h1>
                    <p className="text-xs md:text-base text-gray-600 mt-1 font-medium">
                        What's happening with your expenses.
                    </p>
                </div>
            </header>

            {/* Hero Card */}
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-2xl md:rounded-3xl p-6 md:p-8 text-white shadow-xl shadow-indigo-200 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                <div className="relative z-10">
                    <p className="text-indigo-100 font-medium mb-1 text-sm">
                        Total To Pay
                    </p>
                    <h2 className="text-3xl md:text-5xl font-bold mb-4 md:mb-6">
                        ${totals.totalUnpaid.toFixed(2)}
                    </h2>
                    <div className="flex gap-3"></div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                <Card className="p-4 md:p-6">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingDown size={16} className="text-red-500" />
                        <p className="text-gray-600 text-xs md:text-sm font-medium">
                            Unpaid
                        </p>
                    </div>
                    <p className="text-2xl md:text-3xl font-bold text-gray-900">
                        ${totals.totalUnpaid.toFixed(2)}
                    </p>
                </Card>
                <Card className="p-4 md:p-6">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp size={16} className="text-green-500" />
                        <p className="text-gray-600 text-xs md:text-sm font-medium">
                            Paid
                        </p>
                    </div>
                    <p className="text-2xl md:text-3xl font-bold text-gray-900">
                        ${totals.totalPaid.toFixed(2)}
                    </p>
                </Card>
                <Card className="p-4 md:p-6">
                    <div className="flex items-center gap-2 mb-2">
                        <p className="text-gray-600 text-xs md:text-sm font-medium">
                            Pending
                        </p>
                    </div>
                    <p className="text-2xl md:text-3xl font-bold text-gray-900">
                        ${totals.totalPending.toFixed(2)}
                    </p>
                </Card>
                <Card className="p-4 md:p-6">
                    <p className="text-gray-600 text-xs md:text-sm mb-2 font-medium">
                        Total Bills
                    </p>
                    <p className="text-2xl md:text-3xl font-bold text-gray-900">
                        {totalBills}
                    </p>
                </Card>
            </div>

            {/* Bills List */}
            <div>
                <h3 className="font-bold text-base md:text-lg text-gray-900 mb-3 md:mb-4">
                    Recent Bills
                </h3>
                <div className="space-y-3">
                    {bills.length === 0 ? (
                        <Card className="p-8 md:p-10 flex flex-col items-center justify-center text-gray-500 border-dashed">
                            <Receipt
                                size={36}
                                className="mb-3 md:mb-4 opacity-30"
                            />
                            <p className="text-sm font-medium">No bills yet.</p>
                        </Card>
                    ) : (
                        bills.map((bill) => (
                            <button
                                key={bill.id}
                                onClick={() => onViewBill(bill.id)}
                                className="w-full bg-white p-3 md:p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all text-left flex justify-between items-center gap-2 md:gap-4 group"
                            >
                                <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
                                    <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-50 rounded-xl flex-shrink-0 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                                        <Receipt
                                            size={18}
                                            className="md:block hidden"
                                        />
                                        <Receipt
                                            size={16}
                                            className="md:hidden"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-gray-900 text-sm md:text-base truncate">
                                            {bill.description}
                                        </h4>
                                        <p className="text-xs text-gray-500 truncate">
                                            Paid by{" "}
                                            {bill.paidByName || bill.paidBy}
                                        </p>
                                    </div>
                                </div>
                                <span className="font-bold text-gray-900 text-sm md:text-lg whitespace-nowrap">
                                    ${bill.amount.toFixed(2)}
                                </span>
                            </button>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
