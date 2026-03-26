import api from './client';

export interface BillingStatus {
  status: 'TRIAL' | 'PRO' | 'EXPIRED';
  creditsRemaining: number;
  creditsTotal: number;
  creditsResetAt: string | null;
  jobsUsed: number;
  trialLimit: number;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export async function getBillingStatus(): Promise<BillingStatus> {
  const { data } = await api.get<BillingStatus>('/billing/status');
  return data;
}

export async function startCheckout(priceId: 'monthly' | 'annual'): Promise<void> {
  const { data } = await api.post<{ url: string }>('/billing/checkout', { priceId });
  window.location.href = data.url;
}

export async function openCustomerPortal(): Promise<void> {
  const { data } = await api.post<{ url: string }>('/billing/portal');
  window.location.href = data.url;
}
