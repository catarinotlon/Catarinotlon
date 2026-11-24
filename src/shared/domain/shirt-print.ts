const MAX_RATIO = 0.116;
const FIT = 0.94;

/**
 * How large to print a name on the back of the shirt.
 *
 * @remarks
 * Short names print at one size; longer ones shrink so they always fit across
 * the back. The PDF ticket uses it, and the web shirt preview
 * (src/shared/ui/shirt-preview.tsx) applies the same numbers.
 *
 * @param printed - The name as printed, already uppercase.
 * @returns The font size as a fraction of the shirt's width.
 * @example
 * shirtNameWidthRatio('SOFI'); // 0.116
 */
export function shirtNameWidthRatio(printed: string): number {
  return Math.min(MAX_RATIO, FIT / Math.max(printed.length, 1));
}
