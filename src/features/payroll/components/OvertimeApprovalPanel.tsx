'use client';

import { useState, useTransition } from 'react';
import { reviewOvertimeRequest } from '../actions';
import { OvertimeRequest } from '../types';
import { Clock, CheckCircle2, XCircle, User, Calendar, AlignLeft, Loader2, ChevronDown } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

interface Props {
    pendingRequests: OvertimeRequest[];
    allRequests: OvertimeRequest[];
}

function ReviewCard({ req }: { req: OvertimeRequest }) {
    const [isPending, startTransition] = useTransition();
    const [notes, setNotes] = useState('');
    const [done, setDone] = useState(false);
    const [showReject, setShowReject] = useState(false);
    const [result, setResult] = useState<{ success?: boolean; status?: string; error?: string } | null>(null);

    const employeeName = (req.employee as any)?.party?.legal_name ?? 'Empleado';
    const salary = Number((req.employee as any)?.salary ?? 0);
    const hourlyRate = salary / 240;
    const estimatedValue = Math.round(hourlyRate * 1.25 * req.hours);

    function handle(action: 'APPROVED' | 'REJECTED') {
        startTransition(async () => {
            try {
                const res = await reviewOvertimeRequest(req.id!, action, notes);
                setResult({ success: true, status: res.status });
                setDone(true);
            } catch (err: unknown) {
                setResult({ error: err instanceof Error ? err.message : 'Error al procesar' });
            }
        });
    }

    if (done) {
        const approved = result?.status === 'APPROVED';
        return (
            <div className={`rounded-[2rem] p-6 flex items-center gap-4 border ${approved ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                {approved
                    ? <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                    : <XCircle className="h-5 w-5 text-rose-500 shrink-0" />
                }
                <p className="text-sm font-black text-slate-700">
                    Solicitud de <span className="italic">{employeeName}</span> {approved ? 'aprobada' : 'rechazada'}.
                    El empleado ha sido notificado.
                </p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
            {/* Header */}
            <div className="p-6 pb-4 space-y-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
                            <User className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-sm font-black text-slate-900 italic tracking-tight leading-none">{employeeName}</p>
                            <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest mt-0.5">Solicitud Pendiente</p>
                        </div>
                    </div>
                    <div className="text-right shrink-0">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Est. valor</span>
                        <span className="text-lg font-black text-amber-700 italic leading-none">${estimatedValue.toLocaleString('es-CO')}</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 rounded-2xl px-4 py-3 flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <div>
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Fecha</span>
                            <span className="text-xs font-black text-slate-700">{req.date}</span>
                        </div>
                    </div>
                    <div className="bg-slate-50 rounded-2xl px-4 py-3 flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        <div>
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Horas</span>
                            <span className="text-xs font-black text-amber-700 italic">{req.hours}h extra</span>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-50 rounded-2xl px-4 py-3 flex items-start gap-2">
                    <AlignLeft className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Motivo</span>
                        <p className="text-xs text-slate-700 font-medium leading-relaxed">{req.reason}</p>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="border-t border-slate-100 p-4 space-y-3">
                {showReject ? (
                    <div className="space-y-3">
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="Motivo del rechazo (recomendado)…"
                            rows={2}
                            className="w-full px-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 text-slate-900 font-medium text-xs resize-none focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent transition-all"
                        />
                        <div className="grid grid-cols-2 gap-2">
                            <Button
                                onClick={() => setShowReject(false)}
                                variant="outline"
                                className="h-11 rounded-2xl text-xs font-black uppercase tracking-widest border-slate-200"
                                disabled={isPending}
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={() => handle('REJECTED')}
                                disabled={isPending}
                                className="h-11 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-black uppercase tracking-widest border-none"
                            >
                                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Rechazar'}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-2">
                        <Button
                            onClick={() => setShowReject(true)}
                            variant="outline"
                            className="h-12 rounded-2xl text-xs font-black uppercase tracking-widest border-rose-100 text-rose-600 hover:bg-rose-50"
                            disabled={isPending}
                        >
                            <XCircle className="h-4 w-4 mr-1.5" />
                            Rechazar
                        </Button>
                        <Button
                            onClick={() => handle('APPROVED')}
                            disabled={isPending}
                            className="h-12 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black uppercase tracking-widest border-none"
                        >
                            {isPending
                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                : <><CheckCircle2 className="h-4 w-4 mr-1.5" />Aprobar</>
                            }
                        </Button>
                    </div>
                )}

                {result?.error && (
                    <p className="text-xs font-bold text-rose-600 text-center">{result.error}</p>
                )}
            </div>
        </div>
    );
}

export function OvertimeApprovalPanel({ pendingRequests, allRequests }: Props) {
    const [showAll, setShowAll] = useState(false);
    const displayAll = showAll ? allRequests : allRequests.slice(0, 5);

    return (
        <div className="space-y-10">
            {/* Pending requests */}
            <section className="space-y-6">
                <div className="flex items-center gap-4">
                    <div className="h-px flex-1 bg-slate-100" />
                    <div className="flex items-center gap-2 shrink-0">
                        <Clock className="h-4 w-4 text-amber-500" />
                        <h2 className="text-xs font-black text-amber-500 uppercase tracking-[0.4em] italic">
                            Horas Extra Pendientes
                        </h2>
                        {pendingRequests.length > 0 && (
                            <span className="bg-amber-500 text-white text-[9px] font-black rounded-full h-5 w-5 flex items-center justify-center">
                                {pendingRequests.length}
                            </span>
                        )}
                    </div>
                    <div className="h-px flex-1 bg-slate-100" />
                </div>

                {pendingRequests.length === 0 ? (
                    <div className="py-16 text-center bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center gap-3">
                        <CheckCircle2 className="h-10 w-10 text-emerald-300" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">
                            Sin solicitudes pendientes de aprobación
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {pendingRequests.map(req => (
                            <ReviewCard key={req.id} req={req} />
                        ))}
                    </div>
                )}
            </section>

            {/* All requests history */}
            {allRequests.length > 0 && (
                <section className="space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="h-px flex-1 bg-slate-100" />
                        <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.4em] italic shrink-0 px-4">
                            Historial Completo
                        </h2>
                        <div className="h-px flex-1 bg-slate-100" />
                    </div>

                    <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b border-slate-100">
                                    <th className="text-left px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Empleado</th>
                                    <th className="text-left px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Fecha</th>
                                    <th className="text-right px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Horas</th>
                                    <th className="text-right px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {displayAll.map(req => {
                                    const name = (req.employee as any)?.party?.legal_name ?? '—';
                                    const statusMap = {
                                        PENDING: { label: 'Pendiente', cls: 'bg-amber-50 text-amber-700' },
                                        APPROVED: { label: 'Aprobada', cls: 'bg-emerald-50 text-emerald-700' },
                                        REJECTED: { label: 'Rechazada', cls: 'bg-rose-50 text-rose-700' },
                                    };
                                    const s = statusMap[req.status];
                                    return (
                                        <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 font-bold text-slate-800 italic">{name}</td>
                                            <td className="px-6 py-4 text-slate-500 font-medium">{req.date}</td>
                                            <td className="px-6 py-4 text-right font-black text-amber-600">{req.hours}h</td>
                                            <td className="px-6 py-4 text-right">
                                                <span className={`inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${s.cls}`}>
                                                    {s.label}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        {allRequests.length > 5 && (
                            <div className="border-t border-slate-100 p-4 text-center">
                                <button
                                    onClick={() => setShowAll(!showAll)}
                                    className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    {showAll ? 'Ver menos' : `Ver todos (${allRequests.length})`}
                                    <ChevronDown className={`h-3 w-3 transition-transform ${showAll ? 'rotate-180' : ''}`} />
                                </button>
                            </div>
                        )}
                    </div>
                </section>
            )}
        </div>
    );
}
