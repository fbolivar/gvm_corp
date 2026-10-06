"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/shared/components/ui/card"
import { Clock, LogIn, LogOut, Loader2, MapPin, MapPinOff, AlertTriangle, CheckCircle2, Home, ScanLine, X } from "lucide-react"
import { toast } from "sonner"
import {
    getMyAttendanceTodayAction,
    appClockInAction,
    remoteClockInAction,
    selfClockOutAction,
    justifyEarlyLeaveAction,
    type MyAttendanceToday,
} from "../actions/selfAttendanceActions"

/**
 * Asistencia del empleado en "Mi nómina".
 *
 * Tres formas de entrada: carnet en la tablet (sedes con kiosco), "Entrada"
 * desde la app (sedes sin tablet) y "Hoy no voy a la oficina" (remota, con
 * motivo obligatorio). La salida se registra aquí venga de donde venga la
 * entrada, con justificación obligatoria si aún no es la hora de fin del turno
 * (lo comprueba el servidor).
 */

interface Props {
    employeeId: string
    tenantId: string
}

type GeoStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable'
type Dialog = 'none' | 'remote' | 'leave' | 'justify'

const fmtTime = (iso: string | null) =>
    iso ? new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota' }) : ''

// `employeeId`/`tenantId` ya no se envían al servidor: el empleado se resuelve
// desde la sesión. Se conservan en las props para no romper al llamador.
export function AttendanceWidget(_props: Props) {
    const [today, setToday] = useState<MyAttendanceToday | null>(null)
    const [loading, setLoading] = useState(false)
    const [dialog, setDialog] = useState<Dialog>('none')
    const [reason, setReason] = useState('')
    const [fieldError, setFieldError] = useState<string | null>(null)
    const [geoStatus, setGeoStatus] = useState<GeoStatus>('idle')
    const [dateStr, setDateStr] = useState('')
    const [timeStr, setTimeStr] = useState('')

    const refresh = useCallback(async () => {
        try {
            setToday(await getMyAttendanceTodayAction())
        } catch {
            /* la pantalla sigue usable sin el estado */
        }
    }, [])

    useEffect(() => { refresh() }, [refresh])

    // Reloj en hora local del dispositivo (el empleado está en Colombia).
    useEffect(() => {
        const tick = () => {
            const now = new Date()
            setDateStr(now.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' }))
            setTimeStr(now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
        }
        tick()
        const id = setInterval(tick, 1000)
        return () => clearInterval(id)
    }, [])

    const getGeo = useCallback((): Promise<{ lat: number; lng: number } | undefined> => {
        return new Promise((resolve) => {
            if (!navigator.geolocation) { setGeoStatus('unavailable'); resolve(undefined); return }
            setGeoStatus('requesting')
            navigator.geolocation.getCurrentPosition(
                (pos) => { setGeoStatus('granted'); resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }) },
                () => { setGeoStatus('denied'); resolve(undefined) },
                { timeout: 8000, maximumAge: 60000 },
            )
        })
    }, [])

    const closeDialog = () => { setDialog('none'); setReason(''); setFieldError(null) }

    async function submitAppEntry() {
        setLoading(true)
        try {
            const geo = await getGeo()
            const r = await appClockInAction({ geo })
            if (r.error) { toast.error(r.error); return }
            toast.success(`Entrada registrada a las ${r.time}`, {
                description: r.late_minutes ? `Quedó con ${r.late_minutes} min de retardo según tu turno.` : undefined,
            })
            await refresh()
        } finally {
            setLoading(false)
        }
    }

    async function submitRemote() {
        setLoading(true)
        try {
            const geo = await getGeo()
            const r = await remoteClockInAction({ reason, geo })
            if (r.error) { setFieldError(r.error); toast.error(r.error); return }
            toast.success(`Entrada remota registrada a las ${r.time}`, {
                description: r.late_minutes ? `Quedó con ${r.late_minutes} min de retardo según tu turno.` : undefined,
            })
            closeDialog()
            await refresh()
        } finally {
            setLoading(false)
        }
    }

    async function submitLeave() {
        setLoading(true)
        try {
            const geo = await getGeo()
            const r = await selfClockOutAction({ reason, geo })
            if (r.error) { setFieldError(r.error); toast.error(r.error); return }
            toast.success(`Salida registrada a las ${r.time}`, {
                description: r.early ? 'Quedó como salida anticipada con tu justificación.' : `${r.total_worked_hours} h trabajadas.`,
            })
            closeDialog()
            await refresh()
        } finally {
            setLoading(false)
        }
    }

    async function submitJustify() {
        setLoading(true)
        try {
            const r = await justifyEarlyLeaveAction({ reason })
            if (r.error) { setFieldError(r.error); toast.error(r.error); return }
            toast.success('Justificación guardada')
            closeDialog()
            await refresh()
        } finally {
            setLoading(false)
        }
    }

    const checkedIn = !!today?.check_in
    const checkedOut = !!today?.check_out
    const isRemote = today?.check_in_mode === 'REMOTE'

    // Si ya salió antes de la hora y no dejó justificación, se le pide aquí.
    const leftEarlyUnjustified = checkedOut && today?.expected_end
        ? fmtTime(today.check_out) < today.expected_end && !today.early_leave_reason
        : false

    const GeoIcon = geoStatus === 'denied' ? MapPinOff : MapPin

    return (
        <Card className="border-none bg-slate-900 shadow-lg rounded-2xl overflow-hidden">
            <CardContent className="p-6 space-y-5">
                {/* Encabezado */}
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold text-white/40 uppercase tracking-wide">Mi asistencia</p>
                        <h3 className="text-base font-bold text-white tracking-tight capitalize">{dateStr || ' '}</h3>
                    </div>
                    <div className="text-right">
                        <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center text-white ml-auto">
                            <Clock className="h-5 w-5" />
                        </div>
                        {timeStr && <p className="text-xs font-mono font-bold text-white/60 mt-1">{timeStr}</p>}
                    </div>
                </div>

                {/* Estado de hoy */}
                <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-2">
                    {!checkedIn ? (
                        <p className="text-sm text-white/70 flex items-center gap-2">
                            <ScanLine className="h-4 w-4 text-indigo-300" />
                            Sin entrada hoy. Marca con tu carnet en la tablet o registra tu entrada aquí.
                        </p>
                    ) : (
                        <>
                            <p className="text-sm text-white flex items-center gap-2">
                                {isRemote ? <Home className="h-4 w-4 text-sky-300" /> : <ScanLine className="h-4 w-4 text-indigo-300" />}
                                Entrada <span className="font-mono font-bold">{fmtTime(today!.check_in)}</span>
                                <span className="text-white/50">
                                    {isRemote ? '· fuera de la oficina'
                                        : today?.check_in_terminal ? `· ${today.check_in_terminal}`
                                        : today?.check_in_mode === 'APP' ? '· desde la app' : ''}
                                </span>
                            </p>
                            {isRemote && today?.remote_reason && (
                                <p className="text-xs text-white/50 pl-6">Motivo: {today.remote_reason}</p>
                            )}
                            {checkedOut && (
                                <p className="text-sm text-white flex items-center gap-2">
                                    <LogOut className="h-4 w-4 text-emerald-300" />
                                    Salida <span className="font-mono font-bold">{fmtTime(today!.check_out)}</span>
                                    <span className="text-white/50">· {today!.total_worked_hours} h</span>
                                </p>
                            )}
                            {today?.early_leave_reason && (
                                <p className="text-xs text-amber-300/80 pl-6">Salida anticipada: {today.early_leave_reason}</p>
                            )}
                        </>
                    )}

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                        {checkedIn && today!.late_minutes > 0 && (
                            <span className="inline-flex items-center gap-1.5 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 text-[10px] font-bold text-amber-400 uppercase">
                                <AlertTriangle className="h-3 w-3" /> Retardo {today!.late_minutes} min
                            </span>
                        )}
                        {checkedOut && (
                            <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 text-[10px] font-bold text-emerald-400 uppercase">
                                <CheckCircle2 className="h-3 w-3" /> Jornada cerrada
                            </span>
                        )}
                        {today?.expected_end && !checkedOut && (
                            <span className="text-[10px] font-semibold text-white/40 uppercase">Tu turno termina a las {today.expected_end}</span>
                        )}
                    </div>
                </div>

                {/* Acciones */}
                {dialog === 'none' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {!checkedIn && (
                            <button
                                type="button"
                                disabled={loading}
                                onClick={submitAppEntry}
                                className="p-4 rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 transition-all flex flex-col items-center gap-2 shadow-lg shadow-indigo-500/20"
                            >
                                {loading && dialog === 'none' ? <Loader2 className="h-5 w-5 text-white animate-spin" /> : <LogIn className="h-5 w-5 text-white" />}
                                <span className="text-xs font-bold text-white uppercase tracking-wide">Entrada</span>
                                <span className="text-[10px] text-white/70">Registrar mi entrada de hoy</span>
                            </button>
                        )}
                        {!checkedIn && (
                            <button
                                type="button"
                                onClick={() => setDialog('remote')}
                                className="p-4 rounded-xl bg-sky-500 hover:bg-sky-400 transition-all flex flex-col items-center gap-2 shadow-lg shadow-sky-500/20"
                            >
                                <Home className="h-5 w-5 text-white" />
                                <span className="text-xs font-bold text-white uppercase tracking-wide">Hoy no voy a la oficina</span>
                                <span className="text-[10px] text-white/70">Registrar entrada con motivo</span>
                            </button>
                        )}
                        {checkedIn && !checkedOut && (
                            <button
                                type="button"
                                onClick={() => setDialog('leave')}
                                className="p-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 transition-all flex flex-col items-center gap-2 shadow-lg shadow-emerald-500/20"
                            >
                                <LogOut className="h-5 w-5 text-white" />
                                <span className="text-xs font-bold text-white uppercase tracking-wide">Registrar salida</span>
                                {today?.leaving_now_is_early && (
                                    <span className="text-[10px] text-white/80">Antes de tu hora · pide justificación</span>
                                )}
                            </button>
                        )}
                        {leftEarlyUnjustified && (
                            <button
                                type="button"
                                onClick={() => setDialog('justify')}
                                className="p-4 rounded-xl bg-amber-500 hover:bg-amber-400 transition-all flex flex-col items-center gap-2 shadow-lg shadow-amber-500/20"
                            >
                                <AlertTriangle className="h-5 w-5 text-white" />
                                <span className="text-xs font-bold text-white uppercase tracking-wide">Justificar salida anticipada</span>
                            </button>
                        )}
                    </div>
                )}

                {dialog !== 'none' && (
                    <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                            <p className="text-sm font-semibold text-white">
                                {dialog === 'remote' && '¿Por qué no vas a la oficina hoy?'}
                                {dialog === 'leave' && (today?.leaving_now_is_early
                                    ? `Tu turno termina a las ${today.expected_end}. ¿Por qué sales antes?`
                                    : 'Registrar salida')}
                                {dialog === 'justify' && 'Justificación de la salida anticipada'}
                            </p>
                            <button type="button" onClick={closeDialog} className="text-white/40 hover:text-white" aria-label="Cerrar">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <textarea
                            value={reason}
                            onChange={(e) => { setReason(e.target.value); setFieldError(null) }}
                            maxLength={300}
                            rows={3}
                            placeholder={
                                dialog === 'remote'
                                    ? 'Ej: visita a cliente en Rionegro / cita médica / trabajo desde casa autorizado por…'
                                    : dialog === 'leave' && !today?.leaving_now_is_early
                                        ? 'Opcional'
                                        : 'Ej: cita médica, diligencia personal autorizada por…'
                            }
                            className="w-full rounded-lg bg-slate-800 border border-white/10 text-sm text-white placeholder:text-white/30 p-3 outline-none focus:border-sky-400"
                        />
                        {fieldError && (
                            <p className="text-xs text-rose-300 flex items-center gap-1.5">
                                <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {fieldError}
                            </p>
                        )}
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-[10px] text-white/30">{reason.length}/300</span>
                            <button
                                type="button"
                                disabled={loading}
                                onClick={dialog === 'remote' ? submitRemote : dialog === 'leave' ? submitLeave : submitJustify}
                                className="h-10 px-5 rounded-lg bg-white text-slate-900 text-xs font-bold uppercase tracking-wide disabled:opacity-50 flex items-center gap-2"
                            >
                                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                                {dialog === 'remote' ? 'Registrar entrada' : dialog === 'leave' ? 'Registrar salida' : 'Guardar'}
                            </button>
                        </div>
                    </div>
                )}

                {/* GPS */}
                <div className="pt-3 border-t border-white/5 flex items-center gap-2">
                    <div className={`h-1.5 w-1.5 rounded-full ${geoStatus === 'granted' ? 'bg-emerald-500' : geoStatus === 'denied' ? 'bg-rose-500' : 'bg-white/30'}`} />
                    <p className="text-xs font-medium text-white/40 uppercase tracking-wide flex items-center gap-1.5">
                        <GeoIcon className="h-3 w-3" />
                        {geoStatus === 'granted' ? 'Ubicación registrada' : geoStatus === 'denied' ? 'Ubicación denegada' : 'La ubicación se toma al registrar'}
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}
