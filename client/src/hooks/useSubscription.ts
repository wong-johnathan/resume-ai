import { useQuery } from '@tanstack/react-query';
import { getBillingStatus } from '../api/billing';
import { useAuth } from '../context/AuthContext';

export function useSubscription() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['billing', 'status'],
    queryFn: getBillingStatus,
    staleTime: 60_000,
    enabled: !!user,
  });
}
