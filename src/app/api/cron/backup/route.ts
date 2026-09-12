import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { collectTenantBackup } from '@/features/settings/services/backupService';
import { encryptGvm } from '@/lib/backup/gvmCrypto';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 min max for backup cron

/** GET /api/cron/backup — Vercel Cron (domingos 3am UTC) */
export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createAdminClient();

    try {
        const { data: tenants } = await admin.from('tenants').select('id, name');
        if (!tenants || tenants.length === 0) {
            return NextResponse.json({ message: 'No tenants found' });
        }

        const results: Array<{ tenant: string; status: string; records: number }> = [];

        for (const tenant of tenants) {
            try {
                const tenantId = tenant.id;

                // 1. Recolectar + armar backup (sin auth_users en el automático)
                const backup = await collectTenantBackup(admin, tenantId, {
                    createdBy: 'CRON_AUTO_BACKUP',
                    type: 'auto',
                    includeAuthUsers: false,
                    tenantRow: tenant,
                });

                // 2. Cifrar → .gvm
                const gvm = encryptGvm(JSON.stringify(backup));
                const fileSizeBytes = gvm.length;
                const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
                const filePath = `${tenantId}/auto-backup-${dateStr}.gvm`;

                // 3. Subir
                await admin.storage
                    .from('backups')
                    .upload(filePath, gvm, {
                        contentType: 'application/octet-stream',
                        upsert: true,
                    });

                // 4. Registrar
                await admin.from('tenant_backups').insert({
                    tenant_id: tenantId,
                    created_by_email: 'sistema@gvm.co (automático)',
                    type: 'auto',
                    status: 'completed',
                    file_path: filePath,
                    file_size_bytes: fileSizeBytes,
                    tables_included: backup.tables_included,
                    record_count: backup.record_count,
                });

                // 5. Notificar en pantalla (todo el tenant)
                await admin.from('app_notifications').insert({
                    tenant_id: tenantId,
                    user_id: null,
                    title: 'Copia de seguridad automática lista',
                    body: `Se guardó la copia semanal cifrada (.gvm): ${backup.record_count.toLocaleString('es-CO')} registros de ${backup.tables_included.length} tablas.`,
                    link: '/settings/backup',
                    category: 'BACKUP',
                    priority: 'LOW',
                    is_read: false,
                });

                // 6. Retención: conservar solo las últimas 8 copias por tenant
                const { data: oldBackups } = await admin
                    .from('tenant_backups')
                    .select('id, file_path')
                    .eq('tenant_id', tenantId)
                    .order('created_at', { ascending: false })
                    .range(8, 100);

                if (oldBackups && oldBackups.length > 0) {
                    for (const old of oldBackups) {
                        if (old.file_path) {
                            await admin.storage.from('backups').remove([old.file_path]);
                        }
                        await admin.from('tenant_backups').delete().eq('id', old.id);
                    }
                }

                results.push({ tenant: tenant.name, status: 'OK', records: backup.record_count });
            } catch (err) {
                const msg = err instanceof Error ? err.message : 'Error';
                results.push({ tenant: tenant.name, status: `ERROR: ${msg}`, records: 0 });
            }
        }

        // ─── Mantenimiento: purgar audit_log con más de 90 días ──────────────
        let auditPurge = 'skipped';
        try {
            const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
            const { error: purgeErr } = await admin
                .from('audit_log')
                .delete()
                .lt('created_at', cutoff);
            auditPurge = purgeErr ? `error: ${purgeErr.message}` : 'ok (>90d)';
        } catch (e) {
            auditPurge = `error: ${e instanceof Error ? e.message : 'unknown'}`;
        }

        return NextResponse.json({
            message: `Auto backup completed for ${results.length} tenants`,
            results,
            auditPurge,
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error';
        console.error('[Cron Backup] Fatal:', msg);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
