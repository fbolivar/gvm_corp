import { createClient } from "@/lib/supabase/server";
import { settingsService } from "@/features/settings/services/settingsService";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import { DocSupportPrintControls } from "./DocSupportPrintControls";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DocLineRow {
    id: string;
    description: string;
    qty: number;
    unit_price: number;
    line_total: number;
    tax_config: { rate?: number; pct?: number } | null;
}

interface PartyRow {
    legal_name: string;
    nit: string | null;
    doc_number: string | null;
    dv: string | null;
    address: string | null;
    city: string | null;
    phone: string | null;
}

interface DocRow {
    id: string;
    number: string | null;
    doc_type: string;
    issue_date: string;
    due_date: string | null;
    status: string;
    subtotal: number;
    taxes: number;
    total: number;
    notes_internal: string | null;
    notes_public: string | null;
    party: PartyRow | null;
    document_lines: DocLineRow[];
}

interface DianResRow {
    resolution_number: string | null;
    prefix: string | null;
    from_number: number | null;
    to_number: number | null;
    valid_until: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtNumber(n: number): string {
    return n.toLocaleString("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtDateShort(iso: string | null | undefined): string {
    if (!iso) return "";
    const [year, month, day] = iso.split("-");
    return `${day}/${month}/${year}`;
}

// Number to words (Colombian pesos)
const UNITS = ["", "UNO", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE", "DIEZ", "ONCE", "DOCE", "TRECE", "CATORCE", "QUINCE", "DIECISEIS", "DIECISIETE", "DIECIOCHO", "DIECINUEVE", "VEINTE"];
const TENS = ["", "", "VEINTI", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];
const HUNDREDS = ["", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS", "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS"];

function hundredsToWords(n: number): string {
    if (n === 0) return "";
    if (n === 100) return "CIEN";
    if (n <= 20) return UNITS[n];
    if (n < 100) {
        const t = Math.floor(n / 10);
        const u = n % 10;
        if (t === 2) return u === 0 ? "VEINTE" : `VEINTI${UNITS[u]}`;
        return u === 0 ? TENS[t] : `${TENS[t]} Y ${UNITS[u]}`;
    }
    const h = Math.floor(n / 100);
    const rest = n % 100;
    return rest === 0 ? HUNDREDS[h] : `${HUNDREDS[h]} ${hundredsToWords(rest)}`;
}

function numberToWords(n: number): string {
    n = Math.floor(Math.abs(n));
    if (n === 0) return "CERO";
    const millones = Math.floor(n / 1_000_000);
    const miles = Math.floor((n % 1_000_000) / 1000);
    const resto = n % 1000;
    const parts: string[] = [];
    if (millones > 0) parts.push(millones === 1 ? "UN MILLON" : `${hundredsToWords(millones)} MILLONES`);
    if (miles > 0) parts.push(miles === 1 ? "MIL" : `${hundredsToWords(miles)} MIL`);
    if (resto > 0) parts.push(hundredsToWords(resto));
    return parts.join(" ");
}

function amountInWords(amount: number): string {
    return `${numberToWords(amount)} PESOS M/CTE`;
}

function parseInternalNumber(raw: string | null | undefined): string {
    const s = (raw || "").trim();
    const m = s.match(/(\d+)$/);
    return m?.[1] ?? s;
}

export const dynamic = "force-dynamic";

export default async function DocSupportPrintPage({
    searchParams,
}: {
    searchParams: Promise<{ id?: string }>;
}) {
    const supabase = await createClient();
    const params = await searchParams;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const tenant = await settingsService.getTenantInfo(supabase);

    if (!params.id) {
        return (
            <div className="page-container">
                <div className="surface-card p-8 text-center">
                    <FileText className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                    <h2 className="text-h2 mb-1">Documento Soporte</h2>
                    <p className="text-sm text-slate-500">Abre un DS desde la lista para imprimir.</p>
                </div>
            </div>
        );
    }

    const { data: rawDoc, error } = await supabase
        .from("documents")
        .select(`
            id, number, doc_type, issue_date, due_date, status,
            subtotal, taxes, total, notes_internal, notes_public,
            party:parties(legal_name, nit, doc_number, dv, address, city, phone),
            document_lines(id, description, qty, unit_price, line_total, tax_config)
        `)
        .eq("id", params.id)
        .eq("doc_type", "DOC_SUPPORT")
        .single();

    if (error || !rawDoc) {
        return (
            <div className="page-container">
                <div className="surface-card p-8 text-center max-w-md mx-auto">
                    <FileText className="h-10 w-10 text-rose-300 mx-auto mb-3" />
                    <h2 className="text-h2 mb-1">Documento no encontrado</h2>
                    <p className="text-sm text-slate-500 mb-4">El DS no existe o no es del tipo correcto.</p>
                    <Link href="/documents" className="text-sm text-slate-900 hover:underline inline-flex items-center gap-1">
                        <ArrowLeft className="h-3.5 w-3.5" /> Volver a documentos
                    </Link>
                </div>
            </div>
        );
    }

    const doc = rawDoc as unknown as DocRow;
    const party = doc.party;
    const lines = (doc.document_lines ?? []) as DocLineRow[];
    const consecutive = parseInternalNumber(doc.number);
    const prefix = (doc.number || "").match(/^([A-Z]+)/)?.[1] || "DS";

    // DIAN resolution for DS
    const { data: resRaw } = await supabase
        .from("dian_resolutions")
        .select("resolution_number, prefix, from_number, to_number, valid_until")
        .eq("doc_type", "DOC_SUPPORT")
        .eq("status", "ACTIVE")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
    const dianRes = resRaw as DianResRow | null;

    const partyName = (party?.legal_name || "—").toUpperCase();
    const partyId = party?.nit ? `${party.nit}${party.dv ? ` ${party.dv}` : ""}` : (party?.doc_number || "—");
    const concept = (doc.notes_public || doc.notes_internal || "—").toUpperCase();
    const subtotal = Number(doc.subtotal ?? 0);
    const total = Number(doc.total ?? subtotal);
    const retefuente = 0; // Placeholder — no tenemos campo específico aún
    const reteica = 0;
    const isClosed = doc.status === "SENT" || doc.status === "PAID" || doc.status === "APPROVED";

    const filename = `DS ${consecutive} - ${partyName.slice(0, 30)}`.trim();

    return (
        <>
            <style>{`
                @media screen { .ds-doc { padding: 24px 32px; } }
                @media print {
                    @page { size: 210mm 297mm; margin: 10mm; }
                    html, body { margin: 0 !important; padding: 0 !important; background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .no-print { display: none !important; }
                    .ds-doc { width: 100% !important; max-width: 100% !important; padding: 0 !important; margin: 0 !important; font-size: 10px !important; }
                }
                .ds-outer { border: 1px solid #111; border-collapse: collapse; width: 100%; }
                .ds-outer td { border: 1px solid #111; vertical-align: top; padding: 4px 8px; }
                .ds-head-gray { background: #d9d9d9; font-weight: 700; text-transform: uppercase; font-size: 9px; letter-spacing: 0.02em; }
                .ds-table { width: 100%; border-collapse: collapse; }
                .ds-table th, .ds-table td { border: 1px solid #111; padding: 4px 6px; font-size: 10px; vertical-align: top; }
                .ds-table th { background: #d9d9d9; text-transform: uppercase; font-size: 9px; letter-spacing: 0.02em; text-align: center; }
                .ds-num { text-align: right; font-variant-numeric: tabular-nums; }
            `}</style>

            <DocSupportPrintControls docId={doc.id} filename={filename} />

            {/* ═══════════════════════ DOCUMENTO SOPORTE ═══════════════════════ */}
            <div className="ds-doc max-w-[820px] mx-auto bg-white text-slate-900" style={{ fontFamily: "Arial, sans-serif", fontSize: "11px" }}>

                {/* ── Top header row: empresa + título + caja DS ─────────────── */}
                <table className="ds-outer">
                    <tbody>
                        <tr>
                            <td style={{ width: "30%", padding: "10px 12px", verticalAlign: "top" }}>
                                <div style={{ fontSize: "13px", fontWeight: 900, lineHeight: 1.15 }}>{tenant?.name ?? "—"}</div>
                                <div style={{ fontSize: "11px", marginTop: "6px" }}>
                                    <span style={{ fontWeight: 700 }}>Nit</span>
                                    <span style={{ marginLeft: "14px" }}>{tenant?.nit ?? "—"}{tenant?.dv ? ` ${tenant.dv}` : ""}</span>
                                </div>
                            </td>
                            <td style={{ width: "50%", padding: "10px 12px", verticalAlign: "top", textAlign: "left" }}>
                                <div style={{ fontSize: "11px", fontWeight: 600, lineHeight: 1.3 }}>
                                    Documento Soporte en Adquisiciones<br />Efectuadas a No Obligados a Facturar
                                </div>
                                <div style={{ fontSize: "10.5px", marginTop: "16px", textAlign: "right" }}>
                                    Cuenta de Cobro No.
                                </div>
                            </td>
                            <td style={{ width: "20%", padding: 0, verticalAlign: "top" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse", height: "100%" }}>
                                    <tbody>
                                        <tr>
                                            <td style={{ padding: "10px 4px", background: "#4a4a4a", color: "#fff", textAlign: "center", fontSize: "18px", fontWeight: 900, width: "35%", borderRight: "1px solid #111" }}>
                                                {prefix}
                                            </td>
                                            <td style={{ padding: "10px 4px", textAlign: "center", fontSize: "16px", fontWeight: 900, width: "65%" }}>
                                                {consecutive}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* ── NOMBRES Y APELLIDOS O RAZÓN SOCIAL... ─────────────────── */}
                <table className="ds-outer" style={{ borderTop: "none" }}>
                    <tbody>
                        <tr>
                            <td className="ds-head-gray" style={{ padding: "4px 8px" }}>
                                NOMBRES Y APELLIDOS O RAZÓN SOCIAL DEL VENDEDOR O QUIEN PRESTA EL SERVICIO
                            </td>
                        </tr>
                        <tr>
                            <td style={{ padding: "6px 8px", fontWeight: 600, fontSize: "11px", textTransform: "uppercase" }}>{partyName}</td>
                        </tr>
                    </tbody>
                </table>

                {/* ── Vendor info + DIAN authorization box ───────────────────── */}
                <table className="ds-outer" style={{ borderTop: "none" }}>
                    <tbody>
                        <tr>
                            <td style={{ width: "68%", padding: 0, verticalAlign: "top" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                    <tbody>
                                        <tr>
                                            <td className="ds-head-gray" style={{ padding: "3px 8px", borderRight: "1px solid #111", width: "22%" }}>NIT o C.C.</td>
                                            <td style={{ padding: "6px 8px", fontWeight: 600, fontSize: "11px" }}>{partyId}</td>
                                        </tr>
                                        <tr>
                                            <td className="ds-head-gray" style={{ padding: "3px 8px", borderRight: "1px solid #111", borderTop: "1px solid #111" }}>DIRECCION</td>
                                            <td style={{ padding: "6px 8px", fontSize: "11px", borderTop: "1px solid #111" }}>{party?.address || "—"}</td>
                                        </tr>
                                        <tr>
                                            <td className="ds-head-gray" style={{ padding: "3px 8px", borderRight: "1px solid #111", borderTop: "1px solid #111" }}>CIUDAD</td>
                                            <td style={{ padding: 0, borderTop: "1px solid #111" }}>
                                                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                                    <tbody>
                                                        <tr>
                                                            <td style={{ padding: "6px 8px", fontSize: "11px", width: "50%", borderRight: "1px solid #111" }}>{party?.city || "—"}</td>
                                                            <td className="ds-head-gray" style={{ padding: "3px 8px", width: "20%", borderRight: "1px solid #111" }}>TELÉFONO</td>
                                                            <td style={{ padding: "6px 8px", fontSize: "11px", width: "30%" }}>{party?.phone || "—"}</td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </td>
                            <td style={{ width: "32%", padding: "6px 8px", fontSize: "10px", verticalAlign: "top", textAlign: "center", lineHeight: 1.4 }}>
                                {dianRes ? (
                                    <>
                                        Documento Oficial de Autorización de Numeración Facturación Electrónica No. <strong>{dianRes.resolution_number}</strong> que habilita desde {prefix} {dianRes.from_number} hasta {prefix} {dianRes.to_number}.
                                        {dianRes.valid_until && <> Vence {dianRes.valid_until}</>}
                                    </>
                                ) : (
                                    <span style={{ color: "#6b7280", fontStyle: "italic" }}>
                                        Sin resolución DIAN configurada para DS
                                    </span>
                                )}
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* ── FECHA OPERACIÓN / POR CONCEPTO DE ────────────────────── */}
                <table className="ds-outer" style={{ borderTop: "none" }}>
                    <tbody>
                        <tr>
                            <td className="ds-head-gray" style={{ padding: "3px 8px", borderRight: "1px solid #111", width: "22%" }}>FECHA OPERACIÓN</td>
                            <td className="ds-head-gray" style={{ padding: "3px 8px" }}>POR CONCEPTO DE</td>
                        </tr>
                        <tr>
                            <td style={{ padding: "6px 8px", fontWeight: 600, fontSize: "11px", borderRight: "1px solid #111" }}>{fmtDateShort(doc.issue_date)}</td>
                            <td style={{ padding: "6px 8px", fontWeight: 600, fontSize: "11px", textTransform: "uppercase" }}>{concept}</td>
                        </tr>
                    </tbody>
                </table>

                {/* ── Description / Value table ────────────────────────────── */}
                <table className="ds-table" style={{ borderTop: "none" }}>
                    <thead>
                        <tr>
                            <th style={{ width: "85%", textAlign: "center" }}>Descripción</th>
                            <th style={{ width: "15%" }} className="ds-num">Valor</th>
                        </tr>
                    </thead>
                    <tbody>
                        {lines.length === 0 && (
                            <tr>
                                <td colSpan={2} style={{ padding: "16px", textAlign: "center", color: "#6b7280" }}>
                                    Sin líneas.
                                </td>
                            </tr>
                        )}
                        {lines.map((l) => (
                            <tr key={l.id}>
                                <td style={{ fontSize: "10.5px" }}>{l.description}</td>
                                <td className="ds-num">{fmtNumber(Number(l.line_total ?? l.qty * l.unit_price))}</td>
                            </tr>
                        ))}
                        {isClosed && (
                            <tr>
                                <td colSpan={2} style={{ padding: "8px", textAlign: "center", fontWeight: 700, letterSpacing: "0.15em" }}>
                                    ********* CERRADA *********
                                </td>
                            </tr>
                        )}
                        {/* Filler rows */}
                        {Array.from({ length: Math.max(0, 4 - lines.length - (isClosed ? 1 : 0)) }).map((_, i) => (
                            <tr key={`f-${i}`} style={{ height: "22px" }}>
                                <td>&nbsp;</td>
                                <td>&nbsp;</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* ── Footer: Valor en Letras + Totales ────────────────────── */}
                <table className="ds-outer" style={{ borderTop: "none" }}>
                    <tbody>
                        <tr>
                            <td rowSpan={4} style={{ width: "60%", padding: "8px", verticalAlign: "top" }}>
                                <div className="ds-head-gray" style={{ padding: "3px 6px", display: "inline-block", marginBottom: "6px" }}>Valor en Letras</div>
                                <div style={{ fontSize: "10.5px", textTransform: "uppercase", fontWeight: 600, lineHeight: 1.4 }}>
                                    {amountInWords(total)}
                                </div>
                            </td>
                            <td className="ds-head-gray" style={{ padding: "4px 8px", borderRight: "1px solid #111", width: "22%" }}>SUBTOTAL</td>
                            <td className="ds-num" style={{ padding: "4px 8px", fontWeight: 700, width: "18%" }}>{fmtNumber(subtotal)}</td>
                        </tr>
                        <tr>
                            <td className="ds-head-gray" style={{ padding: "4px 8px", borderRight: "1px solid #111" }}>RETEFUENTE</td>
                            <td className="ds-num" style={{ padding: "4px 8px" }}>{fmtNumber(retefuente)}</td>
                        </tr>
                        <tr>
                            <td className="ds-head-gray" style={{ padding: "4px 8px", borderRight: "1px solid #111" }}>RETEICA</td>
                            <td className="ds-num" style={{ padding: "4px 8px" }}>{fmtNumber(reteica)}</td>
                        </tr>
                        <tr>
                            <td className="ds-head-gray" style={{ padding: "4px 8px", borderRight: "1px solid #111", fontWeight: 900 }}>TOTAL DOCUMENTO</td>
                            <td className="ds-num" style={{ padding: "4px 8px", fontWeight: 900 }}>{fmtNumber(total)}</td>
                        </tr>
                    </tbody>
                </table>

                {/* ── Signature line ───────────────────────────────────────── */}
                <div style={{ padding: "24px 8px 6px 8px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "16px" }}>
                    <div style={{ flex: 1, borderBottom: "1px solid #111", fontSize: "11px", paddingBottom: "2px" }}>
                        Firma del Vendedor o quien presta el servicio
                    </div>
                    <div style={{ width: "180px", borderBottom: "1px solid #111", fontSize: "11px", paddingBottom: "2px" }}>
                        C.C.
                    </div>
                </div>

                <div style={{ textAlign: "center", marginTop: "10px", fontSize: "9px", color: "#6b7280" }}>
                    <p>
                        {tenant?.name ?? "—"} · NIT {tenant?.nit ?? "—"}{tenant?.dv ? `-${tenant.dv}` : ""}
                        {tenant?.city && ` · ${tenant.city}`}
                    </p>
                </div>
            </div>
        </>
    );
}
