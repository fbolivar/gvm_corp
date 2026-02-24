"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs"
import { Button } from "@/shared/components/ui/button"
import { CarrierManager } from "./CarrierManager"
import { ShipmentList } from "./ShipmentList"
import { PendingOrders } from "./PendingOrders"
import { CreateShipmentModal } from "./CreateShipmentModal"
import { ShipmentDetailModal } from "./ShipmentDetailModal"
import { LogisticsDashboard } from "./LogisticsDashboard"
import {
    Truck,
    ClipboardList,
    PackageSearch,
    Settings2,
    TrendingUp
} from "lucide-react"

export function ShipmentManager() {
    const [selectedOrder, setSelectedOrder] = useState<any | null>(null)
    const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState("dashboard")
    const [refreshKey, setRefreshKey] = useState(0)

    return (
        <div className="space-y-6">
            <div className="w-full">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                        <div className="bg-slate-100/50 p-1 rounded-xl inline-flex overflow-x-auto max-w-full custom-scrollbar">
                            <TabsList className="bg-transparent h-10 gap-1 px-1 flex-nowrap min-w-max">
                                <TabsTrigger
                                    value="dashboard"
                                    className="rounded-lg h-8 px-6 font-black text-[9px] uppercase tracking-[0.1em] data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-all whitespace-nowrap"
                                >
                                    <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
                                    Resumen
                                </TabsTrigger>
                                <TabsTrigger
                                    value="shipments"
                                    className="rounded-lg h-8 px-6 font-black text-[9px] uppercase tracking-[0.1em] data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-all whitespace-nowrap"
                                >
                                    <ClipboardList className="h-3.5 w-3.5 mr-1.5" />
                                    Despachos
                                </TabsTrigger>
                                <TabsTrigger
                                    value="pending"
                                    className="rounded-lg h-8 px-6 font-black text-[9px] uppercase tracking-[0.1em] data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-all whitespace-nowrap"
                                >
                                    <PackageSearch className="h-3.5 w-3.5 mr-1.5" />
                                    Pendientes
                                </TabsTrigger>
                                <TabsTrigger
                                    value="carriers"
                                    className="rounded-lg h-8 px-6 font-black text-[9px] uppercase tracking-[0.1em] data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-all whitespace-nowrap"
                                >
                                    <Truck className="h-3.5 w-3.5 mr-1.5" />
                                    Transportistas
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <div className="flex items-center gap-3">
                            <Button
                                variant="outline"
                                className="h-10 w-10 rounded-xl border-none bg-white shadow-sm text-slate-400 hover:text-primary transition-all p-0"
                                onClick={() => setRefreshKey(prev => prev + 1)}
                            >
                                <Settings2 className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>

                    <TabsContent value="dashboard" className="mt-0 animate-in fade-in slide-in-from-bottom-6 duration-700 outline-none">
                        <LogisticsDashboard refreshKey={refreshKey} />
                    </TabsContent>

                    <TabsContent value="shipments" className="mt-0 animate-in fade-in slide-in-from-bottom-6 duration-700 outline-none">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between mb-2">
                                <h2 className="text-xl font-black text-slate-900 italic tracking-tight uppercase">Historial de Despachos</h2>
                            </div>
                            <ShipmentList key={`list-${refreshKey}`} onSelectShipment={setSelectedShipmentId} />
                        </div>
                    </TabsContent>

                    <TabsContent value="pending" className="mt-0 animate-in fade-in slide-in-from-bottom-6 duration-700 outline-none">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between mb-2">
                                <h2 className="text-xl font-black text-slate-900 italic tracking-tight uppercase">Órdenes por Despachar</h2>
                            </div>
                            <PendingOrders onSelectOrder={setSelectedOrder} />
                        </div>
                    </TabsContent>

                    <TabsContent value="carriers" className="mt-0 animate-in fade-in slide-in-from-bottom-6 duration-700 outline-none">
                        <CarrierManager />
                    </TabsContent>
                </Tabs>
            </div>

            <CreateShipmentModal
                order={selectedOrder}
                onClose={() => setSelectedOrder(null)}
                onSuccess={() => {
                    setSelectedOrder(null)
                    setRefreshKey(prev => prev + 1)
                    setActiveTab("shipments")
                }}
            />

            <ShipmentDetailModal
                shipmentId={selectedShipmentId}
                onClose={() => setSelectedShipmentId(null)}
                onUpdate={() => setRefreshKey(prev => prev + 1)}
            />
        </div>
    )
}
