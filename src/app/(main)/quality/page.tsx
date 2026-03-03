import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { qualityService } from '@/features/quality/services/qualityService';
import { settingsService } from '@/features/settings/services/settingsService';
import { InspectionForm } from '@/features/quality/components/InspectionForm';
import { NcrForm, NcrCard } from '@/features/quality/components/NcrForm';
import {
    STAGE_LABELS, RESULT_LABELS,
} from '@/features/quality/types';
import { ClipboardCheck, AlertTriangle, TrendingUp, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export const metadata = { title: 'Control de Calidad QC — GVM Corp' };

function formatDate(d: string | null | undefined) {
    if (!d) return '—';
    try { return format(new Date(d), 'dd MMM yyyy', { locale: es }); } catch { return d; }
}

export default async function QualityPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const tenant = await settingsService.getTenantInfo(supabase);
    if (!tenant) redirect('/login');

    const [inspections, openNcrs, metrics] = await Promise.all([
        qualityService.getInspections(supabase, tenant.id, 30).catch(() => []),
        qualityService.getOpenNcrs(supabase, tenant.id).catch(() => []),
        qualityService.getMetrics(supabase, tenant.id).catch(() => ({
            totalInspections: 0, approvalRate: 100, openNcrs: 0, criticalNcrs: 0,
        })),
    ]);

    return (
        <div className="page-container space-y-12 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-700">

            {/* Header */}
            <div className="relative overflow-hidden bg-slate-950 rounded-[2.5rem] p-10 text-white shadow-active group">
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none group-hover:scale-110 group-hover:rotate-12 transition-all duration-1000">
                    <ShieldCheck className="h-24 w-24 text-white" />
                </div>
                <div className="relative z-10 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="h-2 w-8 bg-indigo-500 rounded-full" />
                        <span className="text-[10px] font-black uppercase tracking-[0.5em] text-indigo-400">Operaciones · QC</span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight uppercase leading-tight">
                        Control de<br /><span className="text-slate-500">Calidad</span>
                    </h1>
                    <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.4em]">
                        Inspecciones · NCRs · Métricas de Rechazo
                    </p>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[
                    { label: 'Inspecciones',   value: metrics.totalInspections,           icon: ClipboardCheck, color: 'text-indigo-600',  bg: 'bg-indigo-50' },
                    { label: 'Tasa Aprobación', value: `${metrics.approvalRate.toFixed(1)}%`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'NCRs Abiertas',  value: metrics.openNcrs,                    icon: AlertTriangle,  color: 'text-amber-600',   bg: 'bg-amber-50' },
                    { label: 'NCRs Críticas',  value: metrics.criticalNcrs,               icon: ShieldCheck,    color: 'text-rose-600',    bg: 'bg-rose-50' },
                ].map((kpi, i) => (
                    <div key={i} className="bg-white rounded-[2.5rem] p-7 shadow-premium flex items-center gap-5">
                        <div className={`h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 ${kpi.bg} ${kpi.color}`}>
                            <kpi.icon className="h-7 w-7" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{kpi.label}</p>
                            <p className="text-2xl font-black text-slate-900 tracking-tight">{kpi.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid md:grid-cols-12 gap-10 items-start">
                {/* Formularios (columna izquierda) */}
                <div className="md:col-span-4 space-y-8">
                    {/* Nueva inspección */}
                    <div className="bg-white rounded-[2.5rem] shadow-premium overflow-hidden">
                        <div className="h-2 bg-indigo-600 w-full" />
                        <div className="p-8 space-y-6">
                            <div>
                                <h2 className="text-lg font-black text-slate-900 tracking-tight">Nueva Inspección</h2>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Registrar resultado QC</p>
                            </div>
                            <InspectionForm />
                        </div>
                    </div>

                    {/* Nueva NCR */}
                    <div className="bg-white rounded-[2.5rem] shadow-premium overflow-hidden">
                        <div className="h-2 bg-rose-600 w-full" />
                        <div className="p-8 space-y-6">
                            <div>
                                <h2 className="text-lg font-black text-slate-900 tracking-tight">Abrir NCR</h2>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">No Conformidad / Defecto</p>
                            </div>
                            <NcrForm />
                        </div>
                    </div>
                </div>

                {/* Contenido principal (columna derecha) */}
                <div className="md:col-span-8 space-y-10">
                    {/* Inspecciones recientes */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="h-2 w-6 bg-indigo-500 rounded-full" />
                            <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Inspecciones Recientes</h2>
                        </div>
                        <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm">
                            {inspections.length === 0 ? (
                                <div className="py-14 text-center">
                                    <ClipboardCheck className="h-8 w-8 text-slate-200 mx-auto mb-3" />
                                    <p className="text-slate-400 font-black text-sm">Sin inspecciones registradas</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full" role="table">
                                        <thead>
                                            <tr className="border-b border-slate-50 bg-slate-50/50">
                                                {['Fecha', 'Etapa', 'Lote', 'Insp.', 'Aprobado', 'Rechazado', 'Resultado'].map(h => (
                                                    <th key={h} scope="col"
                                                        className="px-4 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                        {h}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {inspections.map(insp => {
                                                const res = RESULT_LABELS[insp.result];
                                                return (
                                                    <tr key={insp.id} className="hover:bg-slate-50/60 transition-colors">
                                                        <td className="px-4 py-4 text-xs text-slate-600">{formatDate(insp.inspection_date)}</td>
                                                        <td className="px-4 py-4 text-xs font-bold text-slate-700">{STAGE_LABELS[insp.stage] ?? insp.stage}</td>
                                                        <td className="px-4 py-4 text-xs font-mono text-slate-500">{insp.lot_number || '—'}</td>
                                                        <td className="px-4 py-4 text-xs font-black text-slate-700">{Number(insp.quantity_inspected).toLocaleString('es-CO')}</td>
                                                        <td className="px-4 py-4 text-xs font-bold text-emerald-700">{Number(insp.quantity_approved).toLocaleString('es-CO')}</td>
                                                        <td className="px-4 py-4 text-xs font-bold text-rose-700">{Number(insp.quantity_rejected).toLocaleString('es-CO')}</td>
                                                        <td className="px-4 py-4">
                                                            <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${res?.className ?? ''}`}>
                                                                {res?.label ?? insp.result}
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

                    {/* NCRs abiertas */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="h-2 w-6 bg-rose-500 rounded-full" />
                            <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">NCRs Abiertas</h2>
                            {openNcrs.length > 0 && (
                                <span className="h-6 w-6 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center">
                                    {openNcrs.length}
                                </span>
                            )}
                        </div>
                        {openNcrs.length === 0 ? (
                            <div className="bg-white rounded-[2rem] border border-dashed border-slate-200 py-14 text-center">
                                <AlertTriangle className="h-8 w-8 text-slate-200 mx-auto mb-3" />
                                <p className="text-slate-400 font-black text-sm">Sin NCRs abiertas — ¡excelente!</p>
                            </div>
                        ) : (
                            <div className="grid md:grid-cols-2 gap-4">
                                {openNcrs.map(ncr => <NcrCard key={ncr.id} ncr={ncr} />)}
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
}
