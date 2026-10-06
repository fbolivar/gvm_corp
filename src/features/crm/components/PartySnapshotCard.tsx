'use client';

import { useEffect, useState } from 'react';
import { Loader2, TrendingDown, TrendingUp, Activity } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { formatLocalDate } from '@/shared/lib/dateFmt';
import { getPartySnapshotAction } from '../actions/visitActions';
import { ACCOUNT_STATUSES, type AccountStatus, type PartyCommercialSnapshot } from '../types/visits';

/**
 * Ficha comercial del cliente elegido, calculada en vivo con sus pedidos
 * facturados. Sustituye las columnas INDEX/MATCH del Excel.
 */

const cop = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

const STATUS_STYLE: Record<AccountStatus, string> = {
    ACTIVO_CRECIMIENTO: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    ACTIVO_CAIDA: 'bg-amber-50 text-amber-700 border-amber-200',
    SIN_COMPRA_MES: 'bg-orange-50 text-orange-700 border-orange-200',
    INACTIVO_ANIO: 'bg-rose-50 text-rose-700 border-rose-200',
    INACTIVO_LARGO: 'bg-slate-100 text-slate-600 border-slate-200',
    SIN_HISTORIAL: 'bg-slate-50 text-slate-500 border-slate-200',
};

function Var({ pct }: { pct: number | null }) {
    if (pct === null) return <span className="text-[11px] text-slate-400">sin base</span>;
    const up = pct >= 0;
    return (
        <span className={cn('inline-flex items-center gap-1 text-[11px] font-bold', up ? 'text-emerald-600' : 'text-rose-600')}>
            {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {up ? '+' : ''}{pct.toLocaleString('es-CO')} %
        </span>
    );
}

export function AccountStatusBadge({ status }: { status: AccountStatus }) {
    return (
        <span className={cn('inline-flex px-2 py-0.5 rounded-lg border text-[10px] font-bold whitespace-nowrap', STATUS_STYLE[status])}>
            {ACCOUNT_STATUSES[status]}
        </span>
    );
}

export function PartySnapshotCard({ partyId, initial, compact = false }: { partyId: string | null; initial?: PartyCommercialSnapshot | null; compact?: boolean }) {
    const [snap, setSnap] = useState<PartyCommercialSnapshot | null>(initial ?? null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!partyId) { setSnap(null); return; }
        if (initial && initial.party_id === partyId) { setSnap(initial); return; }
        let alive = true;
        setLoading(true);
        setError(null);
        getPartySnapshotAction(partyId).then(res => {
            if (!alive) return;
            if ('error' in res) { setError(res.error); setSnap(null); }
            else setSnap(res);
        }).finally(() => { if (alive) setLoading(false); });
        return () => { alive = false; };
    }, [partyId, initial]);

    if (!partyId) return null;

    return (
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-2">
                    <Activity className="h-3.5 w-3.5" /> Ficha comercial (pedidos facturados)
                </p>
                {loading && <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />}
                {snap && <AccountStatusBadge status={snap.account_status} />}
            </div>

            {error && <p className="text-xs text-rose-600">{error}</p>}

            {snap && (
                <div className={cn('grid grid-cols-2 gap-3', !compact && 'md:grid-cols-4')}>
                    <Stat label="Venta año actual" value={cop.format(snap.sales_ytd)} extra={<Var pct={snap.var_ytd_pct} />} hint={`Año anterior: ${cop.format(snap.sales_prev_ytd)}`} />
                    <Stat label="Venta mes actual" value={cop.format(snap.sales_month)} extra={<Var pct={snap.var_month_pct} />} hint={`Mismo mes año anterior: ${cop.format(snap.sales_prev_month)}`} />
                    <Stat label="Última compra" value={formatLocalDate(snap.last_purchase_date)} hint={`${snap.orders_count_ytd} pedidos este año`} />
                    <Stat label="Producto principal" value={snap.top_product ?? '—'} hint={snap.biggest_drop_product ? `Mayor caída: ${snap.biggest_drop_product}` : 'Sin caídas frente al año anterior'} />
                </div>
            )}
        </div>
    );
}

function Stat({ label, value, extra, hint }: { label: string; value: string; extra?: React.ReactNode; hint?: string }) {
    return (
        <div className="rounded-xl bg-white border border-slate-100 px-3 py-2.5 min-w-0">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
            <p className="text-sm font-bold text-slate-900 truncate" title={value}>{value}</p>
            {extra}
            {hint && <p className="text-[10px] text-slate-400 truncate" title={hint}>{hint}</p>}
        </div>
    );
}
