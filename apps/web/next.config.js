// @ts-check

const { composePlugins, withNx } = require('@nx/next');

/**
 * @type {import('@nx/next/plugins/with-nx').WithNxOptions}
 **/
const nextConfig = {
  // Use this to set Nx-specific options
  // See: https://nx.dev/recipes/next/next-config-setup
  nx: {},

  // Redirect .next output outside the apps/ bind mount in Docker
  // In Docker: NEXT_DIST_DIR=/app/dist/apps/web, locally: uses default '.next'
  distDir: process.env.NEXT_DIST_DIR || '.next',

  // Optimize for Docker: Standalone mode reduces image size by 70%+
  // Only includes traced dependencies, not full node_modules
  output: 'standalone',

  // i18n configuration with next-intl
  i18n: {
    locales: ['en', 'vi'],
    defaultLocale: 'en',
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
};

const plugins = [
  // Add more Next.js plugins to this list if needed.
  withNx,
];

module.exports = composePlugins(...plugins)(nextConfig);
