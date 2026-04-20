"use client";

import { useRef, useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Printer, Loader2 } from "lucide-react";

/**
 * Botón que imprime una remisión abriendo el diálogo de impresión
 * directamente en la misma página.
 *
 * Estrategia: monta un iframe 1x1 oculto con la plantilla de la remisión.
 * La página dentro del iframe detecta que cargó y auto-llama window.print()
 * por su cuenta (ver DeliveryNotePrintControls). Chrome imprime el iframe.
 *
 * Si falla (p.ej. bloqueo del navegador), fallback a window.open en nueva pestaña.
 */
export function PrintDeliveryNoteButton({ docId }: { docId: string }) {
    const iframeRef = useRef<HTMLIFrameElement | null>(null);
    const [printing, setPrinting] = useState(false);
    const timeoutRef = useRef<number | null>(null);

    const handlePrint = () => {
        setPrinting(true);

        // Limpiar iframe anterior si existía
        if (iframeRef.current) {
            try { document.body.removeChild(iframeRef.current); } catch { /* noop */ }
            iframeRef.current = null;
        }

        const iframe = document.createElement("iframe");
        // 1x1 en lugar de 0x0 (algunos navegadores ignoran iframes 0x0)
        iframe.style.position = "fixed";
        iframe.style.right = "0";
        iframe.style.bottom = "0";
        iframe.style.width = "1px";
        iframe.style.height = "1px";
        iframe.style.opacity = "0";
        iframe.style.border = "0";
        iframe.title = "Imprimir remisión";
        document.body.appendChild(iframe);
        iframeRef.current = iframe;

        // Fallback: si en 5s el iframe no logró imprimir, abrir en pestaña nueva
        timeoutRef.current = window.setTimeout(() => {
            if (printing) {
                console.warn('Iframe print timeout — abriendo en nueva pestaña');
                window.open(`/print/delivery-note?id=${docId}`, '_blank');
                setPrinting(false);
                if (iframeRef.current) {
                    try { document.body.removeChild(iframeRef.current); } catch { /* noop */ }
                    iframeRef.current = null;
                }
            }
        }, 5000);

        iframe.onload = () => {
            // La página dentro del iframe se auto-imprimirá (DeliveryNotePrintControls)
            // Dejamos el botón en estado "printing" un momento y luego liberamos
            window.setTimeout(() => {
                setPrinting(false);
                if (timeoutRef.current) {
                    window.clearTimeout(timeoutRef.current);
                    timeoutRef.current = null;
                }
            }, 1500);
        };

        iframe.onerror = () => {
            console.error('Iframe no pudo cargar la remisión — fallback a nueva pestaña');
            window.open(`/print/delivery-note?id=${docId}`, '_blank');
            setPrinting(false);
        };

        // Setear el src DESPUÉS de montar los handlers
        iframe.src = `/print/delivery-note?id=${docId}`;
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
