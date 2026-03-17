"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { CheckCircle2, XCircle, Clock, Camera, Scan, Loader2 } from "lucide-react"

interface KioskEmployee {
    id: string
    name: string
}

interface Props {
    token: string
    terminalName: string
    tenantName: string
    employees: KioskEmployee[]
}

type KioskState = 'scanning' | 'processing' | 'success_in' | 'success_out' | 'error'

interface ClockResult {
    employee_name: string
    time: string
    data: {
        status: string
        late_minutes: number
        total_worked_hours: number
        overtime_hours: number
    }
}

export function KioskTerminal({ token, terminalName, tenantName, employees }: Props) {
    const [state, setState] = useState<KioskState>('scanning')
    const [time, setTime] = useState('')
    const [date, setDate] = useState('')
    const [result, setResult] = useState<ClockResult | null>(null)
    const [errorMessage, setErrorMessage] = useState('')
    const [cameraReady, setCameraReady] = useState(false)
    const [geo, setGeo] = useState<{ lat: number; lng: number } | undefined>()
    const scannerRef = useRef<unknown>(null)
    const containerId = 'kiosk-qr-reader'
    const resetTimerRef = useRef<NodeJS.Timeout | null>(null)

    // Live clock
    useEffect(() => {
        const tick = () => {
            const now = new Date()
            setTime(now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }))
            setDate(now.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' }))
        }
        tick()
        const interval = setInterval(tick, 1000)
        return () => clearInterval(interval)
    }, [])

    // GPS capture
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                () => { /* GPS denied - continue without */ }
            )
        }
    }, [])

    // Process scanned QR code
    const handleScan = useCallback(async (decodedText: string) => {
        if (state !== 'scanning') return

        // Parse QR: gvm:{employeeId}:{hmac}
        if (!decodedText.startsWith('gvm:')) {
            setState('error')
            setErrorMessage('Codigo QR no valido. Use un carnet de empleado.')
            return
        }

        const parts = decodedText.split(':')
        if (parts.length !== 3) {
            setState('error')
            setErrorMessage('Formato de QR incorrecto.')
            return
        }

        const employeeId = parts[1]
        const hmacSignature = parts[2]

        // Quick local name lookup
        const emp = employees.find(e => e.id === employeeId)

        setState('processing')
        setResult({ employee_name: emp?.name || 'Empleado', time: '', data: { status: '', late_minutes: 0, total_worked_hours: 0, overtime_hours: 0 } })

        try {
            const res = await fetch('/api/kiosk/clock', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, employee_id: employeeId, hmac_signature: hmacSignature, geo }),
            })

            const data = await res.json()

            if (!res.ok) {
                setState('error')
                setErrorMessage(data.error || 'Error al registrar')
                return
            }

            setResult({
                employee_name: data.employee_name,
                time: data.time,
                data: data.data,
            })
            setState(data.action === 'clock_in' ? 'success_in' : 'success_out')
        } catch {
            setState('error')
            setErrorMessage('Error de conexion. Verifique la red.')
        }
    }, [state, token, employees, geo])

    // Auto-reset after result
    useEffect(() => {
        if (state === 'success_in' || state === 'success_out' || state === 'error') {
            resetTimerRef.current = setTimeout(() => {
                setState('scanning')
                setResult(null)
                setErrorMessage('')
            }, 5000)
        }
        return () => {
            if (resetTimerRef.current) clearTimeout(resetTimerRef.current)
        }
    }, [state])

    // QR Scanner setup
    useEffect(() => {
        let scanner: { stop: () => Promise<void>; start: (config: unknown, options: unknown, onSuccess: (text: string) => void, onError: () => void) => Promise<void> } | null = null

        const startScanner = async () => {
            try {
                const { Html5Qrcode } = await import("html5-qrcode")
                scanner = new Html5Qrcode(containerId) as unknown as typeof scanner
                scannerRef.current = scanner

                await scanner!.start(
                    { facingMode: "environment" },
                    { fps: 10, qrbox: { width: 250, height: 250 } },
                    (decodedText: string) => {
                        handleScan(decodedText)
                    },
                    () => { /* ignore scan errors */ }
                )
                setCameraReady(true)
            } catch {
                setCameraReady(false)
            }
        }

        if (state === 'scanning') {
            // Small delay to ensure DOM container exists
            const t = setTimeout(startScanner, 300)
            return () => {
                clearTimeout(t)
                if (scanner) {
                    scanner.stop().catch(() => { /* ignore */ })
                }
            }
        } else {
            // Stop scanner when not in scanning state
            if (scannerRef.current) {
                const s = scannerRef.current as { stop: () => Promise<void> }
                s.stop().catch(() => { /* ignore */ })
                scannerRef.current = null
            }
        }
    }, [state, handleScan])

    return (
        <main className="flex-1 flex flex-col min-h-screen select-none">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-sm">
                        G
                    </div>
                    <div>
                        <p className="font-black text-white text-sm leading-none">{tenantName}</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">{terminalName}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${cameraReady ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                    <span className="text-[10px] text-slate-500 font-bold uppercase">{cameraReady ? 'Activo' : 'Sin camara'}</span>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 gap-6">
                {/* Clock */}
                <div className="text-center">
                    <p className="text-6xl md:text-8xl font-black text-white tracking-tight tabular-nums">{time}</p>
                    <p className="text-sm md:text-base text-slate-400 font-semibold capitalize mt-2">{date}</p>
                </div>

                {/* Scanning state */}
                {state === 'scanning' && (
                    <div className="w-full max-w-xs space-y-4">
                        <div className="relative rounded-2xl overflow-hidden border-2 border-indigo-500/50 shadow-[0_0_40px_rgba(99,102,241,0.15)]">
                            <div id={containerId} className="w-full aspect-square bg-slate-900" />
                            {/* Scan line animation */}
                            <div className="absolute inset-0 pointer-events-none">
                                <div className="absolute top-0 left-0 right-0 h-0.5 bg-indigo-400 animate-scan-line" />
                            </div>
                            {/* Corner markers */}
                            <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-indigo-400 rounded-tl-lg" />
                            <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-indigo-400 rounded-tr-lg" />
                            <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-indigo-400 rounded-bl-lg" />
                            <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-indigo-400 rounded-br-lg" />
                        </div>
                        <div className="flex items-center justify-center gap-2 text-slate-400">
                            <Scan className="h-4 w-4 animate-pulse" />
                            <p className="text-xs font-bold uppercase tracking-widest">Acerque su carnet al lector</p>
                        </div>
                    </div>
                )}

                {/* Processing state */}
                {state === 'processing' && (
                    <div className="text-center space-y-4 animate-in fade-in duration-300">
                        <Loader2 className="h-16 w-16 text-indigo-400 animate-spin mx-auto" />
                        <p className="text-xl font-bold text-white">Verificando...</p>
                        <p className="text-sm text-slate-400">{result?.employee_name}</p>
                    </div>
                )}

                {/* Success Clock-In */}
                {state === 'success_in' && result && (
                    <div className="text-center space-y-4 animate-in zoom-in-95 fade-in duration-500">
                        <div className="h-24 w-24 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto border-4 border-emerald-500/30">
                            <CheckCircle2 className="h-12 w-12 text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-white">Bienvenido!</p>
                            <p className="text-lg font-bold text-emerald-400 mt-1">{result.employee_name}</p>
                        </div>
                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-6 py-4 inline-block">
                            <p className="text-[10px] text-emerald-400/70 font-bold uppercase tracking-widest">Entrada Registrada</p>
                            <p className="text-3xl font-black text-emerald-400 tabular-nums">{result.time}</p>
                        </div>
                        {result.data.late_minutes > 0 && (
                            <div className="flex items-center justify-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2">
                                <Clock className="h-4 w-4 text-amber-400" />
                                <p className="text-xs font-bold text-amber-400">Tardanza: {result.data.late_minutes} min</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Success Clock-Out */}
                {state === 'success_out' && result && (
                    <div className="text-center space-y-4 animate-in zoom-in-95 fade-in duration-500">
                        <div className="h-24 w-24 rounded-full bg-orange-500/20 flex items-center justify-center mx-auto border-4 border-orange-500/30">
                            <CheckCircle2 className="h-12 w-12 text-orange-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-white">Hasta manana!</p>
                            <p className="text-lg font-bold text-orange-400 mt-1">{result.employee_name}</p>
                        </div>
                        <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl px-6 py-4 inline-block">
                            <p className="text-[10px] text-orange-400/70 font-bold uppercase tracking-widest">Salida Registrada</p>
                            <p className="text-3xl font-black text-orange-400 tabular-nums">{result.time}</p>
                        </div>
                        <div className="flex items-center justify-center gap-4">
                            {result.data.total_worked_hours > 0 && (
                                <div className="bg-slate-800 rounded-xl px-4 py-2">
                                    <p className="text-[9px] text-slate-500 font-bold uppercase">Horas</p>
                                    <p className="text-sm font-black text-white">{result.data.total_worked_hours}h</p>
                                </div>
                            )}
                            {result.data.overtime_hours > 0 && (
                                <div className="bg-slate-800 rounded-xl px-4 py-2">
                                    <p className="text-[9px] text-slate-500 font-bold uppercase">Extra</p>
                                    <p className="text-sm font-black text-indigo-400">{result.data.overtime_hours}h</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Error state */}
                {state === 'error' && (
                    <div className="text-center space-y-4 animate-in zoom-in-95 fade-in duration-300">
                        <div className="h-24 w-24 rounded-full bg-red-500/20 flex items-center justify-center mx-auto border-4 border-red-500/30">
                            <XCircle className="h-12 w-12 text-red-400" />
                        </div>
                        <p className="text-lg font-bold text-red-400">{errorMessage}</p>
                        <p className="text-xs text-slate-500">Reintentando en 5 segundos...</p>
                    </div>
                )}
            </div>

            {/* Footer */}
            <footer className="px-6 py-3 border-t border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Camera className="h-3 w-3 text-slate-600" />
                    <p className="text-[10px] text-slate-600 font-bold">Terminal QR v1.0</p>
                </div>
                <p className="text-[10px] text-slate-600 font-bold">
                    {employees.length} empleados registrados
                </p>
            </footer>

            {/* Scan line animation CSS */}
            <style>{`
                @keyframes scan-line {
                    0% { transform: translateY(0); opacity: 1; }
                    50% { opacity: 0.5; }
                    100% { transform: translateY(calc(100vw - 4rem)); opacity: 1; }
                }
                .animate-scan-line {
                    animation: scan-line 2s ease-in-out infinite;
                }
            `}</style>
        </main>
    )
}
