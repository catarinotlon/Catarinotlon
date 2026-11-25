import type { MetadataRoute } from 'next';

/**
 * Bots that only read a page when someone shares its link, to draw the preview card. They do
 * not index the site or train AI models, and without them the share card stops showing.
 */
export const LINK_PREVIEW_BOTS = [
  'Twitterbot',
  'facebookexternalhit',
  'Facebot',
  'WhatsApp',
  'LinkedInBot',
  'Slackbot',
  'Slackbot-LinkExpanding',
  'TelegramBot',
  'Discordbot',
] as const;

/**
 * The site is closed to every crawler, search engines and AI tools included. Only link-preview
 * bots may read pages, never the API, and there is no sitemap.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: [...LINK_PREVIEW_BOTS], allow: '/', disallow: '/api/' },
      { userAgent: '*', disallow: '/' },
    ],
  };
}
