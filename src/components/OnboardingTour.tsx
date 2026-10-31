import React, { useState, useEffect, useCallback } from 'react';

export const ONBOARDING_COMPLETED_KEY = 'circuitflow_onboarding_completed';

export function hasCompletedOnboarding(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_COMPLETED_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setOnboardingCompleted(completed = true): void {
  try {
    localStorage.setItem(ONBOARDING_COMPLETED_KEY, completed ? 'true' : 'false');
  } catch {
    // Gracefully ignore storage failures (e.g., sandboxed iframes)
  }
}

export interface TourStep {
  id: string;
  targetSelector?: string;
  title: string;
  subtitle: string;
  description: string;
  actionHint?: string;
  badge: string;
  preferredPlacement?: 'bottom' | 'top' | 'left' | 'right' | 'center';
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to CircuitFlow Copper Lab',
    subtitle: 'Interactive Digital Logic Simulation & Analysis',
    description:
      'CircuitFlow gives you hands-on experience designing, simulating, and analyzing digital electronics. Master the core curriculum workflow:\n\n' +
      '1. Choose a circuit or start from scratch\n' +
      '2. Place components on the canvas\n' +
      '3. Connect pins with orthogonal copper wires\n' +
      '4. Run real-time simulation\n' +
      '5. Verify with Truth Tables, K-Maps & Waveforms\n' +
      '6. Save projects to your private vault.',
    actionHint: 'Click "Next Step" or press Enter to begin the guided tour.',
    badge: 'Overview',
    preferredPlacement: 'center',
  },
  {
    id: 'library',
    targetSelector: '.toolbox-header, .component-toolbox, #sidebar-library-button',
    title: 'Component Library & IC Studio',
    subtitle: 'Logic Gates, MSI Blocks, Flip-Flops & Custom ICs',
    description:
      'Browse and place basic gates (AND, OR, NAND, NOR, XOR), MSI combinational components (Adders, Decoders, 4:1 Multiplexers), and sequential storage elements (D, JK, T Flip-Flops). You can also construct and package reusable multi-chip modules using the Custom IC Studio.',
    actionHint: 'Select components to drop onto the schematic or digital trainer.',
    badge: 'Step 1: Build',
    preferredPlacement: 'right',
  },
  {
    id: 'wiring',
    targetSelector: '.canvas-viewport, .canvas-container',
    title: 'Canvas Navigation & Wire Routing',
    subtitle: 'Click-to-wire pin connections with orthogonal paths',
    description:
      'Click and drag from any component output pin (emerald dot) to an input pin (slate dot) to route clean Manhattan copper wires. Double-click or right-click any wire segment to add junction branches. Pan freely by dragging the canvas or using workspace scrollbars.',
    actionHint: 'Hold middle mouse or drag background to pan; scroll to zoom.',
    badge: 'Step 2: Wire',
    preferredPlacement: 'bottom',
  },
  {
    id: 'simulate',
    targetSelector: '.topbar-right, .shell-btn.primary, button[title*="Simulation"]',
    title: 'Interactive Simulation Controls',
    subtitle: 'Continuous execution, clock frequencies & single stepping',
    description:
      'Press the Simulate button (or press Space) to watch digital signals propagate live through gates, switches, and LEDs. Use single-step (T) to observe flip-flop state transitions clock-by-clock. Frequency is adjustable from 0.5 Hz to 10 Hz.',
    actionHint: 'Hit Space to toggle run/pause, or T to single-step clock pulses.',
    badge: 'Step 3: Simulate',
    preferredPlacement: 'bottom',
  },
  {
    id: 'inspector',
    targetSelector: '.properties-panel, #properties-panel',
    title: 'Live Properties & Pin Diagnostics',
    subtitle: 'Inspect logic levels, labels, switch states & bit widths',
    description:
      'Select any placed component or wire to inspect live logic values (HIGH 5V, LOW 0V, or High-Z). Customize designator labels, invert toggle switches, change LED colors, and configure multi-bit bus connections.',
    actionHint: 'Click any component or wire anytime to inspect its active electrical state.',
    badge: 'Step 4: Inspect',
    preferredPlacement: 'left',
  },
  {
    id: 'analysis',
    targetSelector: 'nav.app-nav, button[title*="Analysis"]',
    title: 'Unified Circuit Analysis Center',
    subtitle: 'Truth Tables, Karnaugh Maps, Waveforms & Test Benches',
    description:
      'Verify and diagnose your designs beyond basic simulation: compute complete truth tables, visualize 2-to-6 variable Karnaugh maps with Gray-code group minimization, observe oscilloscope waveforms, analyze sequential state machines, and run automated test benches.',
    actionHint: 'Navigate to the Analysis tab or press the Analysis Center button anytime.',
    badge: 'Step 5: Analyze',
    preferredPlacement: 'bottom',
  },
  {
    id: 'curriculum',
    targetSelector: 'button[title*="Lab Presets"], button[title*="Pre-wired"]',
    title: 'Pre-Built Labs & Guided Courseware',
    subtitle: '12 Curated curriculum experiments with guided checkpoints',
    description:
      'Practice with 12 verified curriculum experiments covering Boolean fundamentals, adders, decoders, multiplexers, flip-flops, and counters. Each lab includes clear learning objectives, guided tasks, and checkpoint verification. You can restart this tour anytime from the Help menu!',
    actionHint: 'Explore pre-built lab schematics to jumpstart your laboratory work.',
    badge: 'Step 6: Practice',
    preferredPlacement: 'bottom',
  },
];

interface OnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenLabPresets?: () => void;
  onOpenComponentLibrary?: () => void;
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({
  isOpen,
  onClose,
  onOpenLabPresets,
  onOpenComponentLibrary,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [cardPosition, setCardPosition] = useState<{
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
    transform?: string;
  }>({
    top: typeof window !== 'undefined' ? Math.round(window.innerHeight / 2) : 400,
    left: typeof window !== 'undefined' ? Math.round(window.innerWidth / 2) : 600,
    transform: 'translate(-50%, -50%)',
  });
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCurrentStepIndex(0);
    }
  }, [isOpen]);

  const step = TOUR_STEPS[currentStepIndex] || TOUR_STEPS[0];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === TOUR_STEPS.length - 1;

  // Calculate target position for popover
  const updatePosition = useCallback(() => {
    if (!step.targetSelector) {
      setSpotlightRect(null);
      setCardPosition({
        top: window.innerHeight / 2,
        left: window.innerWidth / 2,
        transform: 'translate(-50%, -50%)',
      });
      return;
    }

    const selectors = step.targetSelector.split(',').map((s) => s.trim());
    let targetEl: HTMLElement | null = null;
    for (const sel of selectors) {
      targetEl = document.querySelector<HTMLElement>(sel);
      if (targetEl && targetEl.offsetParent !== null) break;
    }

    if (!targetEl) {
      setSpotlightRect(null);
      setCardPosition({
        top: window.innerHeight / 2,
        left: window.innerWidth / 2,
        transform: 'translate(-50%, -50%)',
      });
      return;
    }

    const rect = targetEl.getBoundingClientRect();
    setSpotlightRect(rect);

    const cardWidth = 460;
    const cardHeight = 310;
    const padding = 16;

    let pos: { top?: number; bottom?: number; left?: number; right?: number; transform?: string } = {};

    switch (step.preferredPlacement) {
      case 'right':
        pos = {
          top: Math.max(padding, Math.min(window.innerHeight - cardHeight - padding, rect.top + 10)),
          left: Math.min(window.innerWidth - cardWidth - padding, rect.right + 16),
        };
        break;
      case 'left':
        pos = {
          top: Math.max(padding, Math.min(window.innerHeight - cardHeight - padding, rect.top + 10)),
          left: Math.max(padding, rect.left - cardWidth - 16),
        };
        break;
      case 'top':
        pos = {
          top: Math.max(padding, rect.top - cardHeight - 16),
          left: Math.max(padding, Math.min(window.innerWidth - cardWidth - padding, rect.left + rect.width / 2 - cardWidth / 2)),
        };
        break;
      case 'bottom':
      default:
        pos = {
          top: Math.min(window.innerHeight - cardHeight - padding, rect.bottom + 16),
          left: Math.max(padding, Math.min(window.innerWidth - cardWidth - padding, rect.left + rect.width / 2 - cardWidth / 2)),
        };
        break;
    }

    setCardPosition(pos);
  }, [step]);

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [isOpen, currentStepIndex, updatePosition]);

  const handleNext = () => {
    if (isLastStep) {
      setOnboardingCompleted(true);
      onClose();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    setOnboardingCompleted(true);
    onClose();
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleSkip();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isFirstStep, isLastStep]);

  if (!isOpen) return null;

  return (
    <div
      className="onboarding-tour-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="CircuitFlow Onboarding Walkthrough"
      onClick={handleSkip}
    >
      {/* Spotlight cutout border over highlighted target element if active */}
      {spotlightRect && (
        <div
          className="onboarding-spotlight-box"
          style={{
            position: 'fixed',
            top: `${Math.max(0, spotlightRect.top - 4)}px`,
            left: `${Math.max(0, spotlightRect.left - 4)}px`,
            width: `${spotlightRect.width + 8}px`,
            height: `${spotlightRect.height + 8}px`,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Tour Card Popover */}
      <div
        className="onboarding-tour-card"
        style={{
          top: cardPosition.top !== undefined ? `${cardPosition.top}px` : undefined,
          left: cardPosition.left !== undefined ? `${cardPosition.left}px` : undefined,
          bottom: cardPosition.bottom !== undefined ? `${cardPosition.bottom}px` : undefined,
          right: cardPosition.right !== undefined ? `${cardPosition.right}px` : undefined,
          transform: cardPosition.transform,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header & Step Badge */}
        <div className="onboarding-tour-header">
          <div className="onboarding-step-pill">
            <span className="onboarding-step-badge">{step.badge}</span>
            <span className="onboarding-step-count">
              Step {currentStepIndex + 1} of {TOUR_STEPS.length}
            </span>
          </div>

          <button
            type="button"
            className="onboarding-close-btn"
            onClick={handleSkip}
            title="Skip & close tour (Esc)"
            aria-label="Close Tour"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="onboarding-tour-body">
          <h3 className="onboarding-tour-title">{step.title}</h3>
          <h4 className="onboarding-tour-subtitle">{step.subtitle}</h4>
          <p className="onboarding-tour-text">{step.description}</p>
          {step.actionHint && (
            <div className="onboarding-action-hint">
              <span className="onboarding-hint-icon">💡</span>
              <span>{step.actionHint}</span>
            </div>
          )}
          {step.id === 'library' && onOpenComponentLibrary && (
            <button
              type="button"
              className="onboarding-btn outline"
              style={{ alignSelf: 'flex-start', marginTop: 4 }}
              onClick={onOpenComponentLibrary}
            >
              📂 Open Component Drawer
            </button>
          )}
          {step.id === 'curriculum' && onOpenLabPresets && (
            <button
              type="button"
              className="onboarding-btn outline"
              style={{ alignSelf: 'flex-start', marginTop: 4 }}
              onClick={onOpenLabPresets}
            >
              🔬 Open Lab Presets Hub
            </button>
          )}
        </div>

        {/* Progress Dots Indicator */}
        <div className="onboarding-progress-dots" aria-hidden="true">
          {TOUR_STEPS.map((_, idx) => (
            <button
              key={idx}
              type="button"
              className={`onboarding-dot ${idx === currentStepIndex ? 'active' : ''} ${
                idx < currentStepIndex ? 'visited' : ''
              }`}
              onClick={() => setCurrentStepIndex(idx)}
              title={`Go to step ${idx + 1}`}
            />
          ))}
        </div>

        {/* Action Controls */}
        <div className="onboarding-tour-footer">
          <button
            type="button"
            className="onboarding-btn secondary"
            onClick={handleSkip}
            title="Dismiss onboarding tour"
          >
            Skip Walkthrough
          </button>

          <div className="onboarding-footer-right">
            {!isFirstStep && (
              <button
                type="button"
                className="onboarding-btn outline onboarding-prev-btn"
                onClick={handlePrev}
                title="Previous step (Left Arrow)"
              >
                ← Back
              </button>
            )}

            <button
              type="button"
              className="onboarding-btn primary onboarding-next-btn"
              onClick={handleNext}
              title={isLastStep ? 'Complete and start building (Enter)' : 'Next step (Right Arrow)'}
            >
              {isLastStep ? 'Finish & Start Building ✓' : 'Next Step →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingTour;
