"use client"

import { useState } from "react"
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent } from "@/shared/components/ui/card"
import { Clock, LogIn, LogOut, Loader2, MapPin } from "lucide-react"
import { toast } from "sonner"
import { attendanceService } from "../services/attendanceService"
import { createClient } from "@/lib/supabase/client"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface Props {
    employeeId: string;
    tenantId: string;
}

export function AttendanceWidget({ employeeId, tenantId }: Props) {
    const supabase = createClient()
    const [loading, setLoading] = useState(false)
    const [lastAction, setLastAction] = useState<{ type: 'IN' | 'OUT', time: string } | null>(null)

    const handleClockIn = async () => {
        setLoading(true)
        try {
            await attendanceService.clockIn(supabase, employeeId, tenantId)
            setLastAction({ type: 'IN', time: new Date().toISOString() })
            toast.success("Entrada registrada con éxito")
        } catch (error) {
            toast.error("Error al registrar entrada")
        } finally {
            setLoading(false)
        }
    }

    const handleClockOut = async () => {
        setLoading(true)
        try {
            await attendanceService.clockOut(supabase, employeeId)
            setLastAction({ type: 'OUT', time: new Date().toISOString() })
            toast.success("Salida registrada con éxito")
        } catch (error) {
            toast.error("Error al registrar salida")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card className="border-none bg-slate-900 shadow-premium rounded-[2.5rem] overflow-hidden group">
            <CardContent className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest italic">Terminal de Tiempo</p>
                        <h3 className="text-xl font-black text-white italic tracking-tight uppercase">
                            {format(new Date(), "EEEE, d 'de' MMMM", { locale: es })}
                        </h3>
                    </div>
                    <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center text-white">
                        <Clock className="h-6 w-6" />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <button
                        disabled={loading || lastAction?.type === 'IN'}
                        onClick={handleClockIn}
                        className="p-6 rounded-[2rem] bg-indigo-500 hover:bg-indigo-400 disabled:bg-slate-800 disabled:opacity-50 transition-all flex flex-col items-center gap-3 group/btn shadow-xl shadow-indigo-500/20"
                    >
                        {loading && lastAction?.type === 'IN' ? (
                            <Loader2 className="h-6 w-6 text-white animate-spin" />
                        ) : (
                            <LogIn className="h-6 w-6 text-white group-hover/btn:scale-110 transition-transform" />
                        )}
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">Entrada</span>
                    </button>

                    <button
                        disabled={loading}
                        onClick={handleClockOut}
                        className="p-6 rounded-[2rem] bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:opacity-50 transition-all flex flex-col items-center gap-3 group/btn shadow-xl shadow-emerald-500/20"
                    >
                        {loading && lastAction?.type === 'OUT' ? (
                            <Loader2 className="h-6 w-6 text-white animate-spin" />
                        ) : (
                            <LogOut className="h-6 w-6 text-white group-hover/btn:scale-110 transition-transform" />
                        )}
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">Salida</span>
                    </button>
                </div>

                <div className="pt-4 border-t border-white/5 flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <p className="text-[9px] font-bold text-white/40 uppercase tracking-tighter flex items-center gap-2">
                        <MapPin className="h-3 w-3" /> Geolocalización Activa • IP Verificada
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}
