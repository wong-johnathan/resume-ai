import { useEffect, useRef } from 'react';
import { useTourContext } from '../context/TourContext';
import type { TourId } from '../api/tours';

export function useTour(tourId: TourId) {
  const ctx = useTourContext();
  const { shouldAutoStart, startTour } = ctx;
  const startedRef = useRef(false);

  useEffect(() => {
    // Guard against React StrictMode double-fire
    if (startedRef.current) return;
    if (shouldAutoStart(tourId)) {
      startedRef.current = true;
      startTour(tourId);
    }
  }, [shouldAutoStart, tourId, startTour]);

  return {
    ...ctx,
    startTour: () => startTour(tourId),
  };
}
