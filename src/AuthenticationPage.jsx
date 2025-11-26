import React, { useState, useEffect } from 'react';
import {
  signInWithCustomToken,
  signInAnonymously,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db, appId } from './firebase.js';

// --- Icon Components ---
// Accept props (like className) so they can be styled by the parent.
const BuildingIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M5 6h14M5 10h14M5 14h14M5 18h14" />
  </svg>
);

const UserIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const LockIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" {...props} className={`${props.className || ''}`} viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
  </svg>
);

const EmailIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" {...props} className={`${props.className || ''}`} viewBox="0 0 20 20" fill="currentColor">
    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
  </svg>
);

// --- Main App Component ---
export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);

  // --- Authentication Listener ---
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Sign in using the provided token or anonymously
        const token = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
        if (token) {
          await signInWithCustomToken(auth, token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Error signing in: ", error);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const uid = currentUser.uid;
        setUserId(uid);
        
        // Check if user document exists in Firestore
        // NOTE: keep your Firestore path format consistent with how you stored user docs
        const userDocRef = doc(db, `artifacts/${appId}/users/${uid}/profile`, "data");
        try {
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            setUser({ ...currentUser, ...userDocSnap.data() });
          } else {
            // If it's an anonymous user or new user, just set basic info
            setUser(currentUser);
          }
        } catch (err) {
          console.error("Error reading user doc:", err);
          setUser(currentUser);
        }
      } else {
        setUser(null);
        setUserId(null);
      }
      setLoading(false);
    });
    
    initializeAuth();

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-xl font-semibold">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {user && !user.isAnonymous ? (
        <Dashboard user={user} />
      ) : (
        <AuthPage />
      )}
    </div>
  );
}

// --- Authentication Page Component ---
const AuthPage = () => {
  const [authMode, setAuthMode] = useState('client'); // 'client' or 'admin'
  const [isLogin, setIsLogin] = useState(true); // true for login, false for signup
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState({ type: '', content: '' });

  const handleAuthAction = async (e) => {
    e.preventDefault();
    setMessage({ type: '', content: '' }); // Clear previous messages

    if (!email || !password) {
      setMessage({ type: 'error', content: 'Please fill in all fields.' });
      return;
    }

    try {
      let userCredential;
      if (isLogin) {
        // --- Login Logic ---
        userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log("User logged in:", userCredential.user);
        setMessage({ type: 'success', content: 'Logged in successfully!' });
        // The onAuthStateChanged listener in App will handle the UI update
      } else {
        // --- Signup Logic ---
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log("User signed up:", user);

        // Create a user document in Firestore
        const userDocRef = doc(db, `artifacts/${appId}/users/${user.uid}/profile`, "data");
        
        await setDoc(userDocRef, {
          email: user.email,
          role: authMode, // Set role to 'client' or 'admin'
          createdAt: new Date().toISOString(),
        });
        
        setMessage({ type: 'success', content: 'Account created successfully! Please log in.' });
        setIsLogin(true); // Switch to login view after signup
      }
    } catch (error) {
      console.error("Authentication error:", error);
      setMessage({ type: 'error', content: error.message });
    }
  };

  const activeBg = authMode === 'client' ? 'bg-blue-600' : 'bg-red-600';
  const inactiveBg = 'bg-gray-200';
  const activeText = 'text-white';
  const inactiveText = 'text-gray-700';

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-100 to-red-100 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        
        {/* --- Role Toggler --- */}
        <div className="flex">
          <button
            onClick={() => setAuthMode('client')}
            className={`flex-1 p-4 font-semibold text-center transition-all duration-300 ${authMode === 'client' ? `${activeBg} ${activeText}` : `${inactiveBg} ${inactiveText} hover:bg-gray-300`} flex flex-col items-center justify-center`}
            aria-pressed={authMode === 'client'}
          >
            {/* Icon above label: pass styling to icon via className */}
            <UserIcon className="h-6 w-6 mb-2" />
            <span>Client</span>
          </button>
          <button
            onClick={() => setAuthMode('admin')}
            className={`flex-1 p-4 font-semibold text-center transition-all duration-300 ${authMode === 'admin' ? `${activeBg} ${activeText}` : `${inactiveBg} ${inactiveText} hover:bg-gray-300`} flex flex-col items-center justify-center`}
            aria-pressed={authMode === 'admin'}
          >
            <BuildingIcon className="h-6 w-6 mb-2" />
            <span>Admin</span>
          </button>
        </div>

        <div className="p-8">
          {/* --- Header --- */}
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-2">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-center text-gray-600 mb-6">
            {isLogin ? 'Log in as' : 'Sign up as'} a{' '}
            <span className={`font-semibold ${authMode === 'client' ? 'text-blue-600' : 'text-red-600'}`}>
              {authMode}
            </span>
          </p>

          {/* --- Message Display --- */}
          {message.content && (
            <div className={`p-3 rounded-lg mb-4 text-center text-sm ${message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
              {message.content}
            </div>
          )}

          {/* --- Auth Form --- */}
          <form onSubmit={handleAuthAction}>
            <div className="space-y-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <EmailIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LockIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              className={`w-full text-white font-semibold py-3 px-4 rounded-lg mt-6 transition-all duration-300 ${authMode === 'client' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 ${authMode === 'client' ? 'focus:ring-blue-500' : 'focus:ring-red-500'}`}
            >
              {isLogin ? 'Login' : 'Sign Up'}
            </button>
          </form>

          {/* --- Toggle Login/Signup --- */}
          <p className="text-center text-gray-600 text-sm mt-6">
            {isLogin ? "Don't have an account?" : 'Already have an account?'}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className={`font-semibold ml-1 ${authMode === 'client' ? 'text-blue-600 hover:text-blue-700' : 'text-red-600 hover:text-red-700'}`}
            >
              {isLogin ? 'Sign Up' : 'Login'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

// --- Dashboard Component (Placeholder) ---
const Dashboard = ({ user }) => {
  const handleLogout = async () => {
    try {
      await signOut(auth);
      // Re-sign in anonymously after logging out the email user
      await signInAnonymously(auth);
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };
  
  const role = user.role || (user.email ? 'client' : 'guest'); // Default role
  const isAnonymous = user.isAnonymous || !user.email;

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="w-full max-w-2xl bg-white p-8 rounded-2xl shadow-xl text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">
          Welcome to the Dashboard!
        </h1>
        {isAnonymous ? (
          <p className="text-gray-600 text-lg">You are browsing as a guest.</p>
        ) : (
          <>
            <p className="text-gray-600 text-lg mb-2">
              You are logged in as: <span className="font-semibold text-gray-900">{user.email}</span>
            </p>
            <p className="text-gray-600 text-lg mb-6">
              Your role is: 
              <span className={`font-bold uppercase ml-2 px-3 py-1 rounded-full text-sm ${role === 'admin' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                {role}
              </span>
            </p>
            {role === 'admin' && (
              <div className="bg-red-50 p-4 rounded-lg border border-red-200 mb-6">
                <h3 className="font-semibold text-red-800">Admin Panel</h3>
                <p className="text-red-700">You have access to admin-only features.</p>
              </div>
            )}
            {role === 'client' && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-6">
                <h3 className="font-semibold text-blue-800">Client Panel</h3>
                <p className="text-blue-700">You can submit and track your reports here.</p>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="w-full max-w-xs mx-auto bg-gray-700 hover:bg-gray-800 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-300"
            >
              Logout
            </button>
          </>
        )}
      </div>
    </div>
  );
};
