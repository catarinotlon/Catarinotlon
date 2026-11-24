import { useTranslations } from 'next-intl';

import { cn } from './cn';

const STEPS = ['account', 'race', 'payment'] as const;
const LABEL_KEYS = {
  account: 'stepAccount',
  race: 'stepRace',
  payment: 'stepPayment',
} as const;

/** Props of {@link RegistrationSteps}. */
export interface RegistrationStepsProps {
  /** The step the runner is on. */
  current: 'race' | 'payment';
}

/**
 * The three registration steps, marking the current one.
 *
 * @param props - The current step.
 * @returns The stepper.
 */
export function RegistrationSteps({ current }: RegistrationStepsProps) {
  const t = useTranslations('registrationForm');
  const currentIndex = STEPS.indexOf(current);

  return (
    <ol aria-label={t('stepsLabel')} className="m-0 flex list-none flex-wrap gap-x-5 gap-y-2 p-0">
      {STEPS.map((step, index) => (
        <li
          key={step}
          aria-current={index === currentIndex ? 'step' : undefined}
          className="flex items-center gap-2 text-sm font-semibold"
        >
          <span
            aria-hidden="true"
            className={cn(
              'inline-flex size-7 items-center justify-center rounded-full border-2 font-bold',
              index < currentIndex && 'border-primary bg-primary text-primary-foreground',
              index === currentIndex && 'border-inverse bg-inverse text-inverse-foreground',
              index > currentIndex && 'border-input-border',
            )}
          >
            {index < currentIndex ? '✓' : index + 1}
          </span>
          {t(LABEL_KEYS[step])}
        </li>
      ))}
    </ol>
  );
}
