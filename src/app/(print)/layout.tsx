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
    // NO usar min-h-screen: eso obliga al documento a 100vh, lo que hace que al
    // guardar como PDF el navegador genere una hoja tan alta como el viewport
    // (y queda mucho espacio en blanco al final). Dejamos altura automática.
    return <div className="bg-white">{children}</div>;
}
