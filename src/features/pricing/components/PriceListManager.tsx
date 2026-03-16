"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/shared/components/ui/button"
import { Badge } from "@/shared/components/ui/badge"
import { toast } from "sonner"
import {
    createPriceListAction,
    deletePriceListAction,
    upsertPriceListItemAction,
    deletePriceListItemAction,
} from "../actions"
import {
    Plus, Trash2, Tags, ChevronDown, ChevronUp,
    Star, Loader2, Save, X, Package
} from "lucide-react"

interface PriceList {
    id: string
    name: string
    currency: string
    valid_from: string | null
    valid_to: string | null
    is_default: boolean
    items: { count: number }[]
}

interface Product {
    id: string
    name: string
    sku: string
    selling_price: number
}

interface PriceListItem {
    id: string
    product_id: string
    unit_price: number
    min_qty: number
    product?: { name: string; sku: string }
}

interface Props {
    priceLists: PriceList[]
    products: Product[]
}

export function PriceListManager({ priceLists, products }: Props) {
    const router = useRouter()
    const [showCreate, setShowCreate] = useState(false)
    const [name, setName] = useState('')
    const [creating, setCreating] = useState(false)
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [addingTo, setAddingTo] = useState<string | null>(null)
    const [newItemProductId, setNewItemProductId] = useState('')
    const [newItemPrice, setNewItemPrice] = useState('')
    const [newItemMinQty, setNewItemMinQty] = useState('1')
    const [savingItem, setSavingItem] = useState(false)
    const [items, setItems] = useState<Record<string, PriceListItem[]>>({})
    const [loadingItems, setLoadingItems] = useState<string | null>(null)

    const fmt = (n: number) =>
        new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            maximumFractionDigits: 0,
        }).format(n)

    const handleCreate = async () => {
        if (!name.trim()) { toast.error("El nombre es requerido"); return }
        setCreating(true)
        const result = await createPriceListAction({ name: name.trim() })
        setCreating(false)
        if (result.error) toast.error(result.error)
        else {
            toast.success("Lista de precios creada")
            setName('')
            setShowCreate(false)
            router.refresh()
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Esta accion eliminara la lista y todos sus precios. Desea continuar?")) return
        const result = await deletePriceListAction(id)
        if (result.error) toast.error(result.error)
        else { toast.success("Lista eliminada"); router.refresh() }
    }

    const loadItems = async (listId: string) => {
        if (expandedId === listId) { setExpandedId(null); return }
        setExpandedId(listId)
        setLoadingItems(listId)
        try {
            const response = await fetch(`/api/pricing/${listId}/items`)
            if (response.ok) {
                const data = await response.json()
                setItems(prev => ({ ...prev, [listId]: data }))
            }
        } catch {
            // ignore network errors silently
        }
        setLoadingItems(null)
    }

    const handleAddItem = async (listId: string) => {
        if (!newItemProductId || !newItemPrice) {
            toast.error("Producto y precio son requeridos")
            return
        }
        setSavingItem(true)
        const result = await upsertPriceListItemAction({
            price_list_id: listId,
            product_id: newItemProductId,
            unit_price: Number(newItemPrice),
            min_qty: Number(newItemMinQty) || 1,
        })
        setSavingItem(false)
        if (result.error) toast.error(result.error)
        else {
            toast.success("Precio guardado")
            setNewItemProductId('')
            setNewItemPrice('')
            setNewItemMinQty('1')
            setAddingTo(null)
            // Reload items for this list
            setLoadingItems(listId)
            try {
                const response = await fetch(`/api/pricing/${listId}/items`)
                if (response.ok) {
                    const data = await response.json()
                    setItems(prev => ({ ...prev, [listId]: data }))
                }
            } catch {
                // ignore
            }
            setLoadingItems(null)
            router.refresh()
        }
    }

    const handleDeleteItem = async (itemId: string, listId: string) => {
        const result = await deletePriceListItemAction(itemId)
        if (result.error) toast.error(result.error)
        else {
            toast.success("Precio eliminado")
            setItems(prev => ({
                ...prev,
                [listId]: (prev[listId] || []).filter(i => i.id !== itemId),
            }))
        }
    }

    const totalItems = priceLists.reduce((sum, l) => sum + (l.items?.[0]?.count || 0), 0)
    const defaultList = priceLists.find(l => l.is_default)

    return (
        <div className="space-y-6">
            {/* KPI cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        Listas Activas
                    </p>
                    <p className="text-3xl font-black text-slate-900 mt-2 italic tracking-tighter">
                        {priceLists.length}
                    </p>
                </div>
                <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        Total Precios
                    </p>
                    <p className="text-3xl font-black text-indigo-600 mt-2 italic tracking-tighter">
                        {totalItems}
                    </p>
                </div>
                <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        Lista por Defecto
                    </p>
                    <p className="text-lg font-black text-slate-900 mt-2 italic tracking-tighter">
                        {defaultList?.name || '—'}
                    </p>
                </div>
            </div>

            {/* Create new list */}
            {!showCreate ? (
                <Button
                    onClick={() => setShowCreate(true)}
                    className="h-10 px-5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                    <Plus className="h-3.5 w-3.5 mr-2" />
                    Nueva Lista de Precios
                </Button>
            ) : (
                <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4 shadow-sm">
                    <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleCreate() }}
                        placeholder="Nombre de la lista (ej: Precio Mayorista)"
                        className="w-full h-10 px-4 rounded-lg border border-slate-200 text-sm font-medium placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300"
                        autoFocus
                    />
                    <div className="flex gap-3">
                        <Button
                            onClick={handleCreate}
                            disabled={creating}
                            className="h-9 px-4 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                            {creating
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                                : <Save className="h-3.5 w-3.5 mr-2" />
                            }
                            Crear
                        </Button>
                        <Button
                            onClick={() => { setShowCreate(false); setName('') }}
                            variant="ghost"
                            className="h-9 px-4 rounded-lg text-xs font-bold text-slate-400"
                        >
                            Cancelar
                        </Button>
                    </div>
                </div>
            )}

            {/* Price lists */}
            {priceLists.length === 0 ? (
                <div className="bg-white rounded-[2.5rem] p-16 text-center shadow-sm border border-slate-100">
                    <Tags className="h-12 w-12 mx-auto text-slate-200 mb-4" />
                    <p className="text-sm font-bold text-slate-400">Sin listas de precios</p>
                    <p className="text-xs text-slate-300 mt-1">
                        Crea una lista para asignar precios diferenciados por cliente
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {priceLists.map(list => (
                        <div
                            key={list.id}
                            className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"
                        >
                            {/* List header row */}
                            <div
                                className="flex items-center justify-between p-5 cursor-pointer hover:bg-slate-50/50 transition-colors"
                                onClick={() => loadItems(list.id)}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                                        <Tags className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold text-slate-900 text-sm">{list.name}</p>
                                            {list.is_default && (
                                                <Badge className="text-[8px] font-bold bg-amber-50 text-amber-600 border-none rounded-full px-2 py-0.5">
                                                    <Star className="h-2.5 w-2.5 mr-1 inline" />
                                                    Por defecto
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-[10px] text-slate-400 font-medium">
                                            {list.items?.[0]?.count || 0} precios &middot; {list.currency}
                                            {list.valid_from && ` · Desde ${list.valid_from}`}
                                            {list.valid_to && ` hasta ${list.valid_to}`}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Button
                                        onClick={e => { e.stopPropagation(); handleDelete(list.id) }}
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                    {expandedId === list.id
                                        ? <ChevronUp className="h-4 w-4 text-slate-400" />
                                        : <ChevronDown className="h-4 w-4 text-slate-400" />
                                    }
                                </div>
                            </div>

                            {/* Expanded items panel */}
                            {expandedId === list.id && (
                                <div className="border-t border-slate-100 p-5 space-y-4">
                                    {loadingItems === list.id ? (
                                        <div className="flex items-center justify-center py-8">
                                            <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
                                        </div>
                                    ) : (
                                        <>
                                            {/* Add item form */}
                                            {addingTo === list.id ? (
                                                <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                                        <select
                                                            value={newItemProductId}
                                                            onChange={e => {
                                                                setNewItemProductId(e.target.value)
                                                                const prod = products.find(p => p.id === e.target.value)
                                                                if (prod && !newItemPrice) {
                                                                    setNewItemPrice(String(prod.selling_price || ''))
                                                                }
                                                            }}
                                                            className="h-9 px-3 rounded-lg border border-slate-200 text-sm col-span-2 bg-white"
                                                        >
                                                            <option value="">Seleccionar producto...</option>
                                                            {products.map(p => (
                                                                <option key={p.id} value={p.id}>
                                                                    {p.sku} — {p.name}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        <input
                                                            type="number"
                                                            value={newItemPrice}
                                                            onChange={e => setNewItemPrice(e.target.value)}
                                                            placeholder="Precio"
                                                            min="0"
                                                            step="0.01"
                                                            className="h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white"
                                                        />
                                                        <input
                                                            type="number"
                                                            value={newItemMinQty}
                                                            onChange={e => setNewItemMinQty(e.target.value)}
                                                            placeholder="Qty min"
                                                            min="1"
                                                            className="h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white"
                                                        />
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            onClick={() => handleAddItem(list.id)}
                                                            disabled={savingItem}
                                                            className="h-8 px-3 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
                                                        >
                                                            {savingItem
                                                                ? <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                                                : <Save className="h-3 w-3 mr-1" />
                                                            }
                                                            Guardar
                                                        </Button>
                                                        <Button
                                                            onClick={() => setAddingTo(null)}
                                                            variant="ghost"
                                                            className="h-8 px-3 rounded-lg text-xs text-slate-400"
                                                        >
                                                            <X className="h-3 w-3 mr-1" />
                                                            Cancelar
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <Button
                                                    onClick={() => setAddingTo(list.id)}
                                                    className="h-8 px-4 rounded-lg text-[10px] font-bold bg-slate-900 hover:bg-slate-800 text-white"
                                                >
                                                    <Plus className="h-3 w-3 mr-1.5" />
                                                    Agregar Precio
                                                </Button>
                                            )}

                                            {/* Items table */}
                                            {(items[list.id] || []).length > 0 ? (
                                                <table className="w-full">
                                                    <thead>
                                                        <tr className="border-b border-slate-100">
                                                            <th className="text-left px-3 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                                Producto
                                                            </th>
                                                            <th className="text-right px-3 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                                Precio
                                                            </th>
                                                            <th className="text-right px-3 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                                Qty Min
                                                            </th>
                                                            <th className="w-10" />
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {(items[list.id] || []).map(item => (
                                                            <tr key={item.id} className="border-b border-slate-50 last:border-0">
                                                                <td className="px-3 py-2.5 text-sm font-medium text-slate-700">
                                                                    <div className="flex items-center gap-2">
                                                                        <Package className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                                                                        {item.product?.name || item.product_id}
                                                                    </div>
                                                                </td>
                                                                <td className="px-3 py-2.5 text-sm font-bold text-right text-emerald-600">
                                                                    {fmt(item.unit_price)}
                                                                </td>
                                                                <td className="px-3 py-2.5 text-sm text-right text-slate-500">
                                                                    {item.min_qty}
                                                                </td>
                                                                <td className="px-3 py-2.5">
                                                                    <button
                                                                        onClick={() => handleDeleteItem(item.id, list.id)}
                                                                        className="text-slate-300 hover:text-rose-500 transition-colors"
                                                                        aria-label="Eliminar precio"
                                                                    >
                                                                        <Trash2 className="h-3.5 w-3.5" />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            ) : (
                                                <div className="text-center py-6 text-xs text-slate-400 font-medium">
                                                    Sin precios configurados. Agrega el primero arriba.
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
