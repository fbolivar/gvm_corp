import { createClient } from "@/lib/supabase/server";
import { settingsService } from "@/features/settings/services/settingsService";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, FileOutput, ShieldCheck } from "lucide-react";
import { SalesOrderPrintControls } from "./SalesOrderPrintControls";

interface DocumentLine {
  id: string;
  description: string;
  qty: number;
  unit_price: number;
  line_total: number;
  product_id?: string | null;
  products?: { name?: string; sku?: string; uom?: string } | null;
}

interface Party {
  legal_name: string;
  doc_number?: string;
  doc_type?: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
}

interface DocRow {
  id: string;
  number: string | null;
  issue_date: string;
  due_date: string | null;
  doc_type: string;
  status: string;
  subtotal: number;
  taxes: number;
  total: number;
  notes_public: string | null;
  notes_internal: string | null;
  prescription_url: string | null;
  prescription_doctor_name: string | null;
  prescription_doctor_license: string | null;
  prescription_doctor_type: string | null;
  prescription_date: string | null;
  commercial_user_id: string | null;
  party?: Party | null;
  document_lines: DocumentLine[];
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function fmtMoney(n: number | null | undefined): string {
  return `$${(n ?? 0).toLocaleString("es-CO", { minimumFractionDigits: 0 })}`;
}

function doctorTypeLabel(t: string | null): string {
  if (t === "VETERINARIO") return "Médico Veterinario";
  if (t === "ZOOTECNISTA") return "Zootecnista";
  return "Profesional";
}

export const dynamic = "force-dynamic";

export default async function SalesOrderPrintPage({
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
          <FileOutput className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <h2 className="text-h2 mb-1">Pedido de Venta</h2>
          <p className="text-sm text-slate-500">Abre un pedido desde la lista para imprimirlo.</p>
        </div>
      </div>
    );
  }

  const { data: rawDoc, error } = await supabase
    .from("documents")
    .select(
      "*, party:parties(legal_name, doc_number, doc_type, address, city, phone, email), document_lines(*, products(name, sku, uom))"
    )
    .eq("id", params.id)
    .eq("doc_type", "SALES_ORDER")
    .single();

  if (error || !rawDoc) {
    return (
      <div className="page-container">
        <div className="surface-card p-8 text-center max-w-md mx-auto">
          <FileOutput className="h-10 w-10 text-rose-300 mx-auto mb-3" />
          <h2 className="text-h2 mb-1">Pedido no encontrado</h2>
          <p className="text-sm text-slate-500 mb-4">El documento solicitado no existe o no es un pedido.</p>
          <Link href="/sales/orders" className="text-sm text-slate-900 hover:underline inline-flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" /> Volver a pedidos
          </Link>
        </div>
      </div>
    );
  }

  const doc = rawDoc as unknown as DocRow;
  const party = doc.party as Party | null;
  const lines = (doc.document_lines ?? []) as DocumentLine[];

  // Comercial + firma
  let commercial: { full_name: string | null; signature_url: string | null; commercial_code: string | null; email: string | null } | null = null;
  if (doc.commercial_user_id) {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, email, signature_url, commercial_code")
      .eq("id", doc.commercial_user_id)
      .maybeSingle();
    commercial = data;
  }

  const displayNumber = (doc.number || "").replace(/^OV-|^SO-/i, "") || "—";
  const clientName = (party?.legal_name || "Cliente").replace(/[\\/:*?"<>|]/g, "").slice(0, 40).trim();
  const fileDate = (doc.issue_date || "").replaceAll("-", "-");
  const filename = `PEDIDO ${displayNumber} - ${clientName} - ${fileDate}`;

  const prescriptionIsPdf = doc.prescription_url?.toLowerCase().includes(".pdf");
  const prescriptionIsImg = doc.prescription_url && !prescriptionIsPdf;

  return (
    <>
      <style>{`
        @media screen {
          .ov-doc { padding: 28px 36px; }
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
          .ov-doc {
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            font-size: 10px !important;
          }
          .ov-table th, .ov-table td { padding: 3px 6px !important; }
          .ov-logo { height: 55px !important; }
          .ov-h1 { font-size: 15px !important; }
          .ov-page-break { page-break-before: always; }
          .ov-ica-img { max-height: 240mm !important; }
        }
        .ov-table { border-collapse: collapse; width: 100%; }
        .ov-table th, .ov-table td { border: 1px solid #94a3b8; padding: 4px 8px; }
        .ov-box-gray { background: #f1f5f9; }
        .ov-ica-border { border: 2px solid #0ea5e9; border-radius: 4px; }
      `}</style>

      <SalesOrderPrintControls docId={doc.id} filename={filename} />

      {/* ═══════════════════════ PEDIDO DE VENTA (A4) ═══════════════════════ */}
      <div className="ov-doc max-w-[780px] mx-auto bg-white text-slate-900 font-sans text-[11px] leading-[1.45]">

        {/* HEADER */}
        <div className="flex items-start justify-between mb-5">
          <div className="w-[170px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoSrc} alt={tenant?.name ?? "GVM"} className="ov-logo h-20 object-contain" />
          </div>
          <div className="text-right">
            <h1 className="ov-h1 text-[18px] font-bold leading-tight mb-1">Pedido de Venta</h1>
            <div className="text-[11px] space-y-0">
              <p><span>No. </span><span className="font-semibold">{displayNumber}</span></p>
              <p><span>Fecha : </span><span className="font-semibold">{fmtDate(doc.issue_date)}</span></p>
              {doc.due_date && <p><span>Fecha entrega : </span><span className="font-semibold">{fmtDate(doc.due_date)}</span></p>}
              <p><span>Estado : </span><span className="font-semibold">{doc.status}</span></p>
            </div>
          </div>
        </div>

        {/* Remitente / Cliente */}
        <div className="grid grid-cols-2 gap-4 mb-1">
          <p className="text-[11px] text-slate-500">Empresa</p>
          <p className="text-[11px] text-slate-500">Cliente</p>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="ov-box-gray border border-slate-300 rounded-sm px-3 py-2 min-h-[110px] text-[10.5px] leading-[1.5]">
            <p className="font-bold">{tenant?.name ?? "GVM"}</p>
            {tenant?.nit && <p>NIT: {tenant.nit}</p>}
            {tenant?.address && <p>{tenant.address}</p>}
            {tenant?.city && <p>{tenant.city}</p>}
            {tenant?.phone && <p>Tel: {tenant.phone}</p>}
            {tenant?.email && <p>{tenant.email}</p>}
          </div>
          <div className="bg-white border border-slate-400 rounded-sm px-3 py-2 min-h-[110px] text-[10.5px] leading-[1.5]">
            <p className="font-bold">{(party?.legal_name || "Cliente").toUpperCase()}</p>
            {party?.doc_number && <p>{party.doc_type || "ID"}: {party.doc_number}</p>}
            {party?.address && <p>{party.address}</p>}
            {party?.city && <p>{party.city}</p>}
            {party?.phone && <p>Tel: {party.phone}</p>}
            {party?.email && <p>{party.email}</p>}
          </div>
        </div>

        {/* ═══════ BLOQUE RECETA MÉDICA ICA ═══════ */}
        <div className="ov-ica-border p-3 mb-3 bg-sky-50/30">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="h-4 w-4 text-sky-700" />
            <p className="font-bold text-sky-900 text-[11px]">Receta Médica — Cumplimiento ICA (Resolución 1056)</p>
          </div>
          {doc.prescription_doctor_name ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[10px]">
              <p><span className="text-slate-500">Profesional:</span> <span className="font-semibold">{doctorTypeLabel(doc.prescription_doctor_type)}</span></p>
              <p><span className="text-slate-500">Fecha receta:</span> <span className="font-semibold">{fmtDate(doc.prescription_date)}</span></p>
              <p><span className="text-slate-500">Nombre:</span> <span className="font-semibold">{doc.prescription_doctor_name}</span></p>
              <p><span className="text-slate-500">Matrícula:</span> <span className="font-semibold">{doc.prescription_doctor_license || "—"}</span></p>
            </div>
          ) : (
            <p className="text-[10px] text-rose-700">⚠ Pedido sin datos de receta médica — NO cumple requisito ICA</p>
          )}
          {doc.prescription_url && (
            <p className="text-[10px] mt-1.5 text-slate-600">
              {prescriptionIsPdf ? (
                <>📄 Receta adjunta (PDF) — ver <a href={doc.prescription_url} className="text-sky-700 underline">archivo</a></>
              ) : (
                <>🖼️ Receta adjunta (imagen) — ver al final del documento</>
              )}
            </p>
          )}
        </div>

        {/* TABLA PRODUCTOS */}
        <table className="ov-table mb-3 text-[11px]">
          <thead>
            <tr className="ov-box-gray">
              <th className="text-left font-normal w-[10%]">SKU</th>
              <th className="text-left font-normal w-[42%]">Descripción</th>
              <th className="text-center font-normal w-[10%]">U.M.</th>
              <th className="text-right font-normal w-[10%]">Cant.</th>
              <th className="text-right font-normal w-[14%]">V. Unit.</th>
              <th className="text-right font-normal w-[14%]">Total</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, idx) => (
              <tr key={line.id || idx}>
                <td className="align-top text-[9.5px] font-mono">{line.products?.sku || "—"}</td>
                <td className="align-top">{line.description || line.products?.name || "—"}</td>
                <td className="text-center align-top">{line.products?.uom || "Und."}</td>
                <td className="text-right align-top tabular-nums">{Number(line.qty).toLocaleString("es-CO")}</td>
                <td className="text-right align-top tabular-nums">{fmtMoney(line.unit_price)}</td>
                <td className="text-right align-top tabular-nums font-semibold">{fmtMoney(line.line_total || line.qty * line.unit_price)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* TOTALES */}
        <div className="flex justify-end mb-3">
          <table className="text-[11px] border-collapse">
            <tbody>
              <tr>
                <td className="px-3 py-1 text-right text-slate-600">Subtotal</td>
                <td className="px-3 py-1 text-right tabular-nums w-[120px]">{fmtMoney(doc.subtotal)}</td>
              </tr>
              <tr>
                <td className="px-3 py-1 text-right text-slate-600">IVA</td>
                <td className="px-3 py-1 text-right tabular-nums">{fmtMoney(doc.taxes)}</td>
              </tr>
              <tr className="font-bold">
                <td className="px-3 py-1.5 text-right border-t border-slate-400">TOTAL</td>
                <td className="px-3 py-1.5 text-right tabular-nums border-t border-slate-400">{fmtMoney(doc.total)} COP</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* NOTAS */}
        {(doc.notes_public || doc.notes_internal) && (
          <div className="border border-slate-300 rounded-sm px-3 py-1.5 mb-3 text-[10.5px]">
            <p className="text-slate-500 text-[9px] uppercase tracking-wide mb-0.5">Observaciones</p>
            {doc.notes_public || doc.notes_internal}
          </div>
        )}

        {/* ═══════ FIRMA COMERCIAL ═══════ */}
        <div className="grid grid-cols-2 gap-6 mt-6 pt-4">
          {/* Firma del comercial */}
          <div className="text-center">
            <div className="h-16 flex items-end justify-center">
              {commercial?.signature_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={commercial.signature_url}
                  alt={`Firma de ${commercial.full_name}`}
                  className="max-h-14 object-contain"
                />
              ) : (
                <div className="w-48 border-b border-slate-400" />
              )}
            </div>
            <div className="border-t border-slate-400 mt-1 pt-1">
              <p className="text-[10px] font-semibold">{commercial?.full_name || "—"}</p>
              <p className="text-[9px] text-slate-600">Comercial responsable</p>
              {commercial?.commercial_code && <p className="text-[9px] text-slate-500">Cód: {commercial.commercial_code}</p>}
            </div>
          </div>

          {/* Firma del cliente */}
          <div className="text-center">
            <div className="h-16 border-b border-slate-400" />
            <div className="mt-1 pt-1">
              <p className="text-[10px] font-semibold">{party?.legal_name || "—"}</p>
              <p className="text-[9px] text-slate-600">Recibí conforme</p>
              {party?.doc_number && <p className="text-[9px] text-slate-500">C.C./NIT: {party.doc_number}</p>}
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="mt-4 text-center text-[9px] text-slate-500 leading-[1.3]">
          <p>Este pedido cumple con la Resolución ICA 1056 — requiere receta firmada por médico veterinario o zootecnista.</p>
          {tenant?.nit && <p>{tenant.name} · NIT {tenant.nit}</p>}
        </div>

        {/* ═══════ RECETA ADJUNTA (segunda página si es imagen) ═══════ */}
        {prescriptionIsImg && doc.prescription_url && (
          <div className="ov-page-break mt-6">
            <div className="flex items-center gap-2 mb-3 border-b border-slate-300 pb-2">
              <ShieldCheck className="h-4 w-4 text-sky-700" />
              <p className="font-bold text-[12px]">Anexo: Receta Médica Firmada</p>
            </div>
            <div className="text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={doc.prescription_url}
                alt="Receta médica ICA"
                className="ov-ica-img max-h-[260mm] max-w-full mx-auto object-contain border border-slate-200 rounded"
              />
              <div className="mt-3 text-[10px] text-slate-600 space-y-0.5">
                <p><strong>{doc.prescription_doctor_name}</strong> — {doctorTypeLabel(doc.prescription_doctor_type)}</p>
                <p>Matrícula: {doc.prescription_doctor_license} · Fecha: {fmtDate(doc.prescription_date)}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
