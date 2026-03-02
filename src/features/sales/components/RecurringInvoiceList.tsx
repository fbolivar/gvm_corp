'use client';

import { useState } from 'react';
import { RecurringInvoice, recurringInvoiceService } from '../services/recurringInvoiceService';
import { generateRecurringInvoiceAction, updateRecurringStatusAction } from '../recurringInvoiceActions';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Zap, Pause, Play, XCircle, Loader2, Calendar, RefreshCw } from 'lucide-react';
import Link from 'next/link';

const FREQ_COLORS: Record<string, string> = {
    WEEKLY:    'bg-violet-100 text-violet-700',
    BIWEEKLY:  'bg-indigo-100 text-indigo-700',
    MONTHLY:   'bg-blue-100 text-blue-700',
    QUARTERLY: 'bg-cyan-100 text-cyan-700',
    ANNUALLY:  'bg-teal-100 text-teal-700',
};

const STATUS_COLORS: Record<string, string> = {
    ACTIVE:    'bg-emerald-100 text-emerald-700',
    PAUSED:    'bg-amber-100 text-amber-700',
    CANCELLED: 'bg-rose-100 text-rose-700',
};

const STATUS_LABELS: Record<string, string> = {
    ACTIVE: 'Activa', PAUSED: 'Pausada', CANCELLED: 'Cancelada',
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
            alert(result.error);
        } else {
            setLastGenerated(prev => ({ ...prev, [item.id]: result.docId! }));
            // Update next_run_date locally so UI refreshes
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
            alert(result.error);
        } else {
            setItems(prev => prev.map(i => i.id === item.id ? { ...i, status } : i));
        }
    };

    if (items.length === 0) {
        return (
            <div className="py-32 text-center bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-100 flex flex-col items-center gap-6">
                <div className="h-20 w-20 rounded-[2rem] bg-white shadow-sm border border-slate-50 flex items-center justify-center">
                    <RefreshCw className="h-10 w-10 text-slate-200" />
                </div>
                <div className="space-y-2">
                    <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tight">Sin Recurrencias Configuradas</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Cree su primera plantilla de facturación automática</p>
                </div>
                <Button className="bg-slate-900 hover:bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest h-14 px-10 rounded-2xl shadow-active" asChild>
                    <Link href="/sales/recurring/new">Nueva Recurrencia</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {items.map(item => {
                const isProcessing = processingId?.startsWith(item.id);
                const totalPerLine = (item.lines ?? []).reduce((s, l) => s + l.qty * l.unit_price, 0);

                return (
                    <div key={item.id} className="group bg-white rounded-[2.5rem] p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-premium border border-transparent hover:border-slate-100 hover:shadow-active transition-all duration-500">
                        {/* Left Info */}
                        <div className="flex items-start gap-6 flex-1 min-w-0">
                            <div className="h-16 w-16 rounded-[1.5rem] bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500">
                                <RefreshCw className="h-7 w-7" />
                            </div>
                            <div className="space-y-2 min-w-0">
                                <div className="flex flex-wrap items-center gap-3">
                                    <h3 className="text-lg font-black text-slate-900 italic tracking-tighter truncate">{item.name}</h3>
                                    <Badge className={`border-none text-[8px] font-black uppercase tracking-widest rounded-full px-3 ${STATUS_COLORS[item.status]}`}>
                                        {STATUS_LABELS[item.status]}
                                    </Badge>
                                    <Badge className={`border-none text-[8px] font-black uppercase tracking-widest rounded-full px-3 ${FREQ_COLORS[item.frequency]}`}>
                                        {recurringInvoiceService.freqLabel(item.frequency)}
                                    </Badge>
                                </div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    {item.party?.legal_name ?? 'Sin cliente asignado'}
                                </p>
                                <div className="flex flex-wrap gap-6 text-[9px] font-black text-slate-300 uppercase tracking-widest">
                                    <span className="flex items-center gap-1.5">
                                        <Calendar className="h-3 w-3" />
                                        Próxima: {item.next_run_date}
                                    </span>
                                    {item.last_run_date && (
                                        <span>Última: {item.last_run_date}</span>
                                    )}
                                    {lastGenerated[item.id] && (
                                        <span className="text-emerald-500">✓ Factura generada</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right: Amount + Actions */}
                        <div className="flex flex-wrap items-center gap-3 shrink-0">
                            <div className="text-right mr-4">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Valor</p>
                                <p className="text-2xl font-black text-slate-900 italic tracking-tighter">
                                    ${totalPerLine.toLocaleString('es-CO')}
                                </p>
                            </div>

                            {item.status === 'ACTIVE' && (
                                <Button
                                    onClick={() => handleGenerate(item)}
                                    disabled={!!isProcessing}
                                    className="h-12 px-5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest shadow-active transition-all"
                                >
                                    {processingId === item.id + '-gen'
                                        ? <Loader2 className="h-4 w-4 animate-spin" />
                                        : <><Zap className="h-4 w-4 mr-1.5" />Generar</>}
                                </Button>
                            )}

                            {item.status === 'ACTIVE' && (
                                <Button
                                    variant="outline"
                                    onClick={() => handleStatus(item, 'PAUSED')}
                                    disabled={!!isProcessing}
                                    className="h-12 w-12 rounded-2xl border-slate-100 text-amber-500 hover:bg-amber-50 hover:border-amber-200 transition-all"
                                    title="Pausar"
                                >
                                    {processingId === item.id + '-status'
                                        ? <Loader2 className="h-4 w-4 animate-spin" />
                                        : <Pause className="h-4 w-4" />}
                                </Button>
                            )}

                            {item.status === 'PAUSED' && (
                                <Button
                                    variant="outline"
                                    onClick={() => handleStatus(item, 'ACTIVE')}
                                    disabled={!!isProcessing}
                                    className="h-12 w-12 rounded-2xl border-slate-100 text-emerald-500 hover:bg-emerald-50 hover:border-emerald-200 transition-all"
                                    title="Reanudar"
                                >
                                    {processingId === item.id + '-status'
                                        ? <Loader2 className="h-4 w-4 animate-spin" />
                                        : <Play className="h-4 w-4" />}
                                </Button>
                            )}

                            {item.status !== 'CANCELLED' && (
                                <Button
                                    variant="outline"
                                    onClick={() => handleStatus(item, 'CANCELLED')}
                                    disabled={!!isProcessing}
                                    className="h-12 w-12 rounded-2xl border-slate-100 text-rose-400 hover:bg-rose-50 hover:border-rose-200 transition-all"
                                    title="Cancelar"
                                >
                                    <XCircle className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
