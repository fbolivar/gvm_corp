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
                toast({ title: "Error", description: result.error, variant: "destructive" })
            } else {
                toast({ title: "Operacion exitosa", description: "La orden fue actualizada correctamente." })
                router.refresh()
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Error desconocido"
            toast({ title: "Error", description: message, variant: "destructive" })
        } finally {
            setLoading(null)
        }
    }

    const busy = (label: string) => loading === label

    return (
        <div className="flex items-center justify-end gap-2">
            {/* View detail */}
            <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" title="Ver Detalle" asChild>
                <Link href={`/purchasing/orders/${orderId}`}>
                    <Eye className="h-3.5 w-3.5" />
                </Link>
            </Button>

            {/* DRAFT → Send for approval */}
            {status === "DRAFT" && (
                <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 rounded-xl text-xs font-semibold border-amber-100 text-amber-700 hover:bg-amber-50 gap-1.5"
                    disabled={busy("submit")}
                    onClick={() => run("submit", () => submitOrderForApprovalAction(orderId))}
                >
                    {busy("submit") ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                        <>
                            <Send className="h-3 w-3" />
                            Enviar
                        </>
                    )}
                </Button>
            )}

            {/* PENDING_APPROVAL → Approve or Reject */}
            {status === "PENDING_APPROVAL" && (
                <>
                    <Button
                        size="sm"
                        className="h-8 px-3 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 gap-1.5"
                        disabled={busy("approve")}
                        onClick={() => run("approve", () => approveOrderAction(orderId))}
                    >
                        {busy("approve") ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <>
                                <CheckCircle2 className="h-3 w-3" />
                                Aprobar
                            </>
                        )}
                    </Button>

                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-lg border-rose-100 text-rose-500 hover:bg-rose-50"
                        disabled={busy("reject")}
                        onClick={() => run("reject", () => cancelOrderAction(orderId))}
                        title="Rechazar"
                    >
                        {busy("reject") ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <XCircle className="h-3.5 w-3.5" />
                        )}
                    </Button>
                </>
            )}

            {/* APPROVED or PARTIALLY_RECEIVED → Receive */}
            {(status === "APPROVED" || status === "PARTIALLY_RECEIVED") && (
                <Button
                    size="sm"
                    className="h-8 px-3 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 gap-1.5"
                    asChild
                >
                    <Link href={`/purchasing/orders/${orderId}/receive`}>
                        <PackageCheck className="h-3 w-3" />
                        Recibir
                    </Link>
                </Button>
            )}

            {/* DRAFT or PENDING_APPROVAL → Cancel */}
            {(status === "DRAFT" || status === "PENDING_APPROVAL") && (
                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-lg text-slate-400 hover:text-rose-600 hover:border-rose-100"
                    disabled={busy("cancel")}
                    onClick={() => run("cancel", () => cancelOrderAction(orderId))}
                    title="Cancelar Orden"
                >
                    {busy("cancel") ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                        <XCircle className="h-3.5 w-3.5" />
                    )}
                </Button>
            )}
        </div>
    )
}
