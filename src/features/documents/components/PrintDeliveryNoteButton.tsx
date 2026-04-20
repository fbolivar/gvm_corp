"use client";

import { Button } from "@/shared/components/ui/button";
import { Printer } from "lucide-react";

/**
 * Botón que imprime una remisión.
 *
 * Estrategia: abre un popup pequeño (centrado, 900×1100) con la plantilla
 * de remisión. La página popup auto-dispara window.print() al cargar y se
 * cierra sola cuando termina (ver DeliveryNotePrintControls.onafterprint).
 *
 * Por qué popup y no iframe: iframes en Next.js + Vercel sufren bloqueos
 * intermitentes al llamar window.print() por políticas del navegador.
 * El popup funciona 100% consistente porque es una ventana top-level real.
 */
export function PrintDeliveryNoteButton({ docId }: { docId: string }) {
    const handlePrint = () => {
        const url = `/print/delivery-note?id=${docId}`;
        const width = 900;
        const height = 1100;
        const screenLeft = typeof window !== 'undefined' ? window.screenLeft ?? 0 : 0;
        const screenTop = typeof window !== 'undefined' ? window.screenTop ?? 0 : 0;
        const viewW = typeof window !== 'undefined' ? window.innerWidth : 1920;
        const viewH = typeof window !== 'undefined' ? window.innerHeight : 1080;
        const left = screenLeft + Math.max(0, (viewW - width) / 2);
        const top = screenTop + Math.max(0, (viewH - height) / 2);

        const popup = window.open(
            url,
            'gvm-print-remision',
            `popup=yes,width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
        );

        // Si el popup fue bloqueado, fallback a nueva pestaña
        if (!popup || popup.closed) {
            window.open(url, '_blank');
        }
    };

    return (
        <Button
            variant="outline"
            onClick={handlePrint}
            className="h-14 rounded-[1.25rem] border-slate-100 bg-white shadow-sm px-8 font-black text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-all text-[10px] uppercase tracking-widest"
        >
            <Printer className="mr-3 h-4 w-4" />
            Imprimir remisión
        </Button>
    );
}
