import { createClient } from "@/lib/supabase/server";
import { BackupManager } from "@/features/settings/components/BackupManager";
import { redirect } from "next/navigation";
import { settingsService } from "@/features/settings/services/settingsService";

export default async function BackupPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const tenants = await settingsService.getUserTenants(supabase, user.id);
    const tenantId = tenants?.[0]?.tenant_id;
    if (!tenantId) redirect("/onboarding");

    return (
        <div className="p-8 lg:p-12">
            <BackupManager tenantId={tenantId} />
        </div>
    );
}
