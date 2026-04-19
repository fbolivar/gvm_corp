import { createClient } from '@/lib/supabase/server';
import { crmService } from '@/features/crm/services/crmService';
import { LeadViewManager } from '@/features/crm/components/LeadViewManager';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Plus, Users, Sparkles, Activity, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/shared/components/ui/page-header';

export default async function LeadsPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const leads = await crmService.getLeads(supabase);

    const newLeadsCount = leads.filter(l => l.status === 'NEW').length;
    const conversionRate = leads.length > 0 ? Math.round((leads.filter(l => l.status === 'CONVERTED').length / leads.length) * 100) : 0;

    return (
        <div className="page-container space-y-6 pb-16 animate-in fade-in duration-500">
            <PageHeader
                title="Prospectos"
                description="Pipeline de oportunidades comerciales."
                icon={UserPlus}
                breadcrumbs={[
                    { label: 'Inicio', href: '/dashboard' },
                    { label: 'CRM', href: '/crm' },
                    { label: 'Prospectos' },
                ]}
                actions={
                    <Button asChild className="h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-semibold text-xs gap-2">
                        <Link href="/crm/leads/new">
                            <Plus className="h-4 w-4" />
                            Nuevo prospecto
                        </Link>
                    </Button>
                }
            />

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border border-slate-100 bg-white shadow-sm rounded-2xl">
                    <CardContent className="p-5 space-y-3">
                        <div className="flex justify-between items-start">
                            <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                <Users className="h-5 w-5" />
                            </div>
                            <Badge className="bg-slate-900 text-white border-none font-semibold text-[10px] tracking-wider px-2 py-0.5 rounded-full">Global</Badge>
                        </div>
                        <div>
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Total Leads</p>
                            <h3 className="text-3xl font-bold text-slate-900 tracking-tight leading-none">{leads.length}</h3>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full w-full bg-indigo-500 rounded-full" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-slate-100 bg-white shadow-sm rounded-2xl">
                    <CardContent className="p-5 space-y-3">
                        <div className="flex justify-between items-start">
                            <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                                <Sparkles className="h-5 w-5" />
                            </div>
                            <Badge className="bg-emerald-50 text-emerald-600 border border-emerald-100 font-semibold text-[10px] tracking-wider px-2 py-0.5 rounded-full">Nuevos</Badge>
                        </div>
                        <div>
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Leads Nuevos</p>
                            <h3 className="text-3xl font-bold text-slate-900 tracking-tight leading-none">{newLeadsCount}</h3>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full w-1/4 bg-amber-500 rounded-full" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-slate-100 bg-white shadow-sm rounded-2xl">
                    <CardContent className="p-5 space-y-3">
                        <div className="flex justify-between items-start">
                            <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                                <Activity className="h-5 w-5" />
                            </div>
                            <Badge className="bg-indigo-50 text-indigo-600 border border-indigo-100 font-semibold text-[10px] tracking-wider px-2 py-0.5 rounded-full">Eficiencia</Badge>
                        </div>
                        <div>
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Tasa de Conversión</p>
                            <h3 className="text-3xl font-bold text-slate-900 tracking-tight leading-none">{conversionRate}%</h3>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full w-2/3 bg-emerald-500 rounded-full" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Lead List */}
            <Card className="border border-slate-100 shadow-sm bg-white rounded-2xl overflow-hidden p-4">
                <LeadViewManager leads={leads} />
            </Card>
        </div>
    );
}
