import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/** GET /api/backup/[id] — download a specific backup */
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        // Verify backup belongs to user's tenant
        const { data: backup } = await supabase
            .from('tenant_backups')
            .select('*')
            .eq('id', id)
            .maybeSingle();

        if (!backup) {
            return NextResponse.json({ error: 'Backup no encontrado' }, { status: 404 });
        }

        if (!backup.file_path) {
            return NextResponse.json({ error: 'Archivo de backup no disponible' }, { status: 404 });
        }

        // Download from storage via admin client
        const admin = createAdminClient();
        const { data: fileData, error: downloadError } = await admin.storage
            .from('backups')
            .download(backup.file_path);

        if (downloadError || !fileData) {
            console.error('[Backup Download] error:', downloadError?.message);
            return NextResponse.json({ error: 'Error descargando archivo' }, { status: 500 });
        }

        const bytes = new Uint8Array(await fileData.arrayBuffer());
        const dateStr = new Date(backup.created_at).toISOString().slice(0, 10);
        const isGvm = (backup.file_path as string).endsWith('.gvm');
        const ext = isGvm ? 'gvm' : 'json';

        return new NextResponse(bytes, {
            status: 200,
            headers: {
                'Content-Type': isGvm ? 'application/octet-stream' : 'application/json',
                'Content-Disposition': `attachment; filename="backup-gvm-${dateStr}.${ext}"`,
            },
        });

    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error interno';
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}

/** DELETE /api/backup/[id] — delete a specific backup */
export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        const { data: backup } = await supabase
            .from('tenant_backups')
            .select('*')
            .eq('id', id)
            .maybeSingle();

        if (!backup) {
            return NextResponse.json({ error: 'Backup no encontrado' }, { status: 404 });
        }

        const admin = createAdminClient();

        // Delete from storage
        if (backup.file_path) {
            await admin.storage.from('backups').remove([backup.file_path]);
        }

        // Delete record
        await admin.from('tenant_backups').delete().eq('id', id);

        return NextResponse.json({ success: true });

    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error interno';
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
