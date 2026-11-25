"use client"

import { useState, useTransition, useEffect, useMemo, useRef } from "react"
import { createPortal } from "react-dom"
import { toast } from "sonner"
import { Loader2, Barcode, Printer, FileSpreadsheet, RefreshCw, Search, Package } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { generateMissingProductLabelsAction, type ProductLabel } from "../labelActions"

interface Props {
    initialLabels: ProductLabel[]
    initialMissing: number
    prefix: string
}

// Tope de etiquetas por tanda de impresión: cientos de códigos en el DOM ahogan el
// navegador. Para más, se filtra por SKU/nombre y se imprime por lotes (el Excel sí
// incluye todas). Las hojas de stickers tampoco dan para miles de una sola vez.
const PRINT_CAP = 200

// ─── Código de barras 1D (CODE 128) renderizado como SVG responsivo ─────────────
// El escáner (ZXing / lector láser HID) lee CODE_128, que admite letras, números,
// espacios y el punto del código "<NIT> <SKU> <Unidad>". Se renderiza a un <svg> y
// se convierte a viewBox para que escale al ancho de la etiqueta sin perder nitidez
// (clave para que el impreso tenga el módulo correcto y se pueda escanear).
function Barcode1D({ value, height = 48 }: { value: string; height?: number }) {
    const ref = useRef<SVGSVGElement>(null)

    useEffect(() => {
        let active = true
        const svg = ref.current
        if (!svg || !value) return
        import("jsbarcode")
            .then(({ default: JsBarcode }) => {
                if (!active || !ref.current) return
                try {
                    JsBarcode(ref.current, value, {
                        format: "CODE128",
                        displayValue: false, // el código legible se muestra aparte, debajo
                        height,
                        width: 1.6,
                        margin: 0,
                        background: "#ffffff",
                        lineColor: "#0f172a",
                    })
                    // Hacerlo responsivo: pasar width/height fijos a viewBox y dejar que
                    // el CSS (w-full h-auto) lo escale manteniendo la proporción.
                    const el = ref.current
                    const w = el.getAttribute("width")
                    const h = el.getAttribute("height")
                    if (w && h) {
                        el.setAttribute("viewBox", `0 0 ${w} ${h}`)
                        el.removeAttribute("width")
                        el.removeAttribute("height")
                    }
                } catch (err) {
                    console.error("No se pudo generar el código de barras", err)
                }
            })
            .catch((err) => console.error(err))
        return () => { active = false }
    }, [value, height])

    return <svg ref={ref} className="w-full h-auto" />
}

// ─── Etiqueta imprimible (datos del producto + código de barras) ────────────────
function LabelCard({ label }: { label: ProductLabel }) {
    return (
        <div className="gvm-label-slot flex flex-col gap-1.5 border border-slate-300 rounded-lg bg-white p-2.5">
            <div className="min-w-0">
                <p className="text-[13px] font-black text-slate-900 leading-tight truncate">{label.sku}</p>
                <p className="text-[10px] font-semibold text-slate-700 leading-snug line-clamp-2">{label.name}</p>
                {label.uom && <p className="text-[9px] text-slate-500">Unidad: {label.uom}</p>}
            </div>
            <div className="bg-white px-1 pt-1">
                <Barcode1D value={label.code} />
                <p className="text-[8px] font-mono text-center text-slate-500 mt-0.5 truncate">{label.code}</p>
            </div>
        </div>
    )
}

export function ProductBarcodeLabels({ initialLabels, initialMissing, prefix }: Props) {
    const [labels, setLabels] = useState<ProductLabel[]>(initialLabels)
    const [missing, setMissing] = useState(initialMissing)
    const [search, setSearch] = useState("")
    const [pending, startTransition] = useTransition()
    const [mounted, setMounted] = useState(false)
    const [printing, setPrinting] = useState(false)

    useEffect(() => { setMounted(true) }, [])

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        if (!q) return labels
        return labels.filter((l) => l.sku.toLowerCase().includes(q) || l.name.toLowerCase().includes(q))
    }, [labels, search])

    const preview = filtered.slice(0, 60)

    function handleGenerate() {
        startTransition(async () => {
            const res = await generateMissingProductLabelsAction()
            if ("error" in res) {
                toast.error(res.error)
                return
            }
            setLabels(res.labels)
            setMissing(res.missingCount)
            toast.success(
                res.assigned > 0
                    ? `${res.assigned} código(s) generado(s). Total imprimible: ${res.labels.length}`
                    : `Sin productos nuevos por codificar. Total imprimible: ${res.labels.length}`,
            )
        })
    }

    async function handleExcel() {
        if (filtered.length === 0) { toast.error("No hay etiquetas para exportar"); return }
        try {
            const XLSX = await import("xlsx")
            const rows = filtered.map((l, i) => ({
                "#": i + 1,
                "SKU / Referencia": l.sku,
                "Producto": l.name,
                "Unidad": l.uom ?? "",
                "CODIGO DE BARRAS": l.code,
            }))
            const ws = XLSX.utils.json_to_sheet(rows)
            ws["!cols"] = [{ wch: 5 }, { wch: 20 }, { wch: 46 }, { wch: 10 }, { wch: 40 }]
            const wb = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(wb, ws, "Etiquetas")
            XLSX.writeFile(wb, `etiquetas-codigo-barras-productos-${new Date().toISOString().slice(0, 10)}.xlsx`)
            toast.success(`Excel con ${filtered.length} código(s) descargado`)
        } catch (err) {
            console.error(err)
            toast.error("No se pudo generar el Excel")
        }
    }

    const printList = useMemo(() => filtered.slice(0, PRINT_CAP), [filtered])

    function handlePrint() {
        if (filtered.length === 0) { toast.error("No hay etiquetas para imprimir"); return }
        if (filtered.length > PRINT_CAP) {
            toast.info(`Se imprimirán las primeras ${PRINT_CAP} de ${filtered.length}. Filtra por SKU/nombre para imprimir el resto por lotes.`)
        }
        setPrinting(true)
        setTimeout(() => {
            window.print()
            setPrinting(false)
        }, 200)
    }

    return (
        <>
            <style>{`
                @media print {
                    body > * { display: none !important; }
                    #gvm-print-labels {
                        display: grid !important;
                        grid-template-columns: 1fr 1fr;
                        gap: 4mm;
                        position: fixed; top: 0; left: 0;
                        width: 100vw; padding: 8mm;
                        background: #fff;
                    }
                    #gvm-print-labels .gvm-label-slot {
                        page-break-inside: avoid; break-inside: avoid;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    @page { margin: 6mm; size: A4; }
                }
            `}</style>

            {/* Capa de impresión (portal al body para que no la oculte `body > *`) */}
            {mounted && printing && createPortal(
                <div id="gvm-print-labels">
                    {printList.map((l) => <LabelCard key={l.id} label={l} />)}
                </div>,
                document.body,
            )}

            <div className="space-y-6">
                {/* Resumen + acciones */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <Barcode className="h-5 w-5 text-indigo-600" /> Etiquetas de código de barras
                            </h2>
                            <p className="text-sm text-slate-500 mt-1">
                                Genera un código de barras imprimible (CODE 128) para los productos sin código de fábrica.
                                Al escanearlo con la cámara o el lector láser, el sistema reconoce el producto y carga el movimiento.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex-1 min-w-[200px] rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">Sin código</p>
                            <p className="text-2xl font-black text-amber-700 tabular-nums">{missing}</p>
                        </div>
                        <div className="flex-1 min-w-[200px] rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Con código GVM (imprimibles)</p>
                            <p className="text-2xl font-black text-emerald-700 tabular-nums">{labels.length}</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <Button onClick={handleGenerate} disabled={pending} className="h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-bold">
                            {pending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                            {missing > 0 ? `Generar ${missing} código(s) faltante(s)` : "Actualizar lista"}
                        </Button>
                        <Button onClick={handleExcel} variant="outline" disabled={filtered.length === 0} className="h-11 rounded-xl font-bold">
                            <FileSpreadsheet className="h-4 w-4 mr-2" /> Descargar Excel
                        </Button>
                        <Button onClick={handlePrint} variant="outline" disabled={filtered.length === 0} className="h-11 rounded-xl font-bold">
                            <Printer className="h-4 w-4 mr-2" /> Imprimir etiquetas {printList.length > 0 && `(${printList.length})`}
                        </Button>
                    </div>
                    <p className="text-[11px] text-slate-400">
                        El código se guarda en cada producto como <span className="font-mono">{prefix} &lt;SKU&gt; &lt;unidad&gt;</span>.
                        El Excel y la impresión usan la lista filtrada de abajo.
                    </p>
                </div>

                {/* Buscador */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Filtrar por SKU o nombre de producto..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                </div>

                {/* Vista previa */}
                {filtered.length === 0 ? (
                    <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-slate-200">
                        <Package className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                        <p className="text-sm text-slate-400">
                            {labels.length === 0
                                ? "Aún no hay códigos generados. Usa «Generar» para crearlos."
                                : "Ningún producto coincide con la búsqueda."}
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {preview.map((l) => <LabelCard key={l.id} label={l} />)}
                        </div>
                        <p className="text-[11px] text-center text-slate-400">
                            {filtered.length > preview.length
                                ? `Mostrando ${preview.length} de ${filtered.length}. El Excel y la impresión incluyen los ${filtered.length}.`
                                : `${filtered.length} etiqueta(s)`}
                        </p>
                    </>
                )}
            </div>
        </>
    )
}
