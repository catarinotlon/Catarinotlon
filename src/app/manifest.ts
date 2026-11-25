import type { MetadataRoute } from 'next';

/**
 * What a phone shows and does when a runner saves the site to the home screen: the ladybug on
 * white, and the site opened full screen so the ticket QR has room. The name is a proper noun,
 * so one manifest serves both locales; `/` lets the proxy pick the remembered language.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Catarinotlón 2026',
    short_name: 'Catarinotlón',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
