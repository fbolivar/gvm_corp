// Layout mínimo para vistas de impresión.
// NO incluye sidebar ni header — solo el contenido del documento a imprimir.

export default function PrintLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-white">
            {children}
        </div>
    );
}
