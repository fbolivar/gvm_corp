// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const maxDuration = 300 // 5 min max for backup cron

// Tables to backup (same as /api/backup)
const BACKUP_TABLES = [
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
]

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
}

/** GET /api/cron/backup — Vercel Cron triggers this every Sunday at 3am UTC */
export async function GET(request: NextRequest) {
    // Verify cron secret (Vercel sets CRON_SECRET automatically)
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()

    try {
        // Get all active tenants
        const { data: tenants } = await admin
            .from('tenants')
            .select('id, name')

        if (!tenants || tenants.length === 0) {
            return NextResponse.json({ message: 'No tenants found' })
        }

        const results: Array<{ tenant: string; status: string; records: number }> = []

        for (const tenant of tenants) {
            try {
                const tenantId = tenant.id
                const tables: Record<string, unknown[]> = {}
                const tablesIncluded: string[] = []
                let totalRecords = 0

                // Tenant data
                tables['tenants'] = [tenant]
                tablesIncluded.push('tenants')
                totalRecords += 1

                // User tenants
                const { data: utData } = await admin
                    .from('user_tenants')
                    .select('*')
                    .eq('tenant_id', tenantId)
                if (utData && utData.length > 0) {
                    tables['user_tenants'] = utData
                    tablesIncluded.push('user_tenants')
                    totalRecords += utData.length
                }

                // All tables
                for (const tableName of BACKUP_TABLES) {
                    try {
                        const childConfig = CHILD_TABLE_PARENTS[tableName]
                        if (childConfig) {
                            const parentData = tables[childConfig.parentTable]
                            if (parentData && parentData.length > 0) {
                                const parentIds = parentData.map((r: Record<string, unknown>) => r[childConfig.parentPk] as string)
                                const allRows: unknown[] = []
                                for (let i = 0; i < parentIds.length; i += 100) {
                                    const batch = parentIds.slice(i, i + 100)
                                    const { data } = await admin.from(tableName).select('*').in(childConfig.fk, batch).limit(10000)
                                    if (data) allRows.push(...data)
                                }
                                if (allRows.length > 0) {
                                    tables[tableName] = allRows
                                    tablesIncluded.push(tableName)
                                    totalRecords += allRows.length
                                }
                            }
                        } else {
                            const { data } = await admin.from(tableName).select('*').eq('tenant_id', tenantId).limit(50000)
                            if (data && data.length > 0) {
                                tables[tableName] = data
                                tablesIncluded.push(tableName)
                                totalRecords += data.length
                            }
                        }
                    } catch { /* skip */ }
                }

                // Build backup JSON
                const backup = {
                    version: '1.0',
                    system: 'GVM_CORP_ERP',
                    tenant_id: tenantId,
                    created_at: new Date().toISOString(),
                    created_by: 'CRON_AUTO_BACKUP',
                    type: 'auto',
                    record_count: totalRecords,
                    tables_included: tablesIncluded,
                    data: tables,
                }

                const jsonStr = JSON.stringify(backup)
                const fileSizeBytes = new Blob([jsonStr]).size
                const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
                const filePath = `${tenantId}/auto-backup-${dateStr}.json`

                // Upload to storage
                await admin.storage.from('backups').upload(filePath, jsonStr, {
                    contentType: 'application/json',
                    upsert: true,
                })

                // Record in tenant_backups
                await admin.from('tenant_backups').insert({
                    tenant_id: tenantId,
                    created_by_email: 'sistema@gvm.co (automático)',
                    type: 'auto',
                    status: 'completed',
                    file_path: filePath,
                    file_size_bytes: fileSizeBytes,
                    tables_included: tablesIncluded,
                    record_count: totalRecords,
                })

                // Cleanup: keep only last 8 backups per tenant
                const { data: oldBackups } = await admin
                    .from('tenant_backups')
                    .select('id, file_path')
                    .eq('tenant_id', tenantId)
                    .order('created_at', { ascending: false })
                    .range(8, 100)

                if (oldBackups && oldBackups.length > 0) {
                    for (const old of oldBackups) {
                        if (old.file_path) {
                            await admin.storage.from('backups').remove([old.file_path])
                        }
                        await admin.from('tenant_backups').delete().eq('id', old.id)
                    }
                }

                results.push({ tenant: tenant.name, status: 'OK', records: totalRecords })
            } catch (err) {
                const msg = err instanceof Error ? err.message : 'Error'
                results.push({ tenant: tenant.name, status: `ERROR: ${msg}`, records: 0 })
            }
        }

        return NextResponse.json({
            message: `Auto backup completed for ${results.length} tenants`,
            results,
            timestamp: new Date().toISOString(),
        })
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error'
        console.error('[Cron Backup] Fatal:', msg)
        return NextResponse.json({ error: msg }, { status: 500 })
    }
}
