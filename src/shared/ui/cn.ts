import { twMerge } from 'tailwind-merge';

/**
 * Joins class names, letting later Tailwind utilities win over earlier ones.
 *
 * @param classes - Class names. Falsy values are skipped.
 * @returns The merged class string.
 *
 * @example
 * ```ts
 * cn('p-2', isLarge && 'p-4'); // 'p-4'
 * ```
 */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return twMerge(classes.filter(Boolean).join(' '));
}
