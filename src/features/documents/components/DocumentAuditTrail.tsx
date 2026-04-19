import { SupabaseClient } from '@supabase/supabase-js';
import { AuditTrail } from '@/shared/components/ui/audit-trail';

export async function DocumentAuditTrail({
    client,
    documentId,
}: {
    client: SupabaseClient;
    documentId: string;
}) {
    return (
        <AuditTrail
            client={client}
            entity="documents"
            entityId={documentId}
            childEntities={[
                { table: 'document_lines', fk: 'document_id' },
                { table: 'electronic_documents', fk: 'document_id' },
            ]}
        />
    );
}
