'use client';

import { useState, useTransition } from 'react';
import { reviewOvertimeRequest } from '../actions';
import { OvertimeRequest } from '../types';
import { Clock, CheckCircle2, XCircle, User, Calendar, AlignLeft, Loader2, ChevronDown, FileDown } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';
import { toast } from 'sonner';
import type { PdfCompany } from '@/shared/lib/pdfKit';

interface Props {
    pendingRequests: OvertimeRequest[];
    allRequests: OvertimeRequest[];
    /** Datos de la empresa para el encabezado del PDF. */
    company?: PdfCompany;
    generatedBy?: string;
}

function ReviewCard({ req }: { req: OvertimeRequest }) {
    const [isPending, startTransition] = useTransition();
    const [notes, setNotes] = useState('');
    const [done, setDone] = useState(false);
    const [showReject, setShowReject] = useState(false);
    const [result, setResult] = useState<{ success?: boolean; status?: string; error?: string } | null>(null);

    const employee = req.employee as { party?: { legal_name?: string }; salary?: number } | undefined;
    const employeeName = employee?.party?.legal_name ?? 'Empleado';
    const salary = Number(employee?.salary ?? 0);
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
            <div className={cn(
                "rounded-2xl p-5 flex items-center gap-3 border",
                approved ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'
            )}>
                {approved
                    ? <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    : <XCircle className="h-4 w-4 text-rose-500 shrink-0" />
                }
                <p className="text-xs font-bold text-slate-700">
                    Solicitud de {employeeName} {approved ? 'aprobada' : 'rechazada'}.
                </p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            {/* Header */}
            <div className="p-5 pb-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                            <User className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 leading-snug truncate">{employeeName}</p>
                            <p className="text-[10px] font-semibold text-amber-500 uppercase tracking-wider">Solicitud Pendiente</p>
                        </div>
                    </div>
                    <div className="text-right shrink-0">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Est. valor</span>
                        <span className="text-sm font-bold text-amber-700 font-mono tabular-nums">${estimatedValue.toLocaleString('es-CO')}</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 rounded-xl px-3 py-2.5 flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <div>
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Fecha</span>
                            <span className="text-xs font-bold text-slate-700">{req.date}</span>
                        </div>
                    </div>
                    <div className="bg-slate-50 rounded-xl px-3 py-2.5 flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        <div>
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Horas</span>
                            <span className="text-xs font-bold text-amber-700">{req.hours}h extra</span>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-50 rounded-xl px-3 py-2.5 flex items-start gap-2">
                    <AlignLeft className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">Motivo</span>
                        <p className="text-xs text-slate-700 leading-relaxed">{req.reason}</p>
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
                            placeholder="Motivo del rechazo (recomendado)..."
                            rows={2}
                            className="w-full px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-900 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent transition-all"
                        />
                        <div className="grid grid-cols-2 gap-2">
                            <Button
                                onClick={() => setShowReject(false)}
                                variant="outline"
                                className="h-9 rounded-xl text-xs font-semibold border-slate-200"
                                disabled={isPending}
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={() => handle('REJECTED')}
                                disabled={isPending}
                                className="h-9 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold border-none"
                            >
                                {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Rechazar'}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-2">
                        <Button
                            onClick={() => setShowReject(true)}
                            variant="outline"
                            className="h-9 rounded-xl text-xs font-semibold border-rose-100 text-rose-600 hover:bg-rose-50"
                            disabled={isPending}
                        >
                            <XCircle className="h-3.5 w-3.5 mr-1.5" />
                            Rechazar
                        </Button>
                        <Button
                            onClick={() => handle('APPROVED')}
                            disabled={isPending}
                            className="h-9 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold border-none"
                        >
                            {isPending
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                : <><CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />Aprobar</>
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

type HistoryFilter = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';

const FILTERS: { key: HistoryFilter; label: string; active: string }[] = [
    { key: 'ALL', label: 'Todas', active: 'bg-slate-900 text-white' },
    { key: 'PENDING', label: 'Pendientes', active: 'bg-amber-500 text-white' },
    { key: 'APPROVED', label: 'Aprobadas', active: 'bg-emerald-500 text-white' },
    { key: 'REJECTED', label: 'Rechazadas', active: 'bg-rose-500 text-white' },
];

export function OvertimeApprovalPanel({ pendingRequests, allRequests, company, generatedBy }: Props) {
    const [showAll, setShowAll] = useState(false);
    const [filter, setFilter] = useState<HistoryFilter>('ALL');
    const [downloading, setDownloading] = useState(false);
    // Rango de fechas del historial (vacío = todo). Se aplica a la tabla Y al PDF.
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');

    /** Al elegir un mes se llena el rango completo de ese mes. */
    function selectMonth(value: string) {
        if (!value) { setFrom(''); setTo(''); return; }
        const [y, m] = value.split('-').map(Number);
        const last = new Date(y, m, 0).getDate();
        setFrom(`${value}-01`);
        setTo(`${value}-${String(last).padStart(2, '0')}`);
        setShowAll(false);
    }

    const inRange = (r: OvertimeRequest) => {
        const d = String(r.date ?? '');
        if (from && d < from) return false;
        if (to && d > to) return false;
        return true;
    };

    const byDate = allRequests.filter(inRange);
    const filtered = filter === 'ALL' ? byDate : byDate.filter(r => r.status === filter);
    const displayAll = showAll ? filtered : filtered.slice(0, 5);
    // Los contadores respetan el rango de fechas seleccionado.
    const countBy = (k: HistoryFilter) =>
        k === 'ALL' ? byDate.length : byDate.filter(r => r.status === k).length;

    /** Mes actualmente seleccionado (vacío si el rango no calza con un mes exacto). */
    const monthValue = (() => {
        if (!from || !to) return '';
        const [y, m] = from.split('-').map(Number);
        const last = new Date(y, m, 0).getDate();
        return from.endsWith('-01') && to === `${from.slice(0, 7)}-${String(last).padStart(2, '0')}`
            ? from.slice(0, 7) : '';
    })();

    /** Texto del periodo para el encabezado del PDF y el nombre del archivo. */
    function rangeLabel() {
        if (monthValue) {
            const [y, m] = monthValue.split('-').map(Number);
            const nombre = new Date(y, m - 1, 1).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
            return nombre.charAt(0).toUpperCase() + nombre.slice(1);
        }
        if (from && to) return `${from} a ${to}`;
        if (from) return `Desde ${from}`;
        if (to) return `Hasta ${to}`;
        return 'Todo el historial';
    }

    // Exporta EXACTAMENTE lo que se está viendo según el filtro (para contabilidad
    // normalmente: "Aprobadas").
    async function handleDownloadPdf() {
        if (downloading) return;
        if (filtered.length === 0) {
            toast.error('No hay solicitudes para exportar con este filtro');
            return;
        }
        setDownloading(true);
        try {
            const { generateOvertimeReportPdf } = await import('../services/overtimeReportPdfService');
            await generateOvertimeReportPdf({
                company: company ?? { name: 'GVM S.A.S' },
                requests: filtered,
                filterLabel: FILTERS.find(f => f.key === filter)?.label ?? 'Todas',
                rangeLabel: rangeLabel(),
                generatedBy,
            });
            toast.success('Reporte descargado');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'No se pudo generar el PDF');
        } finally {
            setDownloading(false);
        }
    }

    return (
        <div className="space-y-8">
            {/* Pending requests */}
            <section className="space-y-4">
                <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-amber-500" />
                    <h2 className="text-sm font-bold text-slate-900">Solicitudes Pendientes</h2>
                    {pendingRequests.length > 0 && (
                        <span className="bg-amber-500 text-white text-[10px] font-bold rounded-full h-5 min-w-5 px-1.5 flex items-center justify-center">
                            {pendingRequests.length}
                        </span>
                    )}
                </div>

                {pendingRequests.length === 0 ? (
                    <div className="py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center gap-3">
                        <CheckCircle2 className="h-8 w-8 text-emerald-300" />
                        <p className="text-xs text-slate-400">Sin solicitudes pendientes de aprobacion</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {pendingRequests.map(req => (
                            <ReviewCard key={req.id} req={req} />
                        ))}
                    </div>
                )}
            </section>

            {/* All requests history */}
            {allRequests.length > 0 && (
                <section className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <h2 className="text-sm font-bold text-slate-900">Historial Completo</h2>
                        {/* Periodo: mes completo o rango libre. Aplica a la tabla y al PDF. */}
                        <div className="flex flex-wrap items-center gap-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mes</label>
                            <input
                                type="month"
                                value={monthValue}
                                onChange={e => selectMonth(e.target.value)}
                                className="h-9 px-2 rounded-xl border border-slate-200 text-[11px] font-semibold text-slate-600"
                            />
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Desde</label>
                            <input
                                type="date"
                                value={from}
                                onChange={e => { setFrom(e.target.value); setShowAll(false); }}
                                className="h-9 px-2 rounded-xl border border-slate-200 text-[11px] font-semibold text-slate-600"
                            />
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hasta</label>
                            <input
                                type="date"
                                value={to}
                                onChange={e => { setTo(e.target.value); setShowAll(false); }}
                                className="h-9 px-2 rounded-xl border border-slate-200 text-[11px] font-semibold text-slate-600"
                            />
                            {(from || to) && (
                                <button
                                    onClick={() => { setFrom(''); setTo(''); setShowAll(false); }}
                                    className="h-9 px-3 rounded-xl text-[11px] font-semibold text-slate-500 border border-slate-200 hover:bg-slate-50"
                                >
                                    Todo el historial
                                </button>
                            )}
                        </div>
                        {/* Filtro por estado — se mantiene en una línea y envuelve en móvil */}
                        <div className="flex flex-wrap items-center gap-2">
                            {FILTERS.map(f => (
                                <button
                                    key={f.key}
                                    onClick={() => { setFilter(f.key); setShowAll(false); }}
                                    className={cn(
                                        "h-9 px-3 rounded-xl text-[11px] font-semibold transition-colors border",
                                        filter === f.key
                                            ? `${f.active} border-transparent`
                                            : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                                    )}
                                >
                                    {f.label}
                                    <span className={cn(
                                        "ml-1.5 tabular-nums",
                                        filter === f.key ? "text-white/70" : "text-slate-400"
                                    )}>
                                        {countBy(f.key)}
                                    </span>
                                </button>
                            ))}
                            <Button
                                onClick={handleDownloadPdf}
                                disabled={downloading}
                                variant="outline"
                                className="h-9 px-4 rounded-xl text-[11px] font-semibold border-slate-200 text-slate-600 hover:bg-slate-50 gap-1.5"
                            >
                                {downloading
                                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    : <FileDown className="h-3.5 w-3.5" />}
                                PDF
                            </Button>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b border-slate-100">
                                    <th className="text-left px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Empleado</th>
                                    <th className="text-left px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Fecha</th>
                                    <th className="text-left px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400 min-w-[240px]">Observación</th>
                                    <th className="text-right px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Horas</th>
                                    <th className="text-right px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {displayAll.map(req => {
                                    const emp = req.employee as { party?: { legal_name?: string } } | undefined;
                                    const name = emp?.party?.legal_name ?? '—';
                                    const statusMap = {
                                        PENDING: { label: 'Pendiente', cls: 'bg-amber-50 text-amber-700' },
                                        APPROVED: { label: 'Aprobada', cls: 'bg-emerald-50 text-emerald-700' },
                                        REJECTED: { label: 'Rechazada', cls: 'bg-rose-50 text-rose-700' },
                                    };
                                    const s = statusMap[req.status];
                                    return (
                                        <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-5 py-3 font-bold text-slate-800">{name}</td>
                                            <td className="px-5 py-3 text-slate-500 whitespace-nowrap">{req.date}</td>
                                            {/* Observación del empleado + nota de quien revisó */}
                                            <td className="px-5 py-3 align-top max-w-[340px]">
                                                <p className="text-slate-600 leading-relaxed whitespace-pre-wrap break-words">
                                                    {req.reason?.trim() || <span className="text-slate-300">Sin observación</span>}
                                                </p>
                                                {req.reviewer_notes?.trim() && (
                                                    <p className={cn(
                                                        "mt-1.5 text-[11px] leading-relaxed whitespace-pre-wrap break-words rounded-lg px-2 py-1",
                                                        req.status === 'REJECTED'
                                                            ? "bg-rose-50 text-rose-700"
                                                            : "bg-slate-50 text-slate-600"
                                                    )}>
                                                        <span className="font-semibold">Revisión: </span>
                                                        {req.reviewer_notes}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="px-5 py-3 text-right font-bold text-amber-600 font-mono tabular-nums align-top">{req.hours}h</td>
                                            <td className="px-5 py-3 text-right align-top">
                                                <span className={cn("inline-block px-2.5 py-1 rounded-lg text-[10px] font-semibold whitespace-nowrap", s.cls)}>
                                                    {s.label}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        </div>

                        {filtered.length === 0 && (
                            <div className="py-10 text-center">
                                <p className="text-xs text-slate-400">
                                    No hay solicitudes {FILTERS.find(f => f.key === filter)?.label.toLowerCase()}.
                                </p>
                            </div>
                        )}

                        {filtered.length > 5 && (
                            <div className="border-t border-slate-100 p-3 text-center">
                                <button
                                    onClick={() => setShowAll(!showAll)}
                                    className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    {showAll ? 'Ver menos' : `Ver todas (${filtered.length})`}
                                    <ChevronDown className={cn("h-3 w-3 transition-transform", showAll && 'rotate-180')} />
                                </button>
                            </div>
                        )}
                    </div>
                </section>
            )}
        </div>
    );
}
