"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function DocSupportPrintControls({ docId, filename }: { docId: string; filename: string }) {
  const printed = useRef(false);
  const [titleSet, setTitleSet] = useState(false);
  const searchParams = useSearchParams();
  const autoprintDisabled = searchParams?.get("autoprint") === "0";

  useIsoLayoutEffect(() => {
    document.title = filename;
    setTitleSet(true);
  }, [filename]);

  useEffect(() => {
    if (printed.current) return;
    if (autoprintDisabled) return;
    printed.current = true;

    const isPopup = typeof window !== "undefined" && !!window.opener;
    if (isPopup) {
      window.onafterprint = () => {
        setTimeout(() => { try { window.close(); } catch { /* noop */ } }, 300);
      };
    }
    const timer = setTimeout(() => {
      document.title = filename;
      try { window.print(); } catch (e) { console.error("print() error:", e); }
    }, 600);
    return () => {
      clearTimeout(timer);
      if (typeof window !== "undefined") window.onafterprint = null;
    };
  }, [filename, autoprintDisabled]);

  const handleReprint = () => {
    document.title = filename;
    setTimeout(() => window.print(), 50);
  };

  return (
    <div className="no-print sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-3">
      <div className="max-w-[820px] mx-auto flex items-center justify-between gap-4">
        <Link
          href={`/documents/${docId}`}
          className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 shrink-0"
        >
          <ArrowLeft className="h-4 w-4" /> Volver al detalle
        </Link>
        <div className="flex items-center gap-3 min-w-0">
          <span className="hidden sm:block text-xs text-slate-500 truncate">
            <span className="text-slate-400">Guardar como:</span> {titleSet ? `${filename}.pdf` : "..."}
          </span>
          <button
            type="button"
            onClick={handleReprint}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors shrink-0"
          >
            <Printer className="h-4 w-4" /> Imprimir
          </button>
        </div>
      </div>
    </div>
  );
}
