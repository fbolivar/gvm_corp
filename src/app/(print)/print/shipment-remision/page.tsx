import { createClient } from "@/lib/supabase/server";
import { settingsService } from "@/features/settings/services/settingsService";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Truck } from "lucide-react";
import { ShipmentRemisionPrintControls } from "./ShipmentRemisionPrintControls";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ShipmentItemRow {
    id: string;
    product_id: string;
    qty_ordered: number;
    qty_shipped: number;
    product: {
        name: string;
        sku: string;
        uom: string | null;
        cost: number | null;
    } | null;
}

interface PartyRow {
    legal_name: string | null;
    nit: string | null;
    doc_number: string | null;
    dv: string | null;
    address: string | null;
    city: string | null;
    phone: string | null;
}

interface ShipmentRow {
    id: string;
    tracking_number: string | null;
    status: string;
    notes: string | null;
    shipped_at: string | null;
    delivered_at: string | null;
    created_at: string | null;
    freight_cost: number | null;
    prepared_by: string | null;
    verified_by: string | null;
    dispatched_by: string | null;
    delivered_by_name: string | null;
    carrier: { name: string | null } | null;
    warehouse: { id: string; name: string } | null;
    order: {
        number: string | null;
        party: PartyRow | null;
    } | null;
    items: ShipmentItemRow[];
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

function parseOrderNumber(raw: string | null, fallbackId: string): { year: string; number: string; display: string } {
    const s = (raw || "").trim();
    const m = s.match(/(\d{4}).*?(\d+)$/);
    if (m) return { year: m[1], number: m[2], display: `${m[1]} ${m[2]}` };
    const digits = s.match(/(\d+)$/);
    if (digits) return { year: new Date().getFullYear().toString(), number: digits[1], display: digits[1] };
    const fb = (fallbackId || "").slice(-6).toUpperCase();
    return { year: new Date().getFullYear().toString(), number: fb, display: fb };
}

export const dynamic = "force-dynamic";

export default async function ShipmentRemisionPrintPage({
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
                    <Truck className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                    <h2 className="text-h2 mb-1">Remisión de Despacho</h2>
                    <p className="text-sm text-slate-500">Abre un despacho desde la lista para imprimir la remisión.</p>
                </div>
            </div>
        );
    }

    const { data: rawShipment, error } = await supabase
        .from("logistics_shipments")
        .select(`
            id, tracking_number, status, notes, shipped_at, delivered_at, created_at,
            freight_cost, prepared_by, verified_by, dispatched_by, delivered_by_name,
            carrier:logistics_carriers(name),
            warehouse:warehouses(id, name),
            order:documents(
                number,
                party:parties(legal_name, nit, doc_number, dv, address, city, phone)
            ),
            items:logistics_shipment_items(
                id, product_id, qty_ordered, qty_shipped,
                product:products(name, sku, uom, cost)
            )
        `)
        .eq("id", params.id)
        .single();

    if (error || !rawShipment) {
        return (
            <div className="page-container">
                <div className="surface-card p-8 text-center max-w-md mx-auto">
                    <Truck className="h-10 w-10 text-rose-300 mx-auto mb-3" />
                    <h2 className="text-h2 mb-1">Despacho no encontrado</h2>
                    <p className="text-sm text-slate-500 mb-4">El despacho no existe o no tiene permisos.</p>
                    <Link href="/logistics" className="text-sm text-slate-900 hover:underline inline-flex items-center gap-1">
                        <ArrowLeft className="h-3.5 w-3.5" /> Volver a logística
                    </Link>
                </div>
            </div>
        );
    }

    const shipment = rawShipment as unknown as ShipmentRow;

    // Responsibles (profiles) — separate query because columns have no FK to profiles
    const userIds = [shipment.prepared_by, shipment.verified_by, shipment.dispatched_by]
        .filter((v): v is string => !!v);
    const profilesById = new Map<string, { full_name: string | null; email: string | null }>();
    if (userIds.length > 0) {
        const { data: profs } = await supabase
            .from("profiles")
            .select("id, full_name, email")
            .in("id", Array.from(new Set(userIds)));
        (profs ?? []).forEach(p => profilesById.set(p.id, p));
    }
    const nameOf = (id: string | null): string => {
        if (!id) return "";
        const p = profilesById.get(id);
        if (!p) return "";
        return (p.full_name || p.email?.split("@")[0] || "").toUpperCase();
    };

    const party = shipment.order?.party;
    const partyName = (party?.legal_name ?? "—").toUpperCase();
    const partyNit = party?.nit ?? party?.doc_number ?? "—";
    const partyAddress = party?.address ?? "";
    const partyCity = party?.city ?? "";
    const partyPhone = party?.phone ?? "";

    const { year, number, display } = parseOrderNumber(shipment.order?.number ?? null, shipment.id);
    const carrierName = shipment.carrier?.name ?? "Transporte Propio";
    const warehouseName = shipment.warehouse?.name ?? "—";
    const docDate = shipment.shipped_at || shipment.created_at || null;
    const isClosed = shipment.status === "ENTREGADO";

    // Build rows with pricing from product.cost
    const rows = shipment.items.map((it) => {
        const qty = Number(it.qty_shipped || 0);
        const unitValue = Number(it.product?.cost ?? 0);
        const total = qty * unitValue;
        return {
            id: it.id,
            description: it.product?.name || "—",
            sku: it.product?.sku || "",
            warehouse: warehouseName,
            qty,
            qtyOrdered: Number(it.qty_ordered || 0),
            uom: it.product?.uom || "Und.",
            unitValue,
            ivaPct: 0,
            total,
        };
    });

    const subtotal = rows.reduce((s, r) => s + r.total, 0);
    const discount = 0;
    const totalDoc = subtotal - discount;

    const filename = `REMISION ${display} - ${partyName.slice(0, 30)}`.trim();

    return (
        <>
            <style>{`
                @media screen { .ea-doc { padding: 24px 32px; } }
                @media print {
                    @page { size: 210mm 297mm; margin: 10mm; }
                    html, body { margin: 0 !important; padding: 0 !important; background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .no-print { display: none !important; }
                    .ea-doc { width: 100% !important; max-width: 100% !important; padding: 0 !important; margin: 0 !important; font-size: 10px !important; }
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

            <ShipmentRemisionPrintControls backHref={`/logistics`} filename={filename} />

            {/* ═══════════════════════ REMISIÓN DE DESPACHO ═══════════════════════ */}
            <div className="ea-doc max-w-[820px] mx-auto bg-white text-slate-900" style={{ fontFamily: "Arial, sans-serif", fontSize: "11px" }}>

                {/* ── HEADER: logo + empresa + caja remisión ──────────────────── */}
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
                                    <span style={{ marginLeft: "24px" }}>{tenant?.nit ?? "—"}{tenant?.dv ? ` ${tenant.dv}` : ""}</span>
                                </div>
                            </td>
                            <td style={{ width: "240px", padding: 0, verticalAlign: "top" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse", height: "100%" }}>
                                    <tbody>
                                        <tr>
                                            <td colSpan={2} style={{ background: "#e8efe5", padding: "8px 6px", textAlign: "center", fontSize: "12px", fontWeight: 900, textTransform: "uppercase", borderBottom: "1px solid #111" }}>
                                                REMISIÓN DE DESPACHO No.
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
                                {partyName}
                            </td>
                            <td rowSpan={4} style={{ padding: "8px", fontSize: "11px", textAlign: "center", fontWeight: 600 }}>
                                {shipment.notes ||
                                    `REMISIÓN DE DESPACHO DE LA ORDEN DE VENTA No ${display}`
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
                                                {partyNit}
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
                                            <td style={{ width: "34%", padding: "4px 8px", fontSize: "10.5px", borderRight: "1px solid #111" }}>{partyAddress || "—"}</td>
                                            <td style={{ width: "33%", padding: "4px 8px", fontSize: "10.5px", borderRight: "1px solid #111" }}>{partyCity || "—"}</td>
                                            <td style={{ width: "33%", padding: "4px 8px", fontSize: "10.5px" }}>{partyPhone || "—"}</td>
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
                            <td className="ea-head-gray" style={{ width: "20%", padding: "4px 8px", textAlign: "center" }}>TRANSPORTADORA</td>
                        </tr>
                        <tr>
                            <td style={{ padding: "6px 8px", fontSize: "11px", textAlign: "center" }}>{fmtDateLong(docDate)}</td>
                            <td style={{ padding: "6px 8px", fontSize: "11px", textAlign: "center", textTransform: "uppercase", fontWeight: 600 }}>
                                {nameOf(shipment.dispatched_by) || nameOf(shipment.prepared_by) || tenant?.name || "—"}
                            </td>
                            <td style={{ padding: "6px 8px", fontSize: "11px", textAlign: "center" }}>{carrierName}</td>
                        </tr>
                    </tbody>
                </table>

                {/* ── TABLA DE LÍNEAS ──────────────────────────────────────────── */}
                <table className="ea-table" style={{ borderTop: "none" }}>
                    <thead>
                        <tr>
                            <th style={{ width: "14%" }}>SKU</th>
                            <th style={{ width: "28%", textAlign: "center" }}>Descripción</th>
                            <th style={{ width: "11%" }}>Bodega</th>
                            <th style={{ width: "9%" }} className="ea-num">Pedido</th>
                            <th style={{ width: "9%" }} className="ea-num">Despachado</th>
                            <th style={{ width: "9%" }}>U Medida</th>
                            <th style={{ width: "10%" }} className="ea-num">Valor Unit</th>
                            <th style={{ width: "10%" }} className="ea-num">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 && (
                            <tr>
                                <td colSpan={8} style={{ padding: "16px", textAlign: "center", color: "#6b7280" }}>
                                    Sin líneas registradas.
                                </td>
                            </tr>
                        )}
                        {rows.map((r) => (
                            <tr key={r.id}>
                                <td style={{ fontWeight: 600, fontSize: "9.5px" }}>{r.sku}</td>
                                <td style={{ textTransform: "uppercase" }}>{r.description}</td>
                                <td>{r.warehouse}</td>
                                <td className="ea-num">{fmtNumber(r.qtyOrdered)}</td>
                                <td className="ea-num" style={{ fontWeight: 700 }}>{fmtNumber(r.qty)}</td>
                                <td>{r.uom}</td>
                                <td className="ea-num">{fmtNumber(r.unitValue)}</td>
                                <td className="ea-num" style={{ fontWeight: 600 }}>{fmtNumber(r.total)}</td>
                            </tr>
                        ))}
                        {isClosed && (
                            <tr>
                                <td colSpan={8} style={{ padding: "8px", textAlign: "center", fontWeight: 700, letterSpacing: "0.15em" }}>
                                    ********* ENTREGADO *********
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
                            <td style={{ height: "56px", padding: "6px 8px", fontSize: "10px", textAlign: "center", textTransform: "uppercase", verticalAlign: "bottom", fontWeight: 700 }}>
                                {nameOf(shipment.verified_by) || "—"}
                            </td>
                            <td style={{ padding: "6px 8px", fontSize: "10px", textAlign: "center", textTransform: "uppercase", verticalAlign: "bottom", fontWeight: 700 }}>
                                {nameOf(shipment.dispatched_by) || nameOf(shipment.prepared_by) || "—"}
                            </td>
                            <td style={{ padding: "6px 8px", fontSize: "10px", textAlign: "center", textTransform: "uppercase", verticalAlign: "bottom", fontWeight: 700 }}>
                                {(shipment.delivered_by_name ?? "").toUpperCase() || "—"}
                            </td>
                        </tr>
                    </tbody>
                </table>

                <div style={{ textAlign: "center", marginTop: "10px", fontSize: "9px", color: "#6b7280" }}>
                    <p>
                        Remisión {shipment.tracking_number || `SHPT-${number}`} · Orden: {shipment.order?.number || "—"} · Bodega origen: {warehouseName} · {tenant?.name} · NIT {tenant?.nit ?? ""}{tenant?.dv ? `-${tenant.dv}` : ""}
                    </p>
                </div>
            </div>
        </>
    );
}
