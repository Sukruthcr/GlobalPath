import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserProgress } from './types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  progress: UserProgress;
  updateProgress: (newProgress: Partial<UserProgress>) => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [progress, setProgress] = useState<UserProgress>({ checklist: {}, timeline: {}, calculations: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser && token) {
      setUser(JSON.parse(savedUser));
      fetchProgress(token);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchProgress = async (authToken: string) => {
    try {
      const res = await fetch('/api/user/progress', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProgress(data);
      }
    } catch (e) {
      console.error("Failed to fetch progress", e);
    } finally {
      setLoading(false);
    }
  };

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    fetchProgress(newToken);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setProgress({ checklist: {}, timeline: {}, calculations: [] });
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const updateProgress = async (newProgress: Partial<UserProgress>) => {
    const updated = { ...progress, ...newProgress };
    setProgress(updated);
    if (token) {
      await fetch('/api/user/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(updated)
      });
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
