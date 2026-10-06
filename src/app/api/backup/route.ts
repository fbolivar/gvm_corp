import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { collectTenantBackup } from '@/features/settings/services/backupService';
import { encryptGvm } from '@/lib/backup/gvmCrypto';

export const runtime = 'nodejs';
export const maxDuration = 300;

const ADMIN_ROLES = ['ADMINISTRADOR', 'SUPER ADMINISTRADOR', 'admin', 'owner'];

/** GET /api/backup — lista los backups del tenant actual */
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

        if (!ut) return NextResponse.json({ error: 'Sin tenant' }, { status: 403 });

        const { data: backups, error } = await supabase
            .from('tenant_backups')
            .select('*')
            .eq('tenant_id', ut.tenant_id)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ backups: backups || [] });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error interno';
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}

/** POST /api/backup — genera un backup real, cifrado en formato .gvm */
export async function POST(_request: NextRequest) {
    void _request;
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

        if (!ut || !ADMIN_ROLES.includes(ut.role)) {
            return NextResponse.json({ error: 'Sin permisos de administrador' }, { status: 403 });
        }

        const tenantId = ut.tenant_id;
        const admin = createAdminClient();

        // 1. Recolectar y armar el backup (incluye usuarios auth para DR)
        const backup = await collectTenantBackup(admin, tenantId, {
            createdBy: user.email || 'usuario',
            type: 'manual',
            includeAuthUsers: true,
        });

        // 2. Cifrar → .gvm (AES-256-GCM + gzip)
        const gvm = encryptGvm(JSON.stringify(backup));
        const fileSizeBytes = gvm.length;
        const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const filePath = `${tenantId}/backup-${dateStr}.gvm`;

        // 3. Subir a storage (bucket privado)
        const { error: uploadError } = await admin.storage
            .from('backups')
            .upload(filePath, gvm, { contentType: 'application/octet-stream', upsert: true });

        if (uploadError) {
            console.error('[Backup] Storage upload error:', uploadError.message);
        }

        // 4. Registrar en tenant_backups — si la subida falló, el registro NO
        // puede llamarse "completed": sin archivo en storage no hay nada que
        // restaurar, aunque la recolección de datos haya ido perfecta.
        const { data: backupRecord } = await admin
            .from('tenant_backups')
            .insert({
                tenant_id: tenantId,
                created_by: user.id,
                created_by_email: user.email,
                type: 'manual',
                status: uploadError ? 'failed' : 'completed',
                error_message: uploadError?.message ?? null,
                file_path: uploadError ? null : filePath,
                file_size_bytes: fileSizeBytes,
                tables_included: backup.tables_included,
                tables_skipped: backup.tables_skipped,
                record_count: backup.record_count,
            })
            .select()
            .single();

        // 5. Notificar en pantalla (notificación del tenant) — la subida fallida
        // es lo más grave (no queda nada que restaurar); las tablas saltadas
        // también avisan con prioridad alta en vez de reportar éxito sin más.
        const hasSkipped = backup.tables_skipped.length > 0;
        await admin.from('app_notifications').insert({
            tenant_id: tenantId,
            user_id: user.id,
            title: uploadError
                ? 'Copia de seguridad FALLIDA (no se guardó el archivo)'
                : hasSkipped ? 'Copia de seguridad creada con tablas incompletas' : 'Copia de seguridad creada',
            body: uploadError
                ? `Los datos se recolectaron (${backup.record_count.toLocaleString('es-CO')} registros) pero el archivo cifrado NO se pudo subir a storage: ${uploadError.message}. No hay copia restaurable de este intento.`
                : hasSkipped
                    ? `Se generó la copia cifrada (.gvm) con ${backup.record_count.toLocaleString('es-CO')} registros de ${backup.tables_included.length} tablas, pero ${backup.tables_skipped.length} tabla(s) fallaron: ${backup.tables_skipped.map((t) => t.table).join(', ')}. Revisa los logs.`
                    : `Se generó una copia cifrada (.gvm) con ${backup.record_count.toLocaleString('es-CO')} registros de ${backup.tables_included.length} tablas.`,
            link: '/settings/backup',
            category: 'BACKUP',
            priority: uploadError ? 'CRITICAL' : hasSkipped ? 'HIGH' : 'MEDIUM',
            is_read: false,
        });

        // 6. Devolver el .gvm para descarga
        return new NextResponse(new Uint8Array(gvm), {
            status: 200,
            headers: {
                'Content-Type': 'application/octet-stream',
                'Content-Disposition': `attachment; filename="backup-gvm-${dateStr}.gvm"`,
                'X-Backup-Id': backupRecord?.id || 'unknown',
                'X-Record-Count': String(backup.record_count),
                'X-Tables-Count': String(backup.tables_included.length),
            },
        });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error interno';
        console.error('[Backup] UNHANDLED:', msg);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
