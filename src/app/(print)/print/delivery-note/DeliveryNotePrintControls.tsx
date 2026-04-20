"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";

/**
 * Barra de controles para la vista de impresión de remisión.
 * - Fija document.title = filename antes de imprimir, para que el browser
 *   use ese nombre al "Guardar como PDF". Se fija temprano (useLayoutEffect)
 *   y también justo antes de window.print() por si algo lo sobrescribió.
 * - Auto-abre el diálogo de impresión al cargar (500 ms para que el logo cargue).
 */

// useLayoutEffect en cliente, useEffect en SSR (evita warning)
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function DeliveryNotePrintControls({
    docId,
    filename,
}: {
    docId: string;
    filename: string;
}) {
    const printed = useRef(false);
    const [titleSet, setTitleSet] = useState(false);

    // Set title lo antes posible (pre-paint en cliente)
    useIsoLayoutEffect(() => {
        document.title = filename;
        setTitleSet(true);
    }, [filename]);

    // Auto-abrir diálogo de impresión (una sola vez), asegurando el title antes
    useEffect(() => {
        if (printed.current) return;
        printed.current = true;

        const timer = setTimeout(() => {
            document.title = filename;
            window.print();
        }, 500);

        return () => clearTimeout(timer);
    }, [filename]);

    const handleReprint = () => {
        document.title = filename;
        // pequeño tick para que el nuevo título se aplique antes del print
        setTimeout(() => window.print(), 50);
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
                        <span className="text-slate-400">Guardar como:</span> {titleSet ? `${filename}.pdf` : '...'}
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
