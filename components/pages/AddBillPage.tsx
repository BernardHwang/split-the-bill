"use client";

import React, { useState, useMemo } from "react";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { User } from "firebase/auth";
import { Friend } from "@/hooks/useData";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

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
        splitType: "equal" | "custom";
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
    const [splitType, setSplitType] = useState<"equal" | "custom">("equal");
    const [taxIsPercent, setTaxIsPercent] = useState(true);
    const [tipsIsPercent, setTipsIsPercent] = useState(true);

    const [formData, setFormData] = useState({
        description: "",
        amount: "",
        paidBy: "",
        splitAmong: [] as string[],
        // taxValue and tipsValue: represent either percent (if taxIsPercent true) or absolute amount
        taxValue: "",
        tipsValue: "",
        // items: list of bill items. Each item can be assigned to a single user (assignedTo)
        // or shared among multiple users (sharedWith). amount is a number or empty string.
        items: [] as Array<{
            id: string;
            name: string;
            amount: number | string;
            assignedTo?: string;
            sharedWith: string[];
        }>,
        // legacy per-user amounts (kept for compatibility)
        itemizedAmounts: {} as Record<string, number>,
    });

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

    const toggleFriend = (id: string) => {
        setFormData((prev) => ({
            ...prev,
            splitAmong: prev.splitAmong.includes(id)
                ? prev.splitAmong.filter((fid) => fid !== id)
                : [...prev.splitAmong, id],
        }));
    };

    const addItem = () => {
        const id = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        setFormData((prev) => ({
            ...prev,
            items: [
                ...prev.items,
                { id, name: "", amount: "", sharedWith: [] },
            ],
        }));
    };

    const removeItem = (id: string) => {
        setFormData((prev) => ({
            ...prev,
            items: prev.items.filter((i) => i.id !== id),
        }));
    };

    const updateItemField = (id: string, field: string, value: any) => {
        setFormData((prev) => ({
            ...prev,
            items: prev.items.map((i) =>
                i.id === id ? { ...i, [field]: value } : i
            ),
        }));
    };

    const toggleItemSharedUser = (itemId: string, userId: string) => {
        setFormData((prev) => ({
            ...prev,
            items: prev.items.map((i) => {
                if (i.id !== itemId) return i;
                const has = i.sharedWith.includes(userId);
                const sharedWith = has
                    ? i.sharedWith.filter((u) => u !== userId)
                    : [...i.sharedWith, userId];
                return {
                    ...i,
                    sharedWith,
                    assignedTo:
                        sharedWith.length > 0 ? undefined : i.assignedTo,
                };
            }),
        }));
    };

    const setItemAssignedTo = (itemId: string, userId?: string) => {
        setFormData((prev) => ({
            ...prev,
            items: prev.items.map((i) =>
                i.id === itemId
                    ? {
                          ...i,
                          assignedTo: userId,
                          sharedWith: userId ? [] : i.sharedWith,
                      }
                    : i
            ),
        }));
    };

    const calculateTotals = () => {
        let baseAmount = parseFloat(formData.amount) || 0;

        // For custom split, use total items amount as base
        if (splitType === "custom") {
            baseAmount = formData.items.reduce((sum, item) => {
                return sum + (parseFloat(String(item.amount)) || 0);
            }, 0);
        }

        const taxRaw = parseFloat(formData.taxValue) || 0;
        const tipsRaw = parseFloat(formData.tipsValue) || 0;
        const taxAmount = taxIsPercent ? (baseAmount * taxRaw) / 100 : taxRaw;
        const tipsAmount = tipsIsPercent
            ? (baseAmount * tipsRaw) / 100
            : tipsRaw;
        const totalAmount = baseAmount + taxAmount + tipsAmount;
        return { baseAmount, taxAmount, tipsAmount, totalAmount };
    };

    const calculatePerPersonAmount = () => {
        if (splitType === "equal") {
            const { totalAmount } = calculateTotals();
            return formData.splitAmong.length > 0
                ? totalAmount / formData.splitAmong.length
                : 0;
        } else {
            // Build per-user subtotal from item list. Items can be assigned to a single user (assignedTo)
            // or shared among specific users (sharedWith). If neither assigned nor shared, treat as shared among selected splitAmong.
            const subtotals: Record<string, number> = {};
            formData.splitAmong.forEach((id) => {
                subtotals[id] = 0;
            });

            formData.items.forEach((item) => {
                const amt = parseFloat(String(item.amount)) || 0;
                if (item.assignedTo) {
                    if (!subtotals[item.assignedTo])
                        subtotals[item.assignedTo] = 0;
                    subtotals[item.assignedTo] += amt;
                } else if (item.sharedWith && item.sharedWith.length > 0) {
                    const per = amt / item.sharedWith.length;
                    item.sharedWith.forEach((uid) => {
                        if (!subtotals[uid]) subtotals[uid] = 0;
                        subtotals[uid] += per;
                    });
                } else {
                    // shared among all selected people
                    const count = formData.splitAmong.length || 1;
                    const per = amt / count;
                    formData.splitAmong.forEach((uid) => {
                        if (!subtotals[uid]) subtotals[uid] = 0;
                        subtotals[uid] += per;
                    });
                }
            });

            const subtotalTotal = Object.values(subtotals).reduce(
                (a, b) => a + b,
                0
            );
            const { taxAmount, tipsAmount } = calculateTotals();
            const totalTaxAndTips = taxAmount + tipsAmount;

            if (subtotalTotal > 0) {
                return {
                    distribution: formData.splitAmong.map((userId) => ({
                        userId,
                        itemAmount: subtotals[userId] || 0,
                        share:
                            ((subtotals[userId] || 0) / subtotalTotal) *
                            totalTaxAndTips,
                        total:
                            (subtotals[userId] || 0) +
                            ((subtotals[userId] || 0) / subtotalTotal) *
                                totalTaxAndTips,
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

                if (splitType === "custom") {
                    // send itemized items (with assignment/shared info)
                    billData.items = formData.items;

                    // Also compute legacy per-user itemizedAmounts for compatibility with other parts of the app
                    const subtotals: Record<string, number> = {};
                    formData.splitAmong.forEach((id) => {
                        subtotals[id] = 0;
                    });
                    formData.items.forEach((item) => {
                        const amt = parseFloat(String(item.amount)) || 0;
                        if (item.assignedTo) {
                            if (!subtotals[item.assignedTo])
                                subtotals[item.assignedTo] = 0;
                            subtotals[item.assignedTo] += amt;
                        } else if (
                            item.sharedWith &&
                            item.sharedWith.length > 0
                        ) {
                            const per = amt / item.sharedWith.length;
                            item.sharedWith.forEach((uid) => {
                                if (!subtotals[uid]) subtotals[uid] = 0;
                                subtotals[uid] += per;
                            });
                        } else {
                            const count = formData.splitAmong.length || 1;
                            const per = amt / count;
                            formData.splitAmong.forEach((uid) => {
                                if (!subtotals[uid]) subtotals[uid] = 0;
                                subtotals[uid] += per;
                            });
                        }
                    });
                    billData.itemizedAmounts = subtotals;
                }

                // Convert tax/tips absolute amounts to percentages for storage when not percent
                let base = parseFloat(formData.amount) || 0;
                if (splitType === "custom") {
                    base = formData.items.reduce((sum, item) => {
                        return sum + (parseFloat(String(item.amount)) || 0);
                    }, 0);
                }
                const taxRaw = parseFloat(formData.taxValue) || 0;
                const tipsRaw = parseFloat(formData.tipsValue) || 0;
                const taxPercent = taxIsPercent
                    ? taxRaw
                    : base > 0
                    ? (taxRaw / base) * 100
                    : 0;
                const tipsPercent = tipsIsPercent
                    ? tipsRaw
                    : base > 0
                    ? (tipsRaw / base) * 100
                    : 0;

                if (taxRaw)
                    billData.taxPercentage = Math.round(taxPercent * 100) / 100;
                if (tipsRaw)
                    billData.tipsPercentage =
                        Math.round(tipsPercent * 100) / 100;

                await onCreateBill(billData);
            }
            onBack();
        } catch (error) {
            console.error("Error creating bill:", error);
            alert("Failed to create bill");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-xl mx-auto space-y-4 md:space-y-6">
            <div className="">
                <button
                    onClick={onCancel}
                    className="p-2 flex items-center gap-2 md:gap-4 hover:bg-gray-200 rounded-full transition-colors flex-shrink-0"
                >
                    <ArrowLeft size={20} className="text-gray-900" />
                    <h1 className="text-lg md:text-xl font-bold text-gray-900">
                        Create New Bill
                    </h1>
                </button>
            </div>

            {/* Step 1: bill info (description, amount, paid by, participants) */}

            {step === 1 && (
                <div className="space-y-6 animate-in fade-in">
                    <Card className="p-6 space-y-4">
                        <Input
                            label="Description"
                            placeholder="e.g. Dinner at Mario's"
                            value={formData.description}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    description: e.target.value,
                                })
                            }
                            autoFocus
                        />

                        <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-2">
                                Paid by
                            </label>
                            <select
                                value={formData.paidBy}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        paidBy: e.target.value,
                                    })
                                }
                                className="w-full p-3 bg-white text-gray-900 text-base border-2 border-gray-300 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none"
                            >
                                <option value="" className="text-gray-500">
                                    Select a person
                                </option>
                                {authenticatedUser && (
                                    <option value={authenticatedUser.uid}>
                                        {authenticatedUser.displayName || "You"}
                                    </option>
                                )}
                                {friends.map((friend) => (
                                    <option key={friend.id} value={friend.id}>
                                        {friend.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </Card>

                    <div>
                        <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4">
                            Select people to split with
                        </h2>
                        <Card className="p-6">
                            <div className="space-y-2">
                                {authenticatedUser && (
                                    <button
                                        onClick={() =>
                                            toggleFriend(authenticatedUser.uid)
                                        }
                                        className={`w-full flex items-center gap-3 p-3 text-gray-700 rounded-xl border transition-all ${
                                            formData.splitAmong.includes(
                                                authenticatedUser.uid
                                            )
                                                ? "border-indigo-500 bg-indigo-50"
                                                : "border-gray-100 hover:bg-gray-50"
                                        }`}
                                    >
                                        <div className="w-8 h-8 rounded-full bg-indigo-200 flex items-center justify-center text-xs font-bold text-indigo-700">
                                            {(
                                                authenticatedUser.displayName ||
                                                "You"
                                            )
                                                .charAt(0)
                                                .toUpperCase()}
                                        </div>
                                        <span className="flex-1 text-left font-medium">
                                            {authenticatedUser.displayName ||
                                                "You"}
                                        </span>
                                        {formData.splitAmong.includes(
                                            authenticatedUser.uid
                                        ) && (
                                            <CheckCircle
                                                size={20}
                                                className="text-indigo-600"
                                            />
                                        )}
                                    </button>
                                )}
                                {friends.length === 0 && (
                                    <p className="text-center text-gray-400 py-4">
                                        No friends added.
                                    </p>
                                )}
                                {friends.map((f) => (
                                    <button
                                        key={f.id}
                                        onClick={() => toggleFriend(f.id)}
                                        className={`w-full flex items-center gap-3 p-3 text-gray-700 rounded-xl border transition-all ${
                                            formData.splitAmong.includes(f.id)
                                                ? "border-indigo-500 bg-indigo-50"
                                                : "border-gray-100 hover:bg-gray-50"
                                        }`}
                                    >
                                        <div className="w-8 h-8 rounded-full bg-indigo-200 flex items-center justify-center text-xs font-bold text-indigo-700">
                                            {f.name.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="flex-1 text-left font-medium">
                                            {f.name}
                                        </span>
                                        {formData.splitAmong.includes(f.id) && (
                                            <CheckCircle
                                                size={20}
                                                className="text-indigo-600"
                                            />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </Card>
                    </div>

                    <div className="flex gap-3">
                        <Button
                            className="flex-1"
                            onClick={() => onCancel()}
                            variant="outline"
                        >
                            Cancel
                        </Button>
                        <Button
                            className="flex-1"
                            disabled={
                                formData.splitAmong.length === 0 ||
                                !formData.paidBy ||
                                loading
                            }
                            onClick={() => setStep(2)}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-6 animate-in fade-in">
                    <div>
                        <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4">
                            How to split?
                        </h2>
                    </div>

                    {/* Split Type Selection */}
                    <Card className="p-6 space-y-4">
                        <div className="space-y-3">
                            <label
                                className="flex items-center p-3 border-2 rounded-xl cursor-pointer transition-all"
                                style={{
                                    borderColor:
                                        splitType === "equal"
                                            ? "#4f46e5"
                                            : "#e5e7eb",
                                    backgroundColor:
                                        splitType === "equal"
                                            ? "#eef2ff"
                                            : "white",
                                }}
                            >
                                <input
                                    type="radio"
                                    checked={splitType === "equal"}
                                    onChange={() => setSplitType("equal")}
                                    className="w-4 h-4"
                                />
                                <span className="ml-3 font-medium text-gray-900">
                                    Split Equally
                                </span>
                            </label>

                            <label
                                className="flex items-center p-3 border-2 rounded-xl cursor-pointer transition-all"
                                style={{
                                    borderColor:
                                        splitType === "custom"
                                            ? "#4f46e5"
                                            : "#e5e7eb",
                                    backgroundColor:
                                        splitType === "custom"
                                            ? "#eef2ff"
                                            : "white",
                                }}
                            >
                                <input
                                    type="radio"
                                    checked={splitType === "custom"}
                                    onChange={() => setSplitType("custom")}
                                    className="w-4 h-4"
                                />
                                <span className="ml-3 font-medium text-gray-900">
                                    Custom Split (by items + tax + tips)
                                </span>
                            </label>
                        </div>
                    </Card>

                    {/* Equal Split Summary */}
                    {splitType === "equal" && (
                        <>
                            <Card className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                                        Total Amount ($)
                                    </label>
                                    <input
                                        type="number"
                                        placeholder="0.00"
                                        value={formData.amount}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                amount: e.target.value,
                                            })
                                        }
                                        className="w-full p-3 bg-white text-gray-900 text-base border-2 border-gray-300 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none"
                                    />
                                </div>
                            </Card>
                            <Card className="p-6 bg-indigo-50 border border-indigo-200">
                                <p className="text-sm text-gray-600 mb-2">
                                    Each person pays:
                                </p>
                                <p className="text-2xl font-bold text-indigo-600">
                                    $
                                    {(
                                        (calculatePerPersonAmount() as number) ||
                                        0
                                    ).toFixed(2)}
                                </p>
                                <p className="text-xs text-gray-500 mt-2">
                                    Total: $
                                    {calculateTotals().totalAmount.toFixed(2)} ÷{" "}
                                    {formData.splitAmong.length} people
                                </p>
                            </Card>
                        </>
                    )}

                    {/* Custom Split */}
                    {splitType === "custom" && (
                        <div className="space-y-4">
                            <Card className="p-4 space-y-4 bg-gray-50">
                                <div className="flex flex-col md:flex-col gap-4">
                                    <div>
                                        <label className="text-sm font-semibold text-gray-900">
                                            Tax
                                        </label>
                                        <div className="mt-2 flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setTaxIsPercent(true);
                                                    setFormData({
                                                        ...formData,
                                                        taxValue: "",
                                                    });
                                                }}
                                                className={`px-3 py-2 text-gray-700 rounded-lg border font-medium ${
                                                    taxIsPercent
                                                        ? "bg-indigo-50 border-indigo-400"
                                                        : "bg-white border-gray-300"
                                                }`}
                                            >
                                                %
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setTaxIsPercent(false);
                                                    setFormData({
                                                        ...formData,
                                                        taxValue: "",
                                                    });
                                                }}
                                                className={`px-3 py-2 rounded-lg border font-medium text-gray-700 ${
                                                    !taxIsPercent
                                                        ? "bg-indigo-50 border-indigo-400"
                                                        : "bg-white border-gray-300"
                                                }`}
                                            >
                                                $
                                            </button>
                                            <input
                                                type="number"
                                                placeholder={
                                                    taxIsPercent
                                                        ? "0 %"
                                                        : "0.00"
                                                }
                                                value={formData.taxValue}
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        taxValue:
                                                            e.target.value,
                                                    })
                                                }
                                                className="flex-1 p-2 border-2 border-gray-300 text-gray-900 text-base bg-white rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-sm font-semibold text-gray-900">
                                            Tips
                                        </label>
                                        <div className="mt-2 flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setTipsIsPercent(true);
                                                    setFormData({
                                                        ...formData,
                                                        tipsValue: "",
                                                    });
                                                }}
                                                className={`px-3 py-2 rounded-lg border font-medium text-gray-700 ${
                                                    tipsIsPercent
                                                        ? "bg-indigo-50 border-indigo-400"
                                                        : "bg-white border-gray-300"
                                                }`}
                                            >
                                                %
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setTipsIsPercent(false);
                                                    setFormData({
                                                        ...formData,
                                                        tipsValue: "",
                                                    });
                                                }}
                                                className={`px-3 py-2 rounded-lg border font-medium text-gray-700 ${
                                                    !tipsIsPercent
                                                        ? "bg-indigo-50 border-indigo-400"
                                                        : "bg-white border-gray-300"
                                                }`}
                                            >
                                                $
                                            </button>
                                            <input
                                                type="number"
                                                placeholder={
                                                    tipsIsPercent
                                                        ? "0 %"
                                                        : "0.00"
                                                }
                                                value={formData.tipsValue}
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        tipsValue:
                                                            e.target.value,
                                                    })
                                                }
                                                className="flex-1 p-2 border-2 border-gray-300 text-gray-900 text-base bg-white rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </Card>

                            <Card className="p-6 space-y-4">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-semibold text-gray-700">
                                        Items
                                    </p>
                                    <button
                                        type="button"
                                        onClick={addItem}
                                        className="text-sm px-3 py-1 bg-indigo-600 text-white rounded-lg"
                                    >
                                        + Add item
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {formData.items.length === 0 && (
                                        <p className="text-sm text-gray-500">
                                            No items yet. Add items and mark
                                            them as shared or assign to someone.
                                        </p>
                                    )}

                                    {formData.items.map((item) => (
                                        <div
                                            key={item.id}
                                            className="p-3 border-2 border-gray-300 rounded-lg bg-white"
                                        >
                                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                <input
                                                    className="flex-1 min-w-[150px] p-2 border-2 border-gray-300 text-gray-900 text-base bg-white rounded-lg placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                                                    placeholder="Item name"
                                                    value={item.name}
                                                    onChange={(e) =>
                                                        updateItemField(
                                                            item.id,
                                                            "name",
                                                            e.target.value
                                                        )
                                                    }
                                                />
                                                <div className="flex items-center gap-1">
                                                    <span className="text-sm font-medium text-gray-700">
                                                        $
                                                    </span>
                                                    <input
                                                        type="number"
                                                        className="w-24 p-2 border-2 border-gray-300 text-gray-900 text-base bg-white rounded-lg placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                                                        placeholder="0.00"
                                                        value={
                                                            item.amount as any
                                                        }
                                                        onChange={(e) =>
                                                            updateItemField(
                                                                item.id,
                                                                "amount",
                                                                e.target.value
                                                            )
                                                        }
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        removeItem(item.id)
                                                    }
                                                    className="text-sm font-medium text-red-600 hover:text-red-700"
                                                >
                                                    Remove
                                                </button>
                                            </div>

                                            <div className="flex gap-3 items-center flex-wrap text-sm">
                                                <div className="text-gray-700 font-medium">
                                                    Assign to:
                                                </div>
                                                <div className="flex gap-2">
                                                    <select
                                                        value={
                                                            item.assignedTo ||
                                                            ""
                                                        }
                                                        onChange={(e) =>
                                                            setItemAssignedTo(
                                                                item.id,
                                                                e.target
                                                                    .value ||
                                                                    undefined
                                                            )
                                                        }
                                                        className="p-2 border-2 border-gray-300 text-gray-900 bg-white rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                                                    >
                                                        <option
                                                            value=""
                                                            className="text-gray-500"
                                                        >
                                                            All
                                                        </option>
                                                        {allParticipants.map(
                                                            (p) => (
                                                                <option
                                                                    key={p.id}
                                                                    value={p.id}
                                                                >
                                                                    {p.name}
                                                                </option>
                                                            )
                                                        )}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Card>

                            {/* Custom Split Summary */}
                            {(() => {
                                const summary = calculatePerPersonAmount();
                                if (
                                    typeof summary === "object" &&
                                    summary &&
                                    "distribution" in summary &&
                                    summary.distribution.length > 0
                                ) {
                                    const {
                                        baseAmount,
                                        taxAmount,
                                        tipsAmount,
                                        totalAmount,
                                    } = calculateTotals();
                                    const itemSubtotal =
                                        summary.distribution.reduce(
                                            (sum, d) => sum + d.itemAmount,
                                            0
                                        );
                                    return (
                                        <Card className="p-6 bg-indigo-50 border border-indigo-200">
                                            <p className="text-sm font-semibold text-gray-700 mb-3">
                                                Breakdown:
                                            </p>
                                            <div className="space-y-2 mb-3">
                                                {summary.distribution.map(
                                                    (item) => {
                                                        const participant =
                                                            allParticipants.find(
                                                                (p) =>
                                                                    p.id ===
                                                                    item.userId
                                                            );
                                                        return (
                                                            <div
                                                                key={
                                                                    item.userId
                                                                }
                                                                className="flex justify-between text-sm"
                                                            >
                                                                <span className="text-gray-700">
                                                                    {
                                                                        participant?.name
                                                                    }
                                                                </span>
                                                                <div className="text-right">
                                                                    <div className="font-semibold text-gray-900">
                                                                        $
                                                                        {item.total.toFixed(
                                                                            2
                                                                        )}
                                                                    </div>
                                                                    <div className="text-xs text-gray-500">
                                                                        Items: $
                                                                        {item.itemAmount.toFixed(
                                                                            2
                                                                        )}{" "}
                                                                        +
                                                                        Tax/Tips:
                                                                        $
                                                                        {item.share.toFixed(
                                                                            2
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    }
                                                )}
                                            </div>
                                            <div className="border-t border-indigo-300 pt-2 space-y-1">
                                                <p className="text-xs text-gray-600">
                                                    <span className="font-medium">
                                                        Total: $
                                                        {totalAmount.toFixed(2)}
                                                    </span>
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    Items: $
                                                    {itemSubtotal.toFixed(2)}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    Tax: ${taxAmount.toFixed(2)}{" "}
                                                    {taxIsPercent
                                                        ? `(${formData.taxValue}%)`
                                                        : "(fixed)"}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    Tips: $
                                                    {tipsAmount.toFixed(2)}{" "}
                                                    {tipsIsPercent
                                                        ? `(${formData.tipsValue}%)`
                                                        : "(fixed)"}
                                                </p>
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
                            onClick={() => setStep(1)}
                            disabled={loading}
                        >
                            Back
                        </Button>
                        <Button
                            className="flex-1"
                            disabled={
                                loading ||
                                (splitType === "custom" &&
                                    formData.items.reduce(
                                        (s, it) =>
                                            s +
                                            (parseFloat(String(it.amount)) ||
                                                0),
                                        0
                                    ) === 0)
                            }
                            onClick={handleFinish}
                        >
                            {loading ? "Creating..." : "Create Bill"}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
