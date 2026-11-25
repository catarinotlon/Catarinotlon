const SHORT_HEX = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/;
const FULL_HEX = /^#[0-9a-f]{6}$/;
const RGB = /^rgba?\(\s*(\d{1,3})\s*,?\s*(\d{1,3})\s*,?\s*(\d{1,3})/;

/**
 * Writes a CSS color as a lowercase six-digit hex, whatever form it was authored or minified in.
 *
 * @param value - A color as CSS returns it: `#fff`, `#0e0e0f`, or `rgb(14, 14, 15)`.
 * @returns The six-digit hex, or `undefined` when the value is not one of those forms.
 *
 * @example
 * ```ts
 * toHexColor('#fff'); // '#ffffff'
 * ```
 */
export function toHexColor(value: string): string | undefined {
  const color = value.trim().toLowerCase();
  if (FULL_HEX.test(color)) return color;
  const short = SHORT_HEX.exec(color);
  if (short)
    return `#${short
      .slice(1)
      .map((digit) => digit + digit)
      .join('')}`;
  const rgb = RGB.exec(color);
  if (rgb) {
    return `#${rgb
      .slice(1)
      .map((channel) => Number(channel).toString(16).padStart(2, '0'))
      .join('')}`;
  }
  return undefined;
}
