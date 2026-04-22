import { createClient } from "@/lib/supabase/server";
import { settingsService, TeamMember, AppRole, AppModule, Zone, RolePermission } from "@/features/settings/services/settingsService";
import { redirect } from "next/navigation";
import { TeamSettingsClientWrapper } from "@/features/settings/components/TeamSettingsClientWrapper";

export default async function TeamSettingsPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    // Get tenant info to pass ID
    const tenant = await settingsService.getTenantInfo(supabase);

    let teamMembers: TeamMember[] = [];
    let roles: AppRole[] = [];
    let modules: AppModule[] = [];
    let zones: Zone[] = [];
    let permissions: RolePermission[] = [];
    let errorStatus: string | null = null;

    if (!tenant) {
        return (
            <div className="p-12 text-center text-slate-500">
                No se encontró información de la organización.
            </div>
        );
    }

    try {
        const [membersRes, rolesRes, modulesRes, zonesRes, permsRes] = await Promise.all([
            settingsService.getTeamMembers(supabase),
            settingsService.getAppRoles(supabase),
            settingsService.getAppModules(supabase),
            settingsService.getZones(supabase),
            settingsService.getRolePermissions(supabase)
        ]);

        teamMembers = membersRes;
        roles = rolesRes;
        modules = modulesRes;
        zones = zonesRes;
        permissions = permsRes;
    } catch (error: any) {
        console.error("Error loading team settings data:", error);
        errorStatus = error.message || "Database connection or migration error";
    }

    if (errorStatus && roles.length === 0) {
        return (
            <div className="p-12 text-center space-y-4">
                <div className="bg-rose-50 border-2 border-rose-200 p-8 rounded-[2rem] max-w-2xl mx-auto shadow-sm">
                    <h3 className="text-xl font-black text-rose-900 uppercase italic">Error de Gobernanza y Base de Datos</h3>
                    <p className="text-rose-600 text-sm font-bold mt-2">
                        No se ha podido inicializar la arquitectura de seguridad. Verifique que la migración de base de datos (`20260226000000_security_governance.sql`) haya sido aplicada correctamente en Supabase.
                    </p>
                    <div className="mt-6">
                        <code className="bg-white/50 px-4 py-2 rounded-xl text-xs font-mono text-rose-700">{errorStatus}</code>
                    </div>
                </div>
            </div>
        );
    }

    // Nombre del admin que está generando reportes (para el footer del PDF)
    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .maybeSingle();
    const generatedBy = profile?.full_name || profile?.email || user.email || 'Admin';

    return (
        <div className="p-8 lg:p-12">
            <TeamSettingsClientWrapper
                initialMembers={teamMembers}
                currentUserId={user.id}
                tenantId={tenant.id}
                tenant={tenant}
                generatedBy={generatedBy}
                roles={roles}
                modules={modules}
                initialZones={zones}
                initialPermissions={permissions}
            />
        </div>
    );
}
