import { createClient } from "@/lib/supabase/server";
import { settingsService } from "@/features/settings/services/settingsService";
import { TenantSettingsForm } from "@/features/settings/components/TenantSettingsForm";
import { redirect } from "next/navigation";

export default async function CompanySettingsPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const tenantInfo = await settingsService.getTenantInfo(supabase);

    return (
        <div className="p-8 lg:p-12">
            <TenantSettingsForm initialData={tenantInfo} />
        </div>
    );
}
