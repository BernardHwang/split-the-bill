import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  deleteDoc,
  getDocs,
  getDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface FriendRequest {
  id: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  recipientId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: any;
  updatedAt?: any;
}

/**
 * Custom Hook: Manage Friend Requests
 * Handles sending, accepting, and rejecting friend requests
 */
export const useFriendRequests = (user: User | null | undefined) => {
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Listen for incoming friend requests
  useEffect(() => {
    if (!user?.uid) {
      setIncomingRequests([]);
      setOutgoingRequests([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const incomingQuery = query(
        collection(db, 'friendRequests'),
        where('recipientId', '==', user.uid),
        where('status', '==', 'pending')
      );

      const unsubscribeIncoming = onSnapshot(incomingQuery, (snapshot) => {
        const requests: FriendRequest[] = [];
        snapshot.forEach((doc) => {
          requests.push({
            id: doc.id,
            ...doc.data(),
          } as FriendRequest);
        });
        setIncomingRequests(requests);
      });

      const outgoingQuery = query(
        collection(db, 'friendRequests'),
        where('senderId', '==', user.uid),
        where('status', '==', 'pending')
      );

      const unsubscribeOutgoing = onSnapshot(outgoingQuery, (snapshot) => {
        const requests: FriendRequest[] = [];
        snapshot.forEach((doc) => {
          requests.push({
            id: doc.id,
            ...doc.data(),
          } as FriendRequest);
        });
        setOutgoingRequests(requests);
      });

      setLoading(false);
      return () => {
        unsubscribeIncoming();
        unsubscribeOutgoing();
      };
    } catch (err) {
      console.error('Error fetching friend requests:', err);
      setError('Failed to fetch friend requests');
      setLoading(false);
    }
  }, [user?.uid]);

  const sendFriendRequest = async (
    recipientId: string,
    recipientName: string,
    recipientEmail: string
  ) => {
    try {
      if (!user?.uid) throw new Error('User not authenticated');

      // Check if request already exists
      const existingQuery = query(
        collection(db, 'friendRequests'),
        where('senderId', '==', user.uid),
        where('recipientId', '==', recipientId)
      );

      const existingSnapshot = await getDocs(existingQuery);
      if (!existingSnapshot.empty) {
        throw new Error('Friend request already sent');
      }

      await addDoc(collection(db, 'friendRequests'), {
        senderId: user.uid,
        senderName: user.displayName || 'User',
        senderEmail: user.email,
        recipientId,
        recipientName,
        recipientEmail,
        status: 'pending',
        createdAt: new Date(),
      });

      console.log('Friend request sent');
    } catch (err: any) {
      console.error('Error sending friend request:', err);
      throw err;
    }
  };

  const acceptFriendRequest = async (requestId: string, senderId: string) => {
    try {
      if (!user?.uid) throw new Error('User not authenticated');

      // Update request status
      const requestRef = doc(db, 'friendRequests', requestId);
      await updateDoc(requestRef, {
        status: 'accepted',
        updatedAt: new Date(),
      });

      // Get sender's user data
      const senderRef = doc(db, 'users', senderId);
      const senderDoc = await getDoc(senderRef);
      
      if (!senderDoc.exists()) {
        throw new Error('Sender user data not found');
      }
      
      const senderData = senderDoc.data();

      // Add friend to current user's friends subcollection
      await addDoc(collection(db, 'users', user.uid, 'friends'), {
        id: senderId,
        name: senderData.name || 'User',
        email: senderData.email,
        addedAt: new Date(),
      });

      // Add current user to sender's friends subcollection
      const currentUserRef = doc(db, 'users', user.uid);
      const currentUserDoc = await getDoc(currentUserRef);
      
      if (currentUserDoc.exists()) {
        const currentUserData = currentUserDoc.data();
        await addDoc(collection(db, 'users', senderId, 'friends'), {
          id: user.uid,
          name: currentUserData.name || 'User',
          email: currentUserData.email,
          addedAt: new Date(),
        });
      }

      console.log('Friend request accepted');
    } catch (err) {
      console.error('Error accepting friend request:', err);
      throw err;
    }
  };

  const rejectFriendRequest = async (requestId: string) => {
    try {
      const requestRef = doc(db, 'friendRequests', requestId);
      await updateDoc(requestRef, {
        status: 'rejected',
        updatedAt: new Date(),
      });

      console.log('Friend request rejected');
    } catch (err) {
      console.error('Error rejecting friend request:', err);
      throw err;
    }
  };

  return {
    incomingRequests,
    outgoingRequests,
    loading,
    error,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
  };
};
