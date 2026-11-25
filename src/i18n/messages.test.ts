import { describe, expect, it } from 'vitest';

import en from '../../messages/en.json';
import es from '../../messages/es.json';

function leafKeys(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null) return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    leafKeys(child, prefix ? `${prefix}.${key}` : key),
  );
}

function leaves(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (typeof value !== 'object' || value === null) return [];
  return Object.values(value).flatMap(leaves);
}

describe('message files', () => {
  it('have exactly the same keys in both locales', () => {
    expect(leafKeys(es).sort()).toEqual(leafKeys(en).sort());
  });

  it.each([
    ['en', en],
    ['es', es],
  ])('%s never misspells the event name', (_locale, messages) => {
    expect(leaves(messages).filter((text) => /catarinot[oó]n/i.test(text))).toEqual([]);
  });

  it.each([
    ['en', en],
    ['es', es],
  ])('%s leaves the event name in page titles to the layout template', (_locale, messages) => {
    const titles = leafKeys(messages)
      .filter((key) => /\.(metaTitle|editMeta|newMeta)$/.test(key) && key !== 'landing.metaTitle')
      .map((key) => key.split('.').reduce<unknown>((node, part) => (node as never)[part], messages))
      .filter((title) => String(title).includes('Catarinotlón'));

    expect(titles).toEqual([]);
  });

  it('calls the payment method by its full name in Spanish', () => {
    const shortened = leaves(es).filter(
      (text) => /\bSPEI\b/.test(text) && !text.includes('Transferencia (SPEI)'),
    );

    expect(shortened).toEqual([]);
  });
});
