"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/shared/components/ui/button"
import { Badge } from "@/shared/components/ui/badge"
import { toast } from "sonner"
import {
    createDimensionAction,
    deleteDimensionAction,
    createDimensionValueAction,
    deleteDimensionValueAction,
} from "../actions/dimensionActions"
import { useConfirm } from "@/shared/hooks/useConfirm"
import {
    Plus,
    Trash2,
    Layers,
    ChevronDown,
    ChevronUp,
    Loader2,
    Save,
    X,
    Tag,
    FolderTree,
} from "lucide-react"

interface Dimension {
    id: string
    code: string
    name: string
    is_active: boolean
}

interface DimensionValue {
    id: string
    dimension_id: string
    code: string
    name: string
    is_active: boolean
    dimension?: { code: string; name: string }
}

interface Props {
    dimensions: Dimension[]
    dimensionValues: DimensionValue[]
}

export function DimensionManager({ dimensions, dimensionValues }: Props) {
    const router = useRouter()
    const [ConfirmDialogEl, confirmFn] = useConfirm()
    const [expandedId, setExpandedId] = useState<string | null>(null)

    // Create dimension form state
    const [showCreate, setShowCreate] = useState(false)
    const [newCode, setNewCode] = useState('')
    const [newName, setNewName] = useState('')
    const [creating, setCreating] = useState(false)

    // Create value form state
    const [addingValueTo, setAddingValueTo] = useState<string | null>(null)
    const [valCode, setValCode] = useState('')
    const [valName, setValName] = useState('')
    const [savingValue, setSavingValue] = useState(false)

    const handleCreateDim = async () => {
        if (!newCode.trim() || !newName.trim()) {
            toast.error("Codigo y nombre son requeridos")
            return
        }
        setCreating(true)
        const result = await createDimensionAction({
            code: newCode.trim().toUpperCase(),
            name: newName.trim(),
        })
        setCreating(false)
        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success("Dimension creada")
            setNewCode('')
            setNewName('')
            setShowCreate(false)
            router.refresh()
        }
    }

    const handleDeleteDim = async (id: string) => {
        const ok = await confirmFn({ title: "Confirmar", description: "Eliminar esta dimension y todos sus valores?", variant: "danger", confirmLabel: "Confirmar" })
        if (!ok) return
        const result = await deleteDimensionAction(id)
        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success("Dimension eliminada")
            router.refresh()
        }
    }

    const handleCreateValue = async (dimId: string) => {
        if (!valCode.trim() || !valName.trim()) {
            toast.error("Codigo y nombre requeridos")
            return
        }
        setSavingValue(true)
        const result = await createDimensionValueAction({
            dimension_id: dimId,
            code: valCode.trim().toUpperCase(),
            name: valName.trim(),
        })
        setSavingValue(false)
        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success("Valor agregado")
            setValCode('')
            setValName('')
            setAddingValueTo(null)
            router.refresh()
        }
    }

    const handleDeleteValue = async (id: string) => {
        const result = await deleteDimensionValueAction(id)
        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success("Valor eliminado")
            router.refresh()
        }
    }

    return (
        <div className="space-y-6">
            {ConfirmDialogEl}
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-[2rem] p-6 shadow-premium border border-slate-50">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        Dimensiones
                    </p>
                    <p className="text-3xl font-black text-slate-900 mt-2 italic tracking-tighter">
                        {dimensions.length}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">
                        configuradas
                    </p>
                </div>
                <div className="bg-white rounded-[2rem] p-6 shadow-premium border border-slate-50">
                    <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">
                        Total Valores
                    </p>
                    <p className="text-3xl font-black text-indigo-600 mt-2 italic tracking-tighter">
                        {dimensionValues.length}
                    </p>
                    <p className="text-[10px] text-indigo-300 mt-1">
                        entre todas las dimensiones
                    </p>
                </div>
            </div>

            {/* Create Dimension Button / Form */}
            {!showCreate ? (
                <Button
                    onClick={() => setShowCreate(true)}
                    className="h-10 px-5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-slate-900 hover:bg-slate-800 text-white"
                >
                    <Plus className="h-3.5 w-3.5 mr-2" />
                    Nueva Dimension
                </Button>
            ) : (
                <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4 shadow-sm">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        Nueva Dimension (ej: Centro de Costo, Departamento)
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input
                            type="text"
                            value={newCode}
                            onChange={e => setNewCode(e.target.value)}
                            placeholder="Codigo (ej: CC, DEPT)"
                            className="h-10 px-4 rounded-xl border border-slate-200 text-sm font-mono uppercase placeholder:normal-case placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                        <input
                            type="text"
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            placeholder="Nombre (ej: Centro de Costo)"
                            className="h-10 px-4 rounded-xl border border-slate-200 text-sm placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                    </div>
                    <div className="flex gap-3">
                        <Button
                            onClick={handleCreateDim}
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
                            onClick={() => { setShowCreate(false); setNewCode(''); setNewName('') }}
                            variant="ghost"
                            className="h-9 px-4 rounded-lg text-xs text-slate-400"
                        >
                            Cancelar
                        </Button>
                    </div>
                </div>
            )}

            {/* Dimensions List */}
            {dimensions.length === 0 ? (
                <div className="bg-white rounded-[2.5rem] p-16 text-center shadow-premium border border-slate-50">
                    <Layers className="h-12 w-12 mx-auto text-slate-200 mb-4" />
                    <p className="text-sm font-bold text-slate-400">Sin dimensiones configuradas</p>
                    <p className="text-xs text-slate-300 mt-1">
                        Crea una dimension como &quot;Centro de Costo&quot; o &quot;Departamento&quot;
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {dimensions.map(dim => {
                        const values = dimensionValues.filter(v => v.dimension_id === dim.id)
                        const isExpanded = expandedId === dim.id

                        return (
                            <div
                                key={dim.id}
                                className="bg-white rounded-2xl shadow-premium border border-slate-50 overflow-hidden"
                            >
                                {/* Dimension Header Row */}
                                <div
                                    className="flex items-center justify-between p-5 cursor-pointer hover:bg-slate-50/50 transition-colors"
                                    onClick={() => setExpandedId(isExpanded ? null : dim.id)}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
                                            <FolderTree className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <Badge className="text-[8px] font-mono font-bold bg-slate-100 text-slate-600 border-none rounded px-2">
                                                    {dim.code}
                                                </Badge>
                                                <p className="font-bold text-slate-900 text-sm">
                                                    {dim.name}
                                                </p>
                                            </div>
                                            <p className="text-[10px] text-slate-400 mt-0.5">
                                                {values.length} {values.length === 1 ? 'valor' : 'valores'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            onClick={e => { e.stopPropagation(); handleDeleteDim(dim.id) }}
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                        {isExpanded
                                            ? <ChevronUp className="h-4 w-4 text-slate-400" />
                                            : <ChevronDown className="h-4 w-4 text-slate-400" />
                                        }
                                    </div>
                                </div>

                                {/* Expanded: Values Panel */}
                                {isExpanded && (
                                    <div className="border-t border-slate-100 p-5 space-y-4">
                                        {/* Add Value Form */}
                                        {addingValueTo === dim.id ? (
                                            <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                    Nuevo Valor para {dim.name}
                                                </p>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    <input
                                                        type="text"
                                                        value={valCode}
                                                        onChange={e => setValCode(e.target.value)}
                                                        placeholder="Codigo (ej: 001, ADM)"
                                                        className="h-9 px-3 rounded-lg border border-slate-200 text-sm font-mono uppercase placeholder:normal-case placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={valName}
                                                        onChange={e => setValName(e.target.value)}
                                                        placeholder="Nombre (ej: Administracion)"
                                                        className="h-9 px-3 rounded-lg border border-slate-200 text-sm placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                                    />
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button
                                                        onClick={() => handleCreateValue(dim.id)}
                                                        disabled={savingValue}
                                                        className="h-8 px-3 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
                                                    >
                                                        {savingValue
                                                            ? <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                                            : <Save className="h-3 w-3 mr-1" />
                                                        }
                                                        Guardar
                                                    </Button>
                                                    <Button
                                                        onClick={() => { setAddingValueTo(null); setValCode(''); setValName('') }}
                                                        variant="ghost"
                                                        className="h-8 px-3 text-xs text-slate-400"
                                                    >
                                                        <X className="h-3 w-3 mr-1" />
                                                        Cancelar
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <Button
                                                onClick={() => setAddingValueTo(dim.id)}
                                                className="h-8 px-4 rounded-lg text-[10px] font-bold bg-slate-900 hover:bg-slate-800 text-white"
                                            >
                                                <Plus className="h-3 w-3 mr-1.5" />
                                                Agregar Valor
                                            </Button>
                                        )}

                                        {/* Values List */}
                                        {values.length > 0 && (
                                            <div className="space-y-1">
                                                {values.map(val => (
                                                    <div
                                                        key={val.id}
                                                        className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <Tag className="h-3.5 w-3.5 text-slate-300" />
                                                            <Badge className="text-[8px] font-mono font-bold bg-indigo-50 text-indigo-600 border-none rounded px-2">
                                                                {val.code}
                                                            </Badge>
                                                            <span className="text-sm font-medium text-slate-700">
                                                                {val.name}
                                                            </span>
                                                        </div>
                                                        <button
                                                            onClick={() => handleDeleteValue(val.id)}
                                                            className="text-slate-300 hover:text-rose-500 transition-colors p-1 rounded"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {values.length === 0 && addingValueTo !== dim.id && (
                                            <p className="text-xs text-slate-300 italic pl-1">
                                                Sin valores aun. Agrega el primero.
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
