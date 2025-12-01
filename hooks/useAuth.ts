import { useState, useEffect } from 'react';
import {
  signInWithPopup,
  GoogleAuthProvider,
  signInWithCustomToken,
  onAuthStateChanged,
  signOut,
  User,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { appConfig } from '@/lib/config';

/**
 * Custom Hook: Authentication
 * Manages user session state (loading, user object, login/logout functions)
 */
export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Save user data to Firestore
  const saveUserToDb = async (firebaseUser: User) => {
    try {
      const userRef = doc(db, 'users', firebaseUser.uid);
      
      // Check if user already exists
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        // New user - save their data
        await setDoc(userRef, {
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || 'User',
          email: firebaseUser.email,
          photoURL: firebaseUser.photoURL || null,
          createdAt: new Date(),
        });
        console.log('User saved to Firestore');
      }
    } catch (error) {
      console.error('Error saving user to Firestore:', error);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (appConfig.initialAuthToken) {
          await signInWithCustomToken(auth, appConfig.initialAuthToken);
        }
      } catch (error) {
        console.error("Auth Error:", error);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Save user data to Firestore on login
        await saveUserToDb(currentUser);
      }
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    try {
      setError(null);
      setLoading(true);
      const provider = new GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');
      
      const result = await signInWithPopup(auth, provider);
      // Save user data to Firestore
      await saveUserToDb(result.user);
      return result.user;
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to sign in with Google';
      console.error("Google Login Error:", error);
      setError(errorMessage);
      setLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    try {
      setError(null);
      await signOut(auth);
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to sign out';
      console.error("Logout Error:", error);
      setError(errorMessage);
      throw error;
    }
  };

  return { user, loading, loginWithGoogle, logout, error };
};
