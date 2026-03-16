import { createClient } from "@/lib/supabase/server"
import { crmService } from "@/features/crm/services/crmService"
import { partyService } from "@/features/parties/services/partyService"
import { OpportunityForm } from "@/features/crm/components/OpportunityForm"
import { updateOpportunityAction } from "@/features/crm/actions"
import { redirect, notFound } from "next/navigation"
import { Edit3, Sparkles, Activity } from "lucide-react"
import Link from "next/link"
import { Button } from "@/shared/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default async function EditOpportunityPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    let opp: Record<string, unknown>;
    try {
        opp = await crmService.getOpportunityById(supabase, id) as Record<string, unknown>;
    } catch {
        notFound();
    }

    const [leads, parties] = await Promise.all([
        crmService.getLeads(supabase),
        partyService.getParties(supabase, { role: 'all', page: 1, per_page: 100 })
    ]);

    const handleUpdate = async (data: Record<string, unknown>) => {
        "use server"
        return updateOpportunityAction(id, data);
    };

    return (
        <div className="space-y-16 pb-32 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            {/* HEADER */}
            <div className="relative group overflow-hidden bg-slate-950 rounded-[2.5rem] p-10 text-white shadow-active border border-white/5 mx-6 mt-6">
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none group-hover:scale-125 transition-all">
                    <Edit3 className="h-[20rem] w-[20rem] text-amber-500" />
                </div>

                <div className="relative z-10 space-y-8">
                    <div className="flex items-center gap-4">
                        <Button asChild variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-white/40 hover:text-white hover:bg-white/10">
                            <Link href={`/crm/opportunities/${id}`}><ArrowLeft className="h-5 w-5" /></Link>
                        </Button>
                        <div className="flex flex-col">
                            <span className="text-[11px] font-black uppercase tracking-[0.6em] text-amber-500 italic">Editar Oportunidad</span>
                            <div className="h-1 w-20 bg-amber-500/40 rounded-full mt-2" />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h1 className="text-3xl md:text-4xl font-black tracking-tight uppercase leading-tight mb-4">
                            {String(opp.name)}
                        </h1>
                        <p className="text-white/40 text-sm font-black uppercase tracking-[0.4em] flex items-center gap-4">
                            <Activity className="h-6 w-6 text-amber-500 animate-pulse" />
                            Modificar datos del negocio
                        </p>
                    </div>
                </div>
            </div>

            <div className="px-6">
                <OpportunityForm
                    onSubmit={handleUpdate}
                    redirectTo={`/crm/opportunities/${id}`}
                    initialData={{
                        name: String(opp.name || ''),
                        value: Number(opp.value) || 0,
                        probability: Number(opp.probability) || 10,
                        expected_close_date: opp.expected_close_date ? String(opp.expected_close_date) : '',
                        lead_id: opp.lead_id ? String(opp.lead_id) : null,
                        party_id: opp.party_id ? String(opp.party_id) : null,
                        notes: opp.description ? String(opp.description) : '',
                    }}
                    leads={leads}
                    parties={parties.data || []}
                />
            </div>
        </div>
    )
}
