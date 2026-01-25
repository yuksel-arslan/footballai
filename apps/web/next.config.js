/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@football-ai/database'],

  images: {
    remotePatterns: [
      // Football-Data.org - Team & Competition crests
      {
        protocol: 'https',
        hostname: 'crests.football-data.org',
      },
      // API-Sports
      {
        protocol: 'https',
        hostname: 'media.api-sports.io',
      },
      // Wikipedia (for some team logos)
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
      },
      // Cloudinary (common CDN)
      {
        protocol: 'https',
        hostname: '*.cloudinary.com',
      },
      // Our domain
      {
        protocol: 'https',
        hostname: 'futballai.com',
      },
      {
        protocol: 'https',
        hostname: '*.futballai.com',
      },
      // Common football logo sources
      {
        protocol: 'https',
        hostname: 'img.uefa.com',
      },
      {
        protocol: 'https',
        hostname: 'resources.premierleague.com',
      },
      {
        protocol: 'https',
        hostname: 'assets.laliga.com',
      },
      {
        protocol: 'https',
        hostname: 'tmssl.akamaized.net',
      },
      {
        protocol: 'https',
        hostname: 'www.bundesliga.com',
      },
      // Fallback for any https image
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    // Optimize image loading
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24, // 24 hours
  },

  experimental: {
    optimizePackageImports: ['lucide-react'],
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ]
  },
}

export default nextConfig
