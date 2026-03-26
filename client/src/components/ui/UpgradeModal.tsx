import { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { startCheckout } from '../../api/billing';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function UpgradeModal({ isOpen, onClose }: Props) {
  const [loading, setLoading] = useState<'monthly' | 'annual' | null>(null);

  async function handleUpgrade(plan: 'monthly' | 'annual') {
    setLoading(plan);
    try {
      await startCheckout(plan);
    } catch {
      setLoading(null);
    }
  }

  return (
    <Modal open={isOpen} onClose={onClose} title="Upgrade to Pro">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          You've used all 3 free trial jobs. Upgrade to Pro for unlimited jobs and
          750 AI credits per month.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="border border-gray-200 rounded-lg p-4 space-y-2">
            <div className="font-semibold text-gray-900">Monthly</div>
            <div className="text-2xl font-bold text-gray-900">
              $9.99<span className="text-sm font-normal text-gray-500">/mo</span>
            </div>
            <Button className="w-full" onClick={() => handleUpgrade('monthly')} disabled={loading !== null}>
              {loading === 'monthly' ? 'Redirecting…' : 'Get Pro Monthly'}
            </Button>
          </div>
          <div className="border-2 border-blue-500 rounded-lg p-4 space-y-2 relative">
            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
              Best Value
            </div>
            <div className="font-semibold text-gray-900">Annual</div>
            <div className="text-2xl font-bold text-gray-900">
              $79<span className="text-sm font-normal text-gray-500">/yr</span>
            </div>
            <Button className="w-full" onClick={() => handleUpgrade('annual')} disabled={loading !== null}>
              {loading === 'annual' ? 'Redirecting…' : 'Get Pro Annual'}
            </Button>
          </div>
        </div>
        <p className="text-xs text-gray-400 text-center">Cancel anytime. Powered by Stripe.</p>
      </div>
    </Modal>
  );
}
