import { createClient } from "@/lib/supabase/server";
import { RestoreManager } from "@/features/settings/components/RestoreManager";
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
            <RestoreManager tenantId={tenantId} />
        </div>
    );
}
