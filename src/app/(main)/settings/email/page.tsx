import { createClient } from "@/lib/supabase/server";
import { EmailIntegrationWizard } from "@/features/settings/components/EmailIntegrationWizard";
import { redirect } from "next/navigation";
import { settingsService } from "@/features/settings/services/settingsService";

export default async function EmailSettingsPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    // Get tenant
    const tenants = await settingsService.getUserTenants(supabase, user.id);
    const tenantId = tenants?.[0]?.tenant_id;
    if (!tenantId) redirect("/onboarding");

    // Get current config
    const tenantInfo = await settingsService.getTenantInfo(supabase, tenantId);

    return (
        <div className="p-8 lg:p-12">
            <EmailIntegrationWizard initialData={tenantInfo?.mail_config} tenantId={tenantId} />
        </div>
    );
}
