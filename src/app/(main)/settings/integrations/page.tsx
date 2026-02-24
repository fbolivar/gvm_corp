import { createClient } from "@/lib/supabase/server";
import { settingsService } from "@/features/settings/services/settingsService";
import { DianSettingsForm } from "@/features/settings/components/DianSettingsForm";
import { redirect } from "next/navigation";

export default async function IntegrationsPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    try {
        const tenantInfo = await settingsService.getTenantInfo(supabase);
        if (!tenantInfo) {
            return <div className="p-12 text-center text-slate-500 font-bold uppercase tracking-widest italic border-2 border-dashed border-slate-100 rounded-[3rem] m-8">
                <p>No se encontró información de la organización.</p>
                <p className="text-[9px] mt-2 opacity-50 font-medium">Verifique que su usuario tenga una empresa asignada.</p>
            </div>;
        }
        const dianConfig = await settingsService.getDianConfig(supabase);

        return (
            <div className="p-8 lg:p-12">
                <DianSettingsForm initialData={dianConfig} tenantId={tenantInfo.id} />
            </div>
        );
    } catch (error: any) {
        console.error('Page Error:', error);
        return (
            <div className="m-8 p-12 bg-rose-50 border-2 border-rose-100 rounded-[3rem] text-rose-600 space-y-4">
                <h2 className="text-xl font-black italic tracking-tight">Error de Carga</h2>
                <p className="text-sm font-medium">Hubo un problema al cargar la configuración. Por favor, intente de nuevo.</p>
                <code className="block p-4 bg-white/50 rounded-2xl text-[10px] whitespace-pre-wrap">{JSON.stringify(error, null, 2)}</code>
            </div>
        );
    }
}
