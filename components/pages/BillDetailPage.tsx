"use client";

import React, { useState, useMemo } from "react";
import { ArrowLeft, Trash2, Check, ReceiptText } from "lucide-react";
import { User } from "firebase/auth";
import { Bill, Friend } from "@/hooks/useData";
import { Card } from "@/components/ui/Card";

interface BillDetailPageProps {
    bill: Bill;
    friends: Friend[];
    onBack: () => void;
    onUpdateBill: (billId: string, updates: Partial<Bill>) => void;
    onDeleteBill: (billId: string) => void;
    authenticatedUser?: User | null;
}

export default function BillDetailPage({
    bill,
    friends,
    onBack,
    onUpdateBill,
    onDeleteBill,
    authenticatedUser,
}: BillDetailPageProps) {
    const [updating, setUpdating] = useState(false);

    const allParticipants = useMemo(() => {
        const result = authenticatedUser
            ? [
                  {
                      id: authenticatedUser.uid,
                      name: authenticatedUser.displayName || "You",
                  },
              ]
            : [];
        return [...result, ...friends];
    }, [authenticatedUser, friends]);

    const paidByPerson = allParticipants.find((f) => f.id === bill.paidBy);

    const calculateAmounts = () => {
        if (bill.splitType === "equal") {
            const perPerson = bill.amount / bill.splitAmong.length;
            return bill.splitAmong.map((personId) => ({
                personId,
                amount: perPerson,
            }));
        } else {
            // Custom split
            const baseAmount = bill.amount;
            const taxPercent = bill.taxPercentage || 0;
            const tipsPercent = bill.tipsPercentage || 0;

            const itemizedTotal = Object.values(
                bill.itemizedAmounts || {}
            ).reduce((a, b) => a + b, 0);

            // Determine if baseAmount already includes tax/tips (it should if saved correctly now)
            // But we need to calculate the add-on amounts for distribution
            
            // Logic:
            // The `itemizedAmounts` stored in DB are just the sum of items per person.
            // We need to distribute tax and tips proportional to that.
            
            // Re-calculate tax/tips amounts based on percents
            // NOTE: If bill.amount was saved as Total (Items + Tax + Tips), we can back-calculate.
            // However, the stored `taxPercentage` and `tipsPercentage` are reliably percents now.
            
            // If we assume bill.amount is the GRAND TOTAL:
            // We need the subtotal of items to calculate tax/tips share accurately?
            // Actually, simply: PersonShare = ItemAmount + (ItemAmount/TotalItems * (TotalTax+TotalTips))
            
            const taxAmount = (itemizedTotal * taxPercent) / 100;
            const tipsAmount = (itemizedTotal * tipsPercent) / 100;
            const totalTaxAndTips = taxAmount + tipsAmount;

            return bill.splitAmong.map((personId) => {
                const itemAmount = bill.itemizedAmounts?.[personId] || 0;
                const share =
                    itemizedTotal > 0
                        ? (itemAmount / itemizedTotal) * totalTaxAndTips
                        : 0;
                return {
                    personId,
                    amount: itemAmount + share,
                };
            });
        }
    };

    const amounts = useMemo(() => calculateAmounts(), [bill]);

    // Participant marks themselves as paid -> set pendingStatus[personId] = true
    const handleMarkPaid = async (personId: string) => {
        try {
            setUpdating(true);
            const currentPending = bill.pendingStatus || {};
            const newPending = {
                ...currentPending,
                [personId]: true,
            };
            await onUpdateBill(bill.id, { pendingStatus: newPending });
        } catch (error) {
            console.error("Error marking payment as pending:", error);
            alert("Failed to mark payment as pending");
        } finally {
            setUpdating(false);
        }
    };

    // Participant unmarks their pending payment status
    const handleUnmarkPending = async (personId: string) => {
        try {
            setUpdating(true);
            const currentPending = bill.pendingStatus || {};
            const newPending = {
                ...currentPending,
                [personId]: false,
            };
            await onUpdateBill(bill.id, { pendingStatus: newPending });
        } catch (error) {
            console.error("Error unmarking payment as pending:", error);
            alert("Failed to unmark payment");
        } finally {
            setUpdating(false);
        }
    };

    // Payer confirms a participant's pending payment
    const handleConfirmPaid = async (personId: string) => {
        try {
            setUpdating(true);
            const currentPaid = bill.paidStatus || {};
            const currentPending = bill.pendingStatus || {};
            const newPaid = { ...currentPaid, [personId]: true };
            const newPending = { ...currentPending, [personId]: false };
            await onUpdateBill(bill.id, {
                paidStatus: newPaid,
                pendingStatus: newPending,
            });
        } catch (error) {
            console.error("Error confirming paid status:", error);
            alert("Failed to confirm payment");
        } finally {
            setUpdating(false);
        }
    };

    // Payer unmarks a paid status
    const handleUnmarkPaid = async (personId: string) => {
        try {
            setUpdating(true);
            const currentPaid = bill.paidStatus || {};
            const newPaid = { ...currentPaid, [personId]: false };
            await onUpdateBill(bill.id, { paidStatus: newPaid });
        } catch (error) {
            console.error("Error unmarking paid status:", error);
            alert("Failed to unmark paid status");
        } finally {
            setUpdating(false);
        }
    };

    const handleDelete = () => {
        if (confirm("Are you sure you want to delete this bill?")) {
            onDeleteBill(bill.id);
            onBack();
        }
    };

    return (
        <div className="space-y-4 md:space-y-6 animate-in slide-in-from-right-8">
            <button
                onClick={onBack}
                className="p-2 flex items-center gap-2 text-gray-700 md:gap-4 hover:bg-gray-200 rounded-full transition-colors flex-shrink-0"
            >
                <ArrowLeft size={20} />
                <h1 className="text-lg md:text-xl font-bold">Bill Details</h1>
            </button>

            <Card className="p-4 md:p-6">
                <div className="flex justify-between items-start mb-4 md:mb-6 gap-2">
                    <div className="flex-1 min-w-0">
                        <h2 className="text-xl md:text-2xl font-bold text-gray-900 truncate">
                            {bill.description}
                        </h2>
                        <p className="text-gray-500 text-xs md:text-sm">
                            Paid by {paidByPerson?.name}
                        </p>
                    </div>
                    {authenticatedUser?.uid === bill.paidBy && (
                        <button
                            onClick={handleDelete}
                            className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                            title="Delete bill"
                        >
                            <Trash2 size={18} className="md:block hidden" />
                            <Trash2 size={16} className="md:hidden" />
                        </button>
                    )}
                </div>

                <div className="bg-gray-50 p-4 rounded-xl mb-6">
                    <p className="text-xs text-gray-500 uppercase mb-1">
                        Total Amount
                    </p>
                    <p className="font-bold text-indigo-600 text-2xl">
                        ${bill.amount.toFixed(2)}
                    </p>
                </div>

                {/* --- NEW SECTION: Item Breakdown --- */}
                {bill.items && bill.items.length > 0 && (
                    <div className="mb-6">
                         <div className="flex items-center gap-2 mb-3">
                             <ReceiptText size={18} className="text-gray-500" />
                            <h3 className="font-bold text-gray-900">
                                Itemized Breakdown
                            </h3>
                         </div>
                        <div className="border border-gray-100 rounded-xl overflow-hidden text-sm">
                            <table className="w-full">
                                <thead className="bg-gray-50 text-gray-500 font-medium">
                                    <tr>
                                        <th className="px-4 py-2 text-left">Item</th>
                                        <th className="px-4 py-2 text-right">Cost</th>
                                        <th className="px-4 py-2 text-right">Assigned To</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {bill.items.map((item) => {
                                        let assignedText = "Shared (All)";
                                        if (item.assignedTo) {
                                            const p = allParticipants.find(p => p.id === item.assignedTo);
                                            assignedText = p?.name || "Unknown";
                                        } else if (item.sharedWith && item.sharedWith.length > 0) {
                                             assignedText = `Shared (${item.sharedWith.length})`;
                                        }

                                        return (
                                            <tr key={item.id}>
                                                <td className="px-4 py-2 text-gray-800">{item.name || "Unnamed Item"}</td>
                                                <td className="px-4 py-2 text-right font-medium text-gray-800">
                                                    ${parseFloat(String(item.amount)).toFixed(2)}
                                                </td>
                                                <td className="px-4 py-2 text-right text-gray-500">
                                                    {assignedText}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                            {bill.splitType === 'custom' && (
                                <div className="bg-gray-50 px-4 py-2 text-right text-xs text-gray-500 border-t border-gray-100">
                                    + {bill.taxPercentage || 0}% Tax & {bill.tipsPercentage || 0}% Tips
                                </div>
                            )}
                        </div>
                    </div>
                )}
                {/* ----------------------------------- */}

                <h3 className="font-bold text-gray-900 mb-4">
                    {bill.splitType === "equal"
                        ? "Split equally among:"
                        : "Payment Split (includes Tax/Tips):"}
                </h3>
                <div className="space-y-3">
                    {amounts.map((item) => {
                        const person = allParticipants.find(
                            (p) => p.id === item.personId
                        );
                        const isPaid =
                            bill.paidStatus?.[item.personId] || false;
                        
                        return (
                            <div
                                key={item.personId}
                                className={`flex items-center justify-between p-3 border rounded-xl transition-all ${
                                    isPaid
                                        ? "border-green-200 bg-green-50"
                                        : "border-gray-100"
                                }`}
                            >
                                <div className="flex items-center gap-3 flex-1">
                                    <div className="w-8 h-8 rounded-full bg-indigo-200 flex items-center justify-center text-xs font-bold text-indigo-700 flex-shrink-0">
                                        {person?.name
                                            ?.charAt(0)
                                            .toUpperCase() || "?"}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-900">
                                            {person?.name || "Unknown"}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            ${item.amount.toFixed(2)}
                                        </p>
                                    </div>
                                </div>
                                {/* Participant actions & status */}
                                {item.personId !== bill.paidBy && (
                                    <div className="flex items-center gap-2">
                                        {/* If already paid */}
                                        {isPaid && (
                                            <div className="flex items-center gap-2">
                                                <div className="text-xs font-semibold text-green-600">
                                                    Paid
                                                </div>
                                                {authenticatedUser?.uid ===
                                                    bill.paidBy && (
                                                    <button
                                                        onClick={() =>
                                                            handleUnmarkPaid(
                                                                item.personId
                                                            )
                                                        }
                                                        disabled={updating}
                                                        className="px-2 py-1 text-xs font-medium rounded bg-red-50 text-red-600 hover:bg-red-100 transition-all"
                                                    >
                                                        Undo
                                                    </button>
                                                )}
                                            </div>
                                        )}

                                        {/* If pending (participant marked paid but awaiting payer confirmation) */}
                                        {bill.pendingStatus?.[item.personId] &&
                                            !isPaid && (
                                                <div className="flex items-center gap-2">
                                                    <div className="text-xs font-semibold text-yellow-600">
                                                        Pending
                                                    </div>
                                                    {authenticatedUser?.uid ===
                                                        item.personId && (
                                                        <button
                                                            onClick={() =>
                                                                handleUnmarkPending(
                                                                    item.personId
                                                                )
                                                            }
                                                            disabled={updating}
                                                            className="px-2 py-1 text-xs font-medium rounded bg-red-50 text-red-600 hover:bg-red-100 transition-all"
                                                        >
                                                            Undo
                                                        </button>
                                                    )}
                                                    {authenticatedUser?.uid ===
                                                        bill.paidBy && (
                                                        <button
                                                            onClick={() =>
                                                                handleUnmarkPending(
                                                                    item.personId
                                                                )
                                                            }
                                                            disabled={updating}
                                                            className="px-2 py-1 text-xs font-medium rounded bg-red-50 text-red-600 hover:bg-red-100 transition-all"
                                                        >
                                                            Cancel
                                                        </button>
                                                    )}
                                                </div>
                                            )}

                                        {/* Participant can mark themselves as paid (sets pending) */}
                                        {authenticatedUser?.uid ===
                                            item.personId &&
                                            !isPaid &&
                                            !bill.pendingStatus?.[
                                                item.personId
                                            ] && (
                                                <button
                                                    onClick={() =>
                                                        handleMarkPaid(
                                                            item.personId
                                                        )
                                                    }
                                                    disabled={updating}
                                                    className="p-2 rounded-lg bg-gray-200 text-gray-600 hover:bg-gray-300 transition-all"
                                                >
                                                    <Check size={16} />
                                                </button>
                                            )}

                                        {/* Payer can confirm pending payments */}
                                        {authenticatedUser?.uid ===
                                            bill.paidBy &&
                                            bill.pendingStatus?.[
                                                item.personId
                                            ] &&
                                            !isPaid && (
                                                <button
                                                    onClick={() =>
                                                        handleConfirmPaid(
                                                            item.personId
                                                        )
                                                    }
                                                    disabled={updating}
                                                    className="px-2 py-1 text-xs font-medium rounded bg-green-50 text-green-600 hover:bg-green-100 transition-all"
                                                >
                                                    Confirm
                                                </button>
                                            )}
                                    </div>
                                )}
                                {item.personId === bill.paidBy && (
                                    <div className="text-xs font-semibold text-green-600 ml-2">
                                        Paid
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </Card>
        </div>
    );
}