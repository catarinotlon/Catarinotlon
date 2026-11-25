import { withSentryConfig } from '@sentry/nextjs/config';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ['@libsql/client', '@react-pdf/renderer'],
  // The ticket PDF reads its fonts and images from disk at runtime.
  outputFileTracingIncludes: {
    '/api/tickets/**': ['./src/modules/ticketing/infrastructure/pdf-assets/**/*'],
  },
  // No crawler or AI tool may index the site, files and API responses included (robots.ts).
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow, noarchive, nosnippet, noimageindex, noai, noimageai',
          },
        ],
      },
    ];
  },
  // PostHog goes through the site's own path so ad blockers do not drop it.
  async rewrites() {
    return [
      {
        source: '/ingest/static/:path*',
        destination: 'https://us-assets.i.posthog.com/static/:path*',
      },
      {
        source: '/ingest/array/:path*',
        destination: 'https://us-assets.i.posthog.com/array/:path*',
      },
      { source: '/ingest/:path*', destination: 'https://us.i.posthog.com/:path*' },
    ];
  },
  skipTrailingSlashRedirect: true,
};

export default withSentryConfig(withNextIntl(nextConfig), {
  silent: true,
  ...(process.env.SENTRY_ORG ? { org: process.env.SENTRY_ORG } : {}),
  ...(process.env.SENTRY_PROJECT ? { project: process.env.SENTRY_PROJECT } : {}),
  ...(process.env.SENTRY_AUTH_TOKEN ? { authToken: process.env.SENTRY_AUTH_TOKEN } : {}),
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
  telemetry: false,
});
