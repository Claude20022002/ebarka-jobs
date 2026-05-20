import type { NextConfig } from 'next';

// Next.js requires 'unsafe-inline' for App Router hydration scripts.
// Upgrade to nonce-based CSP via middleware in a future PR.
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://js.stripe.com",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "img-src 'self' blob: data: https://res.cloudinary.com https://*.airtableusercontent.com https://lh3.googleusercontent.com",
  "connect-src 'self' https://*.sentry.io https://ingest.sentry.io",
  "frame-src https://js.stripe.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

const nextConfig: NextConfig = {
  // biome-ignore lint/suspicious/useAwait: NextConfig.headers must return Promise<Header[]>
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Robots-Tag',
            value:
              'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
          },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          { key: 'Content-Security-Policy', value: contentSecurityPolicy },
        ],
      },
      {
        source: '/:path*.jpg',
        headers: [
          { key: 'X-Robots-Tag', value: 'index, max-image-preview:large' },
        ],
      },
      {
        source: '/:path*.jpeg',
        headers: [
          { key: 'X-Robots-Tag', value: 'index, max-image-preview:large' },
        ],
      },
      {
        source: '/:path*.png',
        headers: [
          { key: 'X-Robots-Tag', value: 'index, max-image-preview:large' },
        ],
      },
      {
        source: '/:path*.svg',
        headers: [
          { key: 'X-Robots-Tag', value: 'index, max-image-preview:large' },
        ],
      },
      {
        source: '/:path*.pdf',
        headers: [{ key: 'X-Robots-Tag', value: 'index, nosnippet' }],
      },
    ];
  },
};

export default nextConfig;
