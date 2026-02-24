import { createClient } from "@/lib/supabase/server";
import { settingsService } from "@/features/settings/services/settingsService";
import { AuditLogList } from "@/features/settings/components/AuditLogList";
import { redirect } from "next/navigation";

export default async function AuditLogPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const logs = await settingsService.getAuditLogs(supabase);

    return (
        <div className="p-8 lg:p-12">
            <AuditLogList logs={logs || []} />
        </div>
    );
}
