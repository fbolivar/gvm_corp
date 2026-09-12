import { SupabaseClient } from '@supabase/supabase-js';
import { fetchAllRows } from '@/shared/lib/fetchAllRows';

// Tablas del tenant a respaldar, en orden de dependencia (padres primero).
export const BACKUP_TABLES = [
    'profiles', 'zones', 'app_roles', 'app_modules', 'role_permissions',
    'accounts', 'parties', 'products', 'product_stock', 'employees',
    'documents', 'document_lines', 'leads', 'crm_opportunities',
    'inventory_movements', 'product_lots', 'warehouse_locations',
    'po_number_sequences', 'purchase_orders', 'purchase_order_lines',
    'treasury_transactions', 'payroll_settlements', 'overtime_requests',
    'absence_requests', 'payroll_attendance', 'dian_config', 'dian_resolutions',
    'electronic_documents', 'fixed_assets', 'fiscal_periods', 'period_close_items',
    'budgets', 'budget_lines', 'bank_statements', 'bank_statement_lines',
    'recurring_invoices', 'logistics_carriers', 'logistics_shipments',
    'logistics_shipment_items', 'contracts', 'contract_amendments',
    'training_programs', 'training_records', 'it_assets', 'it_asset_assignments',
    'it_maintenance_schedules', 'chat_channels', 'chat_channel_members',
    'chat_messages', 'chat_reactions', 'support_tickets', 'payment_links',
    'app_notifications', 'audit_log',
];

// Tablas hijas que se filtran por FK del padre (no tienen tenant_id directo).
export const CHILD_TABLE_PARENTS: Record<
    string,
    { parentTable: string; fk: string; parentPk: string }
> = {
    document_lines: { parentTable: 'documents', fk: 'document_id', parentPk: 'id' },
    purchase_order_lines: { parentTable: 'purchase_orders', fk: 'purchase_order_id', parentPk: 'id' },
    budget_lines: { parentTable: 'budgets', fk: 'budget_id', parentPk: 'id' },
    bank_statement_lines: { parentTable: 'bank_statements', fk: 'statement_id', parentPk: 'id' },
    period_close_items: { parentTable: 'fiscal_periods', fk: 'period_id', parentPk: 'id' },
    contract_amendments: { parentTable: 'contracts', fk: 'contract_id', parentPk: 'id' },
    training_records: { parentTable: 'training_programs', fk: 'program_id', parentPk: 'id' },
    it_asset_assignments: { parentTable: 'it_assets', fk: 'asset_id', parentPk: 'id' },
    it_maintenance_schedules: { parentTable: 'it_assets', fk: 'asset_id', parentPk: 'id' },
    chat_channel_members: { parentTable: 'chat_channels', fk: 'channel_id', parentPk: 'id' },
    chat_messages: { parentTable: 'chat_channels', fk: 'channel_id', parentPk: 'id' },
    chat_reactions: { parentTable: 'chat_messages', fk: 'message_id', parentPk: 'id' },
    logistics_shipment_items: { parentTable: 'logistics_shipments', fk: 'shipment_id', parentPk: 'id' },
};

export const BACKUP_FORMAT_VERSION = '2.0';

export interface BackupObject {
    version: string;
    format: 'gvm';
    system: 'GVM_CORP_ERP';
    tenant_id: string;
    created_at: string;
    created_by: string;
    type: 'manual' | 'auto';
    record_count: number;
    tables_included: string[];
    auth_users: Array<Record<string, unknown>>;
    data: Record<string, Record<string, unknown>[]>;
}

/**
 * Recolecta TODOS los datos del tenant y arma el objeto de backup.
 * `admin` debe ser un cliente con service role (salta RLS). Ya autorizado por la ruta.
 */
export async function collectTenantBackup(
    admin: SupabaseClient,
    tenantId: string,
    opts: {
        createdBy: string;
        type: 'manual' | 'auto';
        includeAuthUsers?: boolean;
        tenantRow?: Record<string, unknown> | null;
    }
): Promise<BackupObject> {
    const tables: Record<string, Record<string, unknown>[]> = {};
    const tablesIncluded: string[] = [];
    let totalRecords = 0;

    // tenants
    let tenantRow = opts.tenantRow ?? null;
    if (!tenantRow) {
        const { data } = await admin.from('tenants').select('*').eq('id', tenantId).maybeSingle();
        tenantRow = data ?? null;
    }
    if (tenantRow) {
        tables['tenants'] = [tenantRow];
        tablesIncluded.push('tenants');
        totalRecords += 1;
    }

    // user_tenants
    const { data: utData } = await admin
        .from('user_tenants')
        .select('*')
        .eq('tenant_id', tenantId);
    if (utData && utData.length > 0) {
        tables['user_tenants'] = utData;
        tablesIncluded.push('user_tenants');
        totalRecords += utData.length;
    }

    // Auth users (solo backups manuales/DR — para recrear usuarios borrados)
    const authUsers: Array<Record<string, unknown>> = [];
    if (opts.includeAuthUsers) {
        const userIds = (utData ?? []).map((u) => u.user_id as string);
        if (userIds.length > 0) {
            const { data: listData } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
            listData?.users?.forEach((au) => {
                if (userIds.includes(au.id)) {
                    authUsers.push({
                        id: au.id,
                        email: au.email,
                        user_metadata: au.user_metadata,
                        created_at: au.created_at,
                    });
                }
            });
        }
    }

    for (const tableName of BACKUP_TABLES) {
        try {
            const childConfig = CHILD_TABLE_PARENTS[tableName];
            if (childConfig) {
                const parentData = tables[childConfig.parentTable];
                if (parentData && parentData.length > 0) {
                    const parentIds = parentData.map(
                        (r) => r[childConfig.parentPk] as string
                    );
                    const allRows: Record<string, unknown>[] = [];
                    for (let i = 0; i < parentIds.length; i += 100) {
                        const batch = parentIds.slice(i, i + 100);
                        // Paginado obligatorio: PostgREST corta en 1.000 filas en
                        // silencio. Con `.limit(10000)` un lote de 100 documentos
                        // con muchas líneas se respaldaba incompleto.
                        const rows = await fetchAllRows<Record<string, unknown>>(
                            ({ from, to }) => admin
                                .from(tableName)
                                .select('*')
                                .in(childConfig.fk, batch)
                                .order('id')
                                .range(from, to),
                            { label: `backup:${tableName}` },
                        );
                        allRows.push(...rows);
                    }
                    if (allRows.length > 0) {
                        tables[tableName] = allRows;
                        tablesIncluded.push(tableName);
                        totalRecords += allRows.length;
                    }
                }
            } else {
                // Igual que arriba: sin paginar, una copia de `parties` (6.712
                // filas) o `documents` (2.213) se guardaba con solo 1.000 — un
                // respaldo incompleto que nadie nota hasta que hay que restaurar.
                const data = await fetchAllRows<Record<string, unknown>>(
                    ({ from, to }) => admin
                        .from(tableName)
                        .select('*')
                        .eq('tenant_id', tenantId)
                        .order('id')
                        .range(from, to),
                    { label: `backup:${tableName}` },
                );
                if (data.length > 0) {
                    tables[tableName] = data;
                    tablesIncluded.push(tableName);
                    totalRecords += data.length;
                }
            }
        } catch {
            // La tabla puede no existir o tener otro esquema — se omite.
        }
    }

    return {
        version: BACKUP_FORMAT_VERSION,
        format: 'gvm',
        system: 'GVM_CORP_ERP',
        tenant_id: tenantId,
        created_at: new Date().toISOString(),
        created_by: opts.createdBy,
        type: opts.type,
        record_count: totalRecords,
        tables_included: tablesIncluded,
        auth_users: authUsers,
        data: tables,
    };
}
