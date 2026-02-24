import { createClient } from "@/lib/supabase/server";
import { settingsService } from "@/features/settings/services/settingsService";
import { TeamSettingsForm } from "@/features/settings/components/TeamSettingsForm";
import { redirect } from "next/navigation";

export default async function TeamSettingsPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    // Get tenant info to pass ID
    const tenant = await settingsService.getTenantInfo(supabase);

    if (!tenant) {
        return (
            <div className="p-12 text-center text-slate-500">
                No se encontró información de la organización.
            </div>
        );
    }

    const teamMembers = await settingsService.getTeamMembers(supabase);

    return (
        <div className="p-8 lg:p-12">
            <TeamSettingsForm
                initialMembers={teamMembers}
                currentUserId={user.id}
                tenantId={tenant.id}
            />
        </div>
    );
}
