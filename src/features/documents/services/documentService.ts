import { SupabaseClient } from '@supabase/supabase-js';
import { Document, DocumentFilters, DocumentLine } from '../types';

export const documentService = {
    async getDocuments(client: SupabaseClient, filters: DocumentFilters) {
        // If searching by client name, resolve party IDs first
        let partyIdFilter: string[] | null = null
        if (filters.search && !/^[A-Z]{1,4}-\d/.test(filters.search)) {
            // Looks like a name, not a doc number → search parties
            const { data: matchedParties } = await client
                .from('parties')
                .select('id')
                .ilike('legal_name', `%${filters.search}%`)
                .limit(200)
            if (matchedParties && matchedParties.length > 0) {
                partyIdFilter = matchedParties.map((p: { id: string }) => p.id)
            }
        }

        let query = client.from('documents').select('*, party:parties(legal_name, doc_number), warehouse:warehouses(name)', { count: 'exact' });

        if (filters.search) {
            if (partyIdFilter && partyIdFilter.length > 0) {
                query = query.in('party_id', partyIdFilter)
            } else {
                query = query.ilike('number', `%${filters.search}%`)
            }
        }

        if (filters.type) {
            query = query.eq('doc_type', filters.type);
        }

        if (filters.status) {
            query = query.eq('status', filters.status);
        }

        if (filters.start_date) {
            query = query.gte('issue_date', filters.start_date)
        }

        if (filters.end_date) {
            query = query.lte('issue_date', filters.end_date)
        }

        const from = (filters.page - 1) * filters.per_page;
        const to = from + filters.per_page - 1;

        const { data, error, count } = await query
            .range(from, to)
            .order('issue_date', { ascending: false });

        if (error) { console.error('[documents] getDocuments:', error.message); return { data: [] as Document[], count: 0 }; }
        return { data: data as Document[], count };
    },

    async getDocumentById(client: SupabaseClient, id: string) {
        const { data, error } = await client
            .from('documents')
            .select('*, lines:document_lines(*, product:products(sku, name)), party:parties(*), warehouse:warehouses(id, name, code), electronic_document:electronic_documents(*)')
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

        // INTEGRATION: Inventory — MOVIDO al flujo de emisión
        // DRAFT no consume stock. El descuento FEFO ocurre al emitir vía
        // providerIntegrationService.sendToProvider → RPC consume_stock_for_document.
        // VENDOR_BILL sigue el flujo de recepción OC (purchase order receive), no este.
        // Si necesitas registrar stock directamente, usa /inventory/movements.

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

    /**
     * Actualiza un documento existente (solo borradores) y reemplaza sus líneas.
     * Excluye relaciones y campos de identidad del header. No re-genera asiento
     * contable (los borradores se reconcilian al emitir).
     */
    async updateDocument(client: SupabaseClient, id: string, document: Document & { lines?: DocumentLine[] }) {
        // Excluir relaciones y campos que no se deben sobrescribir
        const {
            lines,
            party,
            warehouse,
            electronic_document,
            id: _id,
            tenant_id: _tenantId,
            created_at: _createdAt,
            number: _number,
            ...headerData
        } = document as Document & {
            lines?: DocumentLine[];
            party?: unknown;
            warehouse?: unknown;
            electronic_document?: unknown;
        };

        const { data: updatedDoc, error: headerError } = await client
            .from('documents')
            .update(headerData)
            .eq('id', id)
            .select()
            .single();

        if (headerError) throw headerError;

        // Reemplazar líneas: borrar las existentes e insertar las nuevas
        const { error: delError } = await client
            .from('document_lines')
            .delete()
            .eq('document_id', id);
        if (delError) throw delError;

        if (lines && lines.length > 0) {
            const linesWithDocId = lines.map(line => {
                const { id: _lineId, document_id: _docId, ...rest } = line as DocumentLine & { document_id?: string };
                return {
                    ...rest,
                    document_id: id,
                    tax_config: line.tax_config || null,
                };
            });

            const { error: linesError } = await client
                .from('document_lines')
                .insert(linesWithDocId);
            if (linesError) throw linesError;
        }

        return updatedDoc;
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
