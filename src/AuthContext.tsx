import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserProgress } from './types';
import { auth, db } from './firebase';
import { onAuthStateChanged, signInWithPopup, signOut, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  progress: UserProgress;
  updateProgress: (newProgress: Partial<UserProgress>) => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const defaultProgress: UserProgress = { checklist: {}, timeline: {}, calculations: [], applications: [] };

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [progress, setProgress] = useState<UserProgress>(defaultProgress);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const t = await firebaseUser.getIdToken();
        setToken(t);
        
        // Fetch or create user profile
        const userRef = doc(db, 'users', firebaseUser.uid);
        const userSnap = await getDoc(userRef);
        
        let userData: User;
        if (userSnap.exists()) {
          userData = { id: firebaseUser.uid as any, ...userSnap.data() } as User;
        } else {
          userData = {
            id: firebaseUser.uid as any,
            name: firebaseUser.displayName || 'Student',
            email: firebaseUser.email || '',
            role: 'student'
          };
          await setDoc(userRef, {
            name: userData.name,
            email: userData.email,
            role: userData.role,
            createdAt: serverTimestamp()
          });
        }
        setUser(userData);
      } else {
        setUser(null);
        setToken(null);
        setProgress(defaultProgress);
      }
      setIsAuthReady(true);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isAuthReady && user) {
      const progressRef = doc(db, 'users', String(user.id), 'data', 'progress');
      const unsubscribe = onSnapshot(progressRef, (docSnap) => {
        if (docSnap.exists()) {
          setProgress(docSnap.data() as UserProgress);
        } else {
          // Initialize progress if it doesn't exist
          setDoc(progressRef, {
            ...defaultProgress,
            updatedAt: serverTimestamp()
          });
          setProgress(defaultProgress);
        }
      }, (error) => {
        console.error("Firestore Error: ", JSON.stringify({
          error: error.message,
          operationType: 'get',
          path: progressRef.path
        }));
      });

      return () => unsubscribe();
    }
  }, [isAuthReady, user]);

  const login = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const updateProgress = async (newProgress: Partial<UserProgress>) => {
    if (!user) return;
    const updated = { ...progress, ...newProgress };
    setProgress(updated);
    
    try {
      const progressRef = doc(db, 'users', String(user.id), 'data', 'progress');
      await setDoc(progressRef, {
        ...updated,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error: any) {
      console.error("Firestore Error: ", JSON.stringify({
        error: error.message,
        operationType: 'update',
        path: `users/${user.id}/data/progress`
      }));
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, progress, updateProgress, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
