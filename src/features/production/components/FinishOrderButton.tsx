"use client"

import { useState } from "react"
import { Button } from "@/shared/components/ui/button"
import { finishOrderAction } from "../actions"
import { Factory, CheckCircle2, AlertCircle, Sparkles } from "lucide-react"
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
            toast.error("Cantidad no válida", {
                description: "Por favor ingrese una cantidad numérica mayor a cero."
            })
            return
        }

        setIsLoading(true)
        try {
            const result = await finishOrderAction(orderId, qty)
            if (result.error) {
                toast.error("Error al finalizar", {
                    description: result.error
                })
            } else {
                toast.success("Orden Completada", {
                    description: `Se han registrado ${qty} unidades producidas.`
                })
                setIsOpen(false)
            }
        } catch (error) {
            toast.error("Error de Sistema", {
                description: "No se pudo procesar la finalización de la orden."
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <>
            <Button
                size="sm"
                className="h-12 px-8 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/20 active:scale-95 transition-all font-black text-[10px] uppercase tracking-widest gap-3"
                onClick={() => setIsOpen(true)}
            >
                <CheckCircle2 className="h-4 w-4" />
                Finalizar Orden
            </Button>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="max-w-md rounded-[2.5rem] border-none bg-white p-0 overflow-hidden shadow-2xl">
                    <div className="p-10 space-y-8">
                        <DialogHeader className="space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="h-14 w-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-sm transition-transform hover:scale-110 duration-500">
                                    <Factory className="h-7 w-7" />
                                </div>
                                <div className="space-y-1">
                                    <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight italic leading-tight">Cierre de Producción</DialogTitle>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Validación de lote & Registro final</p>
                                </div>
                            </div>
                            <DialogDescription className="text-slate-500 font-medium text-xs leading-relaxed">
                                Confirme la cantidad total producida para esta orden. Se descontarán las materias primas del inventario según la receta asociada.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-1">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cantidad Total Obtenida</Label>
                                <span className="text-[10px] font-black text-indigo-500 italic uppercase">Meta: {qtyTarget} unidades</span>
                            </div>
                            <div className="relative group">
                                <Input
                                    type="number"
                                    value={qtyProduced}
                                    onChange={(e) => setQtyProduced(e.target.value)}
                                    className="h-20 pl-8 bg-slate-50 border-none rounded-[1.5rem] font-black text-slate-900 focus-visible:ring-4 focus-visible:ring-emerald-500/10 transition-all text-4xl font-mono tracking-tighter italic"
                                />
                                <span className="absolute right-8 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Unidades</span>
                            </div>
                        </div>

                        <div className="p-6 rounded-3xl bg-amber-50 border border-amber-100 flex items-start gap-4">
                            <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Aviso Operacional</p>
                                <p className="text-[11px] font-medium text-amber-700 leading-tight">
                                    Esta acción es irreversible y afectará el balance de existencias en el almacén de destino.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4">
                            <Button
                                className="flex-1 h-16 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black italic tracking-tight text-lg transition-all shadow-lg shadow-emerald-900/10 active:scale-95 group overflow-hidden relative"
                                onClick={handleFinish}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <div className="flex items-center gap-3">
                                        <div className="h-5 w-5 border-3 border-white/20 border-t-white rounded-full animate-spin" />
                                        <span>PROCESANDO...</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="h-5 w-5 group-hover:scale-110 transition-transform" />
                                        <span>CONFIRMAR CIERRE</span>
                                        <Sparkles className="h-5 w-5 absolute -top-1 right-6 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                )}
                            </Button>
                            <Button
                                variant="ghost"
                                className="h-16 px-8 rounded-2xl text-slate-400 hover:text-slate-900 font-black uppercase tracking-widest text-[9px] transition-all"
                                onClick={() => setIsOpen(false)}
                            >
                                Descartar
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}
