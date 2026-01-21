import { useMemo } from "react";
import { Bill, Friend } from "@/hooks/useData";

export interface UserBalance {
    friendId: string;
    friendName: string;
    owes: number; // Amount the friend owes the user
    owed: number; // Amount the user owes the friend
    netBalance: number; // Positive = friend owes user, Negative = user owes friend
}

/**
 * Custom Hook: Calculate balances with friends
 * Determines how much money is owed between the user and their friends
 */
export const useBalances = (bills: Bill[], friends: Friend[], userId: string | undefined) => {
    const balances = useMemo(() => {
        if (!userId) return {};

        const balanceMap: Record<string, UserBalance> = {};

        // Helper function to get friend name from ID
        const getFriendName = (friendId: string): string => {
            const friend = friends.find(f => f.id === friendId);
            return friend?.name || "Unknown Friend";
        };

        // Helper for safe number parsing
        const safeNumber = (value: any) => {
            const num = parseFloat(value);
            return isNaN(num) ? 0 : num;
        };

        // Calculate the user's share in a bill
        const calculateUserShare = (bill: Bill, userId: string): number => {
            const totalAmount = safeNumber(bill.amount);

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

                const taxAmount = (itemizedTotal * taxPercent) / 100;
                const tipsAmount = (itemizedTotal * tipsPercent) / 100;
                const totalTaxAndTips = taxAmount + tipsAmount;

                const userItemAmount = safeNumber(itemizedAmounts[userId]);
                
                if (itemizedTotal === 0) return userItemAmount;

                const shareOfOverheads = (userItemAmount / itemizedTotal) * totalTaxAndTips;
                return userItemAmount + shareOfOverheads;
            }
        };

        // Helper to check if a bill is completed
        const isBillCompleted = (bill: Bill): boolean => {
            // Check if all people who owe money (splitAmong, excluding paidBy) have paid
            const peopleWhoPay = (bill.splitAmong || []).filter((id) => id !== bill.paidBy);
            if (peopleWhoPay.length === 0) return true; // No one else needs to pay

            return peopleWhoPay.every((personId) => bill.paidStatus?.[personId] || false);
        };

        bills.forEach((bill) => {
            // Only consider PENDING bills for balance calculation
            if (isBillCompleted(bill)) return;

            // Skip bills where user is not involved
            if (!bill.splitAmong?.includes(userId)) return;

            const paidByUserId = bill.paidBy;
            const userShare = calculateUserShare(bill, userId);

            // Case 1: Current user paid this bill
            if (paidByUserId === userId) {
                // For each person in the split (except the user), they owe the user
                bill.splitAmong.forEach((personId) => {
                    if (personId === userId) return; // Skip self

                    // Check if this person has already paid their share
                    const hasPaid = bill.paidStatus?.[personId] || false;
                    if (hasPaid) return; // Skip if they already paid

                    // Initialize balance entry if it doesn't exist
                    if (!balanceMap[personId]) {
                        balanceMap[personId] = {
                            friendId: personId,
                            friendName: getFriendName(personId),
                            owes: 0,
                            owed: 0,
                            netBalance: 0,
                        };
                    }

                    const personShare = calculateUserShare(bill, personId);
                    // This person owes the user (only if they haven't paid yet)
                    balanceMap[personId].owes += personShare;
                });
            }
            // Case 2: Someone else paid this bill
            else {
                // Initialize balance entry for the payer if it doesn't exist
                if (!balanceMap[paidByUserId]) {
                    balanceMap[paidByUserId] = {
                        friendId: paidByUserId,
                        friendName: bill.paidByName || "Unknown",
                        owes: 0,
                        owed: 0,
                        netBalance: 0,
                    };
                }

                // Check if user has paid their share
                const isPaid = bill.paidStatus?.[userId] || false;
                
                if (!isPaid) {
                    // Current user owes the payer their share
                    balanceMap[paidByUserId].owed += userShare;
                }

                // Also check if the payer owes the user anything
                // This happens when the payer is also in splitAmong and other people paid
                // But since we're iterating per bill, we handle this in the user-paid case above
            }
        });

        // Calculate net balance
        Object.values(balanceMap).forEach((balance) => {
            balance.netBalance = balance.owes - balance.owed;
        });

        return balanceMap;
    }, [bills, userId, friends]);

    return balances;
};
