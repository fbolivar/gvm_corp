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

        // 2. Para remisiones: asignar número correlativo (REM-00001...)
        let assignedNumber: string | undefined = undefined;
        if (targetType === 'DELIVERY_NOTE') {
            const { data: numData, error: numErr } = await client.rpc(
                'next_delivery_note_number',
                { p_tenant_id: sourceDoc.tenant_id }
            );
            if (numErr) throw numErr;
            assignedNumber = numData as string;
        }

        // 3. Preparar nueva cabecera
        const newDoc: Partial<Document> & { number?: string } = {
            tenant_id: sourceDoc.tenant_id,
            doc_type: targetType,
            number: assignedNumber,
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

        // 3. Preparar y clonar líneas (incluye warehouse_id para FEFO al emitir)
        const newLines = sourceDoc.lines.map((line: any) => {
            const qty = Number(line.qty) || 0;
            const price = Number(line.unit_price) || 0;
            return {
                tenant_id: sourceDoc.tenant_id,
                document_id: createdDoc.id,
                product_id: line.product_id,
                warehouse_id: line.warehouse_id,
                description: line.description,
                qty: line.qty,
                unit_price: line.unit_price,
                // Recalcula line_total por si la línea origen tenía 0
                line_total: line.line_total && Number(line.line_total) > 0 ? line.line_total : qty * price,
                tax_config: line.tax_config
            };
        });

        const { error: linesError } = await client
            .from('document_lines')
            .insert(newLines);

        if (linesError) throw linesError;

        // 4. Opcional: Actualizar estado del original si es necesario
        // Por ahora lo dejamos como está.

        return createdDoc.id;
    },

    /**
     * Duplica un pedido de venta en un NUEVO borrador independiente (mismos ítems),
     * para que el comercial lo ajuste y lo vuelva a confirmar sin re-digitar todo.
     * No enlaza (parent_id) ni copia número/estado/datos de emisión del original.
     */
    async duplicateSalesOrder(client: SupabaseClient, sourceDocId: string): Promise<string> {
        const { data: src, error: fetchError } = await client
            .from('documents')
            .select('*, lines:document_lines(*)')
            .eq('id', sourceDocId)
            .single();
        if (fetchError) throw fetchError;
        if (!src) throw new Error('Pedido no encontrado');
        if (src.doc_type !== 'SALES_ORDER') throw new Error('Solo se pueden duplicar pedidos de venta');

        const newDoc: Record<string, unknown> = {
            tenant_id: src.tenant_id,
            doc_type: 'SALES_ORDER',
            // number: se deja sin asignar → el trigger de numeración pone el nuevo consecutivo
            party_id: src.party_id,
            issue_date: new Date().toISOString().split('T')[0],
            due_date: src.due_date,
            currency: src.currency,
            subtotal: src.subtotal,
            taxes: src.taxes,
            total: src.total,
            status: 'DRAFT',
            notes_public: src.notes_public,
            notes_internal: `Duplicado del pedido ${src.number ?? ''}`.trim(),
            // Solo se incluyen si la columna existe/tiene valor (evita insertar columnas inexistentes)
            ...(src.warehouse_id ? { warehouse_id: src.warehouse_id } : {}),
            ...(src.expected_delivery_date ? { expected_delivery_date: src.expected_delivery_date } : {}),
            ...(src.salesperson_id ? { salesperson_id: src.salesperson_id } : {}),
        };

        const { data: createdDoc, error: insertError } = await client
            .from('documents')
            .insert(newDoc)
            .select()
            .single();
        if (insertError) throw insertError;

        const newLines = (src.lines ?? []).map((line: any) => {
            const qty = Number(line.qty) || 0;
            const price = Number(line.unit_price) || 0;
            return {
                tenant_id: src.tenant_id,
                document_id: createdDoc.id,
                product_id: line.product_id,
                warehouse_id: line.warehouse_id,
                description: line.description,
                qty: line.qty,
                unit_price: line.unit_price,
                line_total: line.line_total && Number(line.line_total) > 0 ? line.line_total : qty * price,
                tax_config: line.tax_config,
            };
        });
        if (newLines.length > 0) {
            const { error: linesError } = await client.from('document_lines').insert(newLines);
            if (linesError) throw linesError;
        }

        return createdDoc.id;
    },
};
