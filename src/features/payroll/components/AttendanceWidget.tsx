"use client"

import { useState, useEffect } from "react"
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
    const [dateStr, setDateStr] = useState('')

    useEffect(() => {
        setDateStr(format(new Date(), "EEEE, d 'de' MMMM", { locale: es }))
    }, [])

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
        <Card className="border-none bg-slate-900 shadow-lg rounded-2xl overflow-hidden">
            <CardContent className="p-6 space-y-5">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold text-white/40 uppercase tracking-wide">Terminal de Tiempo</p>
                        <h3 className="text-base font-bold text-white tracking-tight">
                            {dateStr || '\u00A0'}
                        </h3>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center text-white">
                        <Clock className="h-5 w-5" />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <button
                        disabled={loading || lastAction?.type === 'IN'}
                        onClick={handleClockIn}
                        className="p-4 rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:bg-slate-800 disabled:opacity-50 transition-all flex flex-col items-center gap-2 shadow-lg shadow-indigo-500/20"
                    >
                        {loading && lastAction?.type === 'IN' ? (
                            <Loader2 className="h-5 w-5 text-white animate-spin" />
                        ) : (
                            <LogIn className="h-5 w-5 text-white" />
                        )}
                        <span className="text-xs font-bold text-white uppercase tracking-wide">Entrada</span>
                    </button>

                    <button
                        disabled={loading}
                        onClick={handleClockOut}
                        className="p-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:opacity-50 transition-all flex flex-col items-center gap-2 shadow-lg shadow-emerald-500/20"
                    >
                        {loading && lastAction?.type === 'OUT' ? (
                            <Loader2 className="h-5 w-5 text-white animate-spin" />
                        ) : (
                            <LogOut className="h-5 w-5 text-white" />
                        )}
                        <span className="text-xs font-bold text-white uppercase tracking-wide">Salida</span>
                    </button>
                </div>

                <div className="pt-3 border-t border-white/5 flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <p className="text-xs font-medium text-white/40 uppercase tracking-wide flex items-center gap-1.5">
                        <MapPin className="h-3 w-3" /> Geolocalización Activa • IP Verificada
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}
