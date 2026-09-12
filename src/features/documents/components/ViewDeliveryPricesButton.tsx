"use client";

import { Button } from "@/shared/components/ui/button";
import { DollarSign } from "lucide-react";

/**
 * Abre la remisión en modo "con precios e IVA" para visualizarla en pantalla.
 * Usa autoprint=0 para que NO se dispare el diálogo de impresión al abrir
 * (el usuario solo quiere ver precio + IVA; puede imprimir desde ahí si desea).
 */
export function ViewDeliveryPricesButton({ docId }: { docId: string }) {
    const handleView = () => {
        const url = `/print/delivery-note?id=${docId}&precios=1&autoprint=0`;
        window.open(url, '_blank');
    };

    return (
        <Button
            variant="outline"
            onClick={handleView}
            className="h-11 rounded-xl border-slate-100 bg-white shadow-sm px-4 font-black text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-all text-[10px] uppercase tracking-widest"
        >
            <DollarSign className="mr-3 h-4 w-4" />
            Ver precios e IVA
        </Button>
    );
}
