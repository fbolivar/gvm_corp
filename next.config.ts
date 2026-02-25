import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // =============================================
  // 🏎️ SAAS FACTORY V3 - PRODUCTION PERFORMANCE
  // Target: 100+ concurrent connections
  // =============================================

  // 1. Enable gzip/brotli compression for all responses
  compress: true,

  // 2. Optimize images (Vercel Image Optimization)
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24, // 24h cache
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/**',
      },
    ],
  },

  // 3. HTTP headers for caching & security
  async headers() {
    return [
      {
        // Static assets (JS, CSS, fonts, images) → aggressive cache
        source: '/:path*.(js|css|woff2|png|jpg|svg|ico|webp|avif)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        // API routes and dynamic pages → no cache, fresh data
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
        ],
      },
      {
        // Security headers for all routes
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ]
  },

  // 4. Redirect trailing slashes for consistency
  trailingSlash: false,

  // 5. Enable React strict mode for development
  reactStrictMode: true,

  // 6. Logging for production debugging
  logging: {
    fetches: {
      fullUrl: true,
    },
  },

  // 7. Experimental: optimize package imports to reduce bundle size
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'recharts',
      'date-fns',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-popover',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      '@radix-ui/react-tooltip',
    ],
  },
}

export default nextConfig
