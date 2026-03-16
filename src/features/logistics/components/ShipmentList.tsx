"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { logisticsService } from "../services/logisticsService"
import { Shipment, ShipmentStatus } from "../types"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import {
    Truck,
    Calendar,
    Hash,
    ExternalLink,
    Clock,
    CheckCircle2,
    Package,
    ArrowRight,
    XCircle,
    PackageCheck,
    Navigation,
    ListChecks,
} from "lucide-react"

const statusConfig: Record<ShipmentStatus, { label: string, color: string, icon: any }> = {
    'RECIBIDO': { label: 'Recibido', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
    'EN_ALISTAMIENTO': { label: 'En Alistamiento', color: 'bg-sky-100 text-sky-700 border-sky-200', icon: Package },
    'LISTO_DESPACHO': { label: 'Listo Despacho', color: 'bg-indigo-100 text-indigo-700 border-indigo-200', icon: ListChecks },
    'DESPACHADO': { label: 'Despachado', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: PackageCheck },
    'EN_TRANSITO': { label: 'En Tránsito', color: 'bg-cyan-100 text-cyan-700 border-cyan-200', icon: Navigation },
    'ENTREGADO': { label: 'Entregado', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
    'RETURNED': { label: 'Devuelto', color: 'bg-rose-100 text-rose-700 border-rose-200', icon: XCircle },
}

export function ShipmentList({ onSelectShipment }: { onSelectShipment: (id: string) => void }) {
    const supabase = createClient()
    const [shipments, setShipments] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadShipments()
    }, [])

    async function loadShipments() {
        try {
            const data = await logisticsService.getShipments(supabase)
            setShipments(data)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) return <div className="space-y-4">{Array(4).fill(0).map((_, i) => <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />)}</div>

    return (
        <div className="space-y-6">
            {shipments.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-slate-100 shadow-premium">
                    <div className="h-16 w-16 bg-slate-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                        <Package className="h-8 w-8 text-slate-200" />
                    </div>
                    <p className="text-slate-900 font-black italic text-base uppercase">No hay despachos registrados aún</p>
                    <p className="text-slate-400 text-[8px] font-black uppercase tracking-widest mt-3">Empieza transformando una Orden de Venta</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {shipments.map((shipment) => {
                        const status = statusConfig[shipment.status as ShipmentStatus] || { label: shipment.status, color: 'bg-slate-100 text-slate-500', icon: Package }
                        return (
                            <div
                                key={shipment.id}
                                onClick={() => onSelectShipment(shipment.id)}
                                className="group bg-white shadow-premium rounded-xl p-6 hover:scale-[1.01] transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-6 cursor-pointer border border-transparent hover:border-slate-100"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`h-12 w-12 rounded-xl ${status.color.split(' ')[0]} flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:rotate-6`}>
                                        <status.icon className="h-6 w-6" />
                                    </div>
                                    <div className="space-y-1 min-w-0 flex-1 leading-none">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">{shipment.order?.number || 'S/N'}</span>
                                            <Badge variant="outline" className={`${status.color} border-none font-black text-[8px] uppercase tracking-wider px-2 h-5 flex items-center rounded-full shadow-sm`}>
                                                {status.label}
                                            </Badge>
                                        </div>
                                        <h3 className="text-lg font-black text-slate-900 tracking-tight italic group-hover:text-primary transition-colors truncate uppercase">
                                            {shipment.order?.party?.legal_name || 'Consumidor Final'}
                                        </h3>
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                                            <span className="flex items-center gap-1.5 text-[8px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">
                                                <Truck className="h-3 w-3 text-slate-400" />
                                                {shipment.carrier?.name || 'Transporte Propio'}
                                            </span>
                                            <span className="flex items-center gap-1.5 text-[8px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">
                                                <Hash className="h-3 w-3 text-slate-400" />
                                                {shipment.tracking_number || 'Sin Guía'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between md:justify-end gap-6 pl-4 md:pl-0 border-l md:border-l-0 border-slate-50">
                                    <div className="text-right space-y-0.5 leading-none">
                                        <div className="text-[8px] text-slate-400 font-black uppercase tracking-[0.1em]">Fecha Registro</div>
                                        <div className="flex items-center justify-end gap-1.5 text-slate-900 font-black italic tracking-tighter text-sm uppercase">
                                            <Calendar className="h-3 w-3 text-slate-400" />
                                            {shipment.created_at ? new Date(shipment.created_at).toLocaleDateString() : 'N/A'}
                                        </div>
                                    </div>
                                    <div className="h-8 w-8 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                                        <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
