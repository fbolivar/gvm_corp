import Link from 'next/link';
import { AlertTriangle, TrendingDown, Clock, PowerOff, CalendarPlus, CalendarClock } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { formatLocalDate } from '@/shared/lib/dateFmt';
import { ALERT_LABELS, type AccountAlert, type AlertKind } from '../utils/accountSummary';
import type { CrmVisit } from '../types/visits';
import { ContactActions } from './ContactActions';

/**
 * "Qué hacer hoy": cuentas en caída, sin compra reciente, inactivas con
 * historial y seguimientos de visitas vencidos. Cada tarjeta lleva al planeador
 * con el cliente y el tipo de gestión precargados.
 */

const cop = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

const KIND_STYLE: Record<AlertKind, { icon: typeof TrendingDown; cls: string }> = {
    EN_CAIDA: { icon: TrendingDown, cls: 'text-rose-600 bg-rose-50 border-rose-100' },
    SIN_COMPRA: { icon: Clock, cls: 'text-amber-600 bg-amber-50 border-amber-100' },
    INACTIVO: { icon: PowerOff, cls: 'text-slate-600 bg-slate-100 border-slate-200' },
};

interface Props {
    alerts: AccountAlert[];
    overdueVisits: CrmVisit[];
    /** Muestra el nombre del comercial (vista gerente). */
    salespersonNames?: Map<string, string>;
    limit?: number;
    currentUserName: string;
}

export function AccountAlerts({ alerts, overdueVisits, salespersonNames, limit = 8, currentUserName }: Props) {
    const groups = (Object.keys(ALERT_LABELS) as AlertKind[]).map(kind => ({ kind, items: alerts.filter(a => a.kind === kind) })).filter(g => g.items.length > 0);
    const empty = groups.length === 0 && overdueVisits.length === 0;

    return (
        <section className="space-y-4">
            <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <h2 className="text-sm font-black text-slate-900">Qué hacer hoy</h2>
                <span className="text-[11px] text-slate-400">{alerts.length + overdueVisits.length} pendientes</span>
            </div>

            {empty && (
                <div className="bg-white rounded-2xl border border-dashed border-slate-200 px-6 py-8 text-center text-xs text-slate-500">
                    Sin alertas: la cartera está al día.
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {groups.map(({ kind, items }) => {
                    const { icon: Icon, cls } = KIND_STYLE[kind];
                    return (
                        <div key={kind} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                            <div className={cn('px-4 py-2.5 border-b flex items-center gap-2', cls)}>
                                <Icon className="h-3.5 w-3.5" />
                                <span className="text-[11px] font-black uppercase tracking-wider">{ALERT_LABELS[kind]}</span>
                                <span className="text-[11px] font-bold ml-auto">{items.length}</span>
                            </div>
                            <ul className="divide-y divide-slate-50">
                                {items.slice(0, limit).map(al => (
                                    <li key={al.account.id} className="px-4 py-2.5 flex items-center gap-3">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-bold text-slate-900 truncate">{al.account.legal_name}</p>
                                            <p className="text-[11px] text-slate-500 truncate">
                                                {al.reason} · año {cop.format(al.account.sales_ytd)}
                                                {salespersonNames && al.account.salesperson_id && ` · ${salespersonNames.get(al.account.salesperson_id) ?? ''}`}
                                                {salespersonNames && !al.account.salesperson_id && <span className="text-amber-600 font-semibold"> · sin comercial</span>}
                                            </p>
                                        </div>
                                        <ContactActions
                                            party={{ id: al.account.id, legal_name: al.account.legal_name, phone: al.account.phone, email: al.account.email }}
                                            context={{ salesperson_name: currentUserName, contact_name: al.account.contact_name, last_purchase_date: al.account.last_purchase_date, days_since_purchase: al.account.days_since_purchase }}
                                            suggest={kind}
                                            className="shrink-0"
                                        />
                                        <Link href={`/crm/visits/new?party_id=${al.account.id}&management_type=${al.suggested_management}&priority=${kind === 'EN_CAIDA' ? 1 : 2}`}
                                            className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg bg-indigo-600 text-white text-[11px] font-bold hover:bg-indigo-700 whitespace-nowrap shrink-0"
                                            title="Planear visita">
                                            <CalendarPlus className="h-3 w-3" /> <span className="hidden sm:inline">Planear visita</span>
                                        </Link>
                                    </li>
                                ))}
                                {items.length > limit && (
                                    <li className="px-4 py-2 text-[11px] text-slate-400">
                                        <Link href={`/crm/accounts?status=${kind === 'EN_CAIDA' ? 'ACTIVO_CAIDA' : kind === 'INACTIVO' ? 'INACTIVO_ANIO' : 'SIN_COMPRA_MES'}`} className="hover:text-indigo-600">
                                            Ver los {items.length} en la cartera →
                                        </Link>
                                    </li>
                                )}
                            </ul>
                        </div>
                    );
                })}

                {overdueVisits.length > 0 && (
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-4 py-2.5 border-b flex items-center gap-2 text-sky-700 bg-sky-50 border-sky-100">
                            <CalendarClock className="h-3.5 w-3.5" />
                            <span className="text-[11px] font-black uppercase tracking-wider">Visitas y seguimientos vencidos</span>
                            <span className="text-[11px] font-bold ml-auto">{overdueVisits.length}</span>
                        </div>
                        <ul className="divide-y divide-slate-50">
                            {overdueVisits.slice(0, limit).map(v => (
                                <li key={v.id}>
                                    <Link href={`/crm/visits/${v.id}`} className="px-4 py-2.5 flex items-center gap-3 hover:bg-slate-50/60">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-bold text-slate-900 truncate">{v.is_internal ? v.title : v.party_name}</p>
                                            <p className="text-[11px] text-slate-500 truncate">
                                                {v.status === 'REALIZADA' ? `Seguimiento ${formatLocalDate(v.next_followup_date)}` : `Planeada ${formatLocalDate(v.planned_date)}`}
                                                {salespersonNames && ` · ${v.salesperson_name}`}
                                            </p>
                                        </div>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </section>
    );
}
