import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

// Restore order: parents before children
const RESTORE_ORDER = [
    'tenants',
    'profiles',
    'user_tenants',
    'zones',
    'app_roles',
    'app_modules',
    'role_permissions',
    'accounts',
    'parties',
    'products',
    'product_stock',
    'employees',
    'documents',
    'document_lines',
    'leads',
    'crm_opportunities',
    'inventory_movements',
    'product_lots',
    'warehouse_locations',
    'po_number_sequences',
    'purchase_orders',
    'purchase_order_lines',
    'treasury_transactions',
    'payroll_settlements',
    'overtime_requests',
    'absence_requests',
    'payroll_attendance',
    'dian_config',
    'dian_resolutions',
    'electronic_documents',
    'fixed_assets',
    'fiscal_periods',
    'period_close_items',
    'budgets',
    'budget_lines',
    'bank_statements',
    'bank_statement_lines',
    'recurring_invoices',
    'logistics_carriers',
    'logistics_shipments',
    'logistics_shipment_items',
    'contracts',
    'contract_amendments',
    'training_programs',
    'training_records',
    'it_assets',
    'it_asset_assignments',
    'it_maintenance_schedules',
    'chat_channels',
    'chat_channel_members',
    'chat_messages',
    'chat_reactions',
    'support_tickets',
    'payment_links',
    'app_notifications',
    'audit_log',
];

/** POST /api/backup/restore — restore from a GVM backup JSON */
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        // Admin check
        const { data: ut } = await supabase
            .from('user_tenants')
            .select('tenant_id, role')
            .eq('user_id', user.id)
            .maybeSingle();

        const adminRoles = ['ADMINISTRADOR', 'SUPER ADMINISTRADOR', 'admin', 'owner'];
        if (!ut || !adminRoles.includes(ut.role)) {
            return NextResponse.json({ error: 'Sin permisos de administrador' }, { status: 403 });
        }

        // Parse the backup file from form data
        const formData = await request.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ error: 'No se proporcionó archivo' }, { status: 400 });
        }

        let backup: Record<string, unknown>;
        try {
            const text = await file.text();
            backup = JSON.parse(text);
        } catch {
            return NextResponse.json({ error: 'Archivo JSON inválido' }, { status: 400 });
        }

        // Validate it's a GVM backup
        if (backup.system !== 'GVM_CORP_ERP' || !backup.version || !backup.data) {
            return NextResponse.json({
                error: 'El archivo no es un backup válido de GVM Corp ERP. Asegúrese de usar un archivo generado por este sistema.'
            }, { status: 400 });
        }

        const admin = createAdminClient();
        const tenantId = ut.tenant_id;
        const data = backup.data as Record<string, unknown[]>;
        const authUsers = (backup.auth_users || []) as Array<Record<string, unknown>>;

        const results: Record<string, { restored: number; errors: string[] }> = {};
        let totalRestored = 0;

        // 1. Restore auth users first (recreate deleted users)
        if (authUsers.length > 0) {
            const userResults = { restored: 0, errors: [] as string[] };

            for (const au of authUsers) {
                try {
                    const email = au.email as string;
                    if (!email) continue;

                    // Check if user already exists
                    const { data: listData } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
                    const existing = listData?.users?.find(u => u.email === email);

                    if (!existing) {
                        // Recreate user with a temporary password
                        const tempPassword = crypto.randomUUID().slice(0, 12) + 'Rx1!';
                        const { error: createErr } = await admin.auth.admin.createUser({
                            email,
                            password: tempPassword,
                            email_confirm: true,
                            user_metadata: (au.user_metadata as Record<string, unknown>) || {},
                        });

                        if (createErr) {
                            userResults.errors.push(`${email}: ${createErr.message}`);
                        } else {
                            userResults.restored++;
                        }
                    } else {
                        userResults.restored++; // Already exists, count as restored
                    }
                } catch (e: unknown) {
                    const msg = e instanceof Error ? e.message : 'Error';
                    userResults.errors.push(`auth_user: ${msg}`);
                }
            }

            results['auth_users'] = userResults;
            totalRestored += userResults.restored;
        }

        // 2. Restore data tables in order
        for (const tableName of RESTORE_ORDER) {
            const rows = data[tableName];
            if (!rows || rows.length === 0) continue;

            const tableResult = { restored: 0, errors: [] as string[] };

            try {
                // Upsert in batches of 100
                const batchSize = 100;
                for (let i = 0; i < rows.length; i += batchSize) {
                    const batch = rows.slice(i, i + batchSize);

                    const { error: upsertError, count } = await admin
                        .from(tableName)
                        .upsert(batch as Record<string, unknown>[], {
                            onConflict: 'id',
                            ignoreDuplicates: false,
                        });

                    if (upsertError) {
                        tableResult.errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${upsertError.message}`);
                    } else {
                        tableResult.restored += count || batch.length;
                    }
                }
            } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : 'Error';
                tableResult.errors.push(msg);
            }

            results[tableName] = tableResult;
            totalRestored += tableResult.restored;
        }

        // Build summary
        const tablesRestored = Object.keys(results).filter(k => results[k].restored > 0);
        const tablesWithErrors = Object.keys(results).filter(k => results[k].errors.length > 0);

        return NextResponse.json({
            success: true,
            message: `Restauración completada: ${totalRestored} registros en ${tablesRestored.length} tablas`,
            tenant_id: tenantId,
            backup_date: backup.created_at,
            total_restored: totalRestored,
            tables_restored: tablesRestored.length,
            tables_with_errors: tablesWithErrors.length,
            details: results,
        });

    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error interno';
        console.error('[Restore] UNHANDLED:', msg);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
