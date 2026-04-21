import { createClient } from "@/lib/supabase/server";
import { settingsService } from "@/features/settings/services/settingsService";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Package } from "lucide-react";
import { WarehouseEntryPrintControls } from "./WarehouseEntryPrintControls";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TransferLineRow {
    id: string;
    product_id: string;
    qty: number;
    qty_received: number;
    notes: string | null;
    product: {
        name: string;
        sku: string;
        uom: string | null;
        cost: number | null;
    } | null;
}

interface TransferRow {
    id: string;
    transfer_number: string | null;
    status: string;
    notes: string | null;
    transferred_at: string | null;
    received_at: string | null;
    created_at: string | null;
    from_warehouse: { name: string } | null;
    to_warehouse: { name: string } | null;
    lines: TransferLineRow[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtNumber(n: number): string {
    return n.toLocaleString("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtDateLong(iso: string | null | undefined): string {
    if (!iso) return "—";
    const d = new Date(iso);
    const days = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
    const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
    return `${days[d.getDay()]}, ${d.getDate()} de ${months[d.getMonth()]} de ${d.getFullYear()}`;
}

// ─── Number to words (Colombian pesos) ───────────────────────────────────────

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

// Extract year + consecutive from transfer_number like "TR-2026-250" or "TR 2026 250"
function parseTransferNumber(raw: string | null | undefined): { year: string; number: string; display: string } {
    const s = (raw || "").trim();
    if (!s) return { year: new Date().getFullYear().toString(), number: "—", display: "—" };
    const m = s.match(/(\d{4})\D+(\d+)/);
    if (m) return { year: m[1], number: m[2], display: `${m[1]} ${m[2]}` };
    return { year: new Date().getFullYear().toString(), number: s, display: s };
}

export const dynamic = "force-dynamic";

export default async function WarehouseEntryPrintPage({
    searchParams,
}: {
    searchParams: Promise<{ id?: string }>;
}) {
    const supabase = await createClient();
    const params = await searchParams;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const tenant = await settingsService.getTenantInfo(supabase);
    const logoSrc = tenant?.logo_url || "/logo-gvm.png";

    if (!params.id) {
        return (
            <div className="page-container">
                <div className="surface-card p-8 text-center">
                    <Package className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                    <h2 className="text-h2 mb-1">Entrada de Almacén</h2>
                    <p className="text-sm text-slate-500">Abre un traslado desde la lista para imprimir su entrada.</p>
                </div>
            </div>
        );
    }

    const { data: rawTransfer, error } = await supabase
        .from("warehouse_transfers")
        .select(`
            id, transfer_number, status, notes, transferred_at, received_at, created_at,
            from_warehouse:warehouses!from_warehouse_id(name),
            to_warehouse:warehouses!to_warehouse_id(name),
            lines:warehouse_transfer_lines(
                id, product_id, qty, qty_received, notes,
                product:products(name, sku, uom, cost)
            )
        `)
        .eq("id", params.id)
        .single();

    if (error || !rawTransfer) {
        return (
            <div className="page-container">
                <div className="surface-card p-8 text-center max-w-md mx-auto">
                    <Package className="h-10 w-10 text-rose-300 mx-auto mb-3" />
                    <h2 className="text-h2 mb-1">Traslado no encontrado</h2>
                    <p className="text-sm text-slate-500 mb-4">El documento solicitado no existe.</p>
                    <Link href="/inventory/transfers" className="text-sm text-slate-900 hover:underline inline-flex items-center gap-1">
                        <ArrowLeft className="h-3.5 w-3.5" /> Volver a traslados
                    </Link>
                </div>
            </div>
        );
    }

    const transfer = rawTransfer as unknown as TransferRow;
    const lines = (transfer.lines ?? []) as TransferLineRow[];
    const { year, number, display } = parseTransferNumber(transfer.transfer_number);
    const isClosed = transfer.status === "RECEIVED";
    const docDate = transfer.received_at || transfer.transferred_at || transfer.created_at || null;
    const elaboratedBy = tenant?.name ?? "—";
    const filename = `ENTRADA ALMACEN ${display}`;

    // Build rows with pricing from product.cost
    const rows = lines.map((l) => {
        const qty = Number(l.qty_received || l.qty || 0);
        const unitValue = Number(l.product?.cost ?? 0);
        const total = qty * unitValue;
        return {
            id: l.id,
            description: l.product?.name || "—",
            sku: l.product?.sku || "",
            warehouse: transfer.to_warehouse?.name || "—",
            qty,
            uom: l.product?.uom || "Und.",
            unitValue,
            ivaPct: 0,
            total,
            lot: l.notes || "",
        };
    });

    const subtotal = rows.reduce((s, r) => s + r.total, 0);
    const discount = 0;
    const totalDoc = subtotal - discount;

    return (
        <>
            <style>{`
                @media screen {
                    .ea-doc { padding: 24px 32px; }
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
                    .ea-doc {
                        width: 100% !important;
                        max-width: 100% !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        font-size: 10px !important;
                    }
                }
                .ea-outer { border: 1px solid #111; border-collapse: collapse; width: 100%; }
                .ea-outer td { border: 1px solid #111; vertical-align: top; padding: 4px 8px; }
                .ea-head-gray { background: #d9d9d9; font-weight: 700; text-transform: uppercase; font-size: 9px; letter-spacing: 0.02em; }
                .ea-head-dark { background: #7a7a7a; color: #fff; font-weight: 700; text-transform: uppercase; font-size: 9px; letter-spacing: 0.03em; }
                .ea-table { width: 100%; border-collapse: collapse; }
                .ea-table th, .ea-table td { border: 1px solid #111; padding: 4px 6px; font-size: 10px; vertical-align: top; }
                .ea-table th { background: #d9d9d9; text-transform: uppercase; font-size: 9px; letter-spacing: 0.02em; text-align: left; }
                .ea-num { text-align: right; font-variant-numeric: tabular-nums; }
                .ea-lot { font-size: 8.5px; color: #333; padding-top: 2px; }
            `}</style>

            <WarehouseEntryPrintControls backHref={`/inventory/transfers/${transfer.id}`} filename={filename} />

            {/* ═══════════════════════ ENTRADA DE ALMACÉN ═══════════════════════ */}
            <div className="ea-doc max-w-[820px] mx-auto bg-white text-slate-900" style={{ fontFamily: "Arial, sans-serif", fontSize: "11px" }}>

                {/* ── HEADER: logo + empresa + caja entrada ────────────────────────── */}
                <table className="ea-outer">
                    <tbody>
                        <tr>
                            <td rowSpan={2} style={{ width: "130px", padding: "8px", textAlign: "center", verticalAlign: "middle" }}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={logoSrc} alt={tenant?.name ?? "GVM"} style={{ maxHeight: "70px", maxWidth: "110px", objectFit: "contain" }} />
                            </td>
                            <td style={{ padding: "8px 12px", textAlign: "center", verticalAlign: "middle" }}>
                                <div style={{ fontSize: "15px", fontWeight: 900, letterSpacing: "0.01em" }}>
                                    {tenant?.name ?? "GVM CORPORATION"}
                                </div>
                                <div style={{ fontSize: "11px", marginTop: "2px" }}>
                                    <span style={{ fontWeight: 700 }}>Nit</span>
                                    <span style={{ marginLeft: "24px" }}>{tenant?.nit ?? "—"}</span>
                                </div>
                            </td>
                            <td style={{ width: "240px", padding: 0, verticalAlign: "top" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse", height: "100%" }}>
                                    <tbody>
                                        <tr>
                                            <td colSpan={2} style={{ background: "#e8efe5", padding: "8px 6px", textAlign: "center", fontSize: "12px", fontWeight: 900, textTransform: "uppercase", borderBottom: "1px solid #111" }}>
                                                ENTRADA DE ALMACEN No.
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style={{ padding: "8px 4px", textAlign: "center", fontSize: "16px", fontWeight: 900, color: "#2d8a4e", borderRight: "1px solid #111", width: "50%" }}>
                                                {year}
                                            </td>
                                            <td style={{ padding: "8px 4px", textAlign: "center", fontSize: "16px", fontWeight: 900, width: "50%" }}>
                                                {number}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </td>
                        </tr>
                        <tr>
                            <td colSpan={2} style={{ padding: 0 }}>
                                {/* placeholder to keep the outer table rows consistent */}
                                &nbsp;
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* ── CON DESTINO A + POR CONCEPTO DE ───────────────────────────── */}
                <table className="ea-outer" style={{ borderTop: "none" }}>
                    <tbody>
                        <tr>
                            <td className="ea-head-gray" style={{ width: "50%", padding: "4px 8px" }}>CON DESTINO A</td>
                            <td className="ea-head-gray" style={{ width: "50%", padding: "4px 8px" }}>POR CONCEPTO DE</td>
                        </tr>
                        <tr>
                            <td style={{ padding: "6px 8px", fontWeight: 700, fontSize: "11px", textTransform: "uppercase" }}>
                                {tenant?.name ?? "—"}
                            </td>
                            <td rowSpan={4} style={{ padding: "8px", fontSize: "11px", textAlign: "center", fontWeight: 600 }}>
                                {transfer.notes ||
                                    `ENTRADA DE ALMACEN GENERADA DESDE LA SALIDA No ${display}`
                                }
                            </td>
                        </tr>
                        <tr>
                            <td style={{ padding: 0 }}>
                                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                    <tbody>
                                        <tr>
                                            <td className="ea-head-gray" style={{ width: "40%", padding: "3px 8px", borderRight: "1px solid #111" }}>NIT</td>
                                            <td style={{ padding: "3px 8px", fontWeight: 700, fontSize: "11px" }}>
                                                {tenant?.nit ? `${tenant.nit}${tenant.dv ? ` ${tenant.dv}` : ""}` : "—"}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </td>
                        </tr>
                        <tr>
                            <td style={{ padding: 0 }}>
                                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                    <tbody>
                                        <tr>
                                            <td className="ea-head-gray" style={{ width: "34%", padding: "3px 8px", borderRight: "1px solid #111" }}>DIRECCION</td>
                                            <td className="ea-head-gray" style={{ width: "33%", padding: "3px 8px", borderRight: "1px solid #111" }}>CIUDAD</td>
                                            <td className="ea-head-gray" style={{ width: "33%", padding: "3px 8px" }}>TELEFONO</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </td>
                        </tr>
                        <tr>
                            <td style={{ padding: 0 }}>
                                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                    <tbody>
                                        <tr>
                                            <td style={{ width: "34%", padding: "4px 8px", fontSize: "10.5px", borderRight: "1px solid #111" }}>{tenant?.address || "—"}</td>
                                            <td style={{ width: "33%", padding: "4px 8px", fontSize: "10.5px", borderRight: "1px solid #111" }}>{tenant?.city || "—"}</td>
                                            <td style={{ width: "33%", padding: "4px 8px", fontSize: "10.5px" }}>{tenant?.phone || "—"}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* ── FECHA DOCUMENTO / ENTREGADO POR / FORMA DE PAGO ───────────── */}
                <table className="ea-outer" style={{ borderTop: "none" }}>
                    <tbody>
                        <tr>
                            <td className="ea-head-gray" style={{ width: "34%", padding: "4px 8px", textAlign: "center" }}>FECHA DOCUMENTO</td>
                            <td className="ea-head-gray" style={{ width: "46%", padding: "4px 8px", textAlign: "center" }}>ENTREGADO POR</td>
                            <td className="ea-head-gray" style={{ width: "20%", padding: "4px 8px", textAlign: "center" }}>FORMA DE PAGO</td>
                        </tr>
                        <tr>
                            <td style={{ padding: "6px 8px", fontSize: "11px", textAlign: "center" }}>{fmtDateLong(docDate)}</td>
                            <td style={{ padding: "6px 8px", fontSize: "11px", textAlign: "center", textTransform: "uppercase", fontWeight: 600 }}>
                                {(tenant?.name ? `/M ${tenant.name.replace(/^GVM\s+/i, "")}` : transfer.from_warehouse?.name) || "—"}
                            </td>
                            <td style={{ padding: "6px 8px", fontSize: "11px", textAlign: "center" }}>Salida por Traslado</td>
                        </tr>
                    </tbody>
                </table>

                {/* ── TABLA DE LÍNEAS ──────────────────────────────────────────── */}
                <table className="ea-table" style={{ borderTop: "none" }}>
                    <thead>
                        <tr>
                            <th style={{ width: "32%", textAlign: "center" }}>Descripción</th>
                            <th style={{ width: "14%" }}>Bodega</th>
                            <th style={{ width: "10%" }} className="ea-num">Cantidad</th>
                            <th style={{ width: "10%" }}>U Medida</th>
                            <th style={{ width: "13%" }} className="ea-num">Valor Unitario</th>
                            <th style={{ width: "7%" }} className="ea-num">IVA</th>
                            <th style={{ width: "14%" }} className="ea-num">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 && (
                            <tr>
                                <td colSpan={7} style={{ padding: "16px", textAlign: "center", color: "#6b7280" }}>
                                    Sin líneas registradas.
                                </td>
                            </tr>
                        )}
                        {rows.map((r) => (
                            <tr key={r.id}>
                                <td>
                                    <div style={{ textTransform: "uppercase" }}>{r.description}</div>
                                    {r.lot && <div className="ea-lot">{r.lot}</div>}
                                </td>
                                <td>{r.warehouse}</td>
                                <td className="ea-num">{r.qty.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td>{r.uom}</td>
                                <td className="ea-num">{fmtNumber(r.unitValue)}</td>
                                <td className="ea-num">{r.ivaPct}%</td>
                                <td className="ea-num" style={{ fontWeight: 600 }}>{fmtNumber(r.total)}</td>
                            </tr>
                        ))}
                        {isClosed && (
                            <tr>
                                <td colSpan={7} style={{ padding: "8px", textAlign: "center", fontWeight: 700, letterSpacing: "0.15em" }}>
                                    ********* CERRADA *********
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {/* ── FOOTER: Valor en letras + totales ────────────────────────── */}
                <table className="ea-outer" style={{ borderTop: "none" }}>
                    <tbody>
                        <tr>
                            <td rowSpan={3} style={{ width: "58%", padding: "10px 8px", verticalAlign: "top" }}>
                                <div className="ea-head-gray" style={{ padding: "3px 6px", display: "inline-block", marginBottom: "6px" }}>Valor en Letras</div>
                                <div style={{ fontSize: "10.5px", textTransform: "uppercase", fontWeight: 600, lineHeight: 1.4 }}>
                                    {amountInWords(totalDoc)}
                                </div>
                            </td>
                            <td className="ea-head-gray" style={{ width: "22%", padding: "4px 8px", textAlign: "right" }}>SUBTOTAL</td>
                            <td className="ea-num" style={{ width: "20%", padding: "4px 8px", fontWeight: 700 }}>{fmtNumber(subtotal)}</td>
                        </tr>
                        <tr>
                            <td className="ea-head-gray" style={{ padding: "4px 8px", textAlign: "right" }}>DESCUENTO</td>
                            <td className="ea-num" style={{ padding: "4px 8px" }}>{fmtNumber(discount)}</td>
                        </tr>
                        <tr>
                            <td className="ea-head-gray" style={{ padding: "4px 8px", textAlign: "right" }}>TOTAL DOCUMENTO</td>
                            <td className="ea-num" style={{ padding: "4px 8px", fontWeight: 700 }}>{fmtNumber(totalDoc)}</td>
                        </tr>
                    </tbody>
                </table>

                {/* ── SELLOS / FIRMAS ──────────────────────────────────────────── */}
                <table className="ea-outer" style={{ borderTop: "none" }}>
                    <tbody>
                        <tr>
                            <td className="ea-head-dark" style={{ width: "33.3%", padding: "4px 8px", textAlign: "center" }}>APROBADO POR</td>
                            <td className="ea-head-dark" style={{ width: "33.3%", padding: "4px 8px", textAlign: "center" }}>ENTREGADO POR</td>
                            <td className="ea-head-dark" style={{ width: "33.3%", padding: "4px 8px", textAlign: "center" }}>RECIBIDO POR</td>
                        </tr>
                        <tr>
                            <td style={{ height: "56px" }}>&nbsp;</td>
                            <td>&nbsp;</td>
                            <td>&nbsp;</td>
                        </tr>
                    </tbody>
                </table>

                <div style={{ textAlign: "center", marginTop: "10px", fontSize: "9px", color: "#6b7280" }}>
                    <p>Traslado {transfer.transfer_number || "—"} · Origen: {transfer.from_warehouse?.name || "—"} → Destino: {transfer.to_warehouse?.name || "—"} · Elaborado por: {elaboratedBy}</p>
                </div>
            </div>
        </>
    );
}
