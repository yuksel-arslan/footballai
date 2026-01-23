/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@football-ai/database'],
  
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'media.api-sports.io',
        pathname: '/football/**',
      },
      {
        protocol: 'https',
        hostname: '**.cloudinary.com',
      },
    ],
  },

  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
}

export default nextConfig
