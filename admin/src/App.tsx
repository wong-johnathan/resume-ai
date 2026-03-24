import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdminAuthProvider, useAdminAuth } from './context/AdminAuthContext';
import { AdminLayout } from './components/AdminLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import UserDetail from './pages/UserDetail';
import Logs from './pages/Logs';
import JobDetail from './pages/JobDetail';

const queryClient = new QueryClient();

function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const { admin, loading } = useAdminAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen text-gray-400">Loading...</div>;
  if (!admin) return <Navigate to="/login" replace />;
  return <AdminLayout>{children}</AdminLayout>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AdminAuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<AdminAuthGuard><Dashboard /></AdminAuthGuard>} />
            <Route path="/users" element={<AdminAuthGuard><Users /></AdminAuthGuard>} />
            <Route path="/users/:userId" element={<AdminAuthGuard><UserDetail /></AdminAuthGuard>} />
            <Route path="/users/:userId/jobs/:jobId" element={<AdminAuthGuard><JobDetail /></AdminAuthGuard>} />
            <Route path="/logs" element={<AdminAuthGuard><Logs /></AdminAuthGuard>} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AdminAuthProvider>
    </QueryClientProvider>
  );
}
