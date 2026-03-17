import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Terminal de Asistencia | GVM Corp',
    description: 'Terminal de control de asistencia con codigo QR.',
    robots: { index: false, follow: false },
}

export default function TerminalLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen bg-slate-950 flex flex-col">
            {children}
        </div>
    )
}
