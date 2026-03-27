import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
} from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTours, completeTour as completeTourApi, resetTour as resetTourApi, TourId } from '../api/tours';
import { TOUR_CONFIGS, TourStep } from '../tours';

interface TourContextValue {
  // Server state
  toursCompleted: Record<string, string>;
  isLoadingTours: boolean;
  // Active tour state
  activeTourId: TourId | null;
  activeStepIndex: number;
  activeStep: TourStep | null;
  totalSteps: number;
  targetRect: DOMRect | null;
  // Actions
  shouldAutoStart: (tourId: TourId) => boolean;
  startTour: (tourId: TourId) => void;
  nextStep: () => void;
  endTour: () => void;
  completeTour: () => void;
  resetTour: (tourId: TourId) => void;
}

const TourContext = createContext<TourContextValue>({
  toursCompleted: {},
  isLoadingTours: true,
  activeTourId: null,
  activeStepIndex: 0,
  activeStep: null,
  totalSteps: 0,
  targetRect: null,
  shouldAutoStart: () => false,
  startTour: () => {},
  nextStep: () => {},
  endTour: () => {},
  completeTour: () => {},
  resetTour: () => {},
});

export function TourProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const { data: toursCompleted = {} as Record<string, string>, isLoading: isLoadingTours } = useQuery({
    queryKey: ['tours'],
    queryFn: getTours,
    staleTime: Infinity,
  });

  const completeMutation = useMutation({
    mutationFn: completeTourApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tours'] }),
  });

  const resetMutation = useMutation({
    mutationFn: resetTourApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tours'] }),
  });

  // Stable ref so endTour doesn't depend on the completeMutation object (which changes every render)
  const completeMutateRef = useRef(completeMutation.mutate);
  completeMutateRef.current = completeMutation.mutate;

  const [activeTourId, setActiveTourId] = useState<TourId | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const measureAttempts = useRef(0);
  const mutationObserverRef = useRef<MutationObserver | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const measureTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeConfig = activeTourId ? TOUR_CONFIGS[activeTourId] : null;
  const activeStep = activeConfig ? activeConfig.steps[activeStepIndex] : null;
  const totalSteps = activeConfig ? activeConfig.steps.length : 0;

  const shouldAutoStart = useCallback(
    (tourId: TourId) => !isLoadingTours && !toursCompleted[tourId],
    [isLoadingTours, toursCompleted]
  );

  const startTour = useCallback((tourId: TourId) => {
    setActiveTourId(tourId);
    setActiveStepIndex(0);
    setTargetRect(null);
  }, []);

  const endTour = useCallback(() => {
    resizeObserverRef.current?.disconnect();
    mutationObserverRef.current?.disconnect();
    if (measureTimeoutRef.current !== null) {
      clearTimeout(measureTimeoutRef.current);
      measureTimeoutRef.current = null;
    }
    if (activeTourId) {
      completeMutateRef.current(activeTourId);
    }
    setActiveTourId(null);
    setActiveStepIndex(0);
    setTargetRect(null);
  }, [activeTourId]);

  const measureTarget = useCallback((selector: string) => {
    measureAttempts.current = 0;
    const attempt = () => {
      const el = document.querySelector(selector);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Wait for scroll to settle before measuring
        setTimeout(() => {
          const rect = el.getBoundingClientRect();
          setTargetRect(rect);
          // ResizeObserver keeps the spotlight aligned as content reflows
          resizeObserverRef.current?.disconnect();
          resizeObserverRef.current = new ResizeObserver(() => {
            setTargetRect(el.getBoundingClientRect());
          });
          resizeObserverRef.current.observe(el);
        }, 300);
      } else if (measureAttempts.current < 10) {
        measureAttempts.current++;
        measureTimeoutRef.current = setTimeout(attempt, 100);
      } else {
        // Element not found after max retries (e.g. conditionally-rendered card absent) — skip step
        if (activeConfig && activeStepIndex >= activeConfig.steps.length - 1) {
          endTour();
        } else {
          setActiveStepIndex((i) => i + 1);
        }
      }
    };
    attempt();
  }, [activeConfig, activeStepIndex, activeTourId, endTour]);

  // When step changes, measure the new target element
  useEffect(() => {
    if (!activeStep) return;
    measureTarget(activeStep.selector);
    return () => {
      // Cancel any pending retry timeout when step/measureTarget changes
      if (measureTimeoutRef.current !== null) {
        clearTimeout(measureTimeoutRef.current);
        measureTimeoutRef.current = null;
      }
      measureAttempts.current = 0;
    };
  }, [activeStep, measureTarget]);

  // Set up MutationObserver for auto-advance steps (prep tour)
  useEffect(() => {
    if (!activeStep?.autoAdvanceWhenSelector) return;

    const advanceSelector = activeStep.autoAdvanceWhenSelector;
    const observer = new MutationObserver(() => {
      if (document.querySelector(advanceSelector)) {
        observer.disconnect();
        setActiveStepIndex((i) => i + 1);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    mutationObserverRef.current = observer;

    return () => observer.disconnect();
  }, [activeStep]);

  // Lock body scroll while tour is active
  useEffect(() => {
    if (activeTourId) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [activeTourId]);

  const completeTour = useCallback(() => {
    endTour();
  }, [endTour]);

  const resetTour = useCallback((tourId: TourId) => {
    resetMutation.mutate(tourId);
  }, [resetMutation]);

  const nextStep = useCallback(() => {
    if (!activeConfig) return;
    if (activeStepIndex < activeConfig.steps.length - 1) {
      setActiveStepIndex((i) => i + 1);
    } else {
      completeTour();
    }
  }, [activeConfig, activeStepIndex, completeTour]);

  return (
    <TourContext.Provider
      value={{
        toursCompleted,
        isLoadingTours,
        activeTourId,
        activeStepIndex,
        activeStep,
        totalSteps,
        targetRect,
        shouldAutoStart,
        startTour,
        nextStep,
        endTour,
        completeTour,
        resetTour,
      }}
    >
      {children}
    </TourContext.Provider>
  );
}

export const useTourContext = () => useContext(TourContext);
