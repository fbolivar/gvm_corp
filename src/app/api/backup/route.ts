import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

// Tables to backup, in dependency order (parents first)
const BACKUP_TABLES = [
    // Core
    'profiles',
    'zones',
    'app_roles',
    'app_modules',
    'role_permissions',
    // Business core
    'accounts',
    'parties',
    'products',
    'product_stock',
    'employees',
    // Documents & lines
    'documents',
    'document_lines',
    // CRM
    'leads',
    'crm_opportunities',
    // Inventory
    'inventory_movements',
    'product_lots',
    'warehouse_locations',
    // Purchasing
    'po_number_sequences',
    'purchase_orders',
    'purchase_order_lines',
    // Treasury
    'treasury_transactions',
    // Payroll
    'payroll_settlements',
    'overtime_requests',
    'absence_requests',
    'payroll_attendance',
    // DIAN
    'dian_config',
    'dian_resolutions',
    'electronic_documents',
    // Accounting
    'fixed_assets',
    'fiscal_periods',
    'period_close_items',
    'budgets',
    'budget_lines',
    'bank_statements',
    'bank_statement_lines',
    'recurring_invoices',
    // Logistics
    'logistics_carriers',
    'logistics_shipments',
    'logistics_shipment_items',
    // Contracts
    'contracts',
    'contract_amendments',
    // Training
    'training_programs',
    'training_records',
    // IT / Technology
    'it_assets',
    'it_asset_assignments',
    'it_maintenance_schedules',
    // Chat
    'chat_channels',
    'chat_channel_members',
    'chat_messages',
    'chat_reactions',
    // Support
    'support_tickets',
    // Payments
    'payment_links',
    // Notifications
    'app_notifications',
    // Audit
    'audit_log',
];

// Tables that need special join/filter (child tables linked via parent FK, not tenant_id)
const CHILD_TABLE_PARENTS: Record<string, { parentTable: string; fk: string; parentPk: string }> = {
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

/** GET /api/backup — list backups for current tenant */
export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        const { data: ut } = await supabase
            .from('user_tenants')
            .select('tenant_id, role')
            .eq('user_id', user.id)
            .maybeSingle();

        if (!ut) {
            return NextResponse.json({ error: 'Sin tenant' }, { status: 403 });
        }

        const { data: backups, error } = await supabase
            .from('tenant_backups')
            .select('*')
            .eq('tenant_id', ut.tenant_id)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ backups: backups || [] });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error interno';
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}

/** POST /api/backup — generate a real backup */
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        const { data: ut } = await supabase
            .from('user_tenants')
            .select('tenant_id, role')
            .eq('user_id', user.id)
            .maybeSingle();

        const adminRoles = ['ADMINISTRADOR', 'SUPER ADMINISTRADOR', 'admin', 'owner'];
        if (!ut || !adminRoles.includes(ut.role)) {
            return NextResponse.json({ error: 'Sin permisos de administrador' }, { status: 403 });
        }

        const tenantId = ut.tenant_id;
        const admin = createAdminClient();

        // 1. Get all auth users for this tenant
        const { data: tenantUsers } = await admin
            .from('user_tenants')
            .select('user_id, role, role_id, zone_id, status')
            .eq('tenant_id', tenantId);

        const userIds = (tenantUsers || []).map(u => u.user_id);

        // Get auth user details
        const authUsers: Array<Record<string, unknown>> = [];
        if (userIds.length > 0) {
            const { data: listData } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
            if (listData?.users) {
                for (const au of listData.users) {
                    if (userIds.includes(au.id)) {
                        authUsers.push({
                            id: au.id,
                            email: au.email,
                            user_metadata: au.user_metadata,
                            created_at: au.created_at,
                        });
                    }
                }
            }
        }

        // 2. Export tenant data from each table
        const tables: Record<string, Record<string, unknown>[]> = {};
        const tablesIncluded: string[] = [];
        let totalRecords = 0;

        // Also include user_tenants
        const { data: utData } = await admin
            .from('user_tenants')
            .select('*')
            .eq('tenant_id', tenantId);
        if (utData && utData.length > 0) {
            tables['user_tenants'] = utData;
            tablesIncluded.push('user_tenants');
            totalRecords += utData.length;
        }

        // Include tenant info
        const { data: tenantData } = await admin
            .from('tenants')
            .select('*')
            .eq('id', tenantId)
            .maybeSingle();
        if (tenantData) {
            tables['tenants'] = [tenantData];
            tablesIncluded.push('tenants');
            totalRecords += 1;
        }

        for (const tableName of BACKUP_TABLES) {
            try {
                const childConfig = CHILD_TABLE_PARENTS[tableName];

                if (childConfig) {
                    // Child table: need to get parent IDs first then filter
                    const parentData = tables[childConfig.parentTable];
                    if (parentData && parentData.length > 0) {
                        const parentIds = parentData.map((r: Record<string, unknown>) => r[childConfig.parentPk] as string);
                        // Fetch in batches of 100 to avoid URL length limits
                        const allRows: Record<string, unknown>[] = [];
                        for (let i = 0; i < parentIds.length; i += 100) {
                            const batch = parentIds.slice(i, i + 100);
                            const { data } = await admin
                                .from(tableName)
                                .select('*')
                                .in(childConfig.fk, batch)
                                .limit(10000);
                            if (data) allRows.push(...data);
                        }
                        if (allRows.length > 0) {
                            tables[tableName] = allRows;
                            tablesIncluded.push(tableName);
                            totalRecords += allRows.length;
                        }
                    }
                } else {
                    // Direct tenant_id filter
                    const { data } = await admin
                        .from(tableName)
                        .select('*')
                        .eq('tenant_id', tenantId)
                        .limit(50000);

                    if (data && data.length > 0) {
                        tables[tableName] = data;
                        tablesIncluded.push(tableName);
                        totalRecords += data.length;
                    }
                }
            } catch {
                // Table might not exist or have different schema — skip silently
                console.log(`[Backup] Skipping table ${tableName} (not found or error)`);
            }
        }

        // 3. Build backup JSON
        const backup = {
            version: '1.0',
            system: 'GVM_CORP_ERP',
            tenant_id: tenantId,
            created_at: new Date().toISOString(),
            created_by: user.email,
            record_count: totalRecords,
            tables_included: tablesIncluded,
            auth_users: authUsers,
            data: tables,
        };

        const jsonStr = JSON.stringify(backup, null, 2);
        const fileSizeBytes = new Blob([jsonStr]).size;
        const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const filePath = `${tenantId}/backup-${dateStr}.json`;

        // 4. Upload to Supabase Storage
        const { error: uploadError } = await admin.storage
            .from('backups')
            .upload(filePath, jsonStr, {
                contentType: 'application/json',
                upsert: true,
            });

        if (uploadError) {
            console.error('[Backup] Storage upload error:', uploadError.message);
            // Even if storage fails, we still record and provide download
        }

        // 5. Record in tenant_backups table
        const { data: backupRecord, error: insertError } = await admin
            .from('tenant_backups')
            .insert({
                tenant_id: tenantId,
                created_by: user.id,
                created_by_email: user.email,
                type: 'manual',
                status: 'completed',
                file_path: uploadError ? null : filePath,
                file_size_bytes: fileSizeBytes,
                tables_included: tablesIncluded,
                record_count: totalRecords,
            })
            .select()
            .single();

        if (insertError) {
            console.error('[Backup] Insert record error:', insertError.message);
        }

        // 6. Return the backup JSON directly for download
        // Also saved to storage for future downloads
        void request; // acknowledge request param
        return new NextResponse(jsonStr, {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Content-Disposition': `attachment; filename="backup-gvm-${dateStr}.json"`,
                'X-Backup-Id': backupRecord?.id || 'unknown',
                'X-Record-Count': String(totalRecords),
                'X-Tables-Count': String(tablesIncluded.length),
            },
        });

    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error interno';
        console.error('[Backup] UNHANDLED:', msg);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
