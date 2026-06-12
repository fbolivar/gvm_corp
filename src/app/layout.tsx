import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ThemeProvider } from '@/shared/components/theme/ThemeProvider'

export const metadata: Metadata = {
    title: {
        default: 'GVM Corp — ERP Integral',
        template: '%s | GVM Corp',
    },
    description: 'Sistema ERP integral para gestión empresarial colombiana — Facturación, Nómina, Contabilidad y más.',
    keywords: ['ERP', 'facturación electrónica', 'nómina', 'contabilidad', 'DIAN', 'Colombia'],
    authors: [{ name: 'GVM Corp' }],
    creator: 'GVM Corp',
    manifest: '/manifest.webmanifest',
    appleWebApp: {
        capable: true,
        statusBarStyle: 'black-translucent',
        title: 'GVM Corp',
    },
    formatDetection: {
        telephone: false,
    },
    icons: {
        icon: '/logo-gvm.png',
        apple: '/logo-gvm.png',
        shortcut: '/logo-gvm.png',
    },
    openGraph: {
        type: 'website',
        locale: 'es_CO',
        title: 'GVM Corp — ERP Integral',
        description: 'ERP empresarial colombiano con facturación electrónica DIAN',
        siteName: 'GVM Corp',
    },
}

export const viewport: Viewport = {
    themeColor: [
        { media: '(prefers-color-scheme: light)', color: '#f1f5f9' },
        { media: '(prefers-color-scheme: dark)', color: '#0a0f1e' },
    ],
    colorScheme: 'light dark',
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="es" suppressHydrationWarning>
            <body>
                <ThemeProvider>
                    {children}
                </ThemeProvider>
            </body>
        </html>
    )
}
