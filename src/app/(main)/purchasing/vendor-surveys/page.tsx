import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Plus, ClipboardList, Users, Star, TrendingUp } from 'lucide-react';

import { createClient } from '@/lib/supabase/server';
import { vendorSurveyService } from '@/features/purchasing/services/vendorSurveyService';
import { VendorSurveyResults } from '@/features/purchasing/components/VendorSurveyResults';
import { summarizeCompany } from '@/features/purchasing/utils/vendorSurveyScoring';
import { PageHeader } from '@/shared/components/ui/page-header';
import { Button } from '@/shared/components/ui/button';

export const metadata = { title: 'Encuestas a proveedores — GVM Corp' };

interface PageProps {
    searchParams: Promise<Record<string, string>>;
}

export default async function VendorSurveysPage({ searchParams }: PageProps) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const sp = await searchParams;
    const from = sp.from?.trim() || undefined;
    const to = sp.to?.trim() || undefined;

    const companies = await vendorSurveyService.getCompanyResults(supabase, { start_date: from, end_date: to });

    // Indicadores globales: se calculan sobre TODAS las respuestas, ponderando por
    // el cargo igual que el consolidado de cada proveedor.
    const allRows = companies.flatMap(c => c.rows);
    const global = summarizeCompany(allRows.map(r => ({
        role_weight: r.role_weight,
        overall_score: r.overall_score,
        score_relationship: r.score_relationship,
        score_orders_payments: r.score_orders_payments,
        score_commercial: r.score_commercial,
        csat: r.csat,
        nps: r.nps,
    })));

    const kpis = [
        {
            label: 'Índice de relación',
            value: global.overall === null ? '—' : `${global.overall.toFixed(0)}/100`,
            hint: 'Ponderado por cargo',
            icon: TrendingUp,
            color: 'text-indigo-600',
            bg: 'bg-indigo-50',
        },
        {
            label: 'Satisfacción (CSAT)',
            value: global.csat === null ? '—' : `${global.csat.toFixed(1)}/10`,
            hint: 'Promedio ponderado',
            icon: Star,
            color: 'text-amber-600',
            bg: 'bg-amber-50',
        },
        {
            label: 'NPS',
            value: global.nps === null ? '—' : `${global.nps}`,
            hint: `${global.promoters} promotores · ${global.detractors} detractores`,
            icon: TrendingUp,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
        },
        {
            label: 'Cobertura',
            value: `${companies.length}`,
            hint: `${allRows.length} respuesta(s) de ${companies.length} proveedor(es)`,
            icon: Users,
            color: 'text-slate-600',
            bg: 'bg-slate-100',
        },
    ];

    return (
        <div className="page-container">
            <div className="space-y-6 pb-16 animate-in fade-in duration-500">
                <PageHeader
                    title="Encuestas a proveedores"
                    description="Cómo perciben los proveedores a GVM como comprador, consolidado por empresa y ponderado según el cargo de quien responde."
                    icon={ClipboardList}
                    breadcrumbs={[
                        { label: 'Inicio', href: '/dashboard' },
                        { label: 'Compras', href: '/purchasing/orders' },
                        { label: 'Encuestas a proveedores' },
                    ]}
                    actions={
                        <>
                            <Button asChild className="h-11 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold gap-2">
                                <Link href="/purchasing/vendor-surveys/new">
                                    <Plus className="h-3.5 w-3.5" /> Nueva encuesta
                                </Link>
                            </Button>
                            <Button variant="outline" asChild className="h-11 px-4 rounded-xl text-xs font-semibold">
                                <Link href="/purchasing/vendors">Proveedores</Link>
                            </Button>
                        </>
                    }
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    {kpis.map(kpi => (
                        <div key={kpi.label} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center gap-3">
                            <div className={`h-10 w-10 rounded-xl ${kpi.bg} flex items-center justify-center shrink-0`}>
                                <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{kpi.label}</p>
                                <p className="text-xl font-bold text-slate-900 tabular-nums">{kpi.value}</p>
                                <p className="text-[11px] text-slate-500 truncate">{kpi.hint}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl px-5 py-4">
                    <p className="text-xs text-indigo-900">
                        <span className="font-bold">Cómo se calcula.</span> Cada respuesta se convierte a una nota de 0 a 100
                        (las opciones «No aplica» no restan). La nota del proveedor promedia a todas las personas que
                        respondieron, dando más peso a los cargos con mayor incidencia en la relación comercial. Los
                        proveedores con peor calificación aparecen primero.
                    </p>
                </div>

                <VendorSurveyResults companies={companies} />
            </div>
        </div>
    );
}
