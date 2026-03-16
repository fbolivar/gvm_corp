"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/shared/components/ui/button"
import { Badge } from "@/shared/components/ui/badge"
import { toast } from "sonner"
import { cn } from "@/shared/lib/utils"
import { createSerialAction, updateSerialStatusAction } from "../actions/serialActions"
import {
    Hash, Package, Warehouse, Search, Plus, Loader2, Save, X,
    CheckCircle2, AlertTriangle, ShoppingCart, RotateCcw, Ban
} from "lucide-react"

interface Serial {
    id: string
    serial_number: string
    status: string
    product_id: string
    warehouse_id: string | null
    created_at: string
    product?: { name: string; sku: string }
    warehouse?: { name: string }
}

interface Stats {
    total: number
    available: number
    sold: number
    defective: number
}

interface Props {
    serials: Serial[]
    stats: Stats
    products: Array<{ id: string; name: string; sku: string }>
    warehouses: Array<{ id: string; name: string }>
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    AVAILABLE: { label: 'Disponible', color: 'bg-emerald-50 text-emerald-600', icon: CheckCircle2 },
    RESERVED: { label: 'Reservado', color: 'bg-amber-50 text-amber-600', icon: AlertTriangle },
    SOLD: { label: 'Vendido', color: 'bg-blue-50 text-blue-600', icon: ShoppingCart },
    RETURNED: { label: 'Devuelto', color: 'bg-violet-50 text-violet-600', icon: RotateCcw },
    DEFECTIVE: { label: 'Defectuoso', color: 'bg-rose-50 text-rose-600', icon: Ban },
}

export function SerialListClient({ serials, stats, products, warehouses }: Props) {
    const router = useRouter()
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('')
    const [showForm, setShowForm] = useState(false)
    const [newProductId, setNewProductId] = useState('')
    const [newWarehouseId, setNewWarehouseId] = useState('')
    const [newSerial, setNewSerial] = useState('')
    const [saving, setSaving] = useState(false)

    const filtered = useMemo(() => {
        let result = serials
        if (search) result = result.filter(s =>
            s.serial_number.toLowerCase().includes(search.toLowerCase()) ||
            s.product?.name.toLowerCase().includes(search.toLowerCase()) ||
            s.product?.sku.toLowerCase().includes(search.toLowerCase())
        )
        if (statusFilter) result = result.filter(s => s.status === statusFilter)
        return result
    }, [serials, search, statusFilter])

    const handleCreate = async () => {
        if (!newProductId) { toast.error("Selecciona un producto"); return }
        if (!newSerial.trim()) { toast.error("El serial es requerido"); return }
        setSaving(true)
        const result = await createSerialAction({
            product_id: newProductId,
            warehouse_id: newWarehouseId || undefined,
            serial_number: newSerial.trim(),
        })
        setSaving(false)
        if (result.error) toast.error(result.error)
        else {
            toast.success("Serial registrado")
            setNewSerial('')
            setShowForm(false)
            router.refresh()
        }
    }

    const handleStatusChange = async (id: string, status: string) => {
        const result = await updateSerialStatusAction(id, status)
        if (result.error) toast.error(result.error)
        else { toast.success("Estado actualizado"); router.refresh() }
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-violet-900 to-violet-800 p-10 text-white shadow-active">
                <div className="absolute top-0 right-0 p-8 opacity-[0.04] pointer-events-none">
                    <Hash className="h-48 w-48" />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-2">
                        <span className="text-[9px] font-black uppercase tracking-[0.4em] text-white/30">Inventario</span>
                        <h1 className="text-3xl font-black tracking-tight uppercase">Control de Seriales</h1>
                        <p className="text-white/40 text-xs font-bold">Trazabilidad individual por numero de serie</p>
                    </div>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-[2rem] p-6 shadow-premium border border-slate-50">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Seriales</p>
                    <p className="text-3xl font-black text-slate-900 mt-2 italic tracking-tighter">{stats.total}</p>
                </div>
                <div className="bg-white rounded-[2rem] p-6 shadow-premium border border-slate-50">
                    <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Disponibles</p>
                    <p className="text-3xl font-black text-emerald-600 mt-2 italic tracking-tighter">{stats.available}</p>
                </div>
                <div className="bg-white rounded-[2rem] p-6 shadow-premium border border-slate-50">
                    <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Vendidos</p>
                    <p className="text-3xl font-black text-blue-600 mt-2 italic tracking-tighter">{stats.sold}</p>
                </div>
                <div className="bg-white rounded-[2rem] p-6 shadow-premium border border-slate-50">
                    <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest">Defectuosos</p>
                    <p className="text-3xl font-black text-rose-600 mt-2 italic tracking-tighter">{stats.defective}</p>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Buscar por serial, producto..."
                        className="w-full h-11 pl-11 pr-4 rounded-xl border border-slate-200 text-sm font-medium placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="h-11 px-4 rounded-xl border border-slate-200 text-sm font-medium bg-white"
                >
                    <option value="">Todos los estados</option>
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                    ))}
                </select>
                <Button
                    onClick={() => setShowForm(true)}
                    className="h-11 px-5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-violet-600 hover:bg-violet-700 text-white"
                >
                    <Plus className="h-3.5 w-3.5 mr-2" /> Registrar Serial
                </Button>
            </div>

            {/* Create Form */}
            {showForm && (
                <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4 shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <select value={newProductId} onChange={e => setNewProductId(e.target.value)}
                            className="h-10 px-4 rounded-lg border border-slate-200 text-sm">
                            <option value="">Producto...</option>
                            {products.map(p => <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>)}
                        </select>
                        <select value={newWarehouseId} onChange={e => setNewWarehouseId(e.target.value)}
                            className="h-10 px-4 rounded-lg border border-slate-200 text-sm">
                            <option value="">Bodega (opcional)</option>
                            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                        <input type="text" value={newSerial} onChange={e => setNewSerial(e.target.value)}
                            placeholder="Numero de serie" className="h-10 px-4 rounded-lg border border-slate-200 text-sm font-mono uppercase" />
                    </div>
                    <div className="flex gap-3">
                        <Button onClick={handleCreate} disabled={saving} className="h-9 px-4 rounded-lg text-xs font-bold bg-violet-600 text-white">
                            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <Save className="h-3.5 w-3.5 mr-2" />} Guardar
                        </Button>
                        <Button onClick={() => setShowForm(false)} variant="ghost" className="h-9 px-4 rounded-lg text-xs text-slate-400">
                            <X className="h-3.5 w-3.5 mr-2" /> Cancelar
                        </Button>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-[2rem] shadow-premium border border-slate-50 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-100">
                                <th className="text-left px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Serial</th>
                                <th className="text-left px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Producto</th>
                                <th className="text-left px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Bodega</th>
                                <th className="text-left px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Estado</th>
                                <th className="text-left px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Fecha</th>
                                <th className="text-left px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-16 text-slate-300">
                                        <Hash className="h-10 w-10 mx-auto mb-3 opacity-50" />
                                        <p className="text-xs font-bold uppercase tracking-widest">Sin seriales registrados</p>
                                    </td>
                                </tr>
                            ) : filtered.map(s => {
                                const cfg = STATUS_CONFIG[s.status] || STATUS_CONFIG.AVAILABLE
                                return (
                                    <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-3">
                                            <span className="text-sm font-mono font-bold text-slate-900">{s.serial_number}</span>
                                        </td>
                                        <td className="px-6 py-3">
                                            <div className="flex items-center gap-2">
                                                <Package className="h-3.5 w-3.5 text-slate-400" />
                                                <span className="text-sm font-medium text-slate-700">{s.product?.name || '—'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3">
                                            <div className="flex items-center gap-2">
                                                <Warehouse className="h-3.5 w-3.5 text-slate-400" />
                                                <span className="text-sm text-slate-500">{s.warehouse?.name || '—'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3">
                                            <Badge className={cn("text-[9px] font-bold rounded-full px-2.5 py-0.5 border-none", cfg.color)}>
                                                {cfg.label}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-3 text-xs text-slate-400">
                                            {new Date(s.created_at).toLocaleDateString('es-CO')}
                                        </td>
                                        <td className="px-6 py-3">
                                            <select
                                                value={s.status}
                                                onChange={e => handleStatusChange(s.id, e.target.value)}
                                                className="h-7 px-2 rounded text-[10px] font-bold border border-slate-200 bg-white"
                                            >
                                                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                                                    <option key={k} value={k}>{v.label}</option>
                                                ))}
                                            </select>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
