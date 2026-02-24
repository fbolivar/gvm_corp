import { ShipmentManager } from "@/features/logistics/components/ShipmentManager"
import { Sparkles } from "lucide-react"

export default function LogisticsPage() {
    return (
        <div className="page-container space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* 💎 PREMIUM HEADER */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-1">
                <div className="space-y-1.5">
                    <h1 className="page-title">Logística & Despachos</h1>
                    <div className="flex items-center gap-3">
                        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Gestión de Entregas & LogiTrack</p>
                        <div className="flex items-center gap-2 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100/50">
                            <Sparkles className="h-2.5 w-2.5 text-indigo-600" />
                            <span className="text-[8px] font-black text-indigo-600 uppercase tracking-widest">Eficiencia Operativa</span>
                        </div>
                    </div>
                </div>
            </div>

            <ShipmentManager />
        </div>
    )
}
