/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Skip generating error pages during static export
  // This prevents Next.js from trying to statically generate /500 and /_error routes
  generateBuildId: async () => {
    return 'build-' + Date.now()
  },
  // Enable cross-origin requests for Replit environment
  allowedDevOrigins: ['*'],
  // Enable all hosts for Replit environment
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
    ]
  },
  // Custom webpack config
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      }
    }
    return config
  },
  // Note: Removed invalid experimental config option
}

export default nextConfig