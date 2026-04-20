import { createClient } from '@/lib/supabase/server';
import { settingsService } from '@/features/settings/services/settingsService';
import { PrintButton } from '@/features/accounting/components/PrintButton';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, FileOutput } from 'lucide-react';

interface DocumentLine {
    id: string;
    description: string;
    qty: number;
    product_id?: string | null;
    products?: { name?: string; sku?: string; weight?: number } | null;
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
    parent?: { number: string | null; issue_date: string | null } | null;
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

    // Resolver info del pedido origen (parent)
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

    return (
        <>
            {/* Estilos de impresión */}
            <style>{`
                @media print {
                    @page { size: A4; margin: 12mm; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .no-print { display: none !important; }
                    .print-card { box-shadow: none !important; border: none !important; }
                }
            `}</style>

            {/* Controles (ocultos en impresión) */}
            <div className="no-print page-container pb-0">
                <div className="flex items-center justify-between mb-4">
                    <Link
                        href={`/documents/${doc.id}`}
                        className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900"
                    >
                        <ArrowLeft className="h-4 w-4" /> Volver al detalle
                    </Link>
                    <PrintButton />
                </div>
            </div>

            {/* Documento imprimible */}
            <div className="max-w-4xl mx-auto bg-white px-10 py-8 text-slate-900 text-[11px] leading-relaxed print:px-0 print:py-0">
                {/* ══════════ Encabezado ══════════ */}
                <div className="flex items-start justify-between mb-8">
                    {/* Logo */}
                    <div className="w-40">
                        {tenant?.logo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={tenant.logo_url} alt={tenant.name} className="h-20 object-contain" />
                        ) : (
                            <div className="h-20 w-20 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 font-bold">
                                LOGO
                            </div>
                        )}
                    </div>

                    {/* Hoja de envío (encabezado con datos clave) */}
                    <div className="text-right space-y-0.5">
                        <h1 className="text-lg font-bold mb-2">Hoja de envío</h1>
                        <p><span className="text-slate-600">Ref. envío : </span><span className="font-semibold">REMISIÓN No.-{doc.number || '—'}</span></p>
                        <p><span className="text-slate-600">Fecha prevista de entrega : </span><span className="font-semibold">{fmtDate(doc.due_date || doc.issue_date)}</span></p>
                        {party?.doc_number && (
                            <p><span className="text-slate-600">Código de cliente : </span><span className="font-semibold">{party.doc_number}</span></p>
                        )}
                        {party?.legal_name && (
                            <p><span className="text-slate-600">Código de contabilidad del cliente : </span><span className="font-semibold">411{party.legal_name.split(' ')[0].toUpperCase()}</span></p>
                        )}
                        <div className="h-2" />
                        <p><span className="text-slate-600">Ref. de orden : </span><span className="font-semibold">{parent?.number || '—'}</span></p>
                        <p><span className="text-slate-600">Fecha de orden : </span><span className="font-semibold">{fmtDate(parent?.issue_date || doc.issue_date)}</span></p>
                    </div>
                </div>

                {/* ══════════ Remitente / Recipiente ══════════ */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                        <p className="text-slate-500 mb-1">Remitente</p>
                        <div className="bg-slate-100 p-3 rounded border border-slate-200 min-h-[130px] text-[10.5px]">
                            <p className="font-bold mb-1">{tenant?.name ?? 'GVM VETERINARY MEDICINE S A S'}</p>
                            {tenant?.address && <p>{tenant.address}</p>}
                            {tenant?.city && <p>{tenant.city}</p>}
                            <div className="h-2" />
                            {tenant?.phone && <p>Teléfono: {tenant.phone}</p>}
                            {tenant?.email && <p>Correo: {tenant.email}</p>}
                            {tenant?.website && <p>Web: {tenant.website}</p>}
                        </div>
                    </div>

                    <div>
                        <p className="text-slate-500 mb-1">Recipiente</p>
                        <div className="p-3 rounded border border-slate-300 min-h-[130px] text-[10.5px]">
                            <p className="font-bold mb-1">{party?.legal_name || 'Cliente'}</p>
                            {party?.address && <p>{party.address}</p>}
                            {party?.city && <p>{party.city}</p>}
                            <div className="h-2" />
                            {party?.phone && <p>Teléfono: {party.phone}</p>}
                            {party?.email && <p>Correo: {party.email}</p>}
                            {party?.doc_number && (
                                <p>RUT: {party.doc_number}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* ══════════ Notas ══════════ */}
                {(doc.notes_public || doc.notes_internal) && (
                    <div className="border border-slate-300 p-3 mb-4 text-[10.5px]">
                        {doc.notes_public && <p>{doc.notes_public}</p>}
                        {doc.notes_internal && !doc.notes_public && <p>{doc.notes_internal}</p>}
                    </div>
                )}

                {/* ══════════ Tabla de líneas ══════════ */}
                <table className="w-full border-collapse mb-2">
                    <thead>
                        <tr className="border-y border-slate-400">
                            <th className="text-left py-2 px-2 font-normal text-[11px]">Descripción</th>
                            <th className="text-center py-2 px-2 font-normal text-[11px] w-[90px] border-l border-slate-400">Peso / Vol.</th>
                            <th className="text-center py-2 px-2 font-normal text-[11px] w-[110px] border-l border-slate-400">Cantidad pedida</th>
                            <th className="text-center py-2 px-2 font-normal text-[11px] w-[110px] border-l border-slate-400">Cantidad a enviar</th>
                        </tr>
                    </thead>
                    <tbody>
                        {lines.map((line, idx) => {
                            const prodLabel = line.products?.sku
                                ? `${line.products.sku} - ${line.description || line.products.name || ''}`
                                : (line.description || line.products?.name || '—');
                            return (
                                <tr key={line.id || idx} className="border-b border-slate-200">
                                    <td className="py-2 px-2 align-top text-[10.5px]">{prodLabel}</td>
                                    <td className="py-2 px-2 align-top text-center text-[10.5px] border-l border-slate-200">
                                        {line.products?.weight ? `${line.products.weight} kg` : ''}
                                    </td>
                                    <td className="py-2 px-2 align-top text-center text-[10.5px] border-l border-slate-200 tabular-nums">
                                        {Number(line.qty).toLocaleString('es-CO')}
                                    </td>
                                    <td className="py-2 px-2 align-top text-center text-[10.5px] border-l border-slate-200 tabular-nums">
                                        {Number(line.qty).toLocaleString('es-CO')}
                                    </td>
                                </tr>
                            );
                        })}
                        {/* Filas vacías para llenar espacio visual (como Dolibarr) */}
                        {Array.from({ length: Math.max(0, 12 - lines.length) }).map((_, i) => (
                            <tr key={`empty-${i}`} className="border-b border-slate-100 h-6">
                                <td className="py-2 px-2"></td>
                                <td className="py-2 px-2 border-l border-slate-100"></td>
                                <td className="py-2 px-2 border-l border-slate-100"></td>
                                <td className="py-2 px-2 border-l border-slate-100"></td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="border-t-2 border-slate-400">
                            <td className="py-2 px-2 font-bold text-center text-[11px]">Total</td>
                            <td className="py-2 px-2 border-l border-slate-400"></td>
                            <td className="py-2 px-2 text-center font-bold text-[11px] border-l border-slate-400 tabular-nums">
                                {totalQty.toLocaleString('es-CO')}
                            </td>
                            <td className="py-2 px-2 text-center font-bold text-[11px] border-l border-slate-400 tabular-nums">
                                {totalQty.toLocaleString('es-CO')}
                            </td>
                        </tr>
                    </tfoot>
                </table>

                {/* ══════════ Firma ══════════ */}
                <div className="mt-6 text-[10.5px] leading-loose">
                    <p>Haber recibido los productos anteriores en buenas condiciones,</p>
                    <p>
                        Para<span className="inline-block w-[200px] border-b border-slate-400 mx-1"></span>
                        el <span className="inline-block w-[30px] border-b border-slate-400 mx-1"></span>
                        / <span className="inline-block w-[30px] border-b border-slate-400 mx-1"></span>
                        / <span className="inline-block w-[30px] border-b border-slate-400 mx-1"></span>
                    </p>
                    <p className="mt-1">Nombre y firma :</p>
                </div>

                {/* ══════════ Footer ══════════ */}
                <div className="mt-10 text-center text-[9.5px] text-slate-600 space-y-0.5">
                    <p>
                        R.U.T.: {tenant?.nit || '—'} - ID profesional 2: {tenant?.nit || '—'}
                    </p>
                    <p>
                        ID profesional 3: 4645 - RUT: {tenant?.nit || '—'}
                    </p>
                </div>
                <div className="text-right text-[9.5px] text-slate-500 mt-2">1 / 1</div>
            </div>
        </>
    );
}
