import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { adminApi, AdminUser } from '../api/admin';

interface AdminAuthContextValue {
  admin: AdminUser | null;
  loading: boolean;
  refetch: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextValue>({
  admin: null,
  loading: true,
  refetch: () => {},
});

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = () => {
    setLoading(true);
    adminApi
      .getMe()
      .then(setAdmin)
      .catch(() => setAdmin(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchMe(); }, []);

  return (
    <AdminAuthContext.Provider value={{ admin, loading, refetch: fetchMe }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  return useContext(AdminAuthContext);
}
