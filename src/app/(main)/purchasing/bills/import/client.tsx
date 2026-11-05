"use client"

import { useRef, useState } from "react"
import { toast } from "sonner"
import { Sparkles, Loader2, Upload, FileText, AlertTriangle, CheckCircle2 } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Party } from "@/features/parties/types"
import { Product } from "@/features/products/types"
import { extractVendorBillAction, type ExtractedBill } from "@/features/purchasing/actions/aiImportActions"
import NewBillClient from "../new/client"

interface Props {
    parties: Party[]
    products: Product[]
}

const onlyDigits = (s: string | null | undefined) => (s ?? "").replace(/\D/g, "")
const validDate = (s: string | null | undefined) =>
    s && !isNaN(Date.parse(s)) ? s.slice(0, 10) : null

export default function ImportBillClient({ parties, products }: Props) {
    const [loading, setLoading] = useState(false)
    const [draft, setDraft] = useState<Record<string, unknown> | null>(null)
    const [warnings, setWarnings] = useState<string[]>([])
    const [fileName, setFileName] = useState<string>("")
    const inputRef = useRef<HTMLInputElement>(null)

    function readAsDataUrl(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(String(reader.result))
            reader.onerror = () => reject(new Error("No se pudo leer el archivo"))
            reader.readAsDataURL(file)
        })
    }

    async function handleFile(file: File) {
        if (file.size > 8 * 1024 * 1024) {
            toast.error("El archivo es muy grande (máximo 8 MB).")
            return
        }
        setFileName(file.name)
        setLoading(true)
        try {
            const dataUrl = await readAsDataUrl(file)
            const result = await extractVendorBillAction(dataUrl, file.type)
            if (result.error || !result.data) {
                toast.error(result.error ?? "No se pudo extraer la factura")
                return
            }
            buildDraft(result.data)
            toast.success("Factura leída. Revisa y aprueba el borrador.")
        } catch {
            toast.error("No se pudo procesar el archivo")
        } finally {
            setLoading(false)
        }
    }

    function buildDraft(ext: ExtractedBill) {
        const warns: string[] = []

        // Proveedor: emparejar por NIT (o documento) contra el maestro de terceros.
        const nit = onlyDigits(ext.supplier_nit)
        const supplier = nit
            ? parties.find(p => onlyDigits((p as any).nit) === nit || onlyDigits((p as any).doc_number) === nit)
            : undefined
        if (!supplier) {
            warns.push(
                `No encontré el proveedor por NIT${ext.supplier_nit ? ` (${ext.supplier_nit})` : ""}` +
                `${ext.supplier_name ? ` — "${ext.supplier_name}"` : ""}. Selecciónalo manualmente abajo${nit ? " o créalo primero en Terceros" : ""}.`,
            )
        }

        // Líneas: emparejar por SKU y, si no, por nombre; si no, queda como texto libre.
        let sinProducto = 0
        const lines = (ext.lines ?? []).map(l => {
            const sku = (l.sku ?? "").trim().toLowerCase()
            let prod = sku ? products.find(p => (p.sku ?? "").toLowerCase() === sku) : undefined
            if (!prod && l.description) {
                const d = l.description.toLowerCase()
                prod = products.find(p => p.name && d.includes(p.name.toLowerCase().slice(0, 14)))
            }
            if (!prod) sinProducto++
            const qty = Number(l.qty) || 0
            const unit = Number(l.unit_price) || 0
            return {
                product_id: prod?.id ?? null,
                description: prod?.name ?? l.description ?? "",
                qty,
                unit_price: unit,
                line_total: qty * unit,
                tax_config: l.tax_rate != null ? [{ rate: l.tax_rate }] : null,
            }
        })
        if (sinProducto > 0) {
            warns.push(`${sinProducto} ítem(s) no coincidieron con el catálogo — quedaron como texto libre. Verifica o selecciona el producto.`)
        }
        if (lines.length === 0) {
            warns.push("No se detectaron renglones. Agrégalos manualmente.")
        }
        warns.push("Revisa proveedor, cantidades, valores e IVA antes de guardar. Nada se guarda sin tu aprobación.")

        const today = new Date().toISOString().split("T")[0]
        setDraft({
            doc_type: "VENDOR_BILL",
            status: "DRAFT",
            currency: ext.currency || "COP",
            party_id: supplier?.id ?? "",
            issue_date: validDate(ext.issue_date) ?? today,
            due_date: validDate(ext.due_date),
            notes_internal: `Capturada con IA${ext.invoice_number ? ` · Factura ${ext.invoice_number}` : ""}`,
            lines,
            subtotal: Number(ext.subtotal) || 0,
            taxes: Number(ext.taxes) || 0,
            total: Number(ext.total) || 0,
        })
        setWarnings(warns)
    }

    // ── Paso 2: revisar el borrador en el formulario normal de compras ──
    if (draft) {
        return (
            <div className="space-y-6">
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-2">
                    <div className="flex items-center gap-2 text-amber-800">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-[11px] font-black uppercase tracking-widest">Borrador generado por IA — revísalo</span>
                    </div>
                    <ul className="text-xs text-amber-700 font-medium space-y-1 list-disc pl-5">
                        {warnings.map((w, i) => <li key={i}>{w}</li>)}
                    </ul>
                    <button
                        type="button"
                        onClick={() => { setDraft(null); setWarnings([]); setFileName("") }}
                        className="text-[10px] font-black uppercase tracking-widest text-amber-700 hover:text-amber-900 underline"
                    >
                        ← Subir otra factura
                    </button>
                </div>

                <NewBillClient parties={parties} products={products} initialData={draft as never} />
            </div>
        )
    }

    // ── Paso 1: subir archivo ──
    return (
        <div className="bg-white border border-slate-100 rounded-[2rem] shadow-sm p-8">
            <input
                ref={inputRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
            />
            <button
                type="button"
                disabled={loading}
                onClick={() => inputRef.current?.click()}
                className="w-full flex flex-col items-center justify-center gap-4 py-16 rounded-[1.5rem] border-2 border-dashed border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40 transition-all disabled:opacity-60"
            >
                {loading ? (
                    <>
                        <Loader2 className="h-10 w-10 text-emerald-500 animate-spin" />
                        <p className="text-sm font-bold text-slate-700">Leyendo la factura con IA…</p>
                        <p className="text-xs text-slate-400">{fileName}</p>
                    </>
                ) : (
                    <>
                        <div className="h-16 w-16 rounded-2xl bg-emerald-50 flex items-center justify-center">
                            <Upload className="h-8 w-8 text-emerald-500" />
                        </div>
                        <p className="text-sm font-bold text-slate-800">Haz clic para subir una foto o PDF de la factura</p>
                        <p className="text-xs text-slate-400">JPG, PNG o PDF · máximo 8 MB</p>
                    </>
                )}
            </button>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px] text-slate-500">
                <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-slate-300" /> Lee proveedor, ítems y valores</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-slate-300" /> Arma un borrador editable</div>
                <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-slate-300" /> Tú revisas y apruebas</div>
            </div>
        </div>
    )
}
