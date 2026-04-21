import { createClient } from "@/lib/supabase/server";
import { settingsService } from "@/features/settings/services/settingsService";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Receipt } from "lucide-react";
import { VendorBillPrintControls } from "./VendorBillPrintControls";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DocumentLineRow {
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
    document_lines: DocumentLineRow[];
}

interface AccountingRow {
    code: string;
    description: string;
    concept: string;
    party: string;
    debit: number;
    credit: number;
    pct: number | null;
    base: number | null;
    creditDocRef: string | null;
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

function parseInternalNumber(raw: string | null | undefined): { year: string; consecutive: string } {
    const s = (raw || "").trim();
    const m = s.match(/(\d{4}).*?(\d+)$/);
    if (m) return { year: m[1], consecutive: m[2] };
    const lastDigits = s.match(/(\d+)$/);
    return { year: new Date().getFullYear().toString(), consecutive: lastDigits?.[1] ?? s };
}

function extractExternalNumber(internal: string, notesInternal: string | null): string {
    // Priority 1: "EXT:12345" in notes_internal
    const extMatch = (notesInternal || "").match(/EXT[:\s]*([\w\d-]+)/i);
    if (extMatch) return extMatch[1];
    // Priority 2: first token in notes
    if (notesInternal) {
        const t = notesInternal.trim().split(/\s+/)[0];
        if (t && /^[\w\d-]+$/.test(t)) return t;
    }
    // Fallback: same as internal consecutive
    return internal;
}

export const dynamic = "force-dynamic";

export default async function VendorBillPrintPage({
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
                    <Receipt className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                    <h2 className="text-h2 mb-1">Factura de Compra</h2>
                    <p className="text-sm text-slate-500">Abre una factura desde la lista para imprimir.</p>
                </div>
            </div>
        );
    }

    const { data: rawDoc, error } = await supabase
        .from("documents")
        .select(`
            id, number, doc_type, issue_date, due_date, status,
            subtotal, taxes, total, notes_internal, notes_public,
            party:parties(legal_name, nit, doc_number, dv),
            document_lines(id, description, qty, unit_price, line_total, tax_config)
        `)
        .eq("id", params.id)
        .eq("doc_type", "VENDOR_BILL")
        .single();

    if (error || !rawDoc) {
        return (
            <div className="page-container">
                <div className="surface-card p-8 text-center max-w-md mx-auto">
                    <Receipt className="h-10 w-10 text-rose-300 mx-auto mb-3" />
                    <h2 className="text-h2 mb-1">Factura no encontrada</h2>
                    <p className="text-sm text-slate-500 mb-4">El documento no existe o no es una factura de compra.</p>
                    <Link href="/purchasing/bills" className="text-sm text-slate-900 hover:underline inline-flex items-center gap-1">
                        <ArrowLeft className="h-3.5 w-3.5" /> Volver a facturas
                    </Link>
                </div>
            </div>
        );
    }

    const doc = rawDoc as unknown as DocRow;
    const party = doc.party;
    const lines = (doc.document_lines ?? []) as DocumentLineRow[];

    const { year, consecutive } = parseInternalNumber(doc.number);
    const externalNumber = extractExternalNumber(consecutive, doc.notes_internal);
    const partyName = (party?.legal_name || "—").toUpperCase();
    const partyId = party?.nit ? `${party.nit}${party.dv ? ` ${party.dv}` : ""}` : (party?.doc_number || "—");
    const concept = (doc.notes_public || doc.notes_internal || `FC${externalNumber}`).toUpperCase();

    // ── Resolve elaborated-by from current user profile ──────────────────────
    const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", user.id)
        .maybeSingle();
    const elaboratedBy = (profile?.full_name || profile?.email?.split("@")[0] || "—").toUpperCase();

    // ── Synthesize accounting entries (Debit expense / Debit IVA / Credit AP) ──
    // Aggregate tax by rate
    const taxByRate = new Map<number, { base: number; tax: number }>();
    for (const l of lines) {
        const base = Number(l.line_total ?? l.qty * l.unit_price);
        const rate = Number(l.tax_config?.rate ?? l.tax_config?.pct ?? 0) / (l.tax_config?.rate != null && Number(l.tax_config?.rate) > 1 ? 100 : 1);
        const taxAmount = base * rate;
        const key = Number(rate.toFixed(4));
        const cur = taxByRate.get(key) ?? { base: 0, tax: 0 };
        cur.base += base;
        cur.tax += taxAmount;
        taxByRate.set(key, cur);
    }

    const subtotal = Number(doc.subtotal ?? 0);
    const totalTaxes = Number(doc.taxes ?? 0);
    const total = Number(doc.total ?? subtotal + totalTaxes);

    const creditDocRef = `FC ${year} ${consecutive}`;

    const accountingRows: AccountingRow[] = [];

    // 1) DEBIT expense (consolidated)
    accountingRows.push({
        code: "529595",
        description: "OTROS",
        concept,
        party: partyName,
        debit: subtotal,
        credit: 0,
        pct: null,
        base: null,
        creditDocRef: null,
    });

    // 2) CREDIT vendor (AP)
    accountingRows.push({
        code: "233595",
        description: "OTROS",
        concept,
        party: partyName,
        debit: 0,
        credit: total,
        pct: null,
        base: null,
        creditDocRef,
    });

    // 3) DEBIT IVA descontable (por rate distinto de 0)
    for (const [rate, { base, tax }] of taxByRate.entries()) {
        if (rate === 0 || tax === 0) continue;
        const pct = Math.round(rate * 100);
        const code = pct === 19 ? "24080301" : pct === 5 ? "24080302" : "2408";
        accountingRows.push({
            code,
            description: `IVA COMPRAS ${pct}% - POR APLICAR`,
            concept,
            party: partyName,
            debit: tax,
            credit: 0,
            pct: rate,
            base,
            creditDocRef: null,
        });
    }

    const totalDebit = accountingRows.reduce((s, r) => s + r.debit, 0);
    const totalCredit = accountingRows.reduce((s, r) => s + r.credit, 0);

    const filename = `FACTURA COMPRA ${consecutive} - ${partyName.slice(0, 30)}`.trim();

    return (
        <>
            <style>{`
                @media screen {
                    .fc-doc { padding: 24px 32px; }
                }
                @media print {
                    @page { size: 210mm 297mm; margin: 10mm; }
                    html, body {
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .no-print { display: none !important; }
                    .fc-doc {
                        width: 100% !important;
                        max-width: 100% !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        font-size: 10px !important;
                    }
                }
                .fc-outer { border: 1px solid #111; border-collapse: collapse; width: 100%; }
                .fc-outer td { border: 1px solid #111; vertical-align: top; padding: 4px 8px; }
                .fc-head-gray { background: #d9d9d9; font-weight: 700; text-transform: uppercase; font-size: 9px; letter-spacing: 0.02em; }
                .fc-table { width: 100%; border-collapse: collapse; }
                .fc-table th, .fc-table td { border: 1px solid #111; padding: 4px 6px; font-size: 10px; vertical-align: top; }
                .fc-table th { background: #d9d9d9; text-transform: uppercase; font-size: 9px; letter-spacing: 0.02em; text-align: left; }
                .fc-num { text-align: right; font-variant-numeric: tabular-nums; }
            `}</style>

            <VendorBillPrintControls docId={doc.id} filename={filename} />

            {/* ═══════════════════════ FACTURA DE COMPRA ═══════════════════════ */}
            <div className="fc-doc max-w-[820px] mx-auto bg-white text-slate-900" style={{ fontFamily: "Arial, sans-serif", fontSize: "11px" }}>

                {/* ── Empresa header (simple centered) ───────────────────────── */}
                <div style={{ textAlign: "center", fontSize: "14px", fontWeight: 900, padding: "6px 0 10px", letterSpacing: "0.02em" }}>
                    {tenant?.name ?? "—"}
                </div>

                {/* ── Title block: Factura de Compra | No. | N° Doc Externo ─── */}
                <table className="fc-outer">
                    <tbody>
                        <tr>
                            <td style={{ width: "35%", padding: "10px 12px", background: "#f3f4f6" }}>
                                <div style={{ fontSize: "18px", fontWeight: 900 }}>Factura de Compra</div>
                            </td>
                            <td style={{ width: "20%", padding: "10px 12px", textAlign: "center", fontSize: "18px", fontWeight: 900 }}>
                                {consecutive}
                            </td>
                            <td style={{ width: "25%", padding: "6px 12px", textAlign: "center", fontSize: "11px", fontWeight: 600 }}>
                                N° Documento<br />Externo
                            </td>
                            <td style={{ width: "20%", padding: "10px 12px", textAlign: "center", fontSize: "18px", fontWeight: 900 }}>
                                {externalNumber}
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* ── BENEFICIARIO / N° IDENTIFICACION ─────────────────────── */}
                <table className="fc-outer" style={{ borderTop: "none" }}>
                    <tbody>
                        <tr>
                            <td className="fc-head-gray" style={{ width: "70%", padding: "4px 8px", textAlign: "center" }}>BENEFICIARIO</td>
                            <td className="fc-head-gray" style={{ width: "30%", padding: "4px 8px", textAlign: "center" }}>N° IDENTIFICACIÓN</td>
                        </tr>
                        <tr>
                            <td style={{ padding: "6px 8px", fontWeight: 700, fontSize: "11px", textTransform: "uppercase" }}>
                                {partyName}
                            </td>
                            <td style={{ padding: "6px 8px", fontWeight: 700, fontSize: "11px" }}>
                                {partyId}
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* ── FECHA DOCUMENTO / FECHA VENCIMIENTO ──────────────────── */}
                <table className="fc-outer" style={{ borderTop: "none" }}>
                    <tbody>
                        <tr>
                            <td className="fc-head-gray" style={{ width: "22%", padding: "4px 8px", textAlign: "center" }}>FECHA DOCUMENTO</td>
                            <td style={{ width: "28%", padding: "6px 8px", fontWeight: 600, textAlign: "center" }}>{fmtDateShort(doc.issue_date)}</td>
                            <td className="fc-head-gray" style={{ width: "22%", padding: "4px 8px", textAlign: "center" }}>FECHA VENCIMIENTO</td>
                            <td style={{ width: "28%", padding: "6px 8px", fontWeight: 600, textAlign: "center" }}>{fmtDateShort(doc.due_date)}</td>
                        </tr>
                    </tbody>
                </table>

                {/* ── POR CONCEPTO DE ─────────────────────────────────────── */}
                <table className="fc-outer" style={{ borderTop: "none" }}>
                    <tbody>
                        <tr>
                            <td className="fc-head-gray" style={{ width: "22%", padding: "4px 8px" }}>POR CONCEPTO DE</td>
                            <td style={{ padding: "6px 8px", fontWeight: 600, fontSize: "11px" }}>{concept}</td>
                        </tr>
                    </tbody>
                </table>

                {/* ── Accounting table ────────────────────────────────────── */}
                <table className="fc-table" style={{ borderTop: "none" }}>
                    <thead>
                        <tr>
                            <th style={{ width: "11%" }}>Cuenta Contable</th>
                            <th style={{ width: "18%" }}>Descripción</th>
                            <th style={{ width: "18%" }}>Tercero</th>
                            <th style={{ width: "13%" }} className="fc-num">Débito</th>
                            <th style={{ width: "13%" }} className="fc-num">Crédito</th>
                            <th style={{ width: "7%" }} className="fc-num">%</th>
                            <th style={{ width: "10%" }} className="fc-num">Base</th>
                            <th style={{ width: "10%" }}>Abona a Doc</th>
                        </tr>
                    </thead>
                    <tbody>
                        {accountingRows.map((r, i) => (
                            <tr key={i}>
                                <td style={{ fontWeight: 700 }}>{r.code}</td>
                                <td style={{ textTransform: "uppercase" }}>{r.description}</td>
                                <td style={{ fontSize: "9.5px" }}>
                                    <div style={{ fontWeight: 600 }}>{r.concept}</div>
                                    <div style={{ color: "#555" }}>{r.party.slice(0, 28)}</div>
                                </td>
                                <td className="fc-num">{r.debit > 0 ? fmtNumber(r.debit) : "0"}</td>
                                <td className="fc-num">{r.credit > 0 ? fmtNumber(r.credit) : "0"}</td>
                                <td className="fc-num">{r.pct != null ? r.pct.toFixed(4).replace(".", ",") : ""}</td>
                                <td className="fc-num">{r.base != null ? fmtNumber(r.base) : ""}</td>
                                <td style={{ fontSize: "9.5px", fontWeight: 600 }}>{r.creditDocRef || ""}</td>
                            </tr>
                        ))}
                        {/* Filler rows to give the table breathing space */}
                        {Array.from({ length: Math.max(0, 6 - accountingRows.length) }).map((_, i) => (
                            <tr key={`filler-${i}`} style={{ height: "22px" }}>
                                <td>&nbsp;</td>
                                <td>&nbsp;</td>
                                <td>&nbsp;</td>
                                <td>&nbsp;</td>
                                <td>&nbsp;</td>
                                <td>&nbsp;</td>
                                <td>&nbsp;</td>
                                <td>&nbsp;</td>
                            </tr>
                        ))}
                        {/* TOTAL row */}
                        <tr>
                            <td colSpan={3} className="fc-head-gray" style={{ padding: "6px 8px", textAlign: "right", fontWeight: 700 }}>TOTAL</td>
                            <td className="fc-num" style={{ fontWeight: 700 }}>{fmtNumber(totalDebit)}</td>
                            <td className="fc-num" style={{ fontWeight: 700 }}>{fmtNumber(totalCredit)}</td>
                            <td>&nbsp;</td>
                            <td>&nbsp;</td>
                            <td>&nbsp;</td>
                        </tr>
                    </tbody>
                </table>

                {/* ── Signatures block ─────────────────────────────────────── */}
                <table className="fc-outer" style={{ borderTop: "none" }}>
                    <tbody>
                        <tr>
                            <td className="fc-head-gray" style={{ width: "18%", padding: "6px 8px", fontWeight: 700, fontSize: "9.5px", textAlign: "center" }}>Elaborado Por:</td>
                            <td style={{ width: "40%", padding: "6px 8px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>{elaboratedBy}</td>
                            <td rowSpan={2} style={{ width: "42%", padding: "6px 8px", verticalAlign: "top" }}>
                                <div style={{ fontSize: "9px", fontWeight: 700, textTransform: "uppercase" }}>FIRMA Y SELLO</div>
                                <div style={{ height: "32px" }}>&nbsp;</div>
                                <div style={{ fontSize: "9px", fontWeight: 700, textTransform: "uppercase", borderTop: "1px solid #111", paddingTop: "3px" }}>CC/NIT</div>
                            </td>
                        </tr>
                        <tr>
                            <td className="fc-head-gray" style={{ padding: "6px 8px", fontWeight: 700, fontSize: "9.5px", textAlign: "center" }}>Revisado y<br />Aprobado Por:</td>
                            <td style={{ padding: "6px 8px", fontSize: "11px" }}>&nbsp;</td>
                        </tr>
                    </tbody>
                </table>

                <div style={{ textAlign: "center", marginTop: "10px", fontSize: "9px", color: "#6b7280" }}>
                    <p>
                        Factura de compra {doc.number || "—"} · NIT {tenant?.nit ?? "—"}{tenant?.dv ? `-${tenant.dv}` : ""}
                        {tenant?.city && ` · ${tenant.city}`}
                    </p>
                </div>
            </div>
        </>
    );
}
