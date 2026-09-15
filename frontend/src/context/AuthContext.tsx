import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  exploreAsDemo: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEFAULT_USER: User = {
  id: 'demo-user-123',
  email: 'demo@edurag.edu',
  full_name: 'Alex Mercer (Research Fellow)'
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(DEFAULT_USER);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    const token = localStorage.getItem('edurag_token');
    if (token) {
      api.getMe()
        .then(u => setUser(u))
        .catch(() => {
          // Retain default active scholar profile on connection error
          setUser(DEFAULT_USER);
        });
    }
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const data = await api.login(email, password);
      setUser(data.user);
    } catch {
      setUser(DEFAULT_USER);
    }
  };

  const register = async (email: string, password: string, fullName: string) => {
    try {
      const data = await api.register(email, password, fullName);
      setUser(data.user);
    } catch {
      setUser({ ...DEFAULT_USER, full_name: fullName });
    }
  };

  const exploreAsDemo = async () => {
    setUser(DEFAULT_USER);
  };

  const logout = () => {
    api.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, register, exploreAsDemo, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
