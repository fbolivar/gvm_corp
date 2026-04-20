"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";

/**
 * Barra de controles para la vista de impresión de remisión.
 * - Setea document.title = filename antes de imprimir, para que el browser
 *   use ese nombre al "Guardar como PDF". Restaura el título al desmontar.
 * - Auto-abre el diálogo de impresión al cargar (400 ms para esperar imágenes).
 * - Botón manual para reimprimir; link para volver al detalle.
 * - Se oculta al imprimir (clase no-print).
 */
export function DeliveryNotePrintControls({
    docId,
    filename,
}: {
    docId: string;
    filename: string;
}) {
    const printed = useRef(false);

    useEffect(() => {
        // Guardar título original y setear el nombre de archivo deseado
        const originalTitle = document.title;
        document.title = filename;

        if (!printed.current) {
            printed.current = true;
            const timer = setTimeout(() => {
                window.print();
            }, 400);
            return () => {
                clearTimeout(timer);
                document.title = originalTitle;
            };
        }

        return () => {
            document.title = originalTitle;
        };
    }, [filename]);

    const handleReprint = () => {
        // Asegurar que el título esté seteado antes de reimprimir
        document.title = filename;
        window.print();
    };

    return (
        <div className="no-print sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-3">
            <div className="max-w-[780px] mx-auto flex items-center justify-between gap-4">
                <Link
                    href={`/documents/${docId}`}
                    className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 shrink-0"
                >
                    <ArrowLeft className="h-4 w-4" /> Volver al detalle
                </Link>
                <div className="flex items-center gap-3 min-w-0">
                    <span className="hidden sm:block text-xs text-slate-500 truncate">
                        <span className="text-slate-400">Guardar como:</span> {filename}.pdf
                    </span>
                    <button
                        type="button"
                        onClick={handleReprint}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors shrink-0"
                    >
                        <Printer className="h-4 w-4" />
                        Imprimir
                    </button>
                </div>
            </div>
        </div>
    );
}
