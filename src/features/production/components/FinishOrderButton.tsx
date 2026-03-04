"use client"

import { useState } from "react"
import { Button } from "@/shared/components/ui/button"
import { finishOrderAction } from "../actions"
import { Factory, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/shared/components/ui/dialog"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { toast } from "sonner"

interface FinishOrderButtonProps {
    orderId: string
    qtyTarget: number
}

export function FinishOrderButton({ orderId, qtyTarget }: FinishOrderButtonProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [isOpen, setIsOpen] = useState(false)
    const [qtyProduced, setQtyProduced] = useState(qtyTarget.toString())

    const handleFinish = async () => {
        const qty = parseFloat(qtyProduced)
        if (isNaN(qty) || qty <= 0) {
            toast.error("Cantidad no valida")
            return
        }

        setIsLoading(true)
        try {
            const result = await finishOrderAction(orderId, qty)
            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success(`Orden completada — ${qty} unidades registradas`)
                setIsOpen(false)
            }
        } catch {
            toast.error("Error al procesar la finalizacion de la orden")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <>
            <Button
                size="sm"
                className="h-9 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold gap-1.5"
                onClick={() => setIsOpen(true)}
            >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Finalizar
            </Button>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="sm:max-w-[420px] rounded-2xl">
                    <DialogHeader>
                        <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                                <Factory className="h-4 w-4" />
                            </div>
                            <div>
                                <DialogTitle className="text-base font-bold text-slate-900">Cierre de Produccion</DialogTitle>
                                <DialogDescription className="text-xs text-slate-400">
                                    Validacion de lote y registro final
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="space-y-4 pt-2">
                        <p className="text-xs text-slate-500 leading-relaxed">
                            Confirme la cantidad total producida. Se descontaran las materias primas del inventario segun la receta asociada.
                        </p>

                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <Label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Cantidad Producida</Label>
                                <span className="text-[10px] font-bold text-indigo-500">Meta: {qtyTarget} unidades</span>
                            </div>
                            <Input
                                type="number"
                                value={qtyProduced}
                                onChange={(e) => setQtyProduced(e.target.value)}
                                className="h-9 rounded-xl text-xs font-mono"
                            />
                        </div>

                        <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 flex items-start gap-2">
                            <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                            <p className="text-[10px] text-amber-700 leading-relaxed">
                                Esta accion es irreversible y afectara el balance de existencias en el almacen de destino.
                            </p>
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-9 rounded-xl text-xs"
                            onClick={() => setIsOpen(false)}
                        >
                            Cancelar
                        </Button>
                        <Button
                            size="sm"
                            className="h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold gap-1.5"
                            onClick={handleFinish}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <>
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Confirmar Cierre
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
