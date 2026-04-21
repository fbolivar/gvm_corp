"use client";

import { Button } from "@/shared/components/ui/button";
import { Printer } from "lucide-react";

/**
 * Abre popup centrado que auto-imprime la Entrada de Almacén (formato WO).
 */
export function PrintWarehouseEntryButton({ transferId }: { transferId: string }) {
    const handlePrint = () => {
        const url = `/print/warehouse-entry?id=${transferId}`;
        const width = 900;
        const height = 1100;
        const screenLeft = typeof window !== "undefined" ? window.screenLeft ?? 0 : 0;
        const screenTop = typeof window !== "undefined" ? window.screenTop ?? 0 : 0;
        const viewW = typeof window !== "undefined" ? window.innerWidth : 1920;
        const viewH = typeof window !== "undefined" ? window.innerHeight : 1080;
        const left = screenLeft + Math.max(0, (viewW - width) / 2);
        const top = screenTop + Math.max(0, (viewH - height) / 2);

        const popup = window.open(
            url,
            "gvm-print-entrada",
            `popup=yes,width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
        );
        if (!popup || popup.closed) {
            window.open(url, "_blank");
        }
    };

    return (
        <Button variant="outline" onClick={handlePrint} size="sm">
            <Printer className="mr-2 h-4 w-4" />
            Imprimir Entrada
        </Button>
    );
}
