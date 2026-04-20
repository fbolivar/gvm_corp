// Layout mínimo para vistas de impresión.
// NO incluye sidebar ni header — solo el contenido del documento a imprimir.

import type { Metadata } from 'next';

// Anular el template del layout raíz ('%s | GVM Corp') para que document.title
// que seteemos en el componente cliente NO sea sobrescrito. El filename que
// fijamos en DeliveryNotePrintControls será el que use el navegador al "Guardar
// como PDF".
export const metadata: Metadata = {
    title: { absolute: 'Documento' },
};

export default function PrintLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-white">
            {children}
        </div>
    );
}
