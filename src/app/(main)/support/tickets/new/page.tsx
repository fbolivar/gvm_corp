import { createClient } from "@/lib/supabase/server";
import { settingsService } from "@/features/settings/services/settingsService";
import { VisualReportHeader } from "@/features/accounting/components/VisualReportHeader";
import { NewTicketForm } from "@/features/support/components/NewTicketForm";

export default async function NewTicketPage() {
    const supabase = await createClient();

    const [partiesRes, docsRes, productsRes, tenant] = await Promise.all([
        supabase.from('parties').select('id, legal_name').limit(100),
        supabase.from('documents').select('id, number, doc_type').limit(100),
        supabase.from('products').select('id, name').limit(100),
        settingsService.getTenantInfo(supabase)
    ]);

    return (
        <div className="space-y-6 pb-16 animate-in fade-in duration-500">
            <VisualReportHeader
                title="Nueva Solicitud"
                subtitle="Soporte & Experiencia al Cliente"
                tenant={tenant}
            />

            <NewTicketForm
                parties={partiesRes.data || []}
                documents={docsRes.data || []}
                products={productsRes.data || []}
            />
        </div>
    );
}
