import { createClient } from "@/lib/supabase/server";
import { BackupCenter } from "@/features/settings/components/BackupCenter";
import { redirect } from "next/navigation";
import { settingsService } from "@/features/settings/services/settingsService";

export default async function RestorePage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const tenants = await settingsService.getUserTenants(supabase, user.id);
    const tenantId = tenants?.[0]?.tenant_id;
    if (!tenantId) redirect("/onboarding");

    return (
        <div className="p-8 lg:p-12">
            <BackupCenter tenantId={tenantId} initialTab="restore" />
        </div>
    );
}
