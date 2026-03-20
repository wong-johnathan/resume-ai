import { Navigate, Outlet } from 'react-router-dom';
import axios from 'axios';
import { useProfile } from '../../hooks/useProfile';

export function ProfileGate() {
  const { isLoading, isError, error } = useProfile();
  if (isLoading) return <div className="flex items-center justify-center h-screen text-gray-400">Loading…</div>;
  if (isError && axios.isAxiosError(error) && error.response?.status === 404)
    return <Navigate to="/setup" replace />;
  return <Outlet />;
}
