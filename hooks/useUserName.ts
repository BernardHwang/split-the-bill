import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * Custom Hook: Get User Name by ID
 * Fetches the name of a user by their UID
 */
export const useUserName = (uid: string | null) => {
  const [name, setName] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!uid);

  useEffect(() => {
    if (!uid) {
      setName(null);
      setLoading(false);
      return;
    }

    const fetchUserName = async () => {
      try {
        setLoading(true);
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
          setName(userDoc.data().name || 'Unknown');
        } else {
          setName('Unknown');
        }
      } catch (error) {
        console.error('Error fetching user name:', error);
        setName('Unknown');
      } finally {
        setLoading(false);
      }
    };

    fetchUserName();
  }, [uid]);

  return { name, loading };
};
