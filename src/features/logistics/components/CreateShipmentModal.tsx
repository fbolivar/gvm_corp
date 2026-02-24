"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { logisticsService } from "../services/logisticsService"
import { inventoryService } from "@/features/inventory/services/inventoryService"
import { Carrier, Shipment, ShipmentItem } from "../types"
import { Warehouse } from "@/features/inventory/types"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Textarea } from "@/shared/components/ui/textarea"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/shared/components/ui/dialog"
import {
    Truck,
    Package,
    Info,
    AlertTriangle,
    CheckCircle2,
    Warehouse as WarehouseIcon
} from "lucide-react"

interface Props {
    order: any | null
    onClose: () => void
    onSuccess: () => void
}

export function CreateShipmentModal({ order, onClose, onSuccess }: Props) {
    const supabase = createClient()
    const [carriers, setCarriers] = useState<Carrier[]>([])
    const [warehouses, setWarehouses] = useState<Warehouse[]>([])
    const [selectedCarrier, setSelectedCarrier] = useState<string>('')
    const [selectedWarehouse, setSelectedWarehouse] = useState<string>('')
    const [trackingNumber, setTrackingNumber] = useState('')
    const [notes, setNotes] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [shipmentItems, setShipmentItems] = useState<Partial<ShipmentItem>[]>([])

    useEffect(() => {
        if (order) {
            loadCarriers()
            loadWarehouses()
            // Default: ship everything in the order
            const initialItems = order.lines.map((line: any) => ({
                product_id: line.product_id,
                qty_ordered: line.qty,
                qty_shipped: line.qty // Default is full shipment
            }))
            setShipmentItems(initialItems)
        }
    }, [order])

    async function loadCarriers() {
        try {
            const data = await logisticsService.getCarriers(supabase)
            setCarriers(data.filter(c => c.is_active))
        } catch (error) {
            console.error(error)
        }
    }

    async function loadWarehouses() {
        try {
            const data = await inventoryService.getWarehouses(supabase)
            setWarehouses(data)
            if (data.length > 0) setSelectedWarehouse(data[0].id || '')
        } catch (error) {
            console.error(error)
        }
    }

    const handleUpdateQty = (productId: string, qty: number) => {
        setShipmentItems(prev => prev.map(item =>
            item.product_id === productId ? { ...item, qty_shipped: qty } : item
        ))
    }

    const handleSubmit = async () => {
        if (!order) return
        if (!selectedWarehouse) {
            alert("Debes seleccionar una bodega de salida")
            return
        }
        setIsSubmitting(true)
        try {
            const shipmentPayload: Partial<Shipment> = {
                order_id: order.id,
                carrier_id: selectedCarrier || null,
                warehouse_id: selectedWarehouse,
                tracking_number: trackingNumber,
                notes: notes,
                status: 'PENDING'
            }

            await logisticsService.createShipment(supabase, shipmentPayload, shipmentItems)
            onSuccess()
        } catch (error) {
            console.error(error)
            alert("Error al crear el despacho")
        } finally {
            setIsSubmitting(false)
        }
    }

    if (!order) return null

    return (
        <Dialog open={!!order} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl rounded-[3rem] p-0 overflow-hidden border-none shadow-premium bg-white">
                <DialogHeader className="sr-only">
                    <DialogTitle>Registrar nuevo despacho</DialogTitle>
                    <DialogDescription>Formulario para crear una guía de remisión a partir de una orden de venta.</DialogDescription>
                </DialogHeader>

                <div className="bg-white p-6 sm:p-10 border-b border-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-4 sm:gap-6">
                        <div className="h-14 w-14 sm:h-16 sm:w-16 bg-blue-50 rounded-[1.2rem] sm:rounded-[1.5rem] flex items-center justify-center shadow-sm">
                            <Truck className="h-7 w-7 sm:h-8 sm:w-8 text-blue-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <DialogTitle className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight italic truncate">Registrar Despacho</DialogTitle>
                            <p className="text-[8px] sm:text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1 truncate">Orden: {order.number} — {order.party?.legal_name}</p>
                        </div>
                    </div>
                    <Button variant="ghost" onClick={onClose} className="h-10 w-10 rounded-full bg-slate-50 text-slate-400 p-0 hover:bg-slate-100 shrink-0">
                        <span className="sr-only">Cerrar</span>
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </Button>
                </div>

                <div className="p-6 sm:p-10 space-y-8 sm:space-y-10 max-h-[65vh] overflow-y-auto custom-scrollbar">
                    {/* Warehouse selection */}
                    <div className="space-y-4">
                        <Label className="text-slate-400 font-black text-[9px] sm:text-[10px] uppercase tracking-[0.2em] pl-1 flex items-center gap-2">
                            <WarehouseIcon className="h-3 sm:h-3.5 w-3 sm:w-3.5" /> Bodega de Salida
                        </Label>
                        <select
                            className="w-full h-12 sm:h-14 bg-slate-50 border-none rounded-xl sm:rounded-2xl px-5 focus:ring-2 focus:ring-primary/20 transition-all font-bold text-slate-900 text-sm appearance-none shadow-sm cursor-pointer"
                            value={selectedWarehouse}
                            onChange={(e) => setSelectedWarehouse(e.target.value)}
                        >
                            <option value="">Selecciona Bodega...</option>
                            {warehouses.map(w => (
                                <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                            ))}
                        </select>
                    </div>

                    {/* Carrier & Tracking */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                        <div className="space-y-4">
                            <Label className="text-slate-400 font-black text-[9px] sm:text-[10px] uppercase tracking-[0.2em] pl-1">Transportadora</Label>
                            <select
                                className="w-full h-12 sm:h-14 bg-slate-50 border-none rounded-xl sm:rounded-2xl px-5 focus:ring-2 focus:ring-primary/20 transition-all font-bold text-slate-900 text-sm appearance-none shadow-sm cursor-pointer"
                                value={selectedCarrier}
                                onChange={(e) => setSelectedCarrier(e.target.value)}
                            >
                                <option value="">Transporte Propio / Interno</option>
                                {carriers.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-4">
                            <Label className="text-slate-400 font-black text-[9px] sm:text-[10px] uppercase tracking-[0.2em] pl-1">Número de Guía</Label>
                            <Input
                                placeholder="Ej: 123456789"
                                value={trackingNumber}
                                onChange={(e) => setTrackingNumber(e.target.value)}
                                className="h-12 sm:h-14 bg-slate-50 border-none rounded-xl sm:rounded-2xl px-5 text-slate-900 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                            />
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="space-y-5">
                        <div className="flex items-center justify-between px-1">
                            <Label className="text-slate-400 font-black text-[9px] sm:text-[10px] uppercase tracking-[0.2em]">Productos a Despachar</Label>
                            <span className="hidden sm:inline-block text-[9px] font-black bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full uppercase tracking-wider">Despachos parciales activos</span>
                        </div>
                        <div className="bg-slate-50 rounded-[1.5rem] sm:rounded-[2.5rem] p-4 sm:p-6 border border-slate-100 shadow-sm overflow-x-auto custom-scrollbar">
                            <table className="w-full min-w-[500px]">
                                <thead>
                                    <tr className="text-left text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-200">
                                        <th className="pb-4 pl-2 sm:pl-4">Producto</th>
                                        <th className="pb-4 text-center">Pedido</th>
                                        <th className="pb-4 text-right pr-2 sm:pr-4">A Despachar</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {order.lines.map((line: any) => (
                                        <tr key={line.id} className="group hover:bg-white/50 transition-colors">
                                            <td className="py-4 sm:py-5 pl-2 sm:pl-4 font-black text-slate-900 italic tracking-tight text-xs sm:text-sm truncate max-w-[180px] sm:max-w-[240px]">{line.description}</td>
                                            <td className="py-4 sm:py-5 text-center">
                                                <span className="text-slate-400 font-black italic text-sm sm:text-base pr-1">{line.qty}</span>
                                                <span className="text-[8px] sm:text-[9px] text-slate-300 font-black uppercase tracking-widest">ud</span>
                                            </td>
                                            <td className="py-4 sm:py-5 text-right pr-2 sm:pr-4">
                                                <div className="inline-flex items-center gap-3">
                                                    <input
                                                        type="number"
                                                        max={line.qty}
                                                        min={0}
                                                        value={shipmentItems.find(i => i.product_id === line.product_id)?.qty_shipped || 0}
                                                        onChange={(e) => handleUpdateQty(line.product_id, parseFloat(e.target.value) || 0)}
                                                        className="w-20 sm:w-24 h-9 sm:h-11 bg-white border border-slate-100 rounded-lg sm:rounded-xl text-right px-3 sm:px-4 font-black text-primary shadow-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <Label className="text-slate-400 font-black text-[9px] sm:text-[10px] uppercase tracking-[0.2em] pl-1">Notas de Despacho</Label>
                        <Textarea
                            placeholder="Instrucciones especiales, punto de entrega, etc."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="bg-slate-50 border-none rounded-xl sm:rounded-2xl min-h-[100px] sm:min-h-[120px] p-5 text-slate-900 font-medium text-sm focus:ring-2 focus:ring-primary/20 transition-all shadow-sm resize-none"
                        />
                    </div>
                </div>

                <DialogFooter className="bg-slate-50/50 p-6 sm:p-10 flex flex-col items-center justify-between gap-6 border-t border-slate-100">
                    <div className="flex items-center gap-3 text-amber-600 bg-amber-50 px-5 py-3 rounded-2xl border border-amber-100 shadow-sm w-full">
                        <AlertTriangle className="h-5 w-5 shrink-0" />
                        <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.15em]">Verifica cantidades antes de procesar</span>
                    </div>
                    <div className="flex flex-col-reverse sm:flex-row gap-4 w-full sm:w-auto mt-2 sm:mt-0">
                        <Button variant="ghost" onClick={onClose} className="h-12 sm:h-14 px-8 rounded-xl sm:rounded-2xl bg-white border border-slate-100 text-slate-500 font-black uppercase text-[9px] sm:text-[10px] tracking-widest hover:bg-slate-50 transition-all w-full sm:w-auto">Cancelar</Button>
                        <Button
                            disabled={isSubmitting}
                            onClick={handleSubmit}
                            className="h-12 sm:h-14 px-10 rounded-xl sm:rounded-2xl bg-slate-900 hover:bg-black text-white font-black uppercase text-[9px] sm:text-[10px] tracking-widest shadow-active transition-all active:scale-95 gap-3 w-full sm:w-auto"
                        >
                            {isSubmitting ? 'Procesando...' : 'Crear Despacho'}
                            <CheckCircle2 className="h-5 w-5" />
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
