'use client';

import { useState, useTransition } from 'react';
import { updateOrderStatusAction } from '../actions';
import type { MaintenanceOrder } from '../types';
import { PRIORITY_CONFIG, STATUS_CONFIG, TYPE_LABELS } from '../types';
import { Loader2, Play, CheckCircle2, XCircle, MapPin, User, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface OrderCardProps {
    order: MaintenanceOrder;
}

function formatDate(d: string | null | undefined) {
    if (!d) return '—';
    try { return format(new Date(d), 'dd MMM yyyy', { locale: es }); } catch { return d; }
}

function OrderCard({ order }: OrderCardProps) {
    const [pending, startTransition] = useTransition();
    const [actualCost, setActualCost] = useState('');
    const [completionNote, setCompletionNote] = useState('');
    const [showCompleteForm, setShowCompleteForm] = useState(false);
    const [localStatus, setLocalStatus] = useState<'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'>(order.status ?? 'PENDING');

    const priorityCfg = PRIORITY_CONFIG[order.priority ?? 'MEDIUM'] ?? { label: order.priority ?? '', className: '' };
    const statusCfg = STATUS_CONFIG[localStatus] ?? { label: localStatus, className: '' };

    function handleStatusChange(newStatus: string, cost?: number, notes?: string) {
        startTransition(async () => {
            await updateOrderStatusAction(order.id!, newStatus, cost, notes);
            setLocalStatus(newStatus as 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED');
            setShowCompleteForm(false);
            setActualCost('');
            setCompletionNote('');
        });
    }

    const isClosed = localStatus === 'COMPLETED' || localStatus === 'CANCELLED';

    return (
        <div className={`bg-white rounded-[2rem] border shadow-sm p-6 space-y-4 transition-opacity ${isClosed ? 'opacity-60' : 'border-slate-100'}`}>
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">
                            {order.equipment?.code ?? '—'}
                        </span>
                        <span className="text-[10px] font-black text-slate-300">·</span>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                            {TYPE_LABELS[order.order_type ?? ''] ?? order.order_type}
                        </span>
                    </div>
                    <p className="text-sm font-bold text-slate-900 leading-tight">
                        {order.equipment?.name ?? 'Equipo'}
                    </p>
                    <p className="text-xs text-slate-500 line-clamp-2">{order.description}</p>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${priorityCfg.className}`}>
                        {priorityCfg.label}
                    </span>
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${statusCfg.className}`}>
                        {statusCfg.label}
                    </span>
                </div>
            </div>

            {/* Meta */}
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                {order.equipment?.location && (
                    <span className="flex items-center gap-1 text-[10px] text-slate-400 font-semibold">
                        <MapPin className="h-3 w-3" />
                        {order.equipment.location}
                    </span>
                )}
                {order.technician_name && (
                    <span className="flex items-center gap-1 text-[10px] text-slate-400 font-semibold">
                        <User className="h-3 w-3" />
                        {order.technician_name}
                    </span>
                )}
                <span className="flex items-center gap-1 text-[10px] text-slate-400 font-semibold">
                    <Calendar className="h-3 w-3" />
                    {formatDate(order.scheduled_date)}
                </span>
            </div>

            {/* Costo estimado */}
            {order.estimated_cost != null && (
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Estimado:{' '}
                    <span className="text-slate-700">
                        {Number(order.estimated_cost).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}
                    </span>
                </p>
            )}

            {/* Acciones de estado */}
            {!isClosed && (
                <div className="space-y-3 pt-1 border-t border-slate-50">
                    {/* Formulario completar con costo */}
                    {showCompleteForm && (
                        <div className="space-y-2">
                            <input
                                type="number"
                                value={actualCost}
                                onChange={e => setActualCost(e.target.value)}
                                min="0"
                                step="1000"
                                placeholder="Costo real (COP)"
                                aria-label="Costo real de mantenimiento"
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                            />
                            <textarea
                                value={completionNote}
                                onChange={e => setCompletionNote(e.target.value)}
                                rows={2}
                                placeholder="Nota de cierre (opcional)…"
                                aria-label="Nota de cierre"
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-400"
                            />
                        </div>
                    )}

                    <div className="flex gap-2 flex-wrap">
                        {/* Iniciar — solo si PENDING */}
                        {localStatus === 'PENDING' && (
                            <button
                                onClick={() => handleStatusChange('IN_PROGRESS')}
                                disabled={pending}
                                className="flex items-center gap-1.5 h-8 px-4 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-black text-[9px] uppercase tracking-widest transition-colors disabled:opacity-50"
                            >
                                {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                                Iniciar
                            </button>
                        )}

                        {/* Completar — solo si IN_PROGRESS */}
                        {localStatus === 'IN_PROGRESS' && !showCompleteForm && (
                            <button
                                onClick={() => setShowCompleteForm(true)}
                                className="flex items-center gap-1.5 h-8 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[9px] uppercase tracking-widest transition-colors"
                            >
                                <CheckCircle2 className="h-3 w-3" />
                                Completar
                            </button>
                        )}

                        {/* Confirmar completar */}
                        {showCompleteForm && (
                            <>
                                <button
                                    onClick={() => handleStatusChange(
                                        'COMPLETED',
                                        actualCost ? parseFloat(actualCost) : undefined,
                                        completionNote || undefined,
                                    )}
                                    disabled={pending}
                                    className="flex items-center gap-1.5 h-8 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[9px] uppercase tracking-widest transition-colors disabled:opacity-50"
                                >
                                    {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                                    Confirmar
                                </button>
                                <button
                                    onClick={() => setShowCompleteForm(false)}
                                    className="flex items-center gap-1.5 h-8 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-[9px] uppercase tracking-widest transition-colors"
                                >
                                    Cancelar
                                </button>
                            </>
                        )}

                        {/* Cancelar orden */}
                        {!showCompleteForm && (
                            <button
                                onClick={() => handleStatusChange('CANCELLED')}
                                disabled={pending}
                                className="flex items-center gap-1.5 h-8 px-4 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-500 font-black text-[9px] uppercase tracking-widest transition-colors disabled:opacity-50"
                            >
                                {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
                                Cancelar
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Estado cerrado */}
            {localStatus === 'COMPLETED' && (
                <div className="flex items-center gap-2 pt-1 border-t border-slate-50">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                        Completada — {formatDate(order.completed_date)}
                    </span>
                    {order.actual_cost != null && (
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-auto">
                            Costo:{' '}
                            {Number(order.actual_cost).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}

interface OrderStatusPanelProps {
    orders: MaintenanceOrder[];
}

export function OrderStatusPanel({ orders }: OrderStatusPanelProps) {
    const pendingOrders = orders.filter(o => o.status === 'PENDING' || o.status === 'IN_PROGRESS');

    if (pendingOrders.length === 0) {
        return (
            <div className="bg-white rounded-[2rem] border border-dashed border-slate-200 py-16 text-center">
                <CheckCircle2 className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-400 font-black text-sm">Sin ordenes activas</p>
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1">Crea una orden de trabajo para comenzar</p>
            </div>
        );
    }

    return (
        <div className="grid gap-4 md:grid-cols-2">
            {pendingOrders.map(order => (
                <OrderCard key={order.id} order={order} />
            ))}
        </div>
    );
}
