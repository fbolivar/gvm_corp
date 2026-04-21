"use client";

import { Button } from "@/shared/components/ui/button";
import { Printer } from "lucide-react";

/**
 * Abre popup centrado que auto-imprime la Factura de Compra (formato WO).
 */
export function PrintVendorBillButton({ docId }: { docId: string }) {
  const handlePrint = () => {
    const url = `/print/vendor-bill?id=${docId}`;
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
      "gvm-print-fc",
      `popup=yes,width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
    );
    if (!popup || popup.closed) {
      window.open(url, "_blank");
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handlePrint}
      className="h-14 rounded-[1.25rem] border-slate-100 bg-white shadow-sm px-8 font-black text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-all text-[10px] uppercase tracking-widest"
    >
      <Printer className="mr-3 h-4 w-4" />
      Imprimir Factura
    </Button>
  );
}
