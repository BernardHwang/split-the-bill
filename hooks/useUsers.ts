import { useState, useEffect } from 'react';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface DBUser {
  uid: string;
  name: string;
  email: string;
  photoURL?: string;
  createdAt?: any;
}

/**
 * Custom Hook: Get Users from Firestore
 * Fetches all registered users from the database
 */
export const useUsers = () => {
  const [users, setUsers] = useState<DBUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const usersRef = collection(db, 'users');
        const q = query(usersRef);
        const querySnapshot = await getDocs(q);
        
        const fetchedUsers: DBUser[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          fetchedUsers.push({
            uid: doc.id,
            name: data.name || 'User',
            email: data.email || '',
            photoURL: data.photoURL,
            createdAt: data.createdAt,
          });
        });
        
        setUsers(fetchedUsers);
      } catch (err) {
        console.error('Error fetching users:', err);
        setError('Failed to fetch users');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  return { users, loading, error };
};
