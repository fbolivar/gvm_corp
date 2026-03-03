"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/shared/components/ui/button"
import { useToast } from "@/shared/hooks/use-toast"
import {
    Send,
    CheckCircle2,
    XCircle,
    Eye,
    Loader2,
    PackageCheck,
} from "lucide-react"
import Link from "next/link"
import {
    submitOrderForApprovalAction,
    approveOrderAction,
    cancelOrderAction,
} from "@/features/purchasing/actions"
import { POStatus } from "@/features/purchasing/types"

interface POActionButtonsProps {
    orderId: string
    status: POStatus
}

type ActionResult = { success?: boolean; error?: string } | void

export function POActionButtons({ orderId, status }: POActionButtonsProps) {
    const [loading, setLoading] = useState<string | null>(null)
    const { toast } = useToast()
    const router = useRouter()

    const run = async (label: string, action: () => Promise<ActionResult>) => {
        setLoading(label)
        try {
            const result = await action()
            if (result && "error" in result && result.error) {
                toast({
                    title: "Error",
                    description: result.error,
                    variant: "destructive",
                })
            } else {
                toast({ title: "Operación exitosa", description: "La orden fue actualizada correctamente." })
                router.refresh()
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Error desconocido"
            toast({ title: "Error Fatal", description: message, variant: "destructive" })
        } finally {
            setLoading(null)
        }
    }

    const busy = (label: string) => loading === label

    return (
        <div className="flex items-center justify-end gap-3">
            {/* View detail — always visible */}
            <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 rounded-2xl bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-white hover:shadow-premium transition-all active:scale-90 border border-transparent hover:border-slate-100"
                title="Ver Detalle"
                asChild
            >
                <Link href={`/purchasing/orders/${orderId}`}>
                    <Eye className="h-4 w-4" />
                </Link>
            </Button>

            {/* DRAFT → Send for approval */}
            {status === "DRAFT" && (
                <Button
                    variant="ghost"
                    className="h-11 px-5 rounded-2xl bg-amber-50 border border-amber-100 text-amber-700 font-black text-[9px] uppercase tracking-widest hover:bg-amber-500 hover:text-white transition-all active:scale-95 group/btn"
                    disabled={busy("submit")}
                    onClick={() => run("submit", () => submitOrderForApprovalAction(orderId))}
                    title="Enviar a Aprobación"
                >
                    {busy("submit") ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <>
                            <Send className="h-3.5 w-3.5 mr-1.5 group-hover/btn:translate-x-0.5 transition-transform" />
                            Enviar
                        </>
                    )}
                </Button>
            )}

            {/* PENDING_APPROVAL → Approve or Reject */}
            {status === "PENDING_APPROVAL" && (
                <>
                    <Button
                        variant="ghost"
                        className="h-11 px-5 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 font-black text-[9px] uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all active:scale-95 group/btn"
                        disabled={busy("approve")}
                        onClick={() => run("approve", () => approveOrderAction(orderId))}
                        title="Aprobar Orden"
                    >
                        {busy("approve") ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <>
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 group-hover/btn:scale-110 transition-transform" />
                                Aprobar
                            </>
                        )}
                    </Button>

                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-11 w-11 rounded-2xl bg-rose-50 border border-rose-100 text-rose-500 hover:bg-rose-500 hover:text-white transition-all active:scale-90"
                        disabled={busy("reject")}
                        onClick={() => run("reject", () => cancelOrderAction(orderId))}
                        title="Rechazar Orden"
                    >
                        {busy("reject") ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <XCircle className="h-4 w-4" />
                        )}
                    </Button>
                </>
            )}

            {/* APPROVED → Mark as received */}
            {status === "APPROVED" && (
                <Button
                    variant="ghost"
                    className="h-11 px-5 rounded-2xl bg-blue-50 border border-blue-100 text-blue-700 font-black text-[9px] uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all active:scale-95 group/btn"
                    disabled={busy("receive")}
                    onClick={() => run("receive", () => approveOrderAction(orderId))}
                    title="Marcar como Recibida"
                >
                    {busy("receive") ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <>
                            <PackageCheck className="h-3.5 w-3.5 mr-1.5 group-hover/btn:scale-110 transition-transform" />
                            Recibir
                        </>
                    )}
                </Button>
            )}

            {/* DRAFT or PENDING_APPROVAL → Cancel */}
            {(status === "DRAFT" || status === "PENDING_APPROVAL") && (
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11 rounded-2xl bg-slate-50 text-slate-300 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-100 transition-all active:scale-90 border border-transparent"
                    disabled={busy("cancel")}
                    onClick={() => run("cancel", () => cancelOrderAction(orderId))}
                    title="Cancelar Orden"
                >
                    {busy("cancel") ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <XCircle className="h-4 w-4" />
                    )}
                </Button>
            )}
        </div>
    )
}
