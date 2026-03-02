'use client';

import { useState } from 'react';
import {
    FiscalPeriod, PeriodCloseItem, CHECKLIST_ITEMS, periodLabel,
} from '../services/fiscalPeriodService';
import {
    confirmChecklistItemAction,
    updatePeriodStatusAction,
} from '../fiscalPeriodActions';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { CheckCircle2, Circle, Lock, Unlock, Loader2, AlertTriangle } from 'lucide-react';

interface Props {
    period: FiscalPeriod;
    items: PeriodCloseItem[];
}

const STATUS_MAP = {
    OPEN:    { label: 'Abierto',   color: 'bg-emerald-100 text-emerald-700' },
    CLOSING: { label: 'En Cierre', color: 'bg-amber-100 text-amber-700' },
    CLOSED:  { label: 'Cerrado',   color: 'bg-rose-100 text-rose-700' },
};

export function PeriodClosePanel({ period: initialPeriod, items: initialItems }: Props) {
    const [period, setPeriod] = useState<FiscalPeriod>(initialPeriod);
    const [items, setItems]   = useState<PeriodCloseItem[]>(initialItems);
    const [loadingId, setLoadingId]   = useState<string | null>(null);
    const [loadingAction, setLoadingAction] = useState(false);

    const confirmedCount = items.filter(i => i.is_confirmed).length;
    const totalCount     = CHECKLIST_ITEMS.length;
    const allConfirmed   = confirmedCount === totalCount;
    const progressPct    = totalCount > 0 ? (confirmedCount / totalCount) * 100 : 0;

    const handleToggle = async (item: PeriodCloseItem) => {
        if (period.status === 'CLOSED') return;
        setLoadingId(item.id);
        const newVal = !item.is_confirmed;
        const result = await confirmChecklistItemAction(item.id, newVal);
        setLoadingId(null);
        if (result.error) {
            alert(result.error);
        } else {
            setItems(prev => prev.map(i => i.id === item.id
                ? { ...i, is_confirmed: newVal, confirmed_at: newVal ? new Date().toISOString() : null }
                : i
            ));
        }
    };

    const handleStatusChange = async (newStatus: 'CLOSING' | 'CLOSED' | 'OPEN') => {
        if (newStatus === 'CLOSED' && !allConfirmed) {
            alert('Todos los ítems del checklist deben estar confirmados antes de cerrar el período.');
            return;
        }
        if (newStatus === 'CLOSED' && !confirm(`¿Confirmar el CIERRE DEFINITIVO del período ${periodLabel(period.period)}? Esta acción bloqueará el período.`)) return;
        setLoadingAction(true);
        const result = await updatePeriodStatusAction(period.id, newStatus);
        setLoadingAction(false);
        if (result.error) {
            alert(result.error);
        } else {
            setPeriod(p => ({ ...p, status: newStatus }));
        }
    };

    const statusInfo = STATUS_MAP[period.status];

    return (
        <div className="space-y-8">
            {/* Period header */}
            <div className="bg-white rounded-[3rem] p-10 shadow-premium">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-4">
                            <h2 className="text-3xl font-black text-slate-900 italic tracking-tighter capitalize">
                                {periodLabel(period.period)}
                            </h2>
                            <Badge className={`border-none text-[9px] font-black uppercase tracking-widest rounded-full px-4 py-1 ${statusInfo.color}`}>
                                {statusInfo.label}
                            </Badge>
                        </div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            Período {period.period} · {confirmedCount}/{totalCount} ítems confirmados
                        </p>
                    </div>

                    <div className="flex gap-3">
                        {period.status === 'OPEN' && (
                            <Button
                                onClick={() => handleStatusChange('CLOSING')}
                                disabled={loadingAction}
                                className="h-12 px-6 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-[10px] uppercase tracking-widest"
                            >
                                {loadingAction ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Unlock className="h-4 w-4 mr-2" />Iniciar Cierre</>}
                            </Button>
                        )}
                        {period.status === 'CLOSING' && (
                            <>
                                <Button
                                    onClick={() => handleStatusChange('OPEN')}
                                    disabled={loadingAction}
                                    variant="outline"
                                    className="h-12 px-6 rounded-2xl border-slate-200 font-black text-[10px] uppercase tracking-widest text-slate-500"
                                >
                                    Reabrir
                                </Button>
                                <Button
                                    onClick={() => handleStatusChange('CLOSED')}
                                    disabled={loadingAction || !allConfirmed}
                                    className={`h-12 px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest text-white ${allConfirmed ? 'bg-rose-600 hover:bg-rose-700 shadow-active' : 'bg-slate-300 cursor-not-allowed'}`}
                                >
                                    {loadingAction ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Lock className="h-4 w-4 mr-2" />Cerrar Período</>}
                                </Button>
                            </>
                        )}
                        {period.status === 'CLOSED' && (
                            <div className="flex items-center gap-2 text-rose-600 bg-rose-50 px-6 py-3 rounded-2xl">
                                <Lock className="h-4 w-4" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Período Bloqueado</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Progress bar */}
                <div className="mt-8 space-y-2">
                    <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-slate-400">
                        <span>Progreso del cierre</span>
                        <span className="text-indigo-600">{progressPct.toFixed(0)}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-700"
                            style={{ width: `${progressPct}%` }}
                        />
                    </div>
                </div>

                {/* Warning if trying to close with pending items */}
                {period.status === 'CLOSING' && !allConfirmed && (
                    <div className="mt-6 flex items-center gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                        <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                        <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">
                            Confirme todos los ítems para habilitar el cierre definitivo
                        </p>
                    </div>
                )}
            </div>

            {/* Checklist */}
            <div className="space-y-3">
                {CHECKLIST_ITEMS.map(def => {
                    const dbItem = items.find(i => i.item_key === def.key);
                    const confirmed = dbItem?.is_confirmed ?? false;
                    const isLoading = loadingId === dbItem?.id;
                    const isClosed  = period.status === 'CLOSED';

                    return (
                        <div
                            key={def.key}
                            onClick={() => dbItem && !isClosed && handleToggle(dbItem)}
                            className={`group flex items-center gap-6 p-8 rounded-[2.5rem] border transition-all duration-300 cursor-pointer
                                ${confirmed
                                    ? 'bg-emerald-50/80 border-emerald-100 shadow-sm'
                                    : 'bg-white border-slate-100 shadow-premium hover:border-indigo-100 hover:shadow-active'}
                                ${isClosed ? 'cursor-default' : ''}
                            `}
                        >
                            {/* Icon */}
                            <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 transition-all ${confirmed ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500'}`}>
                                {isLoading
                                    ? <Loader2 className="h-5 w-5 animate-spin" />
                                    : confirmed
                                        ? <CheckCircle2 className="h-5 w-5" />
                                        : <Circle className="h-5 w-5" />}
                            </div>

                            {/* Text */}
                            <div className="flex-1 min-w-0">
                                <p className={`text-sm font-black tracking-tight ${confirmed ? 'text-emerald-700 line-through opacity-80' : 'text-slate-900'}`}>
                                    {def.label}
                                </p>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                                    {def.description}
                                </p>
                                {dbItem?.confirmed_at && (
                                    <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mt-1">
                                        Confirmado: {new Date(dbItem.confirmed_at).toLocaleDateString('es-CO')}
                                    </p>
                                )}
                            </div>

                            {/* Badge */}
                            {confirmed
                                ? <Badge className="bg-emerald-100 text-emerald-700 border-none text-[8px] font-black uppercase tracking-widest rounded-full px-3 shrink-0">Listo</Badge>
                                : <Badge className="bg-slate-100 text-slate-400 border-none text-[8px] font-black uppercase tracking-widest rounded-full px-3 shrink-0">Pendiente</Badge>
                            }
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
