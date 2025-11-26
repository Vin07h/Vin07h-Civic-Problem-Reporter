import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Read configuration from Vite environment variables (VITE_*)
const envConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Fallback to the old global parsing if env vars are not set (keeps backwards compatibility)
let firebaseConfig = envConfig;
try {
  const hasAny = Object.values(envConfig).some(Boolean);
  if (!hasAny && typeof __firebase_config !== 'undefined') {
    firebaseConfig = typeof __firebase_config === 'string' ? JSON.parse(__firebase_config) : __firebase_config;
  }
} catch (err) {
  console.warn('Failed to parse __firebase_config, using env or defaults.', err);
}

export const appId = import.meta.env.VITE_APP_ID || (typeof __app_id !== 'undefined' ? __app_id : 'default-app-id');

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export services
export const auth = getAuth(app);
export const db = getFirestore(app);