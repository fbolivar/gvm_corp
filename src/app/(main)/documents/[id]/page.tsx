import { createClient } from '@/lib/supabase/server';
import { documentService } from '@/features/documents/services/documentService';
import { DocumentDetail } from '@/features/documents/components/DocumentDetail';
import { DocumentAuditTrail } from '@/features/documents/components/DocumentAuditTrail';
import { DocumentQuickNav, type QuickNavSibling } from '@/features/documents/components/DocumentQuickNav';
import { settingsService } from '@/features/settings/services/settingsService';
import { notFound } from 'next/navigation';

const DOC_TYPE_LABELS: Record<string, string> = {
    INVOICE: 'Facturas', CREDIT_NOTE: 'Notas crédito', DEBIT_NOTE: 'Notas débito',
    QUOTATION: 'Cotizaciones', SALES_ORDER: 'Pedidos', DELIVERY_NOTE: 'Remisiones',
    PURCHASE_ORDER: 'Órdenes de compra', VENDOR_BILL: 'Facturas de compra',
    RECEIPT: 'Recibos', DOC_SUPPORT: 'Documentos soporte',
};

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function DocumentDetailPage({ params }: PageProps) {
    const { id } = await params;
    const supabase = await createClient();

    try {
        const document = await documentService.getDocumentById(supabase, id);
        const relatedDocs = await documentService.getRelatedDocuments(supabase, id, document.parent_id);

        // Documentos del mismo tipo para navegación rápida (anterior/siguiente/saltar)
        const { data: siblingRows } = await supabase
            .from('documents')
            .select('id, number, party:parties(legal_name)')
            .eq('doc_type', document.doc_type)
            .order('created_at', { ascending: false })
            .limit(500);
        const siblings: QuickNavSibling[] = (siblingRows || []).map((r) => {
            const p = (r as { party?: { legal_name?: string } | { legal_name?: string }[] | null }).party;
            const party = (Array.isArray(p) ? p[0]?.legal_name : p?.legal_name) || 'Consumidor Final';
            return { id: r.id as string, number: (r.number as string) ?? null, party };
        });

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
            <div className="container mx-auto py-6 space-y-6">
                {siblings.length > 1 && (
                    <DocumentQuickNav
                        currentId={id}
                        typeLabel={DOC_TYPE_LABELS[document.doc_type] || 'Documentos'}
                        siblings={siblings}
                    />
                )}
                <DocumentDetail
                    document={document}
                    relatedDocuments={relatedDocs}
                    tenantInfo={tenantInfo}
                    dianResolution={dianResolution}
                />
                <DocumentAuditTrail client={supabase} documentId={id} />
            </div>
        );
    } catch {
        notFound();
    }
}
