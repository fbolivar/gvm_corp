import { createClient } from '@/lib/supabase/server';
import { settingsService } from '@/features/settings/services/settingsService';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, FileOutput } from 'lucide-react';
import { DeliveryNotePrintControls } from './DeliveryNotePrintControls';

interface DocumentLine {
    id: string;
    description: string;
    qty: number;
    product_id?: string | null;
    products?: { name?: string; sku?: string } | null;
}

interface Party {
    legal_name: string;
    doc_number?: string;
    doc_type?: string;
    address?: string;
    city?: string;
    phone?: string;
    email?: string;
    external_id?: string;
}

interface DocRow {
    id: string;
    number: string | null;
    issue_date: string;
    due_date: string | null;
    doc_type: string;
    status: string;
    parent_id: string | null;
    notes_public: string | null;
    notes_internal: string | null;
    party?: Party | null;
    document_lines: DocumentLine[];
}

function fmtDate(iso: string | null | undefined): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('es-CO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
}

function computeAccountingCode(name?: string): string {
    if (!name) return '411—';
    const firstToken = name.trim().split(/\s+/)[0] ?? '';
    return `411${firstToken.toUpperCase().slice(0, 10)}`;
}

export const dynamic = 'force-dynamic';

export default async function DeliveryNotePage({
    searchParams,
}: {
    searchParams: Promise<{ id?: string }>;
}) {
    const supabase = await createClient();
    const params = await searchParams;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const tenant = await settingsService.getTenantInfo(supabase);
    // Fallback local si no hay logo_url cargado en settings
    const logoSrc = tenant?.logo_url || '/logo-gvm.png';

    if (!params.id) {
        return (
            <div className="page-container">
                <div className="surface-card p-8 text-center">
                    <FileOutput className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                    <h2 className="text-h2 mb-1">Remisión</h2>
                    <p className="text-sm text-slate-500">Abre una remisión desde la lista de documentos para imprimirla.</p>
                </div>
            </div>
        );
    }

    const { data: rawDoc, error } = await supabase
        .from('documents')
        .select('*, party:parties(legal_name, doc_number, doc_type, address, city, phone, email), document_lines(*, products(name, sku))')
        .eq('id', params.id)
        .eq('doc_type', 'DELIVERY_NOTE')
        .single();

    if (error || !rawDoc) {
        return (
            <div className="page-container">
                <div className="surface-card p-8 text-center max-w-md mx-auto">
                    <FileOutput className="h-10 w-10 text-rose-300 mx-auto mb-3" />
                    <h2 className="text-h2 mb-1">Remisión no encontrada</h2>
                    <p className="text-sm text-slate-500 mb-4">El documento solicitado no existe o no es una remisión.</p>
                    <Link href="/documents" className="text-sm text-slate-900 hover:underline inline-flex items-center gap-1">
                        <ArrowLeft className="h-3.5 w-3.5" /> Volver a documentos
                    </Link>
                </div>
            </div>
        );
    }

    // Parent (pedido origen)
    let parent: { number: string | null; issue_date: string | null } | null = null;
    if (rawDoc.parent_id) {
        const { data: parentData } = await supabase
            .from('documents')
            .select('number, issue_date')
            .eq('id', rawDoc.parent_id)
            .maybeSingle();
        parent = parentData;
    }

    const doc = rawDoc as unknown as DocRow;
    const party = doc.party as Party | null;
    const lines = (doc.document_lines ?? []) as DocumentLine[];
    const totalQty = lines.reduce((s, l) => s + (Number(l.qty) || 0), 0);

    // Display number sin prefix REM- (como Dolibarr: REMISIÓN No.-05911)
    const displayNumber = (doc.number || '').replace(/^REM-/i, '') || '—';

    // Nombre de archivo al guardar como PDF: REMISION No-00001 - Cliente - 20-04-2026
    const clientName = (party?.legal_name || 'Cliente').replace(/[\\/:*?"<>|]/g, '').slice(0, 40).trim();
    const fileDate = (doc.issue_date || '').replaceAll('-', '-');
    const filename = `REMISION No-${displayNumber} - ${clientName} - ${fileDate}`;

    return (
        <>
            <style>{`
                @media screen {
                    .rm-doc { padding: 28px 36px; }
                }
                @media print {
                    /* Forzar A4 portrait estricto — evita que el navegador use otro tamaño de papel */
                    @page { size: 210mm 297mm; margin: 10mm; }
                    html, body {
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                        height: auto !important;
                        min-height: 0 !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .no-print { display: none !important; }
                    .rm-doc {
                        width: 100% !important;
                        max-width: 100% !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        font-size: 10px !important;
                        page-break-inside: avoid !important;
                        page-break-after: avoid !important;
                    }
                    .rm-table th, .rm-table td { padding: 3px 6px !important; }
                    .rm-table tbody tr.rm-empty td { height: 14px !important; }
                    .rm-logo { height: 60px !important; }
                    .rm-h1 { font-size: 15px !important; }
                    .rm-box { min-height: 90px !important; padding: 8px 12px !important; }
                }
                .rm-table { border-collapse: collapse; width: 100%; }
                .rm-table th, .rm-table td { border: 1px solid #94a3b8; padding: 4px 8px; }
                .rm-table tbody tr.rm-empty td { height: 18px; }
                .rm-box-gray { background: #f1f5f9; }
            `}</style>

            {/* Controles (solo pantalla) — auto-abre diálogo de impresión al cargar */}
            <DeliveryNotePrintControls docId={doc.id} filename={filename} />

            {/* ═══════════════════════ REMISIÓN (A4) ═══════════════════════ */}
            <div className="rm-doc max-w-[780px] mx-auto bg-white text-slate-900 font-sans text-[11px] leading-[1.45]">

                {/* HEADER: logo a la izquierda, "Hoja de envío" + datos a la derecha */}
                <div className="flex items-start justify-between mb-5">
                    {/* Logo */}
                    <div className="w-[170px]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={logoSrc}
                            alt={tenant?.name ?? 'GVM'}
                            className="rm-logo h-20 object-contain"
                        />
                    </div>

                    {/* Título + datos alineados a la derecha */}
                    <div className="text-right">
                        <h1 className="rm-h1 text-[18px] font-bold leading-tight mb-1">Hoja de envío</h1>
                        <div className="text-[11px] space-y-0">
                            <p><span>Ref. envío : </span><span className="font-semibold">REMISIÓN No.-{displayNumber}</span></p>
                            <p><span>Fecha prevista de entrega : </span><span className="font-semibold">{fmtDate(doc.due_date || doc.issue_date)}</span></p>
                            <p><span>Código de cliente : </span><span className="font-semibold">{party?.doc_number || '—'}</span></p>
                            <p><span>Código de contabilidad del cliente : </span><span className="font-semibold">{computeAccountingCode(party?.legal_name)}</span></p>
                        </div>
                        <div className="h-2" />
                        <div className="text-[11px] space-y-0">
                            <p><span>Ref. de orden : </span><span className="font-semibold">{parent?.number || '—'}</span></p>
                            <p><span>Fecha de orden : </span><span className="font-semibold">{fmtDate(parent?.issue_date || doc.issue_date)}</span></p>
                        </div>
                    </div>
                </div>

                {/* LABELS Remitente / Recipiente */}
                <div className="grid grid-cols-2 gap-4 mb-1">
                    <p className="text-[11px] text-slate-500">Remitente</p>
                    <p className="text-[11px] text-slate-500">Recipiente</p>
                </div>

                {/* CAJAS Remitente / Recipiente */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                    {/* Remitente (gris) */}
                    <div className="rm-box rm-box-gray border border-slate-300 rounded-sm px-3 py-2 min-h-[110px] text-[10.5px] leading-[1.5]">
                        <p className="font-bold">{tenant?.name ?? 'GVM VETERINARY MEDICINE S A S'}</p>
                        {tenant?.address && <p>{tenant.address}</p>}
                        {tenant?.city && <p>{tenant.city}</p>}
                        <div className="h-2" />
                        {tenant?.phone && <p>Teléfono: {tenant.phone} - Fax: {tenant.phone}</p>}
                        {tenant?.email && <p>Correo: {tenant.email}</p>}
                        {tenant?.website && <p>Web: {tenant.website}</p>}
                    </div>

                    {/* Recipiente (blanco con borde) */}
                    <div className="rm-box bg-white border border-slate-400 rounded-sm px-3 py-2 min-h-[110px] text-[10.5px] leading-[1.5]">
                        <p className="font-bold">{(party?.legal_name || 'Cliente').toUpperCase()}</p>
                        {party?.address && <p>{party.address}</p>}
                        {party?.city && <p>{party.city}</p>}
                        <div className="h-2" />
                        {party?.phone && <p>Teléfono: {party.phone}</p>}
                        {party?.email && <p>Correo: {party.email}</p>}
                        {party?.doc_number && <p>RUT: {party.doc_number}</p>}
                    </div>
                </div>

                {/* NOTA (span completo, con borde) — solo si hay contenido real */}
                {(doc.notes_public || doc.notes_internal) && (
                    <div className="border border-slate-300 rounded-sm px-3 py-1.5 mb-3 text-[10.5px]">
                        {doc.notes_public || doc.notes_internal}
                    </div>
                )}

                {/* TABLA */}
                <table className="rm-table mb-0 text-[11px]">
                    <thead>
                        <tr>
                            <th className="text-left font-normal w-[48%]">Descripción</th>
                            <th className="text-center font-normal w-[17%]">Peso / Vol.</th>
                            <th className="text-center font-normal w-[17%]">Cantidad pedida</th>
                            <th className="text-center font-normal w-[18%]">Cantidad a enviar</th>
                        </tr>
                    </thead>
                    <tbody>
                        {lines.map((line, idx) => {
                            const prodLabel = line.products?.sku
                                ? `${line.products.sku} - ${line.description || line.products.name || ''}`
                                : (line.description || line.products?.name || '—');
                            return (
                                <tr key={line.id || idx}>
                                    <td className="align-top">{prodLabel}</td>
                                    <td className="text-center align-top"></td>
                                    <td className="text-center align-top tabular-nums">
                                        {Number(line.qty).toLocaleString('es-CO')}
                                    </td>
                                    <td className="text-center align-top tabular-nums">
                                        {Number(line.qty).toLocaleString('es-CO')}
                                    </td>
                                </tr>
                            );
                        })}
                        {/* Filas vacías — dinámicas para llenar pero CABER en 1 página A4 */}
                        {Array.from({ length: Math.max(0, 12 - lines.length) }).map((_, i) => (
                            <tr key={`empty-${i}`} className="rm-empty">
                                <td></td>
                                <td></td>
                                <td></td>
                                <td></td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td className="text-center font-bold">Total</td>
                            <td></td>
                            <td className="text-center font-bold tabular-nums">{totalQty.toLocaleString('es-CO')}</td>
                            <td className="text-center font-bold tabular-nums">{totalQty.toLocaleString('es-CO')}</td>
                        </tr>
                    </tfoot>
                </table>

                {/* FIRMA */}
                <div className="mt-2 text-[10.5px] leading-[1.55]">
                    <p>Haber recibido los productos anteriores en buenas condiciones,</p>
                    <p>
                        Para
                        <span className="inline-block w-[200px] border-b border-slate-500 mx-1"></span>
                        el
                        <span className="inline-block w-[28px] border-b border-slate-500 mx-1"></span>
                        /
                        <span className="inline-block w-[36px] border-b border-slate-500 mx-1"></span>
                        /
                        <span className="inline-block w-[28px] border-b border-slate-500 mx-1"></span>
                    </p>
                    <p>Nombre y firma :</p>
                </div>

                {/* FOOTER */}
                <div className="mt-3 text-center text-[9.5px] text-slate-700 leading-[1.4]">
                    <p>R.U.T.: {tenant?.nit || '—'} - ID profesional 2: {tenant?.nit || '—'}</p>
                    <p>ID profesional 3: 4645 - RUT: {tenant?.nit || '—'}</p>
                </div>
                <div className="text-right text-[9.5px] text-slate-600 mt-1">1 / 1</div>
            </div>
        </>
    );
}
