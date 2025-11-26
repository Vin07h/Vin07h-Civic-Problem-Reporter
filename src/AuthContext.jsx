import React, { useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signOut, signInAnonymously, signInWithCustomToken } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
// Import our new firebase config
import { auth, db, appId } from './firebase.js'; 

const AuthContext = React.createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [anonymousDisabled, setAnonymousDisabled] = useState(false);

  // This handles the initial sign-in (token or anonymous)
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
        // Allow opt-in for anonymous sign-in via Vite env var.
        const allowAnonymous = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_ALLOW_ANONYMOUS === 'true';
        if (token) {
          await signInWithCustomToken(auth, token);
        } else if (allowAnonymous) {
          // Only sign in anonymously if explicitly allowed and there's no current user
          if (!auth.currentUser) {
            try {
              await signInAnonymously(auth);
            } catch (err) {
              // If anonymous sign-in is disabled for this project, surface a flag to the UI
              const msg = String(err?.code || err?.message || err);
              if (msg.includes('admin-restricted-operation') || msg.includes('anonymous')) {
                console.warn('Anonymous sign-in not permitted by Firebase project settings.');
                setAnonymousDisabled(true);
              } else {
                console.error('Error during anonymous sign-in:', err);
              }
            }
          }
        } else {
          // anonymous not allowed by env, skip automatic anonymous sign-in
          // UI will require explicit login/signup
        }
      } catch (error) {
        console.error("Error signing in:", error);
      }
    };
    initializeAuth();
  }, []); // Run only once

  // This listens for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // User is signed in — try to read profile from the canonical `users/{uid}`
        try {
          let profile = null;

          // Primary location where authService writes user docs
          const primaryRef = doc(db, 'users', currentUser.uid);
          try {
            const primarySnap = await getDoc(primaryRef);
            if (primarySnap.exists()) profile = primarySnap.data();
          } catch (e) {
            console.warn('Error reading primary user doc:', e);
          }

          // Fallback for backwards-compatibility: older path under artifacts/{appId}/users/{uid}/profile
          if (!profile) {
            try {
              // FIX: Add 'data' at the end to make it a valid document path
              const legacyRef = doc(db, 'artifacts', appId, 'users', currentUser.uid, 'profile', 'data');
              const legacySnap = await getDoc(legacyRef);
              if (legacySnap.exists()) profile = legacySnap.data();
            } catch (e) {
              console.warn('Error reading legacy user profile:', e);
            }
          }

          if (profile) {
            setUser({ ...currentUser, ...profile });
          } else {
            setUser(currentUser);
          }
        } catch (err) {
          console.error("Error fetching user profile:", err);
          setUser(currentUser);
        }
      } else {
        // User is signed out
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe; // Cleanup on unmount
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // Only re-sign in anonymously if the project and env allow it
      const allowAnonymous = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_ALLOW_ANONYMOUS === 'true';
      if (allowAnonymous) {
        try {
          await signInAnonymously(auth);
        } catch (err) {
          // If anonymous sign-in is disabled server-side, mark it and continue
          const msg = String(err?.code || err?.message || err);
          if (msg.includes('admin-restricted-operation') || msg.includes('anonymous')) {
            console.warn('Anonymous sign-in not permitted by Firebase project settings (on logout).');
            setAnonymousDisabled(true);
          } else {
            console.error('Error signing in anonymously after logout:', err);
          }
        }
      }
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  const value = {
    user,
    loading,
    anonymousDisabled,
    handleLogout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
