'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { openForecastPeriodAction, closeForecastPeriodAction, reopenForecastPeriodAction } from '../forecastActions';
import { Button } from '@/shared/components/ui/button';

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

interface Props {
    period: { id: string; year: number; month: number; status: string } | null;
    isManager: boolean;
    defaultYear: number;
    defaultMonth: number;
}

export function ForecastPeriodPanel({ period, isManager, defaultYear, defaultMonth }: Props) {
    const router = useRouter();
    const [year, setYear] = useState(defaultYear);
    const [month, setMonth] = useState(defaultMonth);
    const [msg, setMsg] = useState<{ t: 'ok' | 'err'; m: string } | null>(null);
    const [pending, start] = useTransition();

    function open() {
        setMsg(null);
        start(async () => {
            const r = await openForecastPeriodAction({ year, month });
            if (r.error) return setMsg({ t: 'err', m: r.error });
            setMsg({ t: 'ok', m: `Período abierto: ${r.value} líneas generadas` });
            router.refresh();
        });
    }
    function close() {
        if (!period) return;
        setMsg(null);
        start(async () => {
            const r = await closeForecastPeriodAction(period.id);
            if (r.error) return setMsg({ t: 'err', m: r.error });
            router.refresh();
        });
    }
    function reopen() {
        if (!period) return;
        setMsg(null);
        start(async () => {
            const r = await reopenForecastPeriodAction(period.id);
            if (r.error) return setMsg({ t: 'err', m: r.error });
            router.refresh();
        });
    }

    if (period) {
        return (
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="text-sm font-bold text-slate-900">Período {MONTHS[period.month - 1]} {period.year}</p>
                    <p className="text-xs text-slate-500">{period.status === 'OPEN' ? 'Abierto para ajustes' : 'Cerrado'}</p>
                </div>
                {isManager && period.status === 'OPEN' && (
                    <Button variant="outline" onClick={close} disabled={pending} className="h-10 rounded-xl text-sm">
                        {pending ? 'Cerrando…' : 'Cerrar período'}
                    </Button>
                )}
                {isManager && period.status === 'CLOSED' && (
                    <Button variant="outline" onClick={reopen} disabled={pending} className="h-10 rounded-xl text-sm">
                        {pending ? 'Reabriendo…' : 'Reabrir período'}
                    </Button>
                )}
                {msg && <p className={`text-sm ${msg.t === 'ok' ? 'text-emerald-700' : 'text-red-600'}`}>{msg.m}</p>}
            </div>
        );
    }

    if (!isManager) return <p className="text-sm text-slate-400">No hay un período de pronóstico abierto.</p>;

    return (
        <div className="flex flex-wrap items-end gap-3">
            <label className="space-y-1">
                <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Mes</span>
                <select value={month} onChange={e => setMonth(Number(e.target.value))} className="h-11 rounded-xl border border-slate-200 px-3 text-sm">
                    {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
            </label>
            <label className="space-y-1">
                <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Año</span>
                <input type="number" value={year} onChange={e => setYear(Number(e.target.value))} className="h-11 w-24 rounded-xl border border-slate-200 px-3 text-sm font-mono" />
            </label>
            <Button onClick={open} disabled={pending} className="h-11 rounded-xl text-sm">
                {pending ? 'Abriendo…' : 'Abrir período de pronóstico'}
            </Button>
            {msg && <p className={`text-sm ${msg.t === 'ok' ? 'text-emerald-700' : 'text-red-600'}`}>{msg.m}</p>}
        </div>
    );
}
