import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { auditService, AuditFilters } from '@/features/settings/services/auditService';

// Tope de filas por exportación. La auditoría se purga a ~60 días, así que
// 20k cubre con holgura cualquier reporte por criterio.
const EXPORT_LIMIT = 20000;

// ─── CSV helpers ────────────────────────────────────────────────────────────

/** Envuelve un valor en comillas y escapa las comillas internas (RFC 4180). */
function csvCell(value: unknown): string {
    const s = value === null || value === undefined ? '' : String(value);
    return `"${s.replace(/"/g, '""')}"`;
}

function fmtBogota(iso: string, opts: Intl.DateTimeFormatOptions): string {
    try {
        return new Intl.DateTimeFormat('es-CO', { ...opts, timeZone: 'America/Bogota' }).format(
            new Date(iso)
        );
    } catch {
        return iso;
    }
}

// ─── Route ──────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const sp = request.nextUrl.searchParams;
    const filters: AuditFilters = {
        q: sp.get('q') || undefined,
        entity: sp.get('entity') || undefined,
        action: sp.get('action') || undefined,
        actor: sp.get('actor') || undefined,
        from: sp.get('from') || undefined,
        to: sp.get('to') || undefined,
    };

    let rows;
    try {
        rows = await auditService.getLogs(supabase, filters, EXPORT_LIMIT);
    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Error al generar el reporte' },
            { status: 500 }
        );
    }

    const userMap = await auditService.getActorNames(supabase, rows);
    const enriched = auditService.enrich(rows, userMap);

    const headers = [
        'Fecha',
        'Hora',
        'Usuario',
        'ID Usuario',
        'Accion',
        'Entidad',
        'ID Entidad',
        'Detalle (JSON)',
    ];

    const dataLines = enriched.map((r) =>
        [
            csvCell(fmtBogota(r.created_at, { day: '2-digit', month: '2-digit', year: 'numeric' })),
            csvCell(
                fmtBogota(r.created_at, {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false,
                })
            ),
            csvCell(r.actor_name),
            csvCell(r.actor_user_id ?? ''),
            csvCell(r.action),
            csvCell(r.entity),
            csvCell(r.entity_id ?? ''),
            csvCell(r.payload ? JSON.stringify(r.payload) : ''),
        ].join(',')
    );

    // BOM (﻿) para que Excel reconozca UTF-8 (tildes y ñ).
    const csv = '﻿' + [headers.map(csvCell).join(','), ...dataLines].join('\r\n');

    const stamp = fmtBogota(new Date().toISOString(), {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).replace(/\//g, '-');

    return new NextResponse(csv, {
        status: 200,
        headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="auditoria_${stamp}.csv"`,
            'Cache-Control': 'no-store',
        },
    });
}
