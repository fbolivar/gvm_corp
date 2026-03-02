import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Pagar Factura | GVM Corp',
    description: 'Portal seguro de pago de facturas GVM Corp.',
    robots: { index: false, follow: false },
}

/**
 * Layout standalone para el portal de pagos publico.
 * Intencionalmente NO incluye Sidebar, Header ni ningun elemento
 * del layout principal (main). Es una pagina completamente independiente.
 */
export default function PayLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen bg-[#F3F4F6] flex flex-col">
            {children}
        </div>
    )
}
