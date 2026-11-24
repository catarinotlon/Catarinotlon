'use client';

import { useState } from 'react';

import { Button } from './button';

/** Props of {@link CopyButton}. */
export interface CopyButtonProps {
  /** The text to copy. */
  value: string;
  /** The button's label. */
  label: string;
  /** The label that confirms what was copied. */
  copiedLabel: string;
}

/**
 * Copies a value to the clipboard and confirms it.
 *
 * @param props - The value and its labels.
 * @returns The button.
 */
export function CopyButton({ value, label, copiedLabel }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      variant="outline"
      className="min-h-11 rounded-full px-4 py-1 text-[15px]"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
      }}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-4 shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="9" y="9" width="12" height="12" rx="2" />
        <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
      </svg>
      <span aria-live="polite">{copied ? copiedLabel : label}</span>
    </Button>
  );
}
