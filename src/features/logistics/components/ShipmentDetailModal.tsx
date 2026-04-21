"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { logisticsService } from "../services/logisticsService"
import { logisticsPdfService } from "../services/logisticsPdfService"
import { ShipmentStatus } from "../types"
import { Button } from "@/shared/components/ui/button"
import { Badge } from "@/shared/components/ui/badge"
import { cn } from "@/shared/lib/utils"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from "@/shared/components/ui/dialog"
import {
    Truck,
    Package,
    Download,
    CheckCircle2,
    MapPin,
    User,
    ArrowRight,
    RefreshCw,
    DollarSign,
    Users
} from "lucide-react"

interface Props {
    shipmentId: string | null
    onClose: () => void
    onUpdate: () => void
}

const STATUS_STEPS: ShipmentStatus[] = [
    'RECIBIDO',
    'EN_ALISTAMIENTO',
    'LISTO_DESPACHO',
    'DESPACHADO',
    'EN_TRANSITO',
    'ENTREGADO',
]

const STATUS_LABELS: Record<ShipmentStatus, string> = {
    RECIBIDO: 'Recibido',
    EN_ALISTAMIENTO: 'En Alistamiento',
    LISTO_DESPACHO: 'Listo Despacho',
    DESPACHADO: 'Despachado',
    EN_TRANSITO: 'En Tránsito',
    ENTREGADO: 'Entregado',
    RETURNED: 'Devuelto',
}

const STATUS_COLORS: Record<ShipmentStatus, string> = {
    RECIBIDO: 'bg-amber-100 text-amber-700 border-amber-200',
    EN_ALISTAMIENTO: 'bg-sky-100 text-sky-700 border-sky-200',
    LISTO_DESPACHO: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    DESPACHADO: 'bg-purple-100 text-purple-700 border-purple-200',
    EN_TRANSITO: 'bg-teal-100 text-teal-700 border-teal-200',
    ENTREGADO: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    RETURNED: 'bg-rose-100 text-rose-700 border-rose-200',
}

function getNextStatus(current: ShipmentStatus): ShipmentStatus | null {
    const idx = STATUS_STEPS.indexOf(current)
    if (idx === -1 || idx >= STATUS_STEPS.length - 1) return null
    return STATUS_STEPS[idx + 1]
}

const NEXT_BUTTON_STYLES: Partial<Record<ShipmentStatus, string>> = {
    EN_ALISTAMIENTO: 'bg-sky-600 hover:bg-sky-700 shadow-sky-100',
    LISTO_DESPACHO: 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100',
    DESPACHADO: 'bg-purple-600 hover:bg-purple-700 shadow-purple-100',
    EN_TRANSITO: 'bg-teal-600 hover:bg-teal-700 shadow-teal-100',
    ENTREGADO: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100',
}

const NEXT_BUTTON_LABELS: Partial<Record<ShipmentStatus, string>> = {
    EN_ALISTAMIENTO: 'Iniciar Alistamiento',
    LISTO_DESPACHO: 'Marcar Listo para Despacho',
    DESPACHADO: 'Registrar Despacho',
    EN_TRANSITO: 'Marcar En Tránsito',
    ENTREGADO: 'Confirmar Entrega',
}

export function ShipmentDetailModal({ shipmentId, onClose, onUpdate }: Props) {
    const supabase = createClient()
    const [shipment, setShipment] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [updating, setUpdating] = useState(false)

    useEffect(() => {
        if (shipmentId) {
            loadDetails()
        }
    }, [shipmentId])

    async function loadDetails() {
        setLoading(true)
        try {
            const data = await logisticsService.getShipmentDetails(supabase, shipmentId!)
            setShipment(data)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const handleUpdateStatus = async (newStatus: ShipmentStatus) => {
        if (!shipment) return
        setUpdating(true)
        try {
            await logisticsService.updateShipmentStatus(supabase, shipment.id, newStatus)
            await loadDetails()
            onUpdate()
        } catch (error) {
            console.error(error)
        } finally {
            setUpdating(false)
        }
    }

    const handleDownloadPdf = () => {
        if (!shipment) return
        logisticsPdfService.generateRemision(shipment)
    }

    if (!shipmentId) return null

    const currentStatusColor = shipment ? (STATUS_COLORS[shipment.status as ShipmentStatus] ?? 'bg-slate-100 text-slate-700') : ''
    const nextStatus = shipment ? getNextStatus(shipment.status as ShipmentStatus) : null
    const orderTotal: number = shipment?.order?.total ?? 0
    const freightCost: number = shipment?.freight_cost ?? 0
    const freightPct = orderTotal > 0 ? Math.round((freightCost / orderTotal) * 100) : 0

    return (
        <Dialog open={!!shipmentId} onOpenChange={onClose}>
            <DialogContent className="max-w-5xl w-[calc(100vw-2rem)] rounded-3xl p-0 overflow-hidden border-none shadow-premium bg-white max-h-[92vh] flex flex-col">
                <DialogHeader className="sr-only">
                    <DialogTitle>Detalles del Despacho</DialogTitle>
                    <DialogDescription>Ver y gestionar el progreso de la entrega.</DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="h-[400px] flex items-center justify-center bg-white">
                        <div className="flex flex-col items-center gap-4">
                            <RefreshCw className="h-10 w-10 animate-spin text-primary/30" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cargando expediente...</p>
                        </div>
                    </div>
                ) : shipment && (
                    <div className="flex flex-col lg:flex-row flex-1 min-h-0 overflow-y-auto lg:overflow-hidden">
                        {/* Sidebar: Status & Info */}
                        <div className="w-full lg:w-80 xl:w-96 bg-slate-50 p-6 space-y-6 border-b lg:border-b-0 lg:border-r border-slate-100 shrink-0 lg:overflow-y-auto">
                            <div className="flex flex-row lg:flex-col items-center lg:items-start gap-4 sm:gap-6">
                                <div className="h-14 w-14 sm:h-20 sm:w-20 bg-white rounded-[1.2rem] sm:rounded-[2rem] shadow-sm flex items-center justify-center shrink-0">
                                    <Truck className="h-7 w-7 sm:h-10 sm:w-10 text-primary" />
                                </div>
                                <div className="min-w-0">
                                    <h2 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight italic leading-none truncate">#{shipment.order?.number}</h2>
                                    <div className="mt-2 sm:mt-3">
                                        <Badge className={cn("font-black px-3 sm:px-4 py-1 sm:py-1.5 rounded-full uppercase text-[8px] sm:text-[10px] tracking-[0.2em] shadow-sm border", currentStatusColor)}>
                                            {STATUS_LABELS[shipment.status as ShipmentStatus] ?? shipment.status}
                                        </Badge>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-6 sm:gap-8">
                                <div className="space-y-3">
                                    <LabelText>Destinatario</LabelText>
                                    <div className="bg-white p-4 sm:p-5 rounded-[1.5rem] sm:rounded-3xl shadow-sm space-y-3 border border-slate-100/50">
                                        <div className="flex items-center gap-3">
                                            <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                                                <User className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                            </div>
                                            <p className="font-black text-slate-900 text-xs sm:text-sm leading-tight italic truncate">{shipment.order?.party?.legal_name}</p>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                                                <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                            </div>
                                            <p className="text-slate-500 text-[10px] sm:text-xs font-bold leading-relaxed line-clamp-2">{shipment.order?.party?.address || 'Sin dirección registrada'}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <LabelText>Detalles de Envío</LabelText>
                                    <div className="bg-white p-4 sm:p-5 rounded-[1.5rem] sm:rounded-3xl shadow-sm space-y-3 sm:space-y-4 border border-slate-100/50">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Transporte:</span>
                                            <span className="text-[10px] sm:text-xs font-black text-slate-900 italic">{shipment.carrier?.name || 'Interno'}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Nº Guía:</span>
                                            <span className="text-[10px] sm:text-xs font-black text-primary font-mono">{shipment.tracking_number || 'S/N'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Freight Cost vs Order Total */}
                                <div className="space-y-3">
                                    <LabelText>Costo Flete vs Orden</LabelText>
                                    <div className="bg-white p-4 sm:p-5 rounded-[1.5rem] sm:rounded-3xl shadow-sm space-y-3 border border-slate-100/50">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                                <DollarSign className="h-3 w-3" /> Flete:
                                            </span>
                                            <span className="text-[10px] sm:text-xs font-black text-slate-900 italic">
                                                {freightCost.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Orden:</span>
                                            <span className="text-[10px] sm:text-xs font-black text-slate-900 italic">
                                                {orderTotal.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}
                                            </span>
                                        </div>
                                        <div className="pt-1">
                                            <div className="flex items-center justify-between mb-1.5">
                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">% Flete / Orden</span>
                                                <span className={cn(
                                                    "text-[10px] font-black",
                                                    freightPct > 15 ? 'text-rose-600' : freightPct > 8 ? 'text-amber-600' : 'text-emerald-600'
                                                )}>{freightPct}%</span>
                                            </div>
                                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className={cn(
                                                        "h-full rounded-full transition-all duration-700",
                                                        freightPct > 15 ? 'bg-rose-500' : freightPct > 8 ? 'bg-amber-500' : 'bg-emerald-500'
                                                    )}
                                                    style={{ width: `${Math.min(freightPct, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Collaborators */}
                                {(shipment.prepared_by || shipment.verified_by) && (
                                    <div className="space-y-3">
                                        <LabelText className="flex items-center gap-1">
                                            <Users className="h-3 w-3" /> Responsables
                                        </LabelText>
                                        <div className="bg-white p-4 sm:p-5 rounded-[1.5rem] sm:rounded-3xl shadow-sm space-y-3 border border-slate-100/50">
                                            {shipment.prepared_by && (
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Preparó:</span>
                                                    <span className="text-[9px] sm:text-[10px] font-black text-slate-600 italic truncate max-w-[120px]">{shipment.prepared_by_profile?.email ?? shipment.prepared_by}</span>
                                                </div>
                                            )}
                                            {shipment.verified_by && (
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Verificó:</span>
                                                    <span className="text-[9px] sm:text-[10px] font-black text-slate-600 italic truncate max-w-[120px]">{shipment.verified_by_profile?.email ?? shipment.verified_by}</span>
                                                </div>
                                            )}
                                            {shipment.delivered_by_name && (
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Entregó:</span>
                                                    <span className="text-[9px] sm:text-[10px] font-black text-slate-600 italic truncate max-w-[120px]">{shipment.delivered_by_name}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="pt-6 sm:pt-8 border-t border-slate-200 space-y-4">
                                <Button
                                    onClick={handleDownloadPdf}
                                    className="w-full bg-slate-900 hover:bg-black text-white rounded-xl sm:rounded-2xl h-12 sm:h-14 font-black uppercase text-[9px] sm:text-[10px] tracking-widest gap-3 shadow-active transition-all active:scale-95"
                                >
                                    <Download className="h-4 sm:h-5 w-4 sm:w-5" />
                                    Generar Guía PDF
                                </Button>
                                <p className="text-[8px] sm:text-[9px] text-slate-400 text-center font-black uppercase tracking-tighter px-2 sm:px-4">Documento oficial de despacho.</p>
                            </div>
                        </div>

                        {/* Main Body: Workflow & items */}
                        <div className="flex-1 min-w-0 bg-white p-6 space-y-8 lg:overflow-y-auto custom-scrollbar">
                            {/* Actions */}
                            <div className="bg-white shadow-premium rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6 sm:gap-8 group">
                                <div className="space-y-1 text-center md:text-left">
                                    <p className="text-slate-900 font-black italic text-base sm:text-lg tracking-tight decoration-primary/20 decoration-wavy underline underline-offset-8">Siguiente Paso Logístico</p>
                                    <p className="text-[8px] sm:text-[10px] text-slate-400 font-black uppercase tracking-widest pt-2">Actualiza el progreso del despacho</p>
                                </div>
                                <div className="flex gap-2 w-full md:w-auto">
                                    {nextStatus && nextStatus !== 'RETURNED' ? (
                                        <Button
                                            disabled={updating}
                                            onClick={() => handleUpdateStatus(nextStatus)}
                                            className={cn(
                                                "h-12 sm:h-14 px-6 sm:px-8 rounded-xl sm:rounded-2xl text-white font-black uppercase text-[9px] sm:text-[10px] tracking-widest shadow-lg transition-all active:scale-95 gap-3 w-full",
                                                NEXT_BUTTON_STYLES[nextStatus] ?? 'bg-slate-700 hover:bg-slate-800 shadow-slate-100'
                                            )}
                                        >
                                            {NEXT_BUTTON_LABELS[nextStatus] ?? STATUS_LABELS[nextStatus]}
                                            <ArrowRight className="h-4 sm:h-5 w-4 sm:w-5" />
                                        </Button>
                                    ) : shipment.status === 'ENTREGADO' ? (
                                        <div className="text-emerald-600 font-black text-[8px] sm:text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 px-6 sm:px-8 py-3 sm:py-4 bg-emerald-50 rounded-xl sm:rounded-2xl border border-emerald-100 shadow-sm w-full">
                                            <CheckCircle2 className="h-4 sm:h-5 w-4 sm:w-5" /> Entrega Completada
                                        </div>
                                    ) : shipment.status === 'RETURNED' ? (
                                        <div className="text-rose-600 font-black text-[8px] sm:text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 px-6 sm:px-8 py-3 sm:py-4 bg-rose-50 rounded-xl sm:rounded-2xl border border-rose-100 shadow-sm w-full">
                                            Despacho Devuelto
                                        </div>
                                    ) : null}
                                </div>
                            </div>

                            {/* Workflow steps timeline */}
                            <div className="space-y-6">
                                <div className="flex items-center justify-between px-1">
                                    <h3 className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-[0.25em]">Traza Operativa</h3>
                                    <span className="hidden sm:inline-block text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1.5 rounded-full">Actualizado en tiempo real</span>
                                </div>

                                <div className="bg-slate-50 rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-10 relative border border-slate-100 shadow-sm overflow-x-auto custom-scrollbar">
                                    <div className="min-w-[540px] relative py-4">
                                        {/* Progress Line */}
                                        {(() => {
                                            const currentIdx = STATUS_STEPS.indexOf(shipment.status as ShipmentStatus)
                                            const pct = currentIdx >= 0 ? Math.round((currentIdx / (STATUS_STEPS.length - 1)) * 100) : 0
                                            return (
                                                <div className="absolute top-[44px] left-[40px] right-[40px] h-1 sm:h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-primary transition-all duration-1000 ease-out"
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                            )
                                        })()}

                                        <div className="flex items-center justify-between relative px-2">
                                            {STATUS_STEPS.map((step, idx) => {
                                                const currentIdx = STATUS_STEPS.indexOf(shipment.status as ShipmentStatus)
                                                const isCompleted = currentIdx >= idx
                                                const isCurrent = shipment.status === step

                                                return (
                                                    <div key={step} className="relative z-10 flex flex-col items-center gap-3 sm:gap-4">
                                                        <div className={cn(
                                                            "h-10 w-10 sm:h-14 sm:w-14 rounded-full flex items-center justify-center border-[4px] sm:border-[8px] border-slate-50 shadow-premium transition-all duration-500",
                                                            isCompleted ? 'bg-primary text-white' : 'bg-white text-slate-300',
                                                            isCurrent ? 'scale-110 sm:scale-125 shadow-xl ring-2 sm:ring-4 ring-primary/10' : ''
                                                        )}>
                                                            {isCompleted ? <CheckCircle2 className="h-4 w-4 sm:h-6 sm:w-6" /> : <Package className="h-3.5 w-3.5 sm:h-5 sm:w-5" />}
                                                        </div>
                                                        <div className="text-center">
                                                            <span className={cn(
                                                                "text-[8px] sm:text-[9px] font-black uppercase tracking-widest block transition-colors leading-tight",
                                                                isCompleted ? 'text-slate-900' : 'text-slate-400'
                                                            )}>
                                                                {STATUS_LABELS[step]}
                                                            </span>
                                                            {isCurrent && <span className="text-[7px] sm:text-[8px] font-black text-primary uppercase animate-pulse">Actual</span>}
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Items */}
                            <div className="space-y-6">
                                <h3 className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-[0.25em] pl-1">Declaración de Contenido</h3>
                                <div className="bg-slate-50 border border-slate-100 rounded-[1.5rem] sm:rounded-[2.5rem] overflow-x-auto shadow-sm custom-scrollbar">
                                    <table className="w-full min-w-[400px]">
                                        <thead>
                                            <tr className="text-left font-black text-slate-400 uppercase text-[9px] sm:text-[10px] tracking-[0.2em] border-b border-slate-200">
                                                <th className="px-6 sm:px-8 py-4 sm:py-5">Producto / Sku</th>
                                                <th className="px-6 sm:px-8 py-4 sm:py-5 text-center">Trazabilidad</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {shipment.items?.map((item: any) => (
                                                <tr key={item.id} className="group hover:bg-white/50 transition-colors">
                                                    <td className="px-6 sm:px-8 py-5 sm:py-6">
                                                        <div className="font-black text-slate-900 italic tracking-tight text-xs sm:text-sm truncate max-w-[200px] sm:max-w-none">{item.product?.name || item.product_id}</div>
                                                        <div className="text-[8px] sm:text-[9px] text-slate-400 font-black uppercase tracking-widest mt-1">Ref: {item.product?.sku || 'N/A'}</div>
                                                    </td>
                                                    <td className="px-6 sm:px-8 py-5 sm:py-6 text-center">
                                                        <span className="bg-white text-primary font-black px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl shadow-sm text-xs sm:text-sm italic border border-slate-100">
                                                            {item.qty_shipped} <span className="text-[8px] sm:text-[9px] text-slate-300 uppercase not-italic pr-1">/</span> {item.qty_ordered}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}

function LabelText({ children, className }: { children: React.ReactNode, className?: string }) {
    return (
        <label className={cn("block text-[10px] font-black text-slate-400 uppercase tracking-widest", className)}>
            {children}
        </label>
    )
}
