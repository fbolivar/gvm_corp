"use client";

import { useRef, useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Printer, Loader2 } from "lucide-react";

/**
 * Botón que imprime una remisión SIN abrir nueva pestaña.
 * Monta un <iframe hidden> que carga /print/delivery-note?id=xxx,
 * y dispara el diálogo de impresión del iframe cuando carga.
 *
 * Ventajas vs abrir nueva pestaña:
 * - Flujo de un solo clic
 * - No contamina el historial del navegador
 * - El iframe hereda el título del documento interno (para guardar como PDF)
 */
export function PrintDeliveryNoteButton({ docId }: { docId: string }) {
    const iframeRef = useRef<HTMLIFrameElement | null>(null);
    const [printing, setPrinting] = useState(false);

    const handlePrint = () => {
        setPrinting(true);
        // Crear iframe oculto (o reutilizar)
        if (!iframeRef.current) {
            const iframe = document.createElement("iframe");
            iframe.style.position = "fixed";
            iframe.style.right = "0";
            iframe.style.bottom = "0";
            iframe.style.width = "0";
            iframe.style.height = "0";
            iframe.style.border = "0";
            iframe.title = "Imprimir remisión";
            document.body.appendChild(iframe);
            iframeRef.current = iframe;
        }

        const iframe = iframeRef.current;
        iframe.src = `/print/delivery-note?id=${docId}&autoprint=0`;

        iframe.onload = () => {
            try {
                // Pequeño delay para que el logo y estilos terminen de aplicar
                setTimeout(() => {
                    const win = iframe.contentWindow;
                    if (!win) return;
                    // Intentar que el doc del iframe tenga el título correcto
                    // (el page cliente lo fija en useLayoutEffect; esto es respaldo)
                    win.focus();
                    win.print();
                    setTimeout(() => setPrinting(false), 800);
                }, 600);
            } catch (e) {
                console.error("Error imprimiendo remisión:", e);
                setPrinting(false);
            }
        };
    };

    return (
        <Button
            variant="outline"
            onClick={handlePrint}
            disabled={printing}
            className="h-14 rounded-[1.25rem] border-slate-100 bg-white shadow-sm px-8 font-black text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-all text-[10px] uppercase tracking-widest"
        >
            {printing
                ? <Loader2 className="mr-3 h-4 w-4 animate-spin" />
                : <Printer className="mr-3 h-4 w-4" />
            }
            Imprimir remisión
        </Button>
    );
}
