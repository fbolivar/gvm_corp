import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ClipboardList, Building2, CalendarDays, UserRound, Plus } from 'lucide-react';

import { createClient } from '@/lib/supabase/server';
import { vendorSurveyService } from '@/features/purchasing/services/vendorSurveyService';
import { ScorePill } from '@/features/purchasing/components/VendorSurveyResults';
import {
    VENDOR_SURVEY_SECTIONS,
    VENDOR_SURVEY_QUESTIONS,
    VENDOR_TENURE_OPTIONS,
    VENDOR_STRENGTH_OPTIONS,
    VENDOR_IMPROVEMENT_OPTIONS,
    VENDOR_ROLE_WEIGHT_OPTIONS,
} from '@/features/purchasing/types/vendorSurvey';
import { PageHeader } from '@/shared/components/ui/page-header';
import { Button } from '@/shared/components/ui/button';

export const metadata = { title: 'Encuesta a proveedor — GVM Corp' };

interface PageProps {
    params: Promise<{ id: string }>;
}

/** Etiqueta legible de una respuesta guardada como código. */
function answerLabel(questionId: string, value: unknown): string {
    const q = VENDOR_SURVEY_QUESTIONS.find(x => x.id === questionId);
    return q?.options.find(o => o.value === value)?.label ?? '—';
}

export default async function VendorSurveyDetailPage({ params }: PageProps) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { id } = await params;
    const survey = await vendorSurveyService.getSurveyById(supabase, id);
    if (!survey) notFound();

    const row = survey as unknown as Record<string, unknown>;
    const weight = VENDOR_ROLE_WEIGHT_OPTIONS.find(o => o.value === Number(survey.role_weight));
    const tenure = VENDOR_TENURE_OPTIONS.find(o => o.value === survey.tenure)?.label ?? '—';
    const strength = survey.main_strength === 'OTRO'
        ? survey.main_strength_other || 'Otro'
        : VENDOR_STRENGTH_OPTIONS.find(o => o.value === survey.main_strength)?.label ?? '—';
    const improvement = survey.improvement_area === 'OTRO'
        ? survey.improvement_other || 'Otro'
        : VENDOR_IMPROVEMENT_OPTIONS.find(o => o.value === survey.improvement_area)?.label ?? '—';

    const sectionScore: Record<string, number | null> = {
        RELATIONSHIP: survey.score_relationship,
        ORDERS_PAYMENTS: survey.score_orders_payments,
        COMMERCIAL: survey.score_commercial,
        GENERAL: null,
    };

    return (
        <div className="page-container">
            <div className="space-y-6 pb-16 animate-in fade-in duration-500 max-w-4xl">
                <PageHeader
                    title={survey.respondent_name}
                    description={`${survey.respondent_role} · ${survey.party?.legal_name ?? 'Proveedor'}`}
                    icon={ClipboardList}
                    breadcrumbs={[
                        { label: 'Inicio', href: '/dashboard' },
                        { label: 'Compras', href: '/purchasing/orders' },
                        { label: 'Encuestas a proveedores', href: '/purchasing/vendor-surveys' },
                        { label: 'Detalle' },
                    ]}
                    actions={
                        <Button variant="outline" asChild className="h-11 px-4 rounded-xl text-xs font-semibold gap-2">
                            <Link href={`/purchasing/vendor-surveys/new?party_id=${survey.party_id}`}>
                                <Plus className="h-3.5 w-3.5" /> Encuestar a otra persona
                            </Link>
                        </Button>
                    }
                />

                {/* Resumen */}
                <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 space-y-5">
                    <div className="flex flex-wrap items-center gap-3">
                        <ScorePill score={survey.overall_score} />
                        <span className="text-xs text-slate-500">
                            CSAT <span className="font-bold text-slate-800">{survey.csat}/10</span>
                        </span>
                        <span className="text-xs text-slate-500">
                            Recomendación (NPS) <span className="font-bold text-slate-800">{survey.nps}/10</span>
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                        <div className="flex items-start gap-2">
                            <Building2 className="h-4 w-4 text-slate-400 mt-0.5" />
                            <div>
                                <p className="text-[10px] font-semibold text-slate-400 uppercase">Proveedor</p>
                                <p className="font-semibold text-slate-800">{survey.party?.legal_name ?? '—'}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-2">
                            <UserRound className="h-4 w-4 text-slate-400 mt-0.5" />
                            <div>
                                <p className="text-[10px] font-semibold text-slate-400 uppercase">Peso del cargo</p>
                                <p className="font-semibold text-slate-800">{weight?.label ?? survey.role_weight}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-2">
                            <CalendarDays className="h-4 w-4 text-slate-400 mt-0.5" />
                            <div>
                                <p className="text-[10px] font-semibold text-slate-400 uppercase">Fecha</p>
                                <p className="font-semibold text-slate-800">{survey.survey_date}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-2">
                            <ClipboardList className="h-4 w-4 text-slate-400 mt-0.5" />
                            <div>
                                <p className="text-[10px] font-semibold text-slate-400 uppercase">Antigüedad</p>
                                <p className="font-semibold text-slate-800">{tenure}</p>
                                {survey.author?.full_name && (
                                    <p className="text-[11px] text-slate-500 mt-1">
                                        Registrada por {survey.author.full_name}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Respuestas por sección */}
                {VENDOR_SURVEY_SECTIONS.map(section => {
                    const questions = VENDOR_SURVEY_QUESTIONS.filter(q => q.section === section.id);
                    if (questions.length === 0) return null;
                    const score = sectionScore[section.id];
                    return (
                        <section key={section.id} className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                            <header className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3">
                                <h2 className="text-sm font-bold text-slate-900">{section.title}</h2>
                                {score !== null && <ScorePill score={score} />}
                            </header>
                            <div className="divide-y divide-slate-50">
                                {questions.map(q => (
                                    <div key={q.id} className="px-6 py-4 flex flex-wrap items-baseline justify-between gap-3">
                                        <p className="text-xs text-slate-600 flex-1 min-w-[240px]">{q.label}</p>
                                        <p className="text-sm font-bold text-slate-900">{answerLabel(q.id, row[q.id])}</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    );
                })}

                {/* Cualitativo */}
                <section className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                    <header className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                        <h2 className="text-sm font-bold text-slate-900">Fortalezas y mejoras</h2>
                    </header>
                    <div className="p-6 space-y-4 text-sm">
                        <div>
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Principal fortaleza de GVM</p>
                            <p className="font-semibold text-emerald-700">{strength}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Principal aspecto a mejorar</p>
                            <p className="font-semibold text-amber-700">{improvement}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Recomendación del proveedor</p>
                            <p className="text-slate-700 italic">{survey.recommendation || 'Sin comentarios.'}</p>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
