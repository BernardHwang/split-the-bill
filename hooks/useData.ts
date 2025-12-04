import { useState, useEffect } from "react";
import { User } from "firebase/auth";
import {
    collection,
    query,
    onSnapshot,
    deleteDoc,
    doc,
    updateDoc,
    writeBatch,
    orderBy,
    addDoc,
    getDoc,
    getDocs,
    where,
    serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface BillItem {
    id: string;
    name: string;
    amount: number | string;
    assignedTo?: string;
    sharedWith: string[];
}

export interface Bill {
    id: string;
    description: string;
    amount: number;
    paidBy: string;
    paidByName?: string;
    splitAmong: string[];
    splitType: "equal" | "custom";
    // Added items array to interface so we can store/read specific item details
    items?: BillItem[]; 
    itemizedAmounts?: Record<string, number>; // userId -> amount
    taxPercentage?: number;
    tipsPercentage?: number;
    paidStatus?: Record<string, boolean>; // userId -> paid status
    pendingStatus?: Record<string, boolean>; // userId -> pending
    timestamp: any;
}

export interface Friend {
    id: string;
    name: string;
    email?: string;
}

/**
 * Custom Hook: Firestore Data
 * Fetches Bills and Friends for the authenticated user
 */
export const useData = (user: User | null) => {
    const [bills, setBills] = useState<Bill[]>([]);
    const [friends, setFriends] = useState<Friend[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            setBills([]);
            setFriends([]);
            setLoading(false);
            return;
        }

        // Subscribe to shared bills where user is the payer
        const payerBillsQuery = query(
            collection(db, "bills"),
            where("paidBy", "==", user.uid),
            orderBy("timestamp", "desc")
        );

        // Subscribe to shared bills where user is in splitAmong
        const splitBillsQuery = query(
            collection(db, "bills"),
            where("splitAmong", "array-contains", user.uid),
            orderBy("timestamp", "desc")
        );

        let payerBills: Bill[] = [];
        let splitBills: Bill[] = [];

        const updateBills = () => {
            // Combine both arrays and remove duplicates
            const allBills = [...payerBills, ...splitBills];
            const uniqueBills = Array.from(
                new Map(allBills.map((bill) => [bill.id, bill])).values()
            );
            uniqueBills.sort(
                (a, b) => b.timestamp?.toMillis?.() - a.timestamp?.toMillis?.()
            );
            setBills(uniqueBills);
        };

        const unsubscribePayerBills = onSnapshot(
            payerBillsQuery,
            (snapshot) => {
                payerBills = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Bill[];
                updateBills();
            }
        );

        const unsubscribeSplitBills = onSnapshot(
            splitBillsQuery,
            (snapshot) => {
                splitBills = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Bill[];
                updateBills();
            }
        );

        // Subscribe to friends
        const friendsQuery = query(
            collection(db, "users", user.uid, "friends"),
            orderBy("name", "asc")
        );
        const unsubscribeFriends = onSnapshot(friendsQuery, (snapshot) => {
            const friendsData = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as Friend[];
            setFriends(friendsData);
            setLoading(false);
        });

        return () => {
            unsubscribePayerBills();
            unsubscribeSplitBills();
            unsubscribeFriends();
        };
    }, [user]);

    const deleteBill = (billId: string) => {
        if (!user) return;
        deleteDoc(doc(db, "bills", billId));
    };

    const updateBill = (billId: string, updates: Partial<Bill>) => {
        if (!user) return;
        updateDoc(doc(db, "bills", billId), updates);
    };

    const deleteFriend = async (friendUserId: string) => {
        if (!user) return;
        if (friendUserId === user.uid) return;

        const batch = writeBatch(db);

        // Delete friend docs in both directions
        const myFriendRef = doc(db, "users", user.uid, "friends", friendUserId);
        const theirFriendRef = doc(db, "users", friendUserId, "friends", user.uid);
        batch.delete(myFriendRef);
        batch.delete(theirFriendRef);

        // Find and delete friend requests in both directions
        try {
            const outgoingQuery = query(
                collection(db, "friendRequests"),
                where("senderId", "==", user.uid),
                where("recipientId", "==", friendUserId)
            );
            const outgoingDocs = await getDocs(outgoingQuery);
            outgoingDocs.forEach((doc) => batch.delete(doc.ref));

            const incomingQuery = query(
                collection(db, "friendRequests"),
                where("senderId", "==", friendUserId),
                where("recipientId", "==", user.uid)
            );
            const incomingDocs = await getDocs(incomingQuery);
            incomingDocs.forEach((doc) => batch.delete(doc.ref));

            await batch.commit();
        } catch (error) {
            console.error("Error deleting friend and requests:", error);
            throw error;
        }
    };

    const createBill = async (billData: {
        description: string;
        amount: number;
        paidBy: string;
        splitAmong: string[];
        splitType: "equal" | "custom";
        items?: BillItem[]; // Accept items in creation
        itemizedAmounts?: Record<string, number>;
        taxPercentage?: number;
        tipsPercentage?: number;
    }) => {
        if (!user) throw new Error("User not authenticated");

        let paidByName = "Unknown";
        try {
            const payerDoc = await getDoc(doc(db, "users", billData.paidBy));
            if (payerDoc.exists()) {
                paidByName = payerDoc.data().name || "Unknown";
            }
        } catch (error) {
            console.error("Error fetching payer name:", error);
        }

        const paidStatus: Record<string, boolean> = {};
        const pendingStatus: Record<string, boolean> = {};
        billData.splitAmong.forEach((uid) => {
            paidStatus[uid] = uid === billData.paidBy;
            pendingStatus[uid] = false;
        });

        // Ensure amount is saved as a number
        const finalAmount = typeof billData.amount === 'string' 
            ? parseFloat(billData.amount) 
            : billData.amount;

        const billRef = await addDoc(collection(db, "bills"), {
            ...billData,
            paidByName,
            amount: finalAmount,
            paidStatus,
            pendingStatus,
            timestamp: serverTimestamp(),
        });

        console.log("Bill created in shared collection:", billRef.id);
    };

    return {
        bills,
        friends,
        loading,
        deleteBill,
        updateBill,
        deleteFriend,
        createBill,
    };
};