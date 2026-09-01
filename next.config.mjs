/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep heavy / native-ish packages out of the server bundle so they load
  // from node_modules at runtime (avoids ESM/CJS bundling issues in serverless).
  serverExternalPackages: ["jsdom", "cheerio", "@mozilla/readability", "pdf-parse", "mammoth"],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Enable standalone output for better deployment
  output: 'standalone',
  // Enable cross-origin requests
  allowedDevOrigins: ['*'],
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
  async rewrites() {
    return [
      {
        source: '/Public_api/:path*',
        destination: '/api/Public_api/:path*',
      },
    ]
  },
}

export default nextConfig