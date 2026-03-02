import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'GVM Corp — ERP Integral',
        short_name: 'GVM Corp',
        description: 'Sistema ERP integral para gestión empresarial colombiana',
        start_url: '/dashboard',
        display: 'standalone',
        background_color: '#0f172a',
        theme_color: '#0f172a',
        orientation: 'portrait-primary',
        categories: ['business', 'finance', 'productivity'],
        lang: 'es',
        icons: [
            {
                src: '/logo-gvm.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'maskable',
            },
            {
                src: '/logo-gvm.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any',
            },
        ],
        screenshots: [],
        shortcuts: [
            {
                name: 'Nueva Factura',
                url: '/sales/invoices/new',
                description: 'Crear una nueva factura de venta',
            },
            {
                name: 'Dashboard',
                url: '/dashboard',
                description: 'Ver el panel principal',
            },
            {
                name: 'GVM AI',
                url: '/ai-assistant',
                description: 'Asistente financiero inteligente',
            },
        ],
    };
}
