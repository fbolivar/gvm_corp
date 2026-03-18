"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/shared/components/ui/button"
import { Badge } from "@/shared/components/ui/badge"
import { toast } from "sonner"
import { createApiKeyAction, deleteApiKeyAction } from "../actions/apiKeyActions"
import { useConfirm } from "@/shared/hooks/useConfirm"
import {
    Plus,
    Trash2,
    Key,
    Loader2,
    Save,
    Copy,
    Eye,
    EyeOff,
    AlertTriangle,
} from "lucide-react"

interface ApiKey {
    id: string
    name: string
    prefix: string
    scopes: string[]
    is_active: boolean
    created_at: string
    last_used_at: string | null
}

interface Props {
    apiKeys: ApiKey[]
}

export function ApiKeyManager({ apiKeys }: Props) {
    const router = useRouter()
    const [ConfirmDialogEl, confirmFn] = useConfirm()
    const [showCreate, setShowCreate] = useState(false)
    const [name, setName] = useState('')
    const [creating, setCreating] = useState(false)
    const [newKey, setNewKey] = useState<string | null>(null)
    const [showKey, setShowKey] = useState(false)

    const handleCreate = async () => {
        if (!name.trim()) {
            toast.error("El nombre es requerido")
            return
        }
        setCreating(true)
        const result = await createApiKeyAction({ name: name.trim() })
        setCreating(false)
        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success("API Key creada")
            setName('')
            setShowCreate(false)
            if (result.key) setNewKey(result.key)
            router.refresh()
        }
    }

    const handleDelete = async (id: string) => {
        const ok = await confirmFn({ title: "Confirmar", description: "Eliminar esta API key? Las integraciones que la usen dejaran de funcionar.", variant: "danger", confirmLabel: "Confirmar" })
        if (!ok) return
        const result = await deleteApiKeyAction(id)
        if (result.error) toast.error(result.error)
        else {
            toast.success("API Key eliminada")
            router.refresh()
        }
    }

    const copyKey = (key: string) => {
        navigator.clipboard.writeText(key)
        toast.success("API Key copiada al portapapeles")
    }

    return (
        <div className="space-y-6">
            {/* New Key Display — shown once after creation */}
            {newKey && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 space-y-3">
                    <div className="flex items-center gap-2 text-amber-700">
                        <AlertTriangle className="h-5 w-5" />
                        <p className="text-sm font-bold">
                            Tu nueva API Key - Copiala ahora, no se mostrara de nuevo
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <code className="flex-1 bg-white px-4 py-2 rounded-lg text-sm font-mono border border-amber-200 overflow-auto">
                            {showKey ? newKey : newKey.substring(0, 8) + '\u2022'.repeat(32)}
                        </code>
                        <Button
                            onClick={() => setShowKey(!showKey)}
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-lg shrink-0"
                        >
                            {showKey ? (
                                <EyeOff className="h-4 w-4" />
                            ) : (
                                <Eye className="h-4 w-4" />
                            )}
                        </Button>
                        <Button
                            onClick={() => copyKey(newKey)}
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-lg text-amber-600 shrink-0"
                        >
                            <Copy className="h-4 w-4" />
                        </Button>
                    </div>
                    <Button
                        onClick={() => setNewKey(null)}
                        variant="ghost"
                        className="text-xs text-amber-500"
                    >
                        Entendido, ya la copie
                    </Button>
                </div>
            )}

            {/* Connection info */}
            <div className="bg-white rounded-[2rem] p-6 shadow-premium border border-slate-50 space-y-3">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    Conexion OData para Power BI
                </p>
                <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-slate-500 w-20">URL Base:</span>
                        <code className="text-xs font-mono text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg">
                            /api/v1/odata/[entity]
                        </code>
                    </div>
                    <div className="flex flex-wrap items-start gap-2">
                        <span className="text-xs font-bold text-slate-500 w-20 shrink-0">Entities:</span>
                        <code className="text-xs font-mono text-slate-600 leading-relaxed">
                            documents, parties, products, journal_entries, journal_lines,
                            inventory_movements, purchase_orders, fixed_assets, leads,
                            crm_opportunities
                        </code>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-slate-500 w-20">Auth:</span>
                        <code className="text-xs font-mono text-slate-600">
                            Authorization: Bearer YOUR_API_KEY
                        </code>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-slate-500 w-20">Metadata:</span>
                        <code className="text-xs font-mono text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg">
                            /api/v1/odata/$metadata
                        </code>
                    </div>
                </div>
            </div>

            {/* Create form */}
            {!showCreate ? (
                <Button
                    onClick={() => setShowCreate(true)}
                    className="h-10 px-5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-amber-600 hover:bg-amber-700 text-white"
                >
                    <Plus className="h-3.5 w-3.5 mr-2" /> Nueva API Key
                </Button>
            ) : (
                <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4 shadow-sm">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        Nueva API Key
                    </p>
                    <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Nombre de la key (ej: Power BI Dashboard)"
                        className="w-full h-10 px-4 rounded-xl border border-slate-200 text-sm placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                        onKeyDown={e => e.key === 'Enter' && handleCreate()}
                    />
                    <div className="flex gap-3">
                        <Button
                            onClick={handleCreate}
                            disabled={creating}
                            className="h-9 px-4 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white"
                        >
                            {creating ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                            ) : (
                                <Save className="h-3.5 w-3.5 mr-2" />
                            )}
                            Generar Key
                        </Button>
                        <Button
                            onClick={() => {
                                setShowCreate(false)
                                setName('')
                            }}
                            variant="ghost"
                            className="h-9 px-4 rounded-lg text-xs text-slate-400"
                        >
                            Cancelar
                        </Button>
                    </div>
                </div>
            )}

            {/* Keys Table */}
            <div className="bg-white rounded-[2rem] shadow-premium border border-slate-50 overflow-hidden">
                {apiKeys.length === 0 ? (
                    <div className="p-16 text-center text-slate-300">
                        <Key className="h-10 w-10 mx-auto mb-3 opacity-50" />
                        <p className="text-xs font-bold uppercase tracking-widest">Sin API keys</p>
                        <p className="text-xs mt-1">Crea una key para conectar Power BI</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-100">
                                    <th className="text-left px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                        Nombre
                                    </th>
                                    <th className="text-left px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                        Prefijo
                                    </th>
                                    <th className="text-left px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                        Permisos
                                    </th>
                                    <th className="text-left px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                        Ultimo Uso
                                    </th>
                                    <th className="w-10"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {apiKeys.map(key => (
                                    <tr
                                        key={key.id}
                                        className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
                                    >
                                        <td className="px-6 py-3 text-sm font-bold text-slate-900">
                                            {key.name}
                                        </td>
                                        <td className="px-6 py-3">
                                            <code className="text-xs font-mono text-slate-500">
                                                {key.prefix}
                                                {'\u2022'.repeat(8)}
                                            </code>
                                        </td>
                                        <td className="px-6 py-3">
                                            {(key.scopes || []).map(s => (
                                                <Badge
                                                    key={s}
                                                    className="text-[8px] font-bold bg-emerald-50 text-emerald-600 border-none rounded mr-1"
                                                >
                                                    {s}
                                                </Badge>
                                            ))}
                                        </td>
                                        <td className="px-6 py-3 text-xs text-slate-400">
                                            {key.last_used_at
                                                ? new Date(key.last_used_at).toLocaleString('es-CO')
                                                : 'Nunca'}
                                        </td>
                                        <td className="px-6 py-3">
                                            <button
                                                onClick={() => handleDelete(key.id)}
                                                className="text-slate-300 hover:text-rose-500 transition-colors"
                                                title="Eliminar key"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        {ConfirmDialogEl}
        </div>
    )
}
