import { createClient } from '@/lib/supabase/server';
import { crmService } from '@/features/crm/services/crmService';
import { OpportunityStageButtons } from '@/features/crm/components/OpportunityStageButtons';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import {
    Target, Building2, Calendar, DollarSign, Percent,
    ArrowLeft, Users, Mail, Phone, CheckCircle2, Clock
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';

const STAGE_META: Record<string, { label: string; color: string; bg: string; order: number }> = {
    PROSPECTING:  { label: 'Prospección',   color: 'text-slate-600',   bg: 'bg-slate-100',   order: 0 },
    QUALIFICATION:{ label: 'Calificación',  color: 'text-indigo-600',  bg: 'bg-indigo-100',  order: 1 },
    PROPOSAL:     { label: 'Propuesta',     color: 'text-violet-600',  bg: 'bg-violet-100',  order: 2 },
    NEGOTIATION:  { label: 'Negociación',   color: 'text-amber-600',   bg: 'bg-amber-100',   order: 3 },
    CLOSED_WON:   { label: 'Ganado',        color: 'text-emerald-600', bg: 'bg-emerald-100', order: 4 },
    CLOSED_LOST:  { label: 'Perdido',       color: 'text-rose-600',    bg: 'bg-rose-100',    order: -1 },
};

const LINEAR_STAGES = ['PROSPECTING', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON'];

export default async function OpportunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    let opp: any;
    try {
        opp = await crmService.getOpportunityById(supabase, id);
    } catch {
        notFound();
    }

    const meta = STAGE_META[opp.stage] || STAGE_META.PROSPECTING;
    const currentIdx = LINEAR_STAGES.indexOf(opp.stage);
    const isLost = opp.stage === 'CLOSED_LOST';
    const isWon = opp.stage === 'CLOSED_WON';

    const lead = opp.leads;
    const party = opp.parties;

    const fmt = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

    return (
        <div className="page-container space-y-10 pb-24 animate-in fade-in slide-in-from-bottom-6 duration-700">

            {/* HEADER */}
            <div className={cn(
                "relative overflow-hidden rounded-[3.5rem] p-10 md:p-14 text-white shadow-active",
                isWon ? "bg-emerald-900" : isLost ? "bg-rose-900" : "bg-slate-900"
            )}>
                <div className="absolute top-0 right-0 p-10 opacity-[0.04] pointer-events-none">
                    <Target className="h-56 w-56" />
                </div>

                <div className="relative z-10 space-y-8">
                    <div className="flex items-center gap-4">
                        <Button asChild variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-white/40 hover:text-white hover:bg-white/10">
                            <Link href="/crm/pipeline"><ArrowLeft className="h-5 w-5" /></Link>
                        </Button>
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30">Pipeline CRM</span>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                        <div className="space-y-3">
                            <Badge className={cn("border-none font-black text-[10px] tracking-widest px-4 py-1.5 rounded-full", meta.bg, meta.color)}>
                                {meta.label}
                            </Badge>
                            <h1 className="text-3xl md:text-4xl font-black tracking-tight uppercase leading-tight">
                                {opp.name}
                            </h1>
                            {party && (
                                <p className="text-white/40 font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
                                    <Building2 className="h-3.5 w-3.5" />
                                    {party.trade_name || party.legal_name}
                                </p>
                            )}
                        </div>

                        <div className="flex flex-col items-end gap-2">
                            <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Valor del Negocio</span>
                            <span className="text-4xl font-black italic tracking-tighter">{fmt(opp.value || 0)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* STAGE TRACKER */}
            {!isLost && (
                <div className="bg-white rounded-[2.5rem] p-8 shadow-premium border border-slate-50">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em] mb-6">Progreso del Pipeline</p>
                    <div className="flex items-center gap-0">
                        {LINEAR_STAGES.map((stage, i) => {
                            const m = STAGE_META[stage];
                            const done = currentIdx > i;
                            const active = currentIdx === i;
                            return (
                                <div key={stage} className="flex items-center flex-1">
                                    <div className={cn(
                                        "flex flex-col items-center gap-2 flex-1",
                                    )}>
                                        <div className={cn(
                                            "h-10 w-10 rounded-full flex items-center justify-center transition-all",
                                            done ? "bg-indigo-600 text-white shadow-active" :
                                            active ? "bg-slate-900 text-white shadow-active scale-110" :
                                            "bg-slate-100 text-slate-400"
                                        )}>
                                            {done ? <CheckCircle2 className="h-4 w-4" /> : <span className="text-xs font-black">{i + 1}</span>}
                                        </div>
                                        <span className={cn(
                                            "text-[9px] font-black uppercase tracking-wider text-center",
                                            active ? "text-slate-900" : done ? "text-indigo-500" : "text-slate-300"
                                        )}>{m.label}</span>
                                    </div>
                                    {i < LINEAR_STAGES.length - 1 && (
                                        <div className={cn("h-0.5 flex-1 mx-1 -mt-6 rounded-full transition-all", done || active ? "bg-indigo-200" : "bg-slate-100")} />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* KPI CARDS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="bg-white rounded-[2.5rem] p-8 shadow-premium border border-slate-50 space-y-3">
                    <div className="h-12 w-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                        <DollarSign className="h-6 w-6" />
                    </div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Valor</p>
                    <p className="text-2xl font-black text-slate-900 italic tracking-tighter">{fmt(opp.value || 0)}</p>
                </div>

                <div className="bg-white rounded-[2.5rem] p-8 shadow-premium border border-slate-50 space-y-3">
                    <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center",
                        opp.probability >= 80 ? "bg-emerald-50 text-emerald-600" :
                        opp.probability >= 50 ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-400"
                    )}>
                        <Percent className="h-6 w-6" />
                    </div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Probabilidad</p>
                    <p className="text-2xl font-black text-slate-900 italic tracking-tighter">{opp.probability}%</p>
                </div>

                <div className="bg-white rounded-[2.5rem] p-8 shadow-premium border border-slate-50 space-y-3">
                    <div className="h-12 w-12 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600">
                        <DollarSign className="h-6 w-6" />
                    </div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Pronóstico</p>
                    <p className="text-2xl font-black text-slate-900 italic tracking-tighter">
                        {fmt((opp.value || 0) * ((opp.probability || 0) / 100))}
                    </p>
                </div>

                <div className="bg-white rounded-[2.5rem] p-8 shadow-premium border border-slate-50 space-y-3">
                    <div className="h-12 w-12 rounded-xl bg-rose-50 flex items-center justify-center text-rose-400">
                        <Calendar className="h-6 w-6" />
                    </div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cierre Estimado</p>
                    <p className="text-lg font-black text-slate-900 italic tracking-tighter">
                        {opp.expected_close_date
                            ? new Date(opp.expected_close_date).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
                            : '—'}
                    </p>
                </div>
            </div>

            {/* DETAILS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                {/* Lead Info */}
                {lead && (
                    <div className="bg-white rounded-[2.5rem] p-8 shadow-premium border border-slate-50 space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="h-1 w-5 bg-amber-400 rounded-full" />
                            <h3 className="text-sm font-black italic uppercase tracking-tight text-slate-900">Lead Origen</h3>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500">
                                    <Users className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="font-black text-slate-900 text-sm">{lead.name}</p>
                                    {lead.company_name && <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{lead.company_name}</p>}
                                </div>
                            </div>
                            {lead.email && (
                                <div className="flex items-center gap-3 text-slate-500">
                                    <Mail className="h-4 w-4" />
                                    <span className="text-sm font-medium">{lead.email}</span>
                                </div>
                            )}
                            {lead.phone && (
                                <div className="flex items-center gap-3 text-slate-500">
                                    <Phone className="h-4 w-4" />
                                    <span className="text-sm font-medium">{lead.phone}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Party Info */}
                {party && (
                    <div className="bg-white rounded-[2.5rem] p-8 shadow-premium border border-slate-50 space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="h-1 w-5 bg-indigo-500 rounded-full" />
                            <h3 className="text-sm font-black italic uppercase tracking-tight text-slate-900">Cliente Asociado</h3>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                                    <Building2 className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="font-black text-slate-900 text-sm">{party.legal_name}</p>
                                    {party.trade_name && <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{party.trade_name}</p>}
                                </div>
                            </div>
                            {party.email && (
                                <div className="flex items-center gap-3 text-slate-500">
                                    <Mail className="h-4 w-4" />
                                    <span className="text-sm font-medium">{party.email}</span>
                                </div>
                            )}
                            {party.phone && (
                                <div className="flex items-center gap-3 text-slate-500">
                                    <Phone className="h-4 w-4" />
                                    <span className="text-sm font-medium">{party.phone}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Description */}
                {opp.description && (
                    <div className={cn("bg-white rounded-[2.5rem] p-8 shadow-premium border border-slate-50 space-y-4", !lead && !party && "md:col-span-2")}>
                        <div className="flex items-center gap-3">
                            <div className="h-1 w-5 bg-slate-300 rounded-full" />
                            <h3 className="text-sm font-black italic uppercase tracking-tight text-slate-900">Descripción</h3>
                        </div>
                        <p className="text-slate-600 text-sm leading-relaxed font-medium">{opp.description}</p>
                    </div>
                )}
            </div>

            {/* STAGE ACTIONS */}
            <div className="bg-slate-50 rounded-[2.5rem] p-8 border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-white flex items-center justify-center text-slate-400 shadow-premium border border-slate-100">
                        <Clock className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="font-black text-slate-900 text-sm uppercase italic tracking-tight">Actualizar Etapa</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                            Creado: {new Date(opp.created_at).toLocaleDateString('es-CO')}
                        </p>
                    </div>
                </div>
                <OpportunityStageButtons opportunityId={opp.id} currentStage={opp.stage} />
            </div>
        </div>
    );
}
