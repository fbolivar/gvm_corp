"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/shared/components/ui/card"
import { Clock, LogIn, LogOut, Loader2, MapPin, MapPinOff, AlertTriangle, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { attendanceService } from "../services/attendanceService"
import { createClient } from "@/lib/supabase/client"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface Props {
    employeeId: string;
    tenantId: string;
}

type GeoStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable';

export function AttendanceWidget({ employeeId, tenantId }: Props) {
    const supabase = createClient()
    const [loading, setLoading] = useState(false)
    const [lastAction, setLastAction] = useState<{ type: 'IN' | 'OUT', time: string } | null>(null)
    const [dateStr, setDateStr] = useState('')
    const [timeStr, setTimeStr] = useState('')
    const [geoStatus, setGeoStatus] = useState<GeoStatus>('idle')
    const [geoZoneInfo, setGeoZoneInfo] = useState<string | null>(null)
    const [todayCheckedIn, setTodayCheckedIn] = useState(false)
    const [todayCheckedOut, setTodayCheckedOut] = useState(false)
    const [workedHours, setWorkedHours] = useState<number | null>(null)
    const [lateMin, setLateMin] = useState(0)

    useEffect(() => {
        setDateStr(format(new Date(), "EEEE, d 'de' MMMM", { locale: es }))
        const timer = setInterval(() => {
            setTimeStr(format(new Date(), 'HH:mm:ss'))
        }, 1000)

        // Check today's status
        attendanceService.getTodayStatus(supabase, employeeId).then(record => {
            if (record) {
                if (record.check_in && !record.check_out) {
                    setLastAction({ type: 'IN', time: record.check_in })
                    setTodayCheckedIn(true)
                } else if (record.check_out) {
                    setLastAction({ type: 'OUT', time: record.check_out })
                    setTodayCheckedIn(true)
                    setTodayCheckedOut(true)
                    setWorkedHours(Number(record.total_worked_hours || 0))
                }
                setLateMin(Number(record.late_minutes || 0))
            }
        })

        return () => clearInterval(timer)
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    const getGeoPosition = useCallback((): Promise<{ lat: number; lng: number } | undefined> => {
        return new Promise((resolve) => {
            if (!navigator.geolocation) {
                setGeoStatus('unavailable')
                resolve(undefined)
                return
            }

            setGeoStatus('requesting')
            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    setGeoStatus('granted')
                    const geo = { lat: pos.coords.latitude, lng: pos.coords.longitude }

                    // Validate against geo zones
                    try {
                        const validation = await attendanceService.validateGeoZone(supabase, geo.lat, geo.lng)
                        if (validation.valid) {
                            setGeoZoneInfo(validation.zone ? `En ${validation.zone}` : 'Ubicacion verificada')
                        } else {
                            setGeoZoneInfo(`Fuera de zona${validation.zone ? ` (${validation.distance}m de ${validation.zone})` : ''}`)
                        }
                    } catch {
                        // No zones configured, just proceed
                    }

                    resolve(geo)
                },
                () => {
                    setGeoStatus('denied')
                    resolve(undefined)
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            )
        })
    }, [supabase])

    const handleClockIn = async () => {
        setLoading(true)
        try {
            const geo = await getGeoPosition()
            const result = await attendanceService.clockIn(supabase, employeeId, tenantId, geo)
            setLastAction({ type: 'IN', time: new Date().toISOString() })
            setTodayCheckedIn(true)

            const late = Number(result.late_minutes || 0)
            setLateMin(late)

            if (result.status === 'LATE') {
                toast.warning(`Entrada registrada con ${late} min de tardanza`)
            } else {
                toast.success("Entrada registrada con exito")
            }
        } catch {
            toast.error("Error al registrar entrada")
        } finally {
            setLoading(false)
        }
    }

    const handleClockOut = async () => {
        setLoading(true)
        try {
            const geo = await getGeoPosition()
            const result = await attendanceService.clockOut(supabase, employeeId, geo)
            setLastAction({ type: 'OUT', time: new Date().toISOString() })
            setTodayCheckedOut(true)
            setWorkedHours(Number(result.total_worked_hours || 0))

            const ot = Number(result.overtime_hours || 0)
            const msg = ot > 0
                ? `Salida registrada: ${result.total_worked_hours}h trabajadas (${ot}h extra)`
                : `Salida registrada: ${result.total_worked_hours}h trabajadas`
            toast.success(msg)
        } catch {
            toast.error("Error al registrar salida")
        } finally {
            setLoading(false)
        }
    }

    const GeoIcon = () => {
        switch (geoStatus) {
            case 'granted': return <MapPin className="h-3 w-3 text-emerald-400" />
            case 'denied': return <MapPinOff className="h-3 w-3 text-rose-400" />
            case 'requesting': return <Loader2 className="h-3 w-3 text-amber-400 animate-spin" />
            default: return <MapPin className="h-3 w-3 text-white/40" />
        }
    }

    const geoLabel = () => {
        switch (geoStatus) {
            case 'granted': return geoZoneInfo || 'GPS Activo'
            case 'denied': return 'GPS Denegado'
            case 'requesting': return 'Obteniendo ubicacion...'
            case 'unavailable': return 'GPS No disponible'
            default: return 'GPS Listo'
        }
    }

    return (
        <Card className="border-none bg-slate-900 shadow-lg rounded-2xl overflow-hidden">
            <CardContent className="p-6 space-y-5">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold text-white/40 uppercase tracking-wide">Terminal de Tiempo</p>
                        <h3 className="text-base font-bold text-white tracking-tight">
                            {dateStr || '\u00A0'}
                        </h3>
                    </div>
                    <div className="text-right">
                        <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center text-white ml-auto">
                            <Clock className="h-5 w-5" />
                        </div>
                        {timeStr && (
                            <p className="text-xs font-mono font-bold text-white/60 mt-1">{timeStr}</p>
                        )}
                    </div>
                </div>

                {/* Late/Worked info */}
                {todayCheckedIn && (
                    <div className="flex items-center gap-3">
                        {lateMin > 0 && (
                            <div className="flex items-center gap-1.5 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">
                                <AlertTriangle className="h-3 w-3 text-amber-400" />
                                <span className="text-[10px] font-bold text-amber-400 uppercase">Tardanza: {lateMin} min</span>
                            </div>
                        )}
                        {workedHours !== null && (
                            <div className="flex items-center gap-1.5 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                                <span className="text-[10px] font-bold text-emerald-400 uppercase">{workedHours}h trabajadas</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Clock buttons */}
                <div className="grid grid-cols-2 gap-3">
                    <button
                        disabled={loading || todayCheckedIn}
                        onClick={handleClockIn}
                        className="p-4 rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:bg-slate-800 disabled:opacity-50 transition-all flex flex-col items-center gap-2 shadow-lg shadow-indigo-500/20"
                    >
                        {loading && !todayCheckedIn ? (
                            <Loader2 className="h-5 w-5 text-white animate-spin" />
                        ) : (
                            <LogIn className="h-5 w-5 text-white" />
                        )}
                        <span className="text-xs font-bold text-white uppercase tracking-wide">Entrada</span>
                        {todayCheckedIn && lastAction?.type === 'IN' && (
                            <span className="text-[9px] text-white/50 font-mono">
                                {format(new Date(lastAction.time), 'HH:mm')}
                            </span>
                        )}
                    </button>

                    <button
                        disabled={loading || !todayCheckedIn || todayCheckedOut}
                        onClick={handleClockOut}
                        className="p-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:opacity-50 transition-all flex flex-col items-center gap-2 shadow-lg shadow-emerald-500/20"
                    >
                        {loading && todayCheckedIn && !todayCheckedOut ? (
                            <Loader2 className="h-5 w-5 text-white animate-spin" />
                        ) : (
                            <LogOut className="h-5 w-5 text-white" />
                        )}
                        <span className="text-xs font-bold text-white uppercase tracking-wide">Salida</span>
                        {todayCheckedOut && lastAction?.type === 'OUT' && (
                            <span className="text-[9px] text-white/50 font-mono">
                                {format(new Date(lastAction.time), 'HH:mm')}
                            </span>
                        )}
                    </button>
                </div>

                {/* GPS Status */}
                <div className="pt-3 border-t border-white/5 flex items-center gap-2">
                    <div className={`h-1.5 w-1.5 rounded-full ${
                        geoStatus === 'granted' ? 'bg-emerald-500 animate-pulse' :
                        geoStatus === 'denied' ? 'bg-rose-500' :
                        'bg-white/30'
                    }`} />
                    <p className="text-xs font-medium text-white/40 uppercase tracking-wide flex items-center gap-1.5">
                        <GeoIcon /> {geoLabel()}
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}
