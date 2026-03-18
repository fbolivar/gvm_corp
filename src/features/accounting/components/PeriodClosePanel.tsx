'use client';

import { useState } from 'react';
import {
    FiscalPeriod, PeriodCloseItem, CHECKLIST_ITEMS, periodLabel,
} from '../services/fiscalPeriodService';
import {
    confirmChecklistItemAction,
    updatePeriodStatusAction,
} from '../fiscalPeriodActions';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { CheckCircle2, Circle, Lock, Unlock, Loader2, AlertTriangle } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { useConfirm } from '@/shared/hooks/useConfirm';

interface Props {
    period: FiscalPeriod;
    items: PeriodCloseItem[];
}

const STATUS_MAP = {
    OPEN:    { label: 'Abierto',   color: 'bg-emerald-50 text-emerald-600' },
    CLOSING: { label: 'En Cierre', color: 'bg-amber-50 text-amber-600' },
    CLOSED:  { label: 'Cerrado',   color: 'bg-rose-50 text-rose-600' },
};

export function PeriodClosePanel({ period: initialPeriod, items: initialItems }: Props) {
    const [period, setPeriod] = useState<FiscalPeriod>(initialPeriod);
    const [items, setItems] = useState<PeriodCloseItem[]>(initialItems);
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [loadingAction, setLoadingAction] = useState(false);
    const [ConfirmDialogEl, confirmFn] = useConfirm();

    const confirmedCount = items.filter(i => i.is_confirmed).length;
    const totalCount = CHECKLIST_ITEMS.length;
    const allConfirmed = confirmedCount === totalCount;
    const progressPct = totalCount > 0 ? (confirmedCount / totalCount) * 100 : 0;

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
        if (newStatus === 'CLOSED') {
            const ok = await confirmFn({ title: "Confirmar", description: `Confirmar el CIERRE DEFINITIVO del período ${periodLabel(period.period)}? Esta acción bloqueará el período.`, variant: "danger", confirmLabel: "Confirmar" })
            if (!ok) return;
        }
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
        <div className="space-y-6">
            {ConfirmDialogEl}
            {/* Period header */}
            <Card className="rounded-2xl border border-slate-100 bg-white shadow-sm">
                <CardHeader className="py-5 px-6">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-3">
                                <h2 className="text-lg font-bold text-slate-900 capitalize">
                                    {periodLabel(period.period)}
                                </h2>
                                <Badge className={cn(
                                    "border-none text-[9px] font-bold uppercase tracking-wider rounded-full px-2.5 py-0.5",
                                    statusInfo.color
                                )}>
                                    {statusInfo.label}
                                </Badge>
                            </div>
                            <p className="text-[10px] text-slate-400">
                                Período {period.period} · {confirmedCount}/{totalCount} ítems confirmados
                            </p>
                        </div>

                        <div className="flex gap-2">
                            {period.status === 'OPEN' && (
                                <Button
                                    onClick={() => handleStatusChange('CLOSING')}
                                    disabled={loadingAction}
                                    size="sm"
                                    className="h-9 px-4 rounded-xl gap-2 bg-amber-500 hover:bg-amber-600 text-white text-xs"
                                >
                                    {loadingAction ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Unlock className="h-3.5 w-3.5" />Iniciar Cierre</>}
                                </Button>
                            )}
                            {period.status === 'CLOSING' && (
                                <>
                                    <Button
                                        onClick={() => handleStatusChange('OPEN')}
                                        disabled={loadingAction}
                                        variant="outline"
                                        size="sm"
                                        className="h-9 px-4 rounded-xl text-xs"
                                    >
                                        Reabrir
                                    </Button>
                                    <Button
                                        onClick={() => handleStatusChange('CLOSED')}
                                        disabled={loadingAction || !allConfirmed}
                                        size="sm"
                                        className={cn(
                                            "h-9 px-4 rounded-xl gap-2 text-white text-xs",
                                            allConfirmed ? "bg-rose-600 hover:bg-rose-700" : "bg-slate-300 cursor-not-allowed"
                                        )}
                                    >
                                        {loadingAction ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Lock className="h-3.5 w-3.5" />Cerrar Período</>}
                                    </Button>
                                </>
                            )}
                            {period.status === 'CLOSED' && (
                                <div className="flex items-center gap-2 text-rose-600 bg-rose-50 px-4 py-2 rounded-xl">
                                    <Lock className="h-3.5 w-3.5" />
                                    <span className="text-xs font-bold">Período Bloqueado</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-5 space-y-1.5">
                        <div className="flex justify-between text-[10px] text-slate-400">
                            <span>Progreso del cierre</span>
                            <span className="text-indigo-600 font-semibold">{progressPct.toFixed(0)}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-indigo-500 rounded-full transition-all duration-700"
                                style={{ width: `${progressPct}%` }}
                            />
                        </div>
                    </div>

                    {/* Warning */}
                    {period.status === 'CLOSING' && !allConfirmed && (
                        <div className="mt-4 flex items-center gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
                            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                            <p className="text-xs text-amber-700 font-medium">
                                Confirme todos los ítems para habilitar el cierre definitivo
                            </p>
                        </div>
                    )}
                </CardHeader>
            </Card>

            {/* Checklist */}
            <div className="space-y-2">
                {CHECKLIST_ITEMS.map(def => {
                    const dbItem = items.find(i => i.item_key === def.key);
                    const confirmed = dbItem?.is_confirmed ?? false;
                    const isLoading = loadingId === dbItem?.id;
                    const isClosed = period.status === 'CLOSED';

                    return (
                        <div
                            key={def.key}
                            onClick={() => dbItem && !isClosed && handleToggle(dbItem)}
                            className={cn(
                                "flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer",
                                confirmed
                                    ? "bg-emerald-50/50 border-emerald-100"
                                    : "bg-white border-slate-100 hover:border-indigo-100 shadow-sm",
                                isClosed && "cursor-default"
                            )}
                        >
                            {/* Icon */}
                            <div className={cn(
                                "h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition-all",
                                confirmed
                                    ? "bg-emerald-500 text-white"
                                    : "bg-slate-100 text-slate-400"
                            )}>
                                {isLoading
                                    ? <Loader2 className="h-4 w-4 animate-spin" />
                                    : confirmed
                                        ? <CheckCircle2 className="h-4 w-4" />
                                        : <Circle className="h-4 w-4" />}
                            </div>

                            {/* Text */}
                            <div className="flex-1 min-w-0">
                                <p className={cn(
                                    "text-xs font-bold",
                                    confirmed ? "text-emerald-700 line-through opacity-80" : "text-slate-900"
                                )}>
                                    {def.label}
                                </p>
                                <p className="text-[10px] text-slate-400 mt-0.5">{def.description}</p>
                                {dbItem?.confirmed_at && (
                                    <p className="text-[10px] text-emerald-500 font-medium mt-0.5">
                                        Confirmado: {new Date(dbItem.confirmed_at).toLocaleDateString('es-CO')}
                                    </p>
                                )}
                            </div>

                            {/* Badge */}
                            <Badge className={cn(
                                "border-none text-[9px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5 shrink-0",
                                confirmed ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"
                            )}>
                                {confirmed ? 'Listo' : 'Pendiente'}
                            </Badge>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
