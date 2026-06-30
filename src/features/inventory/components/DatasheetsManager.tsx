"use client"

import { useState, useRef, useTransition, useCallback } from "react"
import { SearchableSelect } from "@/shared/components/ui/searchable-select"
import { Button } from "@/shared/components/ui/button"
import { toast } from "sonner"
import { FileText, Upload, Eye, Trash2, Loader2, FileBox } from "lucide-react"
import {
    listDatasheetsAction,
    uploadDatasheetAction,
    getDatasheetUrlAction,
    deleteDatasheetAction,
    type Datasheet,
} from "../actions/datasheetActions"

interface ProductItem { id: string; name: string; sku?: string }

function fmtSize(bytes: number | null): string {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function DatasheetsManager({ products }: { products: ProductItem[] }) {
    const [productId, setProductId] = useState("")
    const [sheets, setSheets] = useState<Datasheet[]>([])
    const [loading, setLoading] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [, startTransition] = useTransition()
    const fileRef = useRef<HTMLInputElement>(null)

    const items = products.map(p => ({
        value: p.id,
        label: p.name,
        subLabel: p.sku ? `SKU · ${p.sku}` : undefined,
        keywords: `${p.sku ?? ''} ${p.name}`,
    }))

    const loadSheets = useCallback((pid: string) => {
        if (!pid) { setSheets([]); return }
        setLoading(true)
        startTransition(async () => {
            try {
                setSheets(await listDatasheetsAction(pid))
            } catch {
                toast.error("No se pudieron cargar las fichas")
            } finally {
                setLoading(false)
            }
        })
    }, [])

    const handleSelect = (v: string) => {
        setProductId(v)
        loadSheets(v)
    }

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        e.target.value = ""
        if (!file || !productId) return
        if (file.size > 25 * 1024 * 1024) { toast.error("Máximo 25 MB"); return }
        setUploading(true)
        const fd = new FormData()
        fd.append("product_id", productId)
        fd.append("file", file)
        const res = await uploadDatasheetAction(fd)
        setUploading(false)
        if (res.error) { toast.error(res.error); return }
        toast.success("Ficha cargada")
        loadSheets(productId)
    }

    const handleView = async (id: string) => {
        const res = await getDatasheetUrlAction(id)
        if (res.error || !res.url) { toast.error(res.error || "No se pudo abrir"); return }
        window.open(res.url, "_blank", "noopener,noreferrer")
    }

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`¿Eliminar la ficha "${name}"?`)) return
        const res = await deleteDatasheetAction(id)
        if (res.error) { toast.error(res.error); return }
        toast.success("Ficha eliminada")
        loadSheets(productId)
    }

    return (
        <div className="space-y-5">
            {/* Selector de producto */}
            <div className="surface-card p-5 space-y-3">
                <label className="text-xs font-semibold text-slate-600">Producto</label>
                <SearchableSelect
                    items={items}
                    value={productId}
                    onChange={handleSelect}
                    placeholder="Busca un producto por nombre o SKU..."
                    emptyMessage="Sin productos"
                    className="h-10 bg-white border border-slate-200 rounded-lg px-3 text-sm text-slate-900 hover:border-slate-300 transition"
                />
                {productId && (
                    <div>
                        <input ref={fileRef} type="file" className="hidden" onChange={handleFile}
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp" />
                        <Button onClick={() => fileRef.current?.click()} disabled={uploading} className="h-10 rounded-lg text-xs gap-2">
                            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                            {uploading ? "Subiendo..." : "Cargar ficha técnica"}
                        </Button>
                        <p className="text-[11px] text-slate-400 mt-2">PDF, Word, Excel o imagen · máx. 25 MB · uso interno.</p>
                    </div>
                )}
            </div>

            {/* Lista de fichas */}
            {productId && (
                <div className="surface-card overflow-hidden">
                    <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
                        <FileBox className="h-4 w-4 text-slate-400" />
                        <h3 className="text-h3">Documentos</h3>
                        <span className="text-[11px] text-slate-400">({sheets.length})</span>
                    </div>
                    {loading ? (
                        <div className="py-12 flex items-center justify-center text-slate-400 gap-2">
                            <Loader2 className="h-5 w-5 animate-spin" /> Cargando...
                        </div>
                    ) : sheets.length === 0 ? (
                        <div className="py-12 text-center text-sm text-slate-400">
                            <FileText className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                            Este producto aún no tiene fichas técnicas.
                        </div>
                    ) : (
                        <ul className="divide-y divide-slate-100">
                            {sheets.map(s => (
                                <li key={s.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/60">
                                    <FileText className="h-4 w-4 text-indigo-500 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-900 truncate">{s.name}</p>
                                        <p className="text-[11px] text-slate-400">
                                            {fmtSize(s.size)}{s.size ? ' · ' : ''}{new Date(s.created_at).toLocaleDateString('es-CO')}
                                        </p>
                                    </div>
                                    <Button variant="outline" size="sm" className="h-8 rounded-lg text-xs gap-1.5" onClick={() => handleView(s.id)}>
                                        <Eye className="h-3.5 w-3.5" /> Ver
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-rose-600" onClick={() => handleDelete(s.id, s.name)}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    )
}
