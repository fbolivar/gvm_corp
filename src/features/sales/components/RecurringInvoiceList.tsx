'use client';

import { useState } from 'react';
import type { RecurringInvoice } from '../services/recurringInvoiceService';
import { generateRecurringInvoiceAction, updateRecurringStatusAction } from '../recurringInvoiceActions';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Zap, Pause, Play, XCircle, Loader2, Calendar, RefreshCw, Plus } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/shared/lib/utils';
import { toast } from 'sonner';

const FREQ_LABELS: Record<string, string> = {
    WEEKLY: 'Semanal',
    BIWEEKLY: 'Quincenal',
    MONTHLY: 'Mensual',
    QUARTERLY: 'Trimestral',
    ANNUALLY: 'Anual',
};

const FREQ_COLORS: Record<string, string> = {
    WEEKLY: 'bg-violet-50 text-violet-600 border-violet-200',
    BIWEEKLY: 'bg-indigo-50 text-indigo-600 border-indigo-200',
    MONTHLY: 'bg-blue-50 text-blue-600 border-blue-200',
    QUARTERLY: 'bg-cyan-50 text-cyan-600 border-cyan-200',
    ANNUALLY: 'bg-teal-50 text-teal-600 border-teal-200',
};

const STATUS_STYLES: Record<string, string> = {
    ACTIVE: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    PAUSED: 'bg-amber-50 text-amber-600 border-amber-200',
    CANCELLED: 'bg-rose-50 text-rose-600 border-rose-200',
};

const STATUS_LABELS: Record<string, string> = {
    ACTIVE: 'Activa',
    PAUSED: 'Pausada',
    CANCELLED: 'Cancelada',
};

interface Props {
    initialItems: RecurringInvoice[];
}

export function RecurringInvoiceList({ initialItems }: Props) {
    const [items, setItems] = useState<RecurringInvoice[]>(initialItems);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [lastGenerated, setLastGenerated] = useState<Record<string, string>>({});

    const handleGenerate = async (item: RecurringInvoice) => {
        if (!confirm(`¿Generar factura ahora para "${item.name}"?`)) return;
        setProcessingId(item.id + '-gen');
        const result = await generateRecurringInvoiceAction(item.id);
        setProcessingId(null);
        if (result.error) {
            toast.error(result.error);
        } else {
            setLastGenerated(prev => ({ ...prev, [item.id]: result.docId! }));
            toast.success('Factura generada exitosamente');
            const today = new Date().toISOString().split('T')[0];
            setItems(prev => prev.map(i =>
                i.id === item.id ? { ...i, last_run_date: today } : i
            ));
        }
    };

    const handleStatus = async (item: RecurringInvoice, status: 'ACTIVE' | 'PAUSED' | 'CANCELLED') => {
        if (status === 'CANCELLED' && !confirm(`¿Cancelar definitivamente "${item.name}"?`)) return;
        setProcessingId(item.id + '-status');
        const result = await updateRecurringStatusAction(item.id, status);
        setProcessingId(null);
        if (result.error) {
            toast.error(result.error);
        } else {
            setItems(prev => prev.map(i => i.id === item.id ? { ...i, status } : i));
        }
    };

    if (items.length === 0) {
        return (
            <Card className="rounded-2xl border border-slate-100 bg-white shadow-sm">
                <CardContent className="py-16 flex flex-col items-center gap-4">
                    <RefreshCw className="h-8 w-8 text-slate-200" />
                    <div className="text-center">
                        <p className="text-sm font-semibold text-slate-900">Sin Recurrencias Configuradas</p>
                        <p className="text-[10px] text-slate-400 mt-1">Cree su primera plantilla de facturación automática</p>
                    </div>
                    <Button asChild className="h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold gap-2">
                        <Link href="/sales/recurring/new">
                            <Plus className="h-3.5 w-3.5" /> Nueva Recurrencia
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-3">
            {items.map(item => {
                const isProcessing = processingId?.startsWith(item.id);
                const lines = Array.isArray(item.lines) ? item.lines : [];
                const totalPerLine = lines.reduce((s, l) => s + l.qty * l.unit_price, 0);

                return (
                    <Card key={item.id} className="rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            {/* Left Info */}
                            <div className="flex items-start gap-4 flex-1 min-w-0">
                                <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                                    <RefreshCw className="h-5 w-5" />
                                </div>
                                <div className="space-y-1.5 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="text-sm font-bold text-slate-900 truncate">{item.name}</h3>
                                        <Badge variant="outline" className={cn(
                                            "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                                            STATUS_STYLES[item.status]
                                        )}>
                                            {STATUS_LABELS[item.status]}
                                        </Badge>
                                        <Badge variant="outline" className={cn(
                                            "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                                            FREQ_COLORS[item.frequency]
                                        )}>
                                            {FREQ_LABELS[item.frequency] ?? item.frequency}
                                        </Badge>
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-medium">
                                        {item.party?.legal_name ?? 'Sin cliente asignado'}
                                    </p>
                                    <div className="flex flex-wrap gap-4 text-[10px] text-slate-400">
                                        <span className="flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            Próxima: {item.next_run_date}
                                        </span>
                                        {item.last_run_date && (
                                            <span>Última: {item.last_run_date}</span>
                                        )}
                                        {lastGenerated[item.id] && (
                                            <span className="text-emerald-500 font-semibold">Factura generada</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Right: Amount + Actions */}
                            <div className="flex flex-wrap items-center gap-2 shrink-0">
                                <div className="text-right mr-2">
                                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Valor</p>
                                    <p className="text-lg font-bold text-slate-900">
                                        ${totalPerLine.toLocaleString('es-CO')}
                                    </p>
                                </div>

                                {item.status === 'ACTIVE' && (
                                    <Button
                                        size="sm"
                                        onClick={() => handleGenerate(item)}
                                        disabled={!!isProcessing}
                                        className="h-8 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-[10px] font-semibold gap-1.5"
                                    >
                                        {processingId === item.id + '-gen'
                                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            : <><Zap className="h-3.5 w-3.5" /> Generar</>}
                                    </Button>
                                )}

                                {item.status === 'ACTIVE' && (
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => handleStatus(item, 'PAUSED')}
                                        disabled={!!isProcessing}
                                        className="h-8 w-8 rounded-lg text-amber-500 hover:bg-amber-50"
                                        title="Pausar"
                                    >
                                        {processingId === item.id + '-status'
                                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            : <Pause className="h-3.5 w-3.5" />}
                                    </Button>
                                )}

                                {item.status === 'PAUSED' && (
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => handleStatus(item, 'ACTIVE')}
                                        disabled={!!isProcessing}
                                        className="h-8 w-8 rounded-lg text-emerald-500 hover:bg-emerald-50"
                                        title="Reanudar"
                                    >
                                        {processingId === item.id + '-status'
                                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            : <Play className="h-3.5 w-3.5" />}
                                    </Button>
                                )}

                                {item.status !== 'CANCELLED' && (
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => handleStatus(item, 'CANCELLED')}
                                        disabled={!!isProcessing}
                                        className="h-8 w-8 rounded-lg text-rose-400 hover:bg-rose-50"
                                        title="Cancelar"
                                    >
                                        <XCircle className="h-3.5 w-3.5" />
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
