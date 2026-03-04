import { SupabaseClient } from '@supabase/supabase-js';
import { Document, DocumentFilters, DocumentLine } from '../types';

export const documentService = {
    async getDocuments(client: SupabaseClient, filters: DocumentFilters) {
        let query = client.from('documents').select('*, party:parties(legal_name, doc_number)', { count: 'exact' });

        if (filters.search) {
            // Search by number or party name
            // Requires embedding or separate search, simplistic for now
            query = query.ilike('number', `%${filters.search}%`);
        }

        if (filters.type) {
            query = query.eq('doc_type', filters.type);
        }

        if (filters.status) {
            query = query.eq('status', filters.status);
        }

        const from = (filters.page - 1) * filters.per_page;
        const to = from + filters.per_page - 1;

        const { data, error, count } = await query
            .range(from, to)
            .order('created_at', { ascending: false });

        if (error) { console.error('[documents] getDocuments:', error.message); return { data: [] as Document[], count: 0 }; }
        return { data: data as Document[], count };
    },

    async getDocumentById(client: SupabaseClient, id: string) {
        const { data, error } = await client
            .from('documents')
            .select('*, lines:document_lines(*), party:parties(*), electronic_document:electronic_documents(*)')
            .eq('id', id)
            .single();

        if (error) throw error;
        // Supabase returns array for 1:Many relation even if single() is used on parent, 
        // but 'electronic_documents' is 1:1 usually. However, if defined as O2M in DB, it might return array.
        // Assuming 1:1 or taking first.
        const doc = data as any;
        if (Array.isArray(doc.electronic_document)) {
            doc.electronic_document = doc.electronic_document[0] || null;
        }

        return doc as Document;
    },

    async getRelatedDocuments(client: SupabaseClient, id: string, parentId?: string | null) {
        // Fetch original document if this is a child
        let parent = null;
        if (parentId && parentId !== '') {
            const { data, error } = await client
                .from('documents')
                .select('id, number, doc_type')
                .eq('id', parentId)
                .maybeSingle(); // Use maybeSingle to avoid error if not found

            if (!error && data) {
                parent = data;
            }
        }

        // Fetch children (documents that have this as parent)
        const { data: children, error: childrenError } = await client
            .from('documents')
            .select('id, number, doc_type')
            .eq('parent_id', id);

        if (childrenError) console.error("Error fetching related children", childrenError);

        return {
            parent: parent as { id: string; number: string; doc_type: string } | null,
            children: (children || []) as { id: string; number: string; doc_type: string }[]
        };
    },

    async createDocument(client: SupabaseClient, document: Document & { lines: DocumentLine[] }) {
        // 1. Insert Header
        // We explicitly exclude 'lines' and 'party' from the insert payload to avoid errors
        const { lines, party, id, ...headerData } = document;

        const { data: newDoc, error: headerError } = await client
            .from('documents')
            .insert(headerData)
            .select()
            .single();

        if (headerError) throw headerError;

        if (lines && lines.length > 0) {
            const linesWithDocId = lines.map(line => ({
                ...line,
                document_id: newDoc.id,
                // Check if tax_config is present, else null
                tax_config: line.tax_config || null
            }));

            const { error: linesError } = await client
                .from('document_lines')
                .insert(linesWithDocId);

            if (linesError) {
                // In a real app we would rollback header here manually since no transaction
                console.error("Error creating lines", linesError);
                throw linesError;
            }
        }

        // INTEGRATION: Inventory
        // Move stock based on document type
        // INVOICE -> OUT
        // VENDOR_BILL -> IN
        try {
            if (['INVOICE', 'VENDOR_BILL', 'RECEIPT'].includes(headerData.doc_type) && lines && lines.length > 0) {
                const { inventoryService } = await import('@/features/inventory/services/inventoryService');

                // Get Default Warehouse (MVP: Pick first one)
                // In future, Document should have warehouse_id or Line should have it.
                const warehouses = await inventoryService.getWarehouses(client);
                const defaultWarehouseId = warehouses.length > 0 ? warehouses[0].id : null;

                if (defaultWarehouseId) {
                    const movementType = (headerData.doc_type === 'INVOICE') ? 'OUT' : 'IN'; // VENDOR_BILL/RECEIPT -> IN

                    for (const line of lines) {
                        if (line.product_id) {
                            let movementCost = line.unit_price;

                            if (movementType === 'OUT') {
                                // For sales, use current average cost to record COGS
                                try {
                                    movementCost = await inventoryService.getAvgCost(client, line.product_id, defaultWarehouseId);
                                } catch (costErr) {
                                    console.error("Error fetching avg cost, fallback to unit_price", costErr);
                                }
                            }

                            await inventoryService.createMovement(client, {
                                warehouse_id: defaultWarehouseId,
                                product_id: line.product_id,
                                type: movementType, // 'IN' | 'OUT'
                                qty: line.qty,
                                cost: movementCost,
                                ref_doc_type: headerData.doc_type,
                                ref_doc_id: newDoc.id,
                                occurred_at: newDoc.issue_date || new Date().toISOString()
                            });
                        }
                    }
                } else {
                    console.warn("Inventory Integration Skipped: No default warehouse found.");
                }
            }
        } catch (invError) {
            console.error("Failed to process inventory movement", invError);
            // Non-blocking
        }

        // INTEGRATION: Accounting
        // Fire and forget? or await? Ideally within the same transaction but Supabase client doesn't support easy transactions across calls.
        // We will await it to ensure consistency for now, or log error if fails but don't block.
        try {
            const { accountingService } = await import('@/features/accounting/services/accountingService'); // Dynamic import to avoid circular dep if any
            let accLines = lines || [];
            if (lines && lines.length > 0) {
                accLines = lines.map(line => ({
                    ...line,
                    document_id: newDoc.id,
                    tax_config: line.tax_config || null
                }));
            }
            await accountingService.createEntryFromDocument(client, { ...newDoc, subtotal: document.subtotal, taxes: document.taxes, total: document.total, lines: accLines });
        } catch (accError) {
            console.error("Failed to create accounting entry", accError);
            // NOTE: In production, this should alert admin or retry. 
        }

        return newDoc;
    },

    // Helper to re-calculate totals (Backend validation)
    calculateTotals(lines: DocumentLine[]) {
        let subtotal = 0;
        let taxes = 0;

        lines.forEach(line => {
            const lineTotal = line.qty * line.unit_price;
            subtotal += lineTotal;

            // Simple Tax logic: if tax_config exists and has rate
            // Assuming tax_config is JSON: { rate: 19 } for example
            // In V3 we might strict type this later
            if (line.tax_config && typeof line.tax_config === 'object' && 'rate' in line.tax_config) {
                taxes += lineTotal * (Number(line.tax_config.rate) / 100);
            }
        });

        return {
            subtotal,
            taxes,
            total: subtotal + taxes
        };
    }
};
