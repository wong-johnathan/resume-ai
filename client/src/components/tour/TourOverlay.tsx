import { useState, useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { useTourContext } from '../../context/TourContext';

const PADDING = 10;
const TOOLTIP_WIDTH = 300;
const TOOLTIP_HEIGHT = 160;

function computeTooltipStyle(
  rect: DOMRect,
  placement: 'top' | 'bottom' | 'left' | 'right'
): React.CSSProperties {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let top: number, left: number;

  if (placement === 'bottom') {
    top = rect.bottom + PADDING + 8;
    left = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2;
  } else if (placement === 'top') {
    top = rect.top - TOOLTIP_HEIGHT - PADDING - 8;
    left = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2;
  } else if (placement === 'left') {
    top = rect.top + rect.height / 2 - TOOLTIP_HEIGHT / 2;
    left = rect.left - TOOLTIP_WIDTH - PADDING - 8;
  } else {
    top = rect.top + rect.height / 2 - TOOLTIP_HEIGHT / 2;
    left = rect.right + PADDING + 8;
  }

  left = Math.max(12, Math.min(left, vw - TOOLTIP_WIDTH - 12));
  top = Math.max(12, Math.min(top, vh - TOOLTIP_HEIGHT - 12));

  return { position: 'fixed', top, left, width: TOOLTIP_WIDTH };
}

export function TourOverlay() {
  const {
    activeTourId,
    activeStep,
    activeStepIndex,
    totalSteps,
    targetRect,
    nextStep,
    endTour,
  } = useTourContext();

  const [vw, setVw] = useState(window.innerWidth);
  const [vh, setVh] = useState(window.innerHeight);

  useEffect(() => {
    const handleResize = () => {
      setVw(window.innerWidth);
      setVh(window.innerHeight);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const maskId = useId();

  if (!activeTourId || !activeStep || !targetRect) return null;
  const isLastStep = activeStepIndex === totalSteps - 1;

  const spotX = targetRect.left - PADDING;
  const spotY = targetRect.top - PADDING;
  const spotW = targetRect.width + PADDING * 2;
  const spotH = targetRect.height + PADDING * 2;

  const tooltipStyle = computeTooltipStyle(targetRect, activeStep.placement);

  return createPortal(
    <>
      {/* Dimmed backdrop with SVG cutout spotlight */}
      <svg
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: 60, width: vw, height: vh }}
        aria-hidden="true"
      >
        <defs>
          <mask id={maskId}>
            <rect width={vw} height={vh} fill="white" />
            <rect
              x={spotX}
              y={spotY}
              width={spotW}
              height={spotH}
              rx={8}
              fill="black"
            />
          </mask>
        </defs>
        <rect
          width={vw}
          height={vh}
          fill="rgba(0,0,0,0.55)"
          mask={`url(#${maskId})`}
        />
      </svg>

      {/* Blue highlight ring around spotlit element */}
      <div
        className="fixed pointer-events-none rounded-lg"
        style={{
          zIndex: 61,
          top: spotY,
          left: spotX,
          width: spotW,
          height: spotH,
          border: '2px solid #3b82f6',
          boxShadow: '0 0 0 2px rgba(59,130,246,0.3)',
        }}
        aria-hidden="true"
      />

      {/* Tooltip */}
      <div
        className="fixed bg-white rounded-xl shadow-2xl border border-gray-100 p-5 pointer-events-auto"
        style={{ ...tooltipStyle, zIndex: 62 }}
        role="dialog"
        aria-label={activeStep.title}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-sm font-semibold text-gray-900">{activeStep.title}</h3>
          <button
            onClick={endTour}
            className="text-gray-400 hover:text-gray-600 text-xs shrink-0"
            aria-label="Skip tour"
          >
            ✕
          </button>
        </div>
        <p className="text-xs text-gray-600 leading-relaxed mb-4">{activeStep.body}</p>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-gray-400">
            {activeStepIndex + 1} / {totalSteps}
          </span>
          <div className="flex gap-2">
            <button
              onClick={endTour}
              className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded"
            >
              Skip
            </button>
            <button
              onClick={nextStep}
              className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 font-medium"
            >
              {isLastStep ? 'Done' : 'Next →'}
            </button>
          </div>
        </div>
      </div>

      {/* Click-blocking backdrop */}
      <div
        className="fixed inset-0"
        style={{ zIndex: 59, cursor: 'default' }}
        onClick={endTour}
        aria-hidden="true"
      />
    </>,
    document.body
  );
}
