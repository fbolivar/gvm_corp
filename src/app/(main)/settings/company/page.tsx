import { createClient } from "@/lib/supabase/server";
import { settingsService } from "@/features/settings/services/settingsService";
import { TenantSettingsForm } from "@/features/settings/components/TenantSettingsForm";
import { HrSignerCard } from "@/features/settings/components/HrSignerCard";
import { redirect } from "next/navigation";

export default async function CompanySettingsPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const tenantInfo = await settingsService.getTenantInfo(supabase);

    return (
        <div className="p-8 lg:p-12">
            <TenantSettingsForm initialData={tenantInfo} />
            {tenantInfo?.id && (
                <div className="max-w-4xl mx-auto">
                    <HrSignerCard
                        tenantId={tenantInfo.id}
                        initialName={tenantInfo.hr_manager_name ?? null}
                        initialTitle={tenantInfo.hr_manager_title ?? null}
                        initialSignatureUrl={tenantInfo.hr_signature_url ?? null}
                    />
                </div>
            )}
        </div>
    );
}
