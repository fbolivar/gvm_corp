import { ChatInterface } from "@/features/collaboration/components/ChatInterface";
import { ShieldCheck, Zap, Radio } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function CollaborationPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const [{ data: profile }, { data: userTenant }] = await Promise.all([
        supabase
            .from("profiles")
            .select("full_name")
            .eq("id", user.id)
            .maybeSingle(),
        supabase
            .from("user_tenants")
            .select("tenant_id")
            .eq("user_id", user.id)
            .maybeSingle(),
    ]);

    const tenantId = userTenant?.tenant_id;
    if (!tenantId) redirect("/login");

    const userFullName =
        profile?.full_name ||
        user.user_metadata?.full_name ||
        user.email?.split("@")[0] ||
        "Usuario";

    return (
        <div className="space-y-4 md:space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 pb-12">
            {/* PREMIUM HEADER */}
            <div className="relative overflow-hidden bg-slate-950 rounded-2xl md:rounded-[2.5rem] p-5 md:p-10 text-white shadow-active border border-white/5 group">
                {/* Decorators */}
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform duration-1000 hidden md:block">
                    <Radio className="h-64 w-64 text-white" />
                </div>

                <div className="relative z-10 space-y-2 md:space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="h-1.5 w-8 bg-indigo-500 rounded-full" />
                        <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-indigo-400">
                            Comunicacion en Tiempo Real
                        </span>
                    </div>
                    <h1 className="text-xl md:text-3xl font-black tracking-tight uppercase leading-tight">
                        Centro de{' '}
                        <span className="text-slate-500">Colaboracion</span>
                    </h1>
                    <p className="text-slate-500 font-bold text-[9px] uppercase tracking-[0.3em] hidden md:block">
                        Chat corporativo, intercambio de archivos y coordinacion de equipos
                    </p>
                    <div className="flex items-center gap-3 pt-1 md:pt-2">
                        <Badge className="bg-white/5 border border-white/10 text-slate-400 text-[9px] font-black uppercase tracking-[0.3em] px-3 md:px-4 py-1.5 md:py-2 rounded-full">
                            <Zap className="h-3 w-3 mr-1.5 md:mr-2 text-indigo-400" />
                            Realtime
                        </Badge>
                        <Badge className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase tracking-[0.3em] px-3 md:px-4 py-1.5 md:py-2 rounded-full">
                            <ShieldCheck className="h-3 w-3 mr-1.5 md:mr-2" />
                            E2E
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Chat Interface */}
            <ChatInterface userId={user.id} userFullName={userFullName} tenantId={tenantId} />
        </div>
    );
}
