"use client"

import { useState, useEffect, useTransition } from "react"
import { Button } from "@/shared/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/shared/components/ui/dialog"
import { LinkIcon, Unlink, Loader2, CheckCircle2, AlertCircle, Search, User } from "lucide-react"
import { linkEmployeeToUserAction, getTenantUsersAction } from "../actions"
import { toast } from "sonner"
import { cn } from "@/shared/lib/utils"

interface TenantUser {
    id: string
    name: string
    email: string
    linked: boolean
}

interface LinkUserModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    employeeId: string
    employeeName: string
    currentUserId?: string | null
}

export function LinkUserModal({ open, onOpenChange, employeeId, employeeName, currentUserId }: LinkUserModalProps) {
    const [users, setUsers] = useState<TenantUser[]>([])
    const [loading, setLoading] = useState(false)
    const [isPending, startTransition] = useTransition()
    const [search, setSearch] = useState("")
    const [selectedUserId, setSelectedUserId] = useState<string | null>(currentUserId || null)

    useEffect(() => {
        if (open) {
            setLoading(true)
            setSearch("")
            setSelectedUserId(currentUserId || null)
            getTenantUsersAction()
                .then(setUsers)
                .catch(() => toast.error("Error cargando usuarios"))
                .finally(() => setLoading(false))
        }
    }, [open, currentUserId])

    const filtered = users.filter(u =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
    )

    const handleLink = () => {
        startTransition(async () => {
            try {
                await linkEmployeeToUserAction(employeeId, selectedUserId)
                toast.success(selectedUserId
                    ? `Usuario vinculado a ${employeeName}. Ya puede acceder a Mi Nomina.`
                    : `Usuario desvinculado de ${employeeName}.`
                )
                onOpenChange(false)
            } catch (err: unknown) {
                toast.error(err instanceof Error ? err.message : "Error al vincular usuario")
            }
        })
    }

    const handleUnlink = () => {
        startTransition(async () => {
            try {
                await linkEmployeeToUserAction(employeeId, null)
                toast.success(`Usuario desvinculado de ${employeeName}`)
                setSelectedUserId(null)
                onOpenChange(false)
            } catch (err: unknown) {
                toast.error(err instanceof Error ? err.message : "Error al desvincular")
            }
        })
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[460px] rounded-2xl">
                <DialogHeader>
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                            <LinkIcon className="h-4 w-4" />
                        </div>
                        <div>
                            <DialogTitle className="text-base font-bold text-slate-900">Vincular Usuario</DialogTitle>
                            <DialogDescription className="text-xs text-slate-400">
                                {employeeName} — Acceso a Mi Nomina
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-4 pt-2">
                    <p className="text-xs text-slate-500 leading-relaxed">
                        Selecciona el usuario del sistema que corresponde a este empleado. Al vincularlo, podra acceder al portal <strong>Mi Nomina</strong> para ver desprendibles, solicitar vacaciones y mas.
                    </p>

                    {currentUserId && (
                        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                <p className="text-[10px] font-semibold text-emerald-700">Empleado vinculado actualmente</p>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleUnlink}
                                disabled={isPending}
                                className="h-7 px-2.5 rounded-lg text-[10px] font-semibold border-rose-200 text-rose-600 hover:bg-rose-50 gap-1"
                            >
                                {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Unlink className="h-3 w-3" />}
                                Desvincular
                            </Button>
                        </div>
                    )}

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar usuario por nombre o email..."
                            className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    {/* User list */}
                    <div className="max-h-52 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
                        {loading ? (
                            <div className="py-8 text-center">
                                <Loader2 className="h-5 w-5 animate-spin text-slate-400 mx-auto" />
                                <p className="text-[10px] text-slate-400 mt-2">Cargando usuarios...</p>
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="py-8 text-center">
                                <AlertCircle className="h-5 w-5 text-slate-300 mx-auto" />
                                <p className="text-[10px] text-slate-400 mt-2">Sin usuarios disponibles</p>
                            </div>
                        ) : (
                            filtered.map(u => (
                                <button
                                    key={u.id}
                                    onClick={() => setSelectedUserId(u.id)}
                                    disabled={u.linked && u.id !== currentUserId}
                                    className={cn(
                                        "w-full px-4 py-3 flex items-center gap-3 text-left transition-colors",
                                        selectedUserId === u.id
                                            ? "bg-indigo-50"
                                            : u.linked && u.id !== currentUserId
                                                ? "opacity-40 cursor-not-allowed bg-slate-50"
                                                : "hover:bg-slate-50"
                                    )}
                                >
                                    <div className={cn(
                                        "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                                        selectedUserId === u.id ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-400"
                                    )}>
                                        <User className="h-3.5 w-3.5" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-bold text-slate-900 truncate">{u.name}</p>
                                        <p className="text-[10px] text-slate-400 truncate">{u.email}</p>
                                    </div>
                                    {u.linked && u.id !== currentUserId && (
                                        <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg shrink-0">Vinculado</span>
                                    )}
                                    {selectedUserId === u.id && (
                                        <CheckCircle2 className="h-4 w-4 text-indigo-600 shrink-0" />
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-9 rounded-xl text-xs"
                        onClick={() => onOpenChange(false)}
                    >
                        Cancelar
                    </Button>
                    <Button
                        size="sm"
                        className="h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold gap-1.5"
                        onClick={handleLink}
                        disabled={isPending || !selectedUserId || selectedUserId === currentUserId}
                    >
                        {isPending ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <>
                                <LinkIcon className="h-3.5 w-3.5" />
                                Vincular Usuario
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
