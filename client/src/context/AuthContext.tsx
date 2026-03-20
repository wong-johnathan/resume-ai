import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '../types';
import { getMe } from '../api/auth';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  refetch: () => void;
}

const AuthContext = createContext<AuthContextValue>({ user: null, loading: true, refetch: () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = () => {
    setLoading(true);
    getMe()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  };

  useEffect(fetch, []);

  return <AuthContext.Provider value={{ user, loading, refetch: fetch }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
