"use client"

import { useState, useTransition } from "react"
import { KioskTerminal as KioskTerminalType } from "../types"
import { createTerminalAction, toggleTerminalAction, deleteTerminalAction } from "../actions/kioskActions"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Badge } from "@/shared/components/ui/badge"
import { toast } from "sonner"
import { Plus, Loader2, Trash2, Copy, Power, QrCode, ExternalLink } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import { useConfirm } from "@/shared/hooks/useConfirm"

interface Props {
    terminals: KioskTerminalType[]
    baseUrl: string
}

export function TerminalManager({ terminals: initialTerminals, baseUrl }: Props) {
    const [terminals, setTerminals] = useState(initialTerminals)
    const [name, setName] = useState('')
    const [isPending, startTransition] = useTransition()
    const [showQr, setShowQr] = useState<string | null>(null)
    const [ConfirmDialogEl, confirmFn] = useConfirm()

    const handleCreate = () => {
        if (!name.trim()) return
        startTransition(async () => {
            try {
                const newTerminal = await createTerminalAction(name.trim())
                setTerminals(prev => [newTerminal, ...prev])
                setName('')
                toast.success("Terminal creado")
            } catch {
                toast.error("Error al crear terminal")
            }
        })
    }

    const handleToggle = (id: string, currentActive: boolean) => {
        startTransition(async () => {
            try {
                await toggleTerminalAction(id, !currentActive)
                setTerminals(prev => prev.map(t => t.id === id ? { ...t, is_active: !currentActive } : t))
                toast.success(currentActive ? "Terminal desactivado" : "Terminal activado")
            } catch {
                toast.error("Error al cambiar estado")
            }
        })
    }

    const handleDelete = async (id: string, termName: string) => {
        const ok = await confirmFn({ title: "Confirmar", description: `Eliminar terminal "${termName}"?`, variant: "danger", confirmLabel: "Confirmar" })
        if (!ok) return
        startTransition(async () => {
            try {
                await deleteTerminalAction(id)
                setTerminals(prev => prev.filter(t => t.id !== id))
                toast.success("Terminal eliminado")
            } catch {
                toast.error("Error al eliminar")
            }
        })
    }

    const copyUrl = (token: string) => {
        const url = `${baseUrl}/terminal/${token}`
        navigator.clipboard.writeText(url)
        toast.success("URL copiada al portapapeles")
    }

    return (
        <div className="space-y-6">
            {ConfirmDialogEl}
            {/* Create form */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <QrCode className="h-4 w-4 text-indigo-600" />
                    Nuevo Terminal
                </h3>
                <div className="flex gap-3">
                    <Input
                        placeholder="Nombre del terminal (ej: Entrada Principal)"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleCreate()}
                        className="h-9 rounded-lg text-sm flex-1"
                    />
                    <Button
                        onClick={handleCreate}
                        disabled={isPending || !name.trim()}
                        className="h-9 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 px-4"
                    >
                        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4 mr-1" /> Crear</>}
                    </Button>
                </div>
            </div>

            {/* Terminal List */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                    <h3 className="text-sm font-bold text-slate-900">Terminales ({terminals.length})</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Cada terminal genera una URL unica que se abre en la tablet de la entrada.</p>
                </div>

                {terminals.length === 0 ? (
                    <div className="p-12 text-center">
                        <QrCode className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                        <p className="text-xs text-slate-400">No hay terminales. Crea uno para comenzar.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {terminals.map(terminal => (
                            <div key={terminal.id} className="px-5 py-4 space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                                        terminal.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'
                                    }`}>
                                        <QrCode className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-semibold text-slate-900">{terminal.name}</p>
                                            <Badge className={`text-[8px] font-bold px-1.5 py-0 ${
                                                terminal.is_active
                                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                                    : 'bg-slate-100 text-slate-400 border-slate-200'
                                            }`}>
                                                {terminal.is_active ? 'Activo' : 'Inactivo'}
                                            </Badge>
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-0.5">
                                            Creado: {new Date(terminal.created_at).toLocaleDateString('es-CO')}
                                            {terminal.last_ping_at && ` · Ultimo uso: ${new Date(terminal.last_ping_at).toLocaleString('es-CO')}`}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setShowQr(showQr === terminal.id ? null : terminal.id)}
                                            className="h-8 w-8 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                                            title="Ver QR del enlace"
                                        >
                                            <QrCode className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => copyUrl(terminal.token)}
                                            className="h-8 w-8 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                                            title="Copiar URL"
                                        >
                                            <Copy className="h-3.5 w-3.5" />
                                        </Button>
                                        <a
                                            href={`/terminal/${terminal.token}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                                            title="Abrir terminal"
                                        >
                                            <ExternalLink className="h-3.5 w-3.5" />
                                        </a>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleToggle(terminal.id, terminal.is_active)}
                                            disabled={isPending}
                                            className="h-8 w-8 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                                            title={terminal.is_active ? 'Desactivar' : 'Activar'}
                                        >
                                            <Power className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDelete(terminal.id, terminal.name)}
                                            disabled={isPending}
                                            className="h-8 w-8 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>

                                {/* URL display */}
                                <div className="bg-slate-50 rounded-lg px-3 py-2 flex items-center gap-2">
                                    <code className="text-[10px] text-slate-500 font-mono truncate flex-1">
                                        {baseUrl}/terminal/{terminal.token}
                                    </code>
                                </div>

                                {/* QR of terminal URL */}
                                {showQr === terminal.id && (
                                    <div className="flex justify-center py-4 animate-in fade-in duration-300">
                                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                            <QRCodeSVG
                                                value={`${baseUrl}/terminal/${terminal.token}`}
                                                size={200}
                                                level="M"
                                            />
                                            <p className="text-[10px] text-slate-400 text-center mt-2 font-bold">
                                                Escanea con la tablet
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
