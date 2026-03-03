'use client';

import { useState, useTransition } from 'react';
import { reviewAbsenceRequest } from '../actions';
import type { AbsenceRequest } from '../types';
import { CheckCircle2, XCircle, CalendarDays, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const TYPE_LABELS: Record<string, string> = {
    VACATION:   'Vacaciones',
    SICK_LEAVE: 'Incapacidad',
    PERSONAL:   'Permiso Personal',
    UNPAID:     'Lic. No Remunerada',
    MATERNITY:  'Lic. Maternidad',
    PATERNITY:  'Lic. Paternidad',
};

const STATUS_STYLE: Record<string, string> = {
    PENDING:  'bg-amber-50 text-amber-700 border border-amber-100',
    APPROVED: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
    REJECTED: 'bg-rose-50 text-rose-700 border border-rose-100',
};
const STATUS_LABEL: Record<string, string> = {
    PENDING: 'Pendiente', APPROVED: 'Aprobada', REJECTED: 'Rechazada',
};

function formatDate(d: string | null | undefined) {
    if (!d) return '—';
    try { return format(new Date(d), 'dd MMM yyyy', { locale: es }); } catch { return d; }
}

interface Props {
    pendingRequests: AbsenceRequest[];
    allRequests: AbsenceRequest[];
}

function ReviewCard({ req, onDone }: { req: AbsenceRequest; onDone: () => void }) {
    const [notes, setNotes] = useState('');
    const [pending, start] = useTransition();
    const [done, setDone] = useState(false);
    const empName = (req.employee?.party as { legal_name?: string } | undefined)?.legal_name ?? 'Empleado';

    function handle(action: 'APPROVED' | 'REJECTED') {
        start(async () => {
            await reviewAbsenceRequest(req.id!, action, notes);
            setDone(true);
            onDone();
        });
    }

    if (done) return null;

    return (
        <div className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-sm space-y-5">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-sm font-black text-slate-900">{empName}</p>
                    <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mt-0.5">
                        {TYPE_LABELS[req.absence_type] ?? req.absence_type}
                    </p>
                </div>
                <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-slate-700">
                        {formatDate(req.start_date)} → {formatDate(req.end_date)}
                    </p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{req.days} días</p>
                </div>
            </div>

            {req.reason && (
                <p className="text-xs text-slate-500 bg-slate-50 rounded-xl px-4 py-2 italic">{req.reason}</p>
            )}

            <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Notas del revisor (opcional)…"
                rows={2}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
            />

            <div className="flex gap-3">
                <button
                    onClick={() => handle('APPROVED')}
                    disabled={pending}
                    className="flex-1 h-10 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Aprobar
                </button>
                <button
                    onClick={() => handle('REJECTED')}
                    disabled={pending}
                    className="flex-1 h-10 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                >
                    <XCircle className="h-3.5 w-3.5" /> Rechazar
                </button>
            </div>
        </div>
    );
}

export function AbsenceApprovalPanel({ pendingRequests, allRequests }: Props) {
    const [refreshKey, setRefreshKey] = useState(0);

    return (
        <div className="space-y-10">
            {/* PENDIENTES */}
            <section className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="h-2 w-6 bg-amber-500 rounded-full" />
                    <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                        Pendientes de Aprobación
                    </h2>
                    {pendingRequests.length > 0 && (
                        <span className="h-6 w-6 rounded-full bg-amber-500 text-white text-[10px] font-black flex items-center justify-center">
                            {pendingRequests.length}
                        </span>
                    )}
                </div>

                {pendingRequests.length === 0 ? (
                    <div className="bg-white rounded-[2rem] border border-dashed border-slate-200 py-14 text-center">
                        <CalendarDays className="h-8 w-8 text-slate-200 mx-auto mb-3" />
                        <p className="text-slate-400 font-black text-sm">Sin solicitudes pendientes</p>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 gap-4" key={refreshKey}>
                        {pendingRequests.map(req => (
                            <ReviewCard key={req.id} req={req} onDone={() => setRefreshKey(k => k + 1)} />
                        ))}
                    </div>
                )}
            </section>

            {/* HISTORIAL */}
            <section className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="h-2 w-6 bg-slate-400 rounded-full" />
                    <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Historial</h2>
                </div>

                <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm">
                    {allRequests.length === 0 ? (
                        <div className="py-14 text-center">
                            <Clock className="h-8 w-8 text-slate-200 mx-auto mb-3" />
                            <p className="text-slate-400 font-black text-sm">Sin registros</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full" role="table">
                                <thead>
                                    <tr className="border-b border-slate-50 bg-slate-50/50">
                                        {['Empleado', 'Tipo', 'Período', 'Días', 'Estado'].map(h => (
                                            <th key={h} scope="col"
                                                className="px-5 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {allRequests.map(req => {
                                        const empName = (req.employee?.party as { legal_name?: string } | undefined)?.legal_name ?? '—';
                                        return (
                                            <tr key={req.id} className="hover:bg-slate-50/60 transition-colors">
                                                <td className="px-5 py-4 text-sm font-bold text-slate-900">{empName}</td>
                                                <td className="px-5 py-4 text-sm text-slate-600">
                                                    {TYPE_LABELS[req.absence_type] ?? req.absence_type}
                                                </td>
                                                <td className="px-5 py-4 text-xs text-slate-500">
                                                    {formatDate(req.start_date)} → {formatDate(req.end_date)}
                                                </td>
                                                <td className="px-5 py-4 text-sm font-black text-slate-700">{req.days}d</td>
                                                <td className="px-5 py-4">
                                                    <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${STATUS_STYLE[req.status] ?? ''}`}>
                                                        {STATUS_LABEL[req.status] ?? req.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
