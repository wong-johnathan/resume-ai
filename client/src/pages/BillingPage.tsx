import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSubscription } from '../hooks/useSubscription';
import { startCheckout, openCustomerPortal } from '../api/billing';
import { Button } from '../components/ui/Button';
import { useAppStore } from '../store/useAppStore';
import { Zap } from 'lucide-react';

export function BillingPage() {
  const { data: sub, isLoading } = useSubscription();
  const { addToast } = useAppStore();
  const [params, setParams] = useSearchParams();

  useEffect(() => {
    if (params.get('success') === 'true') {
      addToast('Welcome to Pro! 750 credits have been added to your account.', 'success');
      setParams({});
    }
    if (params.get('canceled') === 'true') {
      addToast('Checkout canceled.', 'error');
      setParams({});
    }
  }, [params, addToast, setParams]);

  if (isLoading) return <div className="p-8 text-gray-500">Loading…</div>;

  const isPro = sub?.status === 'PRO';
  const jobsRemaining = Math.max(0, (sub?.trialLimit ?? 3) - (sub?.jobsUsed ?? 0));
  const creditPct = Math.round(((sub?.creditsRemaining ?? 0) / (sub?.creditsTotal ?? 50)) * 100);

  return (
    <div className="max-w-2xl mx-auto p-8 space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Billing &amp; Plan</h1>

      {/* Current Plan */}
      <div className="border border-gray-200 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Current Plan</div>
            <div className="text-xl font-semibold text-gray-900">{isPro ? 'Pro' : 'Free Trial'}</div>
          </div>
          {isPro && (
            <span className="bg-blue-100 text-blue-700 text-xs font-medium px-3 py-1 rounded-full">Active</span>
          )}
        </div>

        {/* Credit balance */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1 text-gray-600">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              AI Credits
            </span>
            <span className="font-medium text-gray-900">
              {sub?.creditsRemaining ?? 0} / {sub?.creditsTotal ?? 50}
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-400 rounded-full transition-all"
              style={{ width: `${creditPct}%` }}
            />
          </div>
          {isPro && sub?.creditsResetAt && (
            <p className="text-xs text-gray-400">
              Resets {new Date(sub.creditsResetAt).toLocaleDateString()}
            </p>
          )}
        </div>

        {!isPro && (
          <div className="text-sm text-gray-600">
            {jobsRemaining > 0
              ? `${jobsRemaining} of ${sub?.trialLimit ?? 3} free trial job${jobsRemaining !== 1 ? 's' : ''} remaining.`
              : 'You have used all free trial jobs.'}
          </div>
        )}

        {isPro && (
          <div className="text-sm text-gray-600">
            {sub?.cancelAtPeriodEnd
              ? `Subscription ends ${sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString() : 'soon'}.`
              : `Renews ${sub?.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString() : '—'}.`}
          </div>
        )}
      </div>

      {/* Credit cost reference */}
      <div className="border border-gray-100 rounded-xl p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">Credit Costs</h2>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm text-gray-600">
          {([
            ['Resume Tailoring', 5],
            ['Cover Letter', 3],
            ['Interview Prep', 5],
            ['Sample Answer', 2],
            ['Answer Feedback', 2],
            ['Improve Summary', 1],
            ['Sample Job', 1],
          ] as [string, number][]).map(([label, cost]) => (
            <div key={label} className="flex items-center justify-between">
              <span>{label}</span>
              <span className="flex items-center gap-0.5 font-medium text-amber-600">
                <Zap className="w-3 h-3" />{cost}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      {isPro ? (
        <div className="space-y-2">
          <p className="text-sm text-gray-600">
            Manage your subscription, update payment method, or cancel via the Stripe Customer Portal.
          </p>
          <Button onClick={async () => {
            try { await openCustomerPortal(); }
            catch { addToast('Failed to open customer portal', 'error'); }
          }}>Open Customer Portal</Button>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Upgrade to Pro</h2>
          <p className="text-sm text-gray-600">Unlimited jobs. 750 AI credits/month. Cancel anytime.</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="border border-gray-200 rounded-lg p-4 space-y-3">
              <div className="font-medium text-gray-900">Monthly</div>
              <div className="text-3xl font-bold text-gray-900">
                $9.99<span className="text-sm font-normal text-gray-500">/mo</span>
              </div>
              <Button className="w-full" onClick={async () => {
                try { await startCheckout('monthly'); }
                catch { addToast('Failed to start checkout', 'error'); }
              }}>Choose Monthly</Button>
            </div>
            <div className="border-2 border-blue-500 rounded-lg p-4 space-y-3 relative">
              <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                Save 34%
              </div>
              <div className="font-medium text-gray-900">Annual</div>
              <div className="text-3xl font-bold text-gray-900">
                $79<span className="text-sm font-normal text-gray-500">/yr</span>
              </div>
              <Button className="w-full" onClick={async () => {
                try { await startCheckout('annual'); }
                catch { addToast('Failed to start checkout', 'error'); }
              }}>Choose Annual</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
