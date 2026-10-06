'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Search, CalendarPlus, Loader2, UserCheck, Building2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';
import { formatLocalDate } from '@/shared/lib/dateFmt';
import { assignAccountsAction } from '../actions/accountActions';
import { AccountStatusBadge } from './PartySnapshotCard';
import { ContactActions } from './ContactActions';
import { ACCOUNT_STATUSES, type AccountStatus } from '../types/visits';
import type { AccountSummary } from '../utils/accountSummary';
import type { Salesperson } from '../services/visitService';

/**
 * Cartera de clientes. El comercial ve la suya con semáforo; el gerente ve
 * todas, filtra "sin comercial" y reparte en bloque.
 */

const cop = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const selectCls = 'h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-700 outline-none focus:border-indigo-300';

interface Props {
    accounts: AccountSummary[];
    salespeople: Salesperson[];
    isManager: boolean;
    initialSalesperson?: string;
    initialStatus?: AccountStatus | '';
    /** Nombre de quien contacta (para las plantillas de WhatsApp). */
    currentUserName: string;
}

export function AccountList({ accounts, salespeople, isManager, initialSalesperson, initialStatus, currentUserName }: Props) {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [status, setStatus] = useState<AccountStatus | ''>(initialStatus ?? '');
    const [salesperson, setSalesperson] = useState<string>(initialSalesperson ?? '');
    const [onlyBuyers, setOnlyBuyers] = useState(true);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [assignTo, setAssignTo] = useState('');
    const [saving, setSaving] = useState(false);

    const nameOf = useMemo(() => new Map(salespeople.map(s => [s.id, s.name])), [salespeople]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return accounts.filter(a =>
            (!q || a.legal_name.toLowerCase().includes(q) || (a.city ?? '').toLowerCase().includes(q)) &&
            (!status || a.account_status === status) &&
            (!salesperson || (salesperson === 'NONE' ? !a.salesperson_id : a.salesperson_id === salesperson)) &&
            (!onlyBuyers || a.orders_count > 0),
        );
    }, [accounts, query, status, salesperson, onlyBuyers]);

    const allVisibleSelected = filtered.length > 0 && filtered.every(a => selected.has(a.id));
    const toggleAll = () => {
        const next = new Set(selected);
        if (allVisibleSelected) filtered.forEach(a => next.delete(a.id)); else filtered.forEach(a => next.add(a.id));
        setSelected(next);
    };
    const toggle = (id: string) => {
        const next = new Set(selected);
        if (next.has(id)) next.delete(id); else next.add(id);
        setSelected(next);
    };

    async function assign() {
        if (selected.size === 0) return;
        setSaving(true);
        const res = await assignAccountsAction({ party_ids: [...selected], salesperson_id: assignTo === 'NONE' ? null : assignTo });
        setSaving(false);
        if ('error' in res) { toast.error(res.error); return; }
        toast.success(assignTo === 'NONE' ? `${res.count} clientes sin comercial` : `${res.count} clientes asignados a ${nameOf.get(assignTo) ?? 'comercial'}`);
        setSelected(new Set());
        router.refresh();
    }

    const totals = useMemo(() => ({
        month: filtered.reduce((s, a) => s + a.sales_month, 0),
        ytd: filtered.reduce((s, a) => s + a.sales_ytd, 0),
    }), [filtered]);

    return (
        <div className="space-y-4">
            {/* Filtros */}
            <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                    <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Cliente o ciudad..."
                        className="h-10 w-56 bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 text-xs outline-none focus:border-indigo-300" />
                </div>
                <select value={status} onChange={e => setStatus(e.target.value as AccountStatus | '')} className={selectCls}>
                    <option value="">Todos los estados</option>
                    {Object.entries(ACCOUNT_STATUSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                {isManager && (
                    <select value={salesperson} onChange={e => setSalesperson(e.target.value)} className={selectCls}>
                        <option value="">Todos los comerciales</option>
                        <option value="NONE">Sin comercial asignado</option>
                        {salespeople.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                )}
                <label className="inline-flex items-center gap-2 text-xs text-slate-600 h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                    <input type="checkbox" checked={onlyBuyers} onChange={e => setOnlyBuyers(e.target.checked)} className="accent-indigo-600" />
                    Solo con compras
                </label>
                <span className="text-[11px] text-slate-400 ml-auto tabular-nums">
                    {filtered.length} clientes · mes {cop.format(totals.month)} · año {cop.format(totals.ytd)}
                </span>
            </div>

            {/* Barra de asignación */}
            {isManager && selected.size > 0 && (
                <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-indigo-200 bg-indigo-50/60 px-4 py-3">
                    <UserCheck className="h-4 w-4 text-indigo-600" />
                    <span className="text-xs font-bold text-indigo-800">{selected.size} seleccionados</span>
                    <select value={assignTo} onChange={e => setAssignTo(e.target.value)} className={cn(selectCls, 'bg-white')}>
                        <option value="">Asignar a…</option>
                        {salespeople.map(s => <option key={s.id} value={s.id}>{s.name}{s.role ? ` — ${s.role}` : ''}</option>)}
                        <option value="NONE">Quitar comercial</option>
                    </select>
                    <Button type="button" disabled={!assignTo || saving} onClick={assign}
                        className="h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold gap-2">
                        {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Asignar cartera
                    </Button>
                    <button type="button" onClick={() => setSelected(new Set())} className="text-xs text-slate-500 hover:text-slate-800 ml-auto">Limpiar</button>
                </div>
            )}

            {/* Tabla */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {filtered.length === 0 ? (
                    <p className="px-6 py-12 text-center text-xs text-slate-400">No hay clientes con ese filtro.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1040px]">
                            <thead>
                                <tr className="bg-slate-50/60 border-b border-slate-100 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                                    {isManager && (
                                        <th className="px-3 py-2.5 w-8">
                                            <input type="checkbox" checked={allVisibleSelected} onChange={toggleAll} className="accent-indigo-600" aria-label="Seleccionar todos" />
                                        </th>
                                    )}
                                    <th className="px-3 py-2.5 text-left">Cliente</th>
                                    <th className="px-3 py-2.5 text-left">Estado</th>
                                    <th className="px-3 py-2.5 text-right">Venta mes</th>
                                    <th className="px-3 py-2.5 text-right">Mes anterior</th>
                                    <th className="px-3 py-2.5 text-right" title="Últimos 30 días frente a los 30 anteriores">Tendencia 30 d</th>
                                    <th className="px-3 py-2.5 text-right">Acum. año</th>
                                    <th className="px-3 py-2.5 text-left">Última compra</th>
                                    {isManager && <th className="px-3 py-2.5 text-left">Comercial</th>}
                                    <th className="px-3 py-2.5" />
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(a => (
                                    <tr key={a.id} className={cn('border-b border-slate-50 last:border-0 hover:bg-slate-50/50', selected.has(a.id) && 'bg-indigo-50/40')}>
                                        {isManager && (
                                            <td className="px-3 py-2.5">
                                                <input type="checkbox" checked={selected.has(a.id)} onChange={() => toggle(a.id)} className="accent-indigo-600" aria-label={`Seleccionar ${a.legal_name}`} />
                                            </td>
                                        )}
                                        <td className="px-3 py-2.5 max-w-[260px]">
                                            <Link href={`/parties/${a.id}`} className="text-xs font-bold text-slate-900 hover:text-indigo-600 truncate block">{a.legal_name}</Link>
                                            {a.city && <span className="text-[11px] text-slate-400">{a.city}</span>}
                                        </td>
                                        <td className="px-3 py-2.5"><AccountStatusBadge status={a.account_status} /></td>
                                        <td className="px-3 py-2.5 text-xs text-right tabular-nums font-semibold text-slate-800">{cop.format(a.sales_month)}</td>
                                        <td className="px-3 py-2.5 text-xs text-right tabular-nums text-slate-500">
                                            {cop.format(a.sales_prev_month)}
                                        </td>
                                        <td className="px-3 py-2.5 text-xs text-right tabular-nums whitespace-nowrap">
                                            {a.var_30d_pct === null ? <span className="text-slate-300">—</span> : (
                                                <span className={cn('font-bold', a.var_30d_pct <= -30 ? 'text-rose-600' : a.var_30d_pct < 0 ? 'text-amber-600' : 'text-emerald-600')}>
                                                    {a.var_30d_pct > 0 ? '+' : ''}{a.var_30d_pct} %
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-3 py-2.5 text-xs text-right tabular-nums text-slate-700">{cop.format(a.sales_ytd)}</td>
                                        <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-nowrap">
                                            {a.last_purchase_date ? (
                                                <>
                                                    {formatLocalDate(a.last_purchase_date, { day: '2-digit', month: 'short' })}
                                                    <span className={cn('ml-1 text-[10px]', (a.days_since_purchase ?? 0) >= 45 ? 'text-amber-600 font-bold' : 'text-slate-400')}>
                                                        · {a.days_since_purchase} d
                                                    </span>
                                                </>
                                            ) : <span className="text-slate-300">—</span>}
                                        </td>
                                        {isManager && (
                                            <td className="px-3 py-2.5 text-[11px] text-slate-600 whitespace-nowrap">
                                                {a.salesperson_id ? nameOf.get(a.salesperson_id) ?? 'Usuario' : <span className="text-amber-600 font-semibold">Sin asignar</span>}
                                            </td>
                                        )}
                                        <td className="px-3 py-2.5 whitespace-nowrap">
                                            <div className="flex flex-nowrap items-center justify-end gap-1.5">
                                                <ContactActions
                                                    party={{ id: a.id, legal_name: a.legal_name, phone: a.phone, email: a.email }}
                                                    context={{ salesperson_name: currentUserName, contact_name: a.contact_name, last_purchase_date: a.last_purchase_date, days_since_purchase: a.days_since_purchase }}
                                                    suggest={a.account_status === 'ACTIVO_CAIDA' ? 'EN_CAIDA' : a.account_status.startsWith('INACTIVO') ? 'INACTIVO' : (a.days_since_purchase ?? 0) >= 45 ? 'SIN_COMPRA' : null}
                                                />
                                                <Link href={`/crm/visits/new?party_id=${a.id}`}
                                                    className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-600 hover:border-indigo-300 hover:text-indigo-700 whitespace-nowrap">
                                                    <CalendarPlus className="h-3 w-3" /> Visita
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {!isManager && accounts.length === 0 && (
                <p className="text-xs text-slate-500 flex items-center gap-2"><Building2 className="h-3.5 w-3.5" /> Aún no tienes clientes asignados. Pide a gerencia comercial que te reparta la cartera.</p>
            )}
        </div>
    );
}
