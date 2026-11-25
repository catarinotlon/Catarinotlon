import { describe, expect, it } from 'vitest';

import manifest from './manifest';

describe('web app manifest', () => {
  it('opens the site full screen from the home screen, in the remembered language', () => {
    expect(manifest()).toMatchObject({
      name: 'Catarinotlón 2026',
      short_name: 'Catarinotlón',
      start_url: '/',
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: '#ffffff',
    });
  });

  it('offers the ladybug at the sizes Android asks for, plus a maskable one', () => {
    expect(manifest().icons).toEqual([
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ]);
  });
});
