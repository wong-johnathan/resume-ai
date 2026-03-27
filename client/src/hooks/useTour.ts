import { useEffect, useRef } from 'react';
import { useTourContext } from '../context/TourContext';
import type { TourId } from '../api/tours';

export function useTour(tourId: TourId, isReady: boolean = true) {
  const ctx = useTourContext();
  const { shouldAutoStart, startTour } = ctx;
  const startedRef = useRef(false);

  useEffect(() => {
    // Guard against React StrictMode double-fire
    if (startedRef.current) return;
    if (isReady && shouldAutoStart(tourId)) {
      startedRef.current = true;
      startTour(tourId);
    }
  }, [isReady, shouldAutoStart, tourId, startTour]);

  return {
    ...ctx,
    startTour: () => startTour(tourId),
  };
}
