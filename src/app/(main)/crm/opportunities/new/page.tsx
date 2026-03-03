
import { createClient } from "@/lib/supabase/server"
import { crmService } from "@/features/crm/services/crmService"
import { partyService } from "@/features/parties/services/partyService"
import { OpportunityForm } from "@/features/crm/components/OpportunityForm"
import { createOpportunityAction } from "@/features/crm/actions"
import { redirect } from "next/navigation"
import { Target, Sparkles, Activity } from "lucide-react"

export default async function NewOpportunityPage() {
    const supabase = await createClient();

    const [leads, parties] = await Promise.all([
        crmService.getLeads(supabase),
        partyService.getParties(supabase, { role: 'all', page: 1, per_page: 100 })
    ]);

    const handleCreate = async (data: any) => {
        "use server"
        const result = await createOpportunityAction(data);
        if (!result.error) {
            redirect('/crm/pipeline');
        }
    };

    return (
        <div className="space-y-16 pb-32 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            {/* 🛡️ PREMIUM HEADER */}
            <div className="relative group overflow-hidden bg-slate-950 rounded-[2.5rem] p-10 text-white shadow-active border border-white/5 mx-6 mt-6">
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none group-hover:scale-125 transition-all">
                    <Target className="h-[20rem] w-[20rem] text-indigo-500" />
                </div>

                <div className="relative z-10 space-y-8">
                    <div className="flex items-center gap-6">
                        <div className="h-14 w-14 bg-indigo-500 rounded-[1.5rem] flex items-center justify-center text-slate-950 shadow-active rotate-6">
                            <Sparkles className="h-8 w-8" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[11px] font-black uppercase tracking-[0.6em] text-indigo-500 italic">CRM Master Terminal</span>
                            <div className="h-1 w-20 bg-indigo-500/40 rounded-full mt-2" />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h1 className="text-3xl md:text-4xl font-black tracking-tight uppercase leading-tight mb-4">
                            Nueva <br /><span className="text-slate-600">Oportunidad</span>
                        </h1>
                        <p className="text-white/40 text-sm font-black uppercase tracking-[0.4em] flex items-center gap-4">
                            <Activity className="h-6 w-6 text-indigo-500 animate-pulse" />
                            Apertura de Negocio en Pipeline Industrial
                        </p>
                    </div>
                </div>
            </div>

            <div className="px-6">
                <OpportunityForm
                    onSubmit={handleCreate}
                    leads={leads}
                    parties={parties.data || []}
                />
            </div>
        </div>
    )
}
