'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

/** Caja de búsqueda del directorio: actualiza ?q= (con pequeño debounce). */
export function DirectorySearch({ initialQ }: { initialQ: string }) {
    const router = useRouter();
    const [q, setQ] = useState(initialQ);
    const first = useRef(true);

    useEffect(() => {
        if (first.current) { first.current = false; return; }
        const t = setTimeout(() => {
            const query = q.trim();
            router.replace(query ? `/crm/directory?q=${encodeURIComponent(query)}` : '/crm/directory');
        }, 300);
        return () => clearTimeout(t);
    }, [q, router]);

    return (
        <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
                type="text"
                autoFocus
                placeholder="Buscar por nombre del contacto, cargo, teléfono, email o cliente…"
                value={q}
                onChange={e => setQ(e.target.value)}
                className="w-full h-12 pl-10 pr-4 rounded-2xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
        </div>
    );
}
