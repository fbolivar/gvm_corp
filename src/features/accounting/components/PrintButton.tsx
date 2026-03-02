'use client';

import { Printer } from 'lucide-react';

interface Props {
    label?: string;
    className?: string;
}

export function PrintButton({ label = 'Imprimir', className }: Props) {
    return (
        <button
            onClick={() => window.print()}
            className={className ?? 'flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all print:hidden'}
        >
            <Printer className="h-4 w-4" />
            {label}
        </button>
    );
}
