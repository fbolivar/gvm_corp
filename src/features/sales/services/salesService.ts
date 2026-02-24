import { SupabaseClient } from '@supabase/supabase-js';
import { Document, DocumentType } from '@/features/documents/types';

export const salesService = {
    /**
     * Convierte un documento a otro tipo (ej: Cotización -> Pedido)
     * Clonamos cabecera y líneas, manteniendo parent_id.
     */
    async convertDocument(client: SupabaseClient, sourceDocId: string, targetType: DocumentType) {
        // 1. Obtener documento origen con sus líneas
        const { data: sourceDoc, error: fetchError } = await client
            .from('documents')
            .select('*, lines:document_lines(*)')
            .eq('id', sourceDocId)
            .single();

        if (fetchError) throw fetchError;
        if (!sourceDoc) throw new Error("Documento no encontrado");

        // 2. Preparar nueva cabecera
        const newDoc: Partial<Document> = {
            tenant_id: sourceDoc.tenant_id,
            doc_type: targetType,
            party_id: sourceDoc.party_id,
            issue_date: new Date().toISOString().split('T')[0],
            due_date: sourceDoc.due_date,
            currency: sourceDoc.currency,
            subtotal: sourceDoc.subtotal,
            taxes: sourceDoc.taxes,
            total: sourceDoc.total,
            status: 'DRAFT',
            parent_id: sourceDoc.id,
            notes_internal: `Convertido desde ${sourceDoc.doc_type} #${sourceDoc.number}`,
            notes_public: sourceDoc.notes_public
        };

        const { data: createdDoc, error: insertError } = await client
            .from('documents')
            .insert(newDoc)
            .select()
            .single();

        if (insertError) throw insertError;

        // 3. Preparar y clonar líneas
        const newLines = sourceDoc.lines.map((line: any) => ({
            tenant_id: sourceDoc.tenant_id,
            document_id: createdDoc.id,
            product_id: line.product_id,
            description: line.description,
            qty: line.qty,
            unit_price: line.unit_price,
            line_total: line.line_total,
            tax_config: line.tax_config
        }));

        const { error: linesError } = await client
            .from('document_lines')
            .insert(newLines);

        if (linesError) throw linesError;

        // 4. Opcional: Actualizar estado del original si es necesario
        // Por ahora lo dejamos como está.

        return createdDoc.id;
    }
};
