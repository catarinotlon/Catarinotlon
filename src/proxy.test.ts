import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

import proxy from './proxy';

const visit = (path: string, headers: Record<string, string> = {}) =>
  proxy(new NextRequest(`http://localhost:3000${path}`, { headers }));

const redirectPath = (response: Response) => {
  const location = response.headers.get('location');
  return location ? new URL(location, 'http://localhost:3000').pathname : null;
};

describe('locale routing', () => {
  it('sends a first visit to Spanish on an English browser', () => {
    const response = visit('/', { 'accept-language': 'en-US,en;q=0.9' });

    expect(redirectPath(response)).toBe('/es');
  });

  it('sends an unprefixed page to its Spanish route on an English browser', () => {
    const response = visit('/sign-in', { 'accept-language': 'en-US,en;q=0.9' });

    expect(redirectPath(response)).toBe('/es/iniciar-sesion');
  });

  it('keeps the language the visitor chose', () => {
    const response = visit('/', { 'accept-language': 'es-MX', cookie: 'NEXT_LOCALE=en' });

    expect(redirectPath(response)).toBe('/en');
  });

  it('falls back to Spanish when the remembered language is not supported', () => {
    const response = visit('/', { 'accept-language': 'en-US', cookie: 'NEXT_LOCALE=fr' });

    expect(redirectPath(response)).toBe('/es');
  });

  it('serves a page whose URL already names a language', () => {
    const response = visit('/en', { 'accept-language': 'es-MX' });

    expect(redirectPath(response)).toBeNull();
  });
});
