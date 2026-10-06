import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Igual que `fetchAllRows` (paginado por `range()`, tope 1.000 filas de
 * PostgREST), pero LANZA si una página falla en vez de tragarse el error y
 * devolver lo acumulado. Un backup necesita saber si una tabla falló de
 * verdad, no solo terminar con menos filas de las que debería — por eso NO
 * se reutiliza el helper compartido aquí (ese sí debe seguir siendo
 * best-effort para sus otros ~10 llamadores en UI/reportes).
 */
async function fetchAllRowsStrict<T>(
    fetchPage: (range: { from: number; to: number }) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
    const PAGE_SIZE = 1000;
    const all: T[] = [];
    let offset = 0;
    for (let page = 0; page < 1000; page++) {
        const { data, error } = await fetchPage({ from: offset, to: offset + PAGE_SIZE - 1 });
        if (error) throw new Error(error.message);
        if (!data || data.length === 0) break;
        all.push(...data);
        if (data.length < PAGE_SIZE) break;
        offset += PAGE_SIZE;
    }
    return all;
}

// Tablas GLOBALES (sin tenant_id, catálogos compartidos por todo el sistema):
// se respaldan completas, SIN filtrar por tenant. Antes se filtraban con
// `.eq('tenant_id', tenantId)` igual que las demás — como la columna no
// existe, PostgREST devolvía error y el catch las omitía en silencio.
// Confirmado con los backups reales: app_roles/app_modules/role_permissions
// llevaban desde julio sin aparecer en NINGÚN backup.
export const GLOBAL_TABLES = ['app_roles', 'app_modules', 'role_permissions', 'currencies', 'taxpayer_types'];

// Tablas del tenant a respaldar, en orden de dependencia (padres antes que
// hijos: el bucle usa `tables[padre]` ya recolectado para resolver las FK de
// las tablas hijas — si un padre queda DESPUÉS de su hijo en esta lista, el
// hijo se salta silenciosamente).
//
// Auditoría 2026-09-26: la lista anterior tenía 'accounts' y 'payroll_settlements'
// (tablas que NUNCA existieron — se omitían en silencio en cada backup) y le
// faltaban 70 tablas reales del esquema, incluida TODA la contabilidad
// (chart_accounts, journal_entries/lines, accounting_rules, opening_balances,
// tax_configurations), TODA la tesorería (treasury_accounts, cartera, cajas
// menores), CRM (visitas/interacciones/metas), bodegas (warehouses, traslados),
// producción, gestión comercial, encuestas y varias tablas de nómina/config.
export const BACKUP_TABLES = [
    'profiles', 'zones', 'dimensions', 'dimension_values',
    'parties', 'party_external_ids', 'price_lists', 'price_list_items',
    'products', 'product_stock', 'product_lots', 'product_serials', 'product_datasheets',
    'employees', 'work_schedules', 'work_schedule_days', 'attendance_geo_zones', 'kiosk_terminals',
    'chart_accounts', 'accounting_rules', 'tax_configurations', 'opening_balances',
    'journal_entries', 'journal_lines', 'transaction_withholdings',
    'documents', 'document_lines', 'document_attachments', 'recurring_invoices',
    'radian_events', 'dian_config', 'dian_resolutions', 'electronic_documents',
    'leads', 'crm_opportunities', 'crm_opportunity_activities', 'crm_visits',
    'crm_interactions', 'crm_sales_targets',
    'inventory_movements', 'warehouses', 'warehouse_locations',
    'warehouse_transfers', 'warehouse_transfer_lines', 'warehouse_transfer_receipts',
    'transfer_number_sequences',
    'production_recipes', 'production_recipe_items', 'production_orders',
    'po_number_sequences', 'purchase_orders', 'purchase_order_lines',
    'treasury_accounts', 'treasury_transactions', 'petty_cash_funds', 'petty_cash_transactions',
    'document_allocations', 'payment_allocations', 'payment_reports', 'payment_links',
    'debtor_profiles', 'collection_actions', 'collection_agent_config',
    'overtime_requests', 'absence_requests', 'payroll_attendance',
    'payroll_loans', 'payroll_benefits', 'payroll_periods',
    'fixed_assets', 'fiscal_periods', 'period_close_items', 'budgets', 'budget_lines',
    'bank_statements', 'bank_statement_lines',
    'logistics_carriers', 'logistics_shipments', 'logistics_shipment_items',
    'contracts', 'contract_amendments',
    'commercial_approvers', 'commercial_requests', 'commercial_request_items', 'commercial_request_events',
    'training_programs', 'training_records', 'academy_courses', 'academy_lessons', 'academy_progress',
    'it_assets', 'it_asset_assignments', 'it_maintenance_schedules',
    'chat_channels', 'chat_channel_members', 'chat_messages', 'chat_reactions',
    'support_tickets', 'support_interactions', 'support_audit_log', 'app_support_tickets',
    'satisfaction_surveys', 'vendor_satisfaction_surveys',
    'api_keys', 'team_admins', 'tenant_licenses', 'tenant_backups',
    'app_notifications', 'audit_log',
    'purchase_accounting_rules', 'purchase_tax_rates',
];

// Tablas hijas que se filtran por FK del padre (no tienen tenant_id directo).
export const CHILD_TABLE_PARENTS: Record<
    string,
    { parentTable: string; fk: string; parentPk: string }
> = {
    document_lines: { parentTable: 'documents', fk: 'document_id', parentPk: 'id' },
    purchase_order_lines: { parentTable: 'purchase_orders', fk: 'order_id', parentPk: 'id' },
    warehouse_locations: { parentTable: 'warehouses', fk: 'warehouse_id', parentPk: 'id' },
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
    warehouse_transfer_lines: { parentTable: 'warehouse_transfers', fk: 'transfer_id', parentPk: 'id' },
    support_interactions: { parentTable: 'support_tickets', fk: 'ticket_id', parentPk: 'id' },
    support_audit_log: { parentTable: 'support_tickets', fk: 'ticket_id', parentPk: 'id' },
};

// Tablas sin columna `id` (llave compuesta o una sola fila por tenant): el
// orden por defecto ('id') rompe la consulta. Se ordena por una columna que
// SÍ exista y sea suficiente para una paginación determinística.
const ORDER_OVERRIDES: Record<string, string> = {
    product_stock: 'product_id',
    dian_config: 'tenant_id',
    po_number_sequences: 'year',
    transfer_number_sequences: 'year',
    currencies: 'code',
    taxpayer_types: 'code',
};

/**
 * Tablas deliberadamente EXCLUIDAS del backup (no es un olvido):
 * - `accounting_rules_backup_20260824` / `parties_backup_wo_20260824`: son
 *   fotos de respaldo manual de la migración de WorldOffice, no datos vivos.
 * - `platform_config` / `platform_announcements` / `announcement_dismissals`:
 *   son datos de PLATAFORMA (multi-tenant), no de la operación de GVM.
 * - `chat_members`: tabla huérfana sin uso en el código (reemplazada por
 *   `chat_channel_members`) y sin columna `id` propia — no se puede paginar.
 */

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
    /**
     * Tablas que se intentaron respaldar y fallaron, con el motivo real.
     * Antes esto se tragaba en silencio (catch vacío) — un backup incompleto
     * no se notaba hasta que hacía falta restaurar. Vacío = respaldo completo.
     */
    tables_skipped: { table: string; error: string }[];
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

    const tablesSkipped: { table: string; error: string }[] = [];

    // GLOBAL_TABLES no vive dentro de BACKUP_TABLES (evita listar la misma
    // tabla dos veces) — se concatena aquí para que el bucle SÍ las visite.
    for (const tableName of [...BACKUP_TABLES, ...GLOBAL_TABLES]) {
        try {
            const childConfig = CHILD_TABLE_PARENTS[tableName];
            if (GLOBAL_TABLES.includes(tableName)) {
                // Catálogo global (sin tenant_id): se respalda completo, sin filtro.
                const data = await fetchAllRowsStrict<Record<string, unknown>>(
                    ({ from, to }) => admin
                        .from(tableName)
                        .select('*')
                        .order(ORDER_OVERRIDES[tableName] ?? 'id')
                        .range(from, to),
                );
                if (data.length > 0) {
                    tables[tableName] = data;
                    tablesIncluded.push(tableName);
                    totalRecords += data.length;
                }
            } else if (tableName === 'profiles') {
                // `profiles` no tiene tenant_id (es global, uno por usuario de Auth):
                // se filtra por los usuarios que SÍ pertenecen a este tenant (utData).
                const userIds = (utData ?? []).map((u) => u.user_id as string);
                if (userIds.length > 0) {
                    const data = await fetchAllRowsStrict<Record<string, unknown>>(
                        ({ from, to }) => admin
                            .from('profiles')
                            .select('*')
                            .in('id', userIds)
                            .order('id')
                            .range(from, to),
                    );
                    if (data.length > 0) {
                        tables['profiles'] = data;
                        tablesIncluded.push('profiles');
                        totalRecords += data.length;
                    }
                }
            } else if (childConfig) {
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
                        const rows = await fetchAllRowsStrict<Record<string, unknown>>(
                            ({ from, to }) => admin
                                .from(tableName)
                                .select('*')
                                .in(childConfig.fk, batch)
                                .order('id')
                                .range(from, to),
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
                const data = await fetchAllRowsStrict<Record<string, unknown>>(
                    ({ from, to }) => admin
                        .from(tableName)
                        .select('*')
                        .eq('tenant_id', tenantId)
                        .order(ORDER_OVERRIDES[tableName] ?? 'id')
                        .range(from, to),
                );
                if (data.length > 0) {
                    tables[tableName] = data;
                    tablesIncluded.push(tableName);
                    totalRecords += data.length;
                }
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            console.error(`[backupService] Falló el respaldo de "${tableName}":`, message);
            tablesSkipped.push({ table: tableName, error: message });
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
        tables_skipped: tablesSkipped,
        auth_users: authUsers,
        data: tables,
    };
}
