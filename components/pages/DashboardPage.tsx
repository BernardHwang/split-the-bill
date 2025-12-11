"use client";

import React, { useMemo } from "react";
import { Receipt, TrendingUp, TrendingDown, CheckCircle, Clock } from "lucide-react";
import { User } from "firebase/auth";
import { Bill, Friend } from "@/hooks/useData";
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
    
    // Helper for safe number parsing
    const safeNumber = (value: any) => {
        const num = parseFloat(value);
        return isNaN(num) ? 0 : num;
    };

    const calculateAmounts = (bill: Bill, userId: string) => {
        const totalAmount = safeNumber(bill.amount);

        // Safety check: if total amount is invalid/0, return 0 to prevent NaN
        if (totalAmount === 0 && bill.splitType === 'equal') return 0;

        if (bill.splitType === "equal") {
            const splitCount = bill.splitAmong?.length || 1;
            return totalAmount / splitCount;
        } else {
            // Custom split validation
            const taxPercent = safeNumber(bill.taxPercentage);
            const tipsPercent = safeNumber(bill.tipsPercentage);

            const itemizedAmounts = bill.itemizedAmounts || {};
            const itemizedTotal = Object.values(itemizedAmounts).reduce(
                (a, b) => a + safeNumber(b),
                0
            );

            // Calculate absolute tax/tips amounts derived from the Itemized Total 
            const taxAmount = (itemizedTotal * taxPercent) / 100;
            const tipsAmount = (itemizedTotal * tipsPercent) / 100;
            const totalTaxAndTips = taxAmount + tipsAmount;

            const userItemAmount = safeNumber(itemizedAmounts[userId]);
            
            // Avoid divide by zero
            if (itemizedTotal === 0) return userItemAmount;

            const shareOfOverheads = (userItemAmount / itemizedTotal) * totalTaxAndTips;
            return userItemAmount + shareOfOverheads;
        }
    };

    // Check if all participants in a bill have paid
    const isBillCompleted = (bill: Bill) => {
        // Check if all people who owe money (splitAmong, excluding paidBy) have paid
        const peopleWhoPay = (bill.splitAmong || []).filter((id) => id !== bill.paidBy);
        if (peopleWhoPay.length === 0) return true; // No one else needs to pay

        return peopleWhoPay.every((personId) => bill.paidStatus?.[personId] || false);
    };

    const totals = useMemo(() => {
        let totalUnpaid = 0;
        let totalPaid = 0;
        let totalPending = 0;

        bills.forEach((bill) => {
            if (!authenticatedUser) return;

            // Check if user is involved in the bill (either paid for it OR is in the split list)
            if (bill.splitAmong?.includes(authenticatedUser.uid)) {
                
                const myShare = calculateAmounts(bill, authenticatedUser.uid);
                
                // CASE 1: I am the Payer
                if (bill.paidBy === authenticatedUser.uid) {
                    // If I paid the bill, my own share is considered "Paid" (settled expense).
                    // I don't owe anyone for this.
                    totalPaid += myShare;
                } 
                // CASE 2: I am a Participant (I owe money)
                else {
                    const isPaid = bill.paidStatus?.[authenticatedUser.uid] || false;
                    const isPending = bill.pendingStatus?.[authenticatedUser.uid] || false;

                    if (isPaid) {
                        totalPaid += myShare;
                    } else if (isPending) {
                        // Pending counts as Unpaid until confirmed, but we track the pending amount
                        totalPending += myShare;
                        totalUnpaid += myShare; 
                    } else {
                        totalUnpaid += myShare;
                    }
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
                        You Owe
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
                            To Pay
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
                            Paid (Settled)
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
                        bills.map((bill) => {
                            const isCompleted = isBillCompleted(bill);
                            
                            // Calculate specific user share safely
                            let myShare = 0;
                            let isPayer = false;
                            
                            if (authenticatedUser) {
                                myShare = calculateAmounts(bill, authenticatedUser.uid);
                                isPayer = bill.paidBy === authenticatedUser.uid;
                            }
                            
                            // If I am the payer, my "share" is what I consumed/spent.
                            const displayAmount = myShare; 

                            return (
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
                                                {isPayer ? "You" : (bill.paidByName || "Unknown")}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center md:gap-4">
                                        {/* Status Badge */}
                                        <div className={`flex flex-row md:flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                                            isCompleted
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-orange-100 text-orange-700'
                                        }`}>
                                            {isCompleted ? (
                                                <>
                                                    <CheckCircle size={14} />
                                                    <span>Completed</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Clock size={14} />
                                                    <span>Ongoing</span>
                                                </>
                                            )}
                                        </div>

                                        <div className="text-right min-w-[70px]">
                                            <p className="text-xs text-gray-500 font-medium mb-0.5">
                                                Your Share
                                            </p>
                                            <span className="font-bold text-gray-900 text-sm md:text-lg block">
                                                ${displayAmount.toFixed(2)}
                                            </span>
                                            <p className="text-[10px] md:text-xs text-gray-400">
                                                Total: ${safeNumber(bill.amount).toFixed(2)}
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
