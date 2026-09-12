import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { parseBackupBuffer } from '@/lib/backup/gvmCrypto';

export const runtime = 'nodejs';
export const maxDuration = 120;

const ADMIN_ROLES = ['ADMINISTRADOR', 'SUPER ADMINISTRADOR', 'admin', 'owner'];

interface TableDiff {
    table: string;
    in_backup: number;
    missing: number;
    present: number;
    comparable: boolean;
}

/** POST /api/backup/analyze — descifra el backup y reporta qué registros faltan en la BD */
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
        if (!ut || !ADMIN_ROLES.includes(ut.role)) {
            return NextResponse.json({ error: 'Sin permisos de administrador' }, { status: 403 });
        }

        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        if (!file) return NextResponse.json({ error: 'No se proporcionó archivo' }, { status: 400 });

        // Descifrar / parsear (.gvm cifrado o .json legado)
        let backup: Record<string, unknown>;
        try {
            const buf = Buffer.from(await file.arrayBuffer());
            backup = parseBackupBuffer(buf);
        } catch (e) {
            return NextResponse.json(
                { error: e instanceof Error ? e.message : 'Archivo de backup inválido o corrupto' },
                { status: 400 }
            );
        }

        if (backup.system !== 'GVM_CORP_ERP' || !backup.data) {
            return NextResponse.json(
                { error: 'El archivo no es un backup válido de GVM Corp ERP.' },
                { status: 400 }
            );
        }

        const admin = createAdminClient();
        const data = backup.data as Record<string, Record<string, unknown>[]>;

        const diffs: TableDiff[] = [];
        let totalInBackup = 0;
        let totalMissing = 0;
        let totalPresent = 0;

        for (const [table, rows] of Object.entries(data)) {
            if (!Array.isArray(rows) || rows.length === 0) continue;

            const hasId = rows[0] && typeof rows[0] === 'object' && 'id' in rows[0];
            const inBackup = rows.length;
            totalInBackup += inBackup;

            if (!hasId) {
                // No se puede comparar por id (ej. vistas o tablas puente) → no diffable
                diffs.push({ table, in_backup: inBackup, missing: 0, present: 0, comparable: false });
                continue;
            }

            const backupIds = rows.map((r) => r.id as string).filter(Boolean);
            const presentIds = new Set<string>();

            // Consultar en lotes qué ids ya existen
            for (let i = 0; i < backupIds.length; i += 200) {
                const batch = backupIds.slice(i, i + 200);
                const { data: found } = await admin.from(table).select('id').in('id', batch);
                found?.forEach((f: { id: string }) => presentIds.add(f.id));
            }

            const present = presentIds.size;
            const missing = backupIds.length - present;
            totalMissing += missing;
            totalPresent += present;

            diffs.push({ table, in_backup: inBackup, missing, present, comparable: true });
        }

        // Ordenar: más faltantes primero
        diffs.sort((a, b) => b.missing - a.missing);

        return NextResponse.json({
            valid: true,
            meta: {
                created_at: backup.created_at,
                created_by: backup.created_by,
                version: backup.version,
                type: backup.type,
                record_count: backup.record_count,
                tables_included: backup.tables_included,
                auth_users: Array.isArray(backup.auth_users) ? backup.auth_users.length : 0,
                encrypted: true,
            },
            totals: {
                in_backup: totalInBackup,
                missing: totalMissing,
                present: totalPresent,
            },
            tables: diffs,
        });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error interno';
        console.error('[Backup Analyze] UNHANDLED:', msg);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
