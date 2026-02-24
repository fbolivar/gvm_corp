import { SupabaseClient } from '@supabase/supabase-js';
import { Document, DocumentType } from '@/features/documents/types';
import { documentService } from '@/features/documents/services/documentService';

export const purchasingService = {
    /**
     * Convierte un documento de compra a otro (ej: Purchase Order -> Vendor Bill)
     * Utiliza documentService para asegurar que se disparen las integraciones de Inventario y Contabilidad.
     */
    async convertDocument(client: SupabaseClient, sourceDocId: string, targetType: DocumentType) {
        // 1. Obtener documento origen con sus líneas
        const { data: sourceDoc, error: fetchError } = await client
            .from('documents')
            .select('*, lines:document_lines(*)')
            .eq('id', sourceDocId)
            .single();

        if (fetchError) throw fetchError;
        if (!sourceDoc) throw new Error("Documento de compra no encontrado");

        // 2. Preparar el nuevo documento
        const newDoc: any = {
            doc_type: targetType,
            party_id: sourceDoc.party_id,
            issue_date: new Date().toISOString().split('T')[0],
            due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            currency: sourceDoc.currency,
            subtotal: sourceDoc.subtotal,
            taxes: sourceDoc.taxes,
            total: sourceDoc.total,
            status: 'DRAFT',
            parent_id: sourceDoc.id,
            notes_internal: `Convertido desde ${sourceDoc.doc_type} #${sourceDoc.number}`,
            notes_public: sourceDoc.notes_public,
            lines: sourceDoc.lines.map((line: any) => ({
                product_id: line.product_id,
                description: line.description,
                qty: line.qty,
                unit_price: line.unit_price,
                line_total: line.line_total,
                tax_config: line.tax_config,
            }))
        };

        // 3. Crear usando documentService para activar integraciones automáticas
        return await documentService.createDocument(client, newDoc);
    },

    /**
     * Marca una Orden de Compra como "Recibida", disparando el movimiento de inventario
     * sin necesidad de generar una factura inmediata.
     */
    async markAsReceived(client: SupabaseClient, docId: string) {
        const doc = await documentService.getDocumentById(client, docId);
        if (doc.doc_type !== 'PURCHASE_ORDER') throw new Error("Solo se pueden recibir Órdenes de Compra");

        // 1. Actualizar estado a ACCEPTED (equivalente a recibida en este flujo)
        const { error: updateError } = await client
            .from('documents')
            .update({ status: 'ACCEPTED' })
            .eq('id', docId);

        if (updateError) throw updateError;

        // 2. Disparar Movimiento de Inventario IN
        const { inventoryService } = await import('@/features/inventory/services/inventoryService');
        const warehouses = await inventoryService.getWarehouses(client);
        const defaultWarehouseId = warehouses.length > 0 ? warehouses[0].id : null;

        if (defaultWarehouseId && doc.lines) {
            for (const line of doc.lines) {
                if (line.product_id) {
                    await inventoryService.createMovement(client, {
                        warehouse_id: defaultWarehouseId,
                        product_id: line.product_id,
                        type: 'IN',
                        qty: line.qty,
                        cost: line.unit_price,
                        ref_doc_type: 'PURCHASE_ORDER',
                        ref_doc_id: doc.id!,
                        occurred_at: new Date().toISOString()
                    });
                }
            }
        }

        return { success: true };
    },

    /**
     * Obtiene métricas de desempeño para un conjunto de proveedores.
     */
    async getVendorMetrics(client: SupabaseClient, partyIds: string[]) {
        if (partyIds.length === 0) return [];

        // 1. Obtener volumen de compra y facturas pendientes
        const { data: billsData } = await client
            .from('documents')
            .select('party_id, total, status, doc_type')
            .in('party_id', partyIds)
            .in('doc_type', ['PURCHASE_ORDER', 'VENDOR_BILL']);

        // 2. Obtener movimientos de inventario para calcular lead time
        const { data: movementsData } = await client
            .from('inventory_movements')
            .select(`
                ref_doc_id,
                occurred_at,
                documents!inner(party_id, issue_date)
            `)
            .eq('ref_doc_type', 'PURCHASE_ORDER')
            .in('documents.party_id', partyIds);

        const metrics: Record<string, any> = {};

        partyIds.forEach(id => {
            metrics[id] = {
                party_id: id,
                total_purchased: 0,
                pending_bills_amount: 0,
                completed_orders: 0,
                lead_times: [] as number[],
                total_orders: 0
            };
        });

        billsData?.forEach(doc => {
            const m = metrics[doc.party_id];
            if (!m) return;

            if (doc.doc_type === 'PURCHASE_ORDER') {
                m.total_orders++;
                if (doc.status === 'ACCEPTED') m.completed_orders++;
            }

            if (doc.doc_type === 'VENDOR_BILL') {
                m.total_purchased += Number(doc.total) || 0;
                if (doc.status === 'SENT' || doc.status === 'DRAFT') {
                    m.pending_bills_amount += Number(doc.total) || 0;
                }
            }
        });

        movementsData?.forEach((mov: any) => {
            const m = metrics[mov.documents.party_id];
            if (!m) return;

            const issueDate = new Date(mov.documents.issue_date).getTime();
            const arrivalDate = new Date(mov.occurred_at).getTime();
            const diffDays = (arrivalDate - issueDate) / (1000 * 60 * 60 * 24);
            if (diffDays >= 0) m.lead_times.push(diffDays);
        });

        return partyIds.map(id => {
            const m = metrics[id];
            const avgLead = m.lead_times.length > 0
                ? m.lead_times.reduce((a: number, b: number) => a + b, 0) / m.lead_times.length
                : 0;

            const reliability = m.total_orders > 0
                ? (m.completed_orders / m.total_orders) * 100
                : 100;

            return {
                party_id: id,
                total_purchased: m.total_purchased,
                pending_bills_amount: m.pending_bills_amount,
                completed_orders: m.completed_orders,
                avg_lead_time_days: Math.round(avgLead * 10) / 10,
                reliability_score: Math.round(reliability)
            };
        });
    },

    /**
     * Aprueba una factura de proveedor (Auditoría).
     */
    async approveVendorBill(client: SupabaseClient, docId: string) {
        const { error } = await client
            .from('documents')
            .update({ status: 'SENT' })
            .eq('id', docId)
            .eq('doc_type', 'VENDOR_BILL');

        if (error) throw error;
        return { success: true };
    }
};
