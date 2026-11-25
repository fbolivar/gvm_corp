'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { CalendarDays, List, Gauge } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

type View = 'kpis' | 'calendar' | 'list';

/**
 * Conmutador KPIs / Calendario / Lista del planeador. Guarda la vista en la URL
 * (`?view=`) conservando el resto de filtros, para compartir el enlace y que
 * "volver" recuerde cómo se estaba mirando. KPIs solo para gerencia.
 */
export function VisitViewSwitch({ view, isManager }: { view: View; isManager: boolean }) {
    const router = useRouter();
    const sp = useSearchParams();

    const to = (v: View) => {
        const next = new URLSearchParams(sp.toString());
        next.set('view', v);
        return `/crm/visits?${next.toString()}`;
    };

    const items: Array<{ key: View; label: string; icon: typeof CalendarDays }> = [
        ...(isManager ? [{ key: 'kpis' as View, label: 'KPIs', icon: Gauge }] : []),
        { key: 'calendar', label: 'Calendario', icon: CalendarDays },
        { key: 'list', label: 'Lista', icon: List },
    ];

    return (
        <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-0.5">
            {items.map(({ key, label, icon: Icon }) => (
                <button
                    key={key}
                    type="button"
                    onClick={() => router.push(to(key))}
                    className={cn(
                        'inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-bold transition-all',
                        view === key ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700',
                    )}
                >
                    <Icon className="h-3.5 w-3.5" /> {label}
                </button>
            ))}
        </div>
    );
}
