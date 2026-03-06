import { createClient } from '@/lib/supabase/server';
import { documentService } from '@/features/documents/services/documentService';
import { DocumentDetail } from '@/features/documents/components/DocumentDetail';
import { settingsService } from '@/features/settings/services/settingsService';
import { notFound } from 'next/navigation';

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function DocumentDetailPage({ params }: PageProps) {
    const { id } = await params;
    const supabase = await createClient();

    try {
        const document = await documentService.getDocumentById(supabase, id);
        const relatedDocs = await documentService.getRelatedDocuments(supabase, id, document.parent_id);

        // Fetch tenant info + DIAN resolution for PDF generation
        const tenantInfo = await settingsService.getTenantInfo(supabase);
        let dianResolution = null;
        try {
            const { data: res } = await supabase
                .from('dian_resolutions')
                .select('resolution_number, prefix, from_number, to_number, valid_from, valid_until')
                .eq('doc_type', document.doc_type === 'CREDIT_NOTE' ? 'CREDIT_NOTE' : 'INVOICE')
                .eq('status', 'ACTIVE')
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (res) {
                dianResolution = {
                    resolution_number: res.resolution_number,
                    prefix: res.prefix,
                    start_range: res.from_number,
                    end_range: res.to_number,
                    start_date: res.valid_from,
                    end_date: res.valid_until,
                };
            }
        } catch {
            // No DIAN resolution configured — that's OK
        }

        return (
            <div className="container mx-auto py-6">
                <DocumentDetail
                    document={document}
                    relatedDocuments={relatedDocs}
                    tenantInfo={tenantInfo}
                    dianResolution={dianResolution}
                />
            </div>
        );
    } catch {
        notFound();
    }
}
