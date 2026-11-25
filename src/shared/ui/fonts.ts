import { Barlow, Barlow_Condensed } from 'next/font/google';

/**
 * Barlow, the body typeface. Exposed to CSS as `--font-barlow`.
 *
 * @remarks
 * Shared by the app's root layout and Storybook, so stories render with the real fonts.
 */
export const barlow = Barlow({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-barlow',
});

/**
 * Barlow Condensed, the heading and display typeface. Exposed to CSS as
 * `--font-barlow-condensed`.
 *
 * @remarks
 * Shared by the app's root layout and Storybook, so stories render with the real fonts.
 */
export const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['600', '700', '800', '900'],
  style: ['normal', 'italic'],
  variable: '--font-barlow-condensed',
});

/** The class names that define both font variables, for the root element. */
export const fontVariables = `${barlow.variable} ${barlowCondensed.variable}`;
