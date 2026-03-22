import { useTourContext } from '../../context/TourContext';
import type { TourId } from '../../api/tours';

interface Props {
  tourId: TourId;
  className?: string;
}

export function TakeTourButton({ tourId, className }: Props) {
  const { startTour, resetTour } = useTourContext();

  const handleClick = () => {
    // resetTour fires an async DELETE mutation. startTour runs immediately
    // without waiting for the server round-trip — this is intentional.
    // The tour restart does not depend on server state being cleared first.
    resetTour(tourId);
    startTour(tourId);
  };

  return (
    <button
      onClick={handleClick}
      className={
        className ??
        'text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2'
      }
    >
      Take a tour
    </button>
  );
}
