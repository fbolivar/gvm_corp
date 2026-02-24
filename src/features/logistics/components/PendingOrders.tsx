"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { logisticsService } from "../services/logisticsService"
import { Button } from "@/shared/components/ui/button"
import {
    ShoppingBag,
    Calendar,
    User,
    ChevronRight,
    Search,
    AlertCircle,
    ArrowRightCircle
} from "lucide-react"

export function PendingOrders({ onSelectOrder }: { onSelectOrder: (order: any) => void }) {
    const supabase = createClient()
    const [orders, setOrders] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => {
        loadOrders()
    }, [])

    async function loadOrders() {
        try {
            const data = await logisticsService.getPendingOrders(supabase)
            setOrders(data)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const filteredOrders = orders.filter(order =>
        order.number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.party?.legal_name?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (loading) return <div className="space-y-4">{Array(3).fill(0).map((_, i) => <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />)}</div>

    return (
        <div className="space-y-6">
            <div className="relative group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                <input
                    type="text"
                    placeholder="Buscar por número o cliente..."
                    className="w-full h-12 bg-white border-none shadow-premium rounded-xl pl-12 pr-6 focus:ring-2 focus:ring-primary/20 transition-all font-bold text-slate-900 placeholder:text-slate-400 text-xs"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="grid grid-cols-1 gap-4">
                {filteredOrders.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-2xl border border-slate-100 shadow-premium px-6">
                        <div className="h-14 w-14 bg-slate-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                            <ShoppingBag className="h-7 w-7 text-slate-200" />
                        </div>
                        <p className="text-slate-900 font-black italic text-base">{searchTerm ? 'No se encontraron resultados' : 'No hay órdenes por despachar'}</p>
                        <p className="text-slate-400 text-[8px] font-black uppercase tracking-widest mt-3">Todo está al día en el flujo logístico</p>
                    </div>
                ) : (
                    filteredOrders.map((order) => (
                        <div key={order.id} className="group bg-white shadow-premium rounded-xl p-6 hover:scale-[1.01] transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-6 border border-transparent hover:border-slate-100">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0 shadow-sm group-hover:bg-primary group-hover:text-white transition-all">
                                    <ShoppingBag className="h-6 w-6" />
                                </div>
                                <div className="space-y-1 min-w-0 flex-1 leading-none">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">{order.number}</span>
                                    </div>
                                    <h3 className="text-lg font-black text-slate-900 tracking-tight italic group-hover:text-primary transition-colors truncate uppercase">
                                        {order.party?.legal_name || 'Sin Cliente'}
                                    </h3>
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                                        <span className="flex items-center gap-1.5 text-[8px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">
                                            <Calendar className="h-3 w-3 text-slate-400" />
                                            {new Date(order.issue_date).toLocaleDateString()}
                                        </span>
                                        <span className="flex items-center gap-1.5 text-[8px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">
                                            <AlertCircle className="h-3 w-3 text-slate-400" />
                                            {order.lines?.length || 0} Productos
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <Button
                                onClick={() => onSelectOrder(order)}
                                className="h-10 px-6 rounded-lg bg-slate-900 hover:bg-primary text-white font-black shadow-active transition-all hover:scale-105 active:scale-95 border-none flex items-center justify-center md:justify-between gap-2 shrink-0 w-full md:w-auto p-0"
                            >
                                <span className="text-[8px] uppercase tracking-widest pl-6 pr-2">Alistar Despacho</span>
                                <div className="h-10 w-10 flex items-center justify-center shrink-0">
                                    <ArrowRightCircle className="h-4 w-4" />
                                </div>
                            </Button>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}

function Card({ children, className }: { children: React.ReactNode, className?: string }) {
    return (
        <div className={`bg-white border rounded-xl ${className}`}>
            {children}
        </div>
    )
}
