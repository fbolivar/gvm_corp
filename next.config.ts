import type { NextConfig } from 'next'

const isProd = process.env.NODE_ENV === 'production'

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
        // Security headers for all routes — hardened config
        source: '/:path*',
        headers: [
          // Prevent MIME-type sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Prevent clickjacking — deny all framing
          { key: 'X-Frame-Options', value: 'DENY' },
          // Legacy XSS protection (modern browsers use CSP instead)
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          // Control referrer information leakage
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // HSTS — force HTTPS for 1 year + subdomains (production only)
          ...(isProd ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' }] : []),
          // CSP — restrict resource origins (hardened)
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              `script-src 'self' 'unsafe-inline'${isProd ? '' : " 'unsafe-eval'"} https://vercel.live https://*.vercel.app`,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://*.supabase.co https://vercel.live",
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://vercel.live https://*.vercel.app https://openrouter.ai",
              "frame-src 'self' https://vercel.live",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "object-src 'none'",
              ...(isProd ? ["upgrade-insecure-requests"] : []),
            ].join('; '),
          },
          // Restrict browser features
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=(), magnetometer=(), gyroscope=(), accelerometer=()',
          },
          // Prevent cross-origin window access
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          // Restrict cross-origin resource loading
          { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
          // Block Adobe Flash/PDF cross-domain policies
          { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
          // Prevent DNS prefetch info leakage
          { key: 'X-DNS-Prefetch-Control', value: 'off' },
        ],
      },
    ]
  },

  // 4. Redirects for legacy/old routes
  async redirects() {
    return [
      {
        source: '/portfolio/agent',
        destination: '/settings/portfolio-agent',
        permanent: true,
      },
    ]
  },

  // 5. Redirect trailing slashes for consistency
  trailingSlash: false,

  // 6. Enable React strict mode for development
  reactStrictMode: true,

  // 7. Logging for production debugging
  logging: {
    fetches: {
      fullUrl: true,
    },
  },

  // 8. Experimental: optimize package imports to reduce bundle size
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
    // Server Actions body size limit — default 1MB no alcanza para imports
    // masivos (Dolibarr puede enviar 5000+ filas en una sola llamada)
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
}

export default nextConfig
