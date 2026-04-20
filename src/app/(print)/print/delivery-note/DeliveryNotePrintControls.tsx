"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";

/**
 * Barra de controles para la vista de impresión de remisión.
 * - Auto-abre el diálogo de impresión al cargar la página (una vez).
 * - Botón manual para reimprimir si el usuario cierra el diálogo.
 * - Enlace para volver al detalle.
 * - Se oculta automáticamente al imprimir (clase no-print).
 */
export function DeliveryNotePrintControls({ docId }: { docId: string }) {
    const printed = useRef(false);

    useEffect(() => {
        if (printed.current) return;
        printed.current = true;

        // Pequeño delay para asegurar que imágenes (logo) carguen antes de imprimir
        const timer = setTimeout(() => {
            window.print();
        }, 400);

        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="no-print sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-3">
            <div className="max-w-[800px] mx-auto flex items-center justify-between">
                <Link
                    href={`/documents/${docId}`}
                    className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900"
                >
                    <ArrowLeft className="h-4 w-4" /> Volver al detalle
                </Link>
                <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
                >
                    <Printer className="h-4 w-4" />
                    Imprimir
                </button>
            </div>
        </div>
    );
}
