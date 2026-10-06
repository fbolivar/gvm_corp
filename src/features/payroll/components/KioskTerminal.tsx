"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { CheckCircle2, XCircle, Clock, Camera, Scan, Loader2, SwitchCamera } from "lucide-react"
import { cn } from "@/shared/lib/utils"

interface Props {
    token: string
    terminalName: string
    tenantName: string
    /** Solo el conteo: el portal es público y no debe exponer el directorio. */
    employeeCount: number
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

export function KioskTerminal({ token, terminalName, tenantName, employeeCount }: Props) {
    const [state, setState] = useState<KioskState>('scanning')
    const [time, setTime] = useState('')
    const [date, setDate] = useState('')
    const [result, setResult] = useState<ClockResult | null>(null)
    const [errorMessage, setErrorMessage] = useState('')
    const [cameraReady, setCameraReady] = useState(false)
    const [cameraError, setCameraError] = useState<string | null>(null)
    const [cameras, setCameras] = useState<{ id: string; label: string }[]>([])
    const [geo, setGeo] = useState<{ lat: number; lng: number } | undefined>()
    const scannerRef = useRef<unknown>(null)
    const startingRef = useRef(false)
    const camIdRef = useRef<string | null>(null) // cámara elegida (persistida por dispositivo)
    const containerId = 'kiosk-qr-reader'
    const resetTimerRef = useRef<NodeJS.Timeout | null>(null)

    // Recupera la cámara elegida para esta tablet (se fija una vez por sede)
    useEffect(() => {
        try { camIdRef.current = localStorage.getItem('kiosk_camera_id') } catch { /* ignore */ }
    }, [])

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

        // El nombre lo confirma el servidor tras validar la firma del QR; aquí
        // solo se muestra el estado de verificación.
        setState('processing')
        setResult({ employee_name: 'Verificando...', time: '', data: { status: '', late_minutes: 0, total_worked_hours: 0, overtime_hours: 0 } })

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
    }, [state, token, geo])

    // Auto-reset after result
    useEffect(() => {
        if (state === 'success_in' || state === 'success_out' || state === 'error') {
            resetTimerRef.current = setTimeout(() => {
                setState('scanning')
                setResult(null)
                setErrorMessage('')
            }, state === 'error' ? 3000 : 3500)
        }
        return () => {
            if (resetTimerRef.current) clearTimeout(resetTimerRef.current)
        }
    }, [state])

    // Inicia (o reintenta) el escáner. Es una función estable para poder llamarla
    // también desde el botón "Activar cámara" (el gesto del usuario ayuda a que el
    // navegador conceda el permiso, sobre todo en iOS/Safari).
    const startScanner = useCallback(async () => {
        if (startingRef.current) return
        startingRef.current = true
        setCameraError(null)
        try {
            // Pre-chequeos con mensajes claros
            if (typeof window !== "undefined" && window.isSecureContext === false) {
                throw new Error("INSECURE_CONTEXT")
            }
            if (typeof navigator === "undefined" || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error("UNSUPPORTED_BROWSER")
            }

            const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode")

            // Detener/limpiar cualquier instancia previa y liberar la cámara.
            if (scannerRef.current) {
                try { await (scannerRef.current as { stop: () => Promise<void> }).stop() } catch { /* ignore */ }
                scannerRef.current = null
            }

            // getCameras() pide permiso y lista las cámaras (una sola apertura).
            // Arrancamos por ID: más confiable que facingMode y evita reabrir la
            // cámara varias veces (causa de NotReadableError en Windows).
            const cams = await Html5Qrcode.getCameras()
            if (!cams || cams.length === 0) throw new Error("NO_CAMERAS")
            setCameras(cams.map((c) => ({ id: c.id, label: c.label || "" })))

            // Selección de cámara:
            //  1) la guardada para esta tablet (si sigue existiendo),
            //  2) por defecto la FRONTAL — en montaje de pared la pantalla mira a la
            //     persona, así que la cámara frontal es la que la ve.
            let chosen = cams.find((c) => c.id === camIdRef.current)
            if (!chosen) {
                chosen = cams.find((c) => /front|user|frontal|selfie|delantera/i.test(c.label || "")) ?? cams[0]
            }
            camIdRef.current = chosen.id
            try { localStorage.setItem("kiosk_camera_id", chosen.id) } catch { /* ignore */ }
            const cameraId = chosen.id

            // Pequeña pausa para que el sistema libere la cámara antes de reabrirla.
            await new Promise((r) => setTimeout(r, 400))

            // Velocidad de lectura. Antes el carnet tardaba o no se capturaba:
            //  - solo QR: sin esto el decodificador prueba códigos de barras 1D en
            //    cada cuadro y desperdicia la mayor parte del tiempo;
            //  - BarcodeDetector nativo cuando el navegador lo trae (Chrome en
            //    Android): decodifica por hardware, muchísimo más rápido que el JS;
            //  - sin intento de imagen espejada (disableFlip): el cuadro de la
            //    cámara no viene invertido aunque la vista previa sí, y probar
            //    ambos duplica el trabajo.
            const scanner = new Html5Qrcode(containerId, {
                formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
                useBarCodeDetectorIfSupported: true,
                verbose: false,
            })
            scannerRef.current = scanner

            await scanner.start(
                cameraId,
                {
                    // 10 cuadros/s obligaba a sostener el carnet quieto; a 30 se
                    // captura en el primer instante en que queda enfocado.
                    fps: 30,
                    // El decodificador SOLO mira dentro de qrbox. Con 250 px fijos
                    // el carnet tenía que caer justo en el centro; ahora es el 75 %
                    // del visor, así basta con acercarlo.
                    qrbox: (viewW: number, viewH: number) => {
                        const side = Math.max(200, Math.floor(Math.min(viewW, viewH) * 0.75))
                        return { width: side, height: side }
                    },
                    disableFlip: true,
                    // Más resolución para un QR pequeño impreso en un carnet, y
                    // enfoque continuo donde la cámara lo soporte. aspectRatio 16:9
                    // fijo para que el video llene EXACTO el recuadro (ver clase
                    // aspect-video abajo) — si no coincide, el video queda más
                    // chico que el contenedor y el área de lectura visual (esquinas)
                    // no coincide con donde el decodificador realmente mira.
                    videoConstraints: {
                        deviceId: { exact: cameraId },
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                        aspectRatio: { ideal: 16 / 9 },
                        advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet],
                    },
                },
                (decodedText: string) => handleScan(decodedText),
                () => { /* ignore scan errors */ }
            )
            setCameraReady(true)
        } catch (err) {
            setCameraReady(false)
            const e = err as { name?: string; message?: string }
            const raw = (typeof err === "string" ? err : `${e?.name || ""} ${e?.message || ""}`).trim()
            let msg = "No se pudo activar la cámara."
            if (/INSECURE_CONTEXT|secure|https|insecure/i.test(raw))
                msg = "La cámara requiere HTTPS. Abre el enlace con https:// (no http)."
            else if (/UNSUPPORTED_BROWSER|not supported/i.test(raw))
                msg = "Este navegador no permite acceder a la cámara. Usa Chrome o Safari actualizado."
            else if (/NotAllowed|Permission|denied/i.test(raw))
                msg = "Permiso de cámara denegado. Toca el ícono de cámara/candado junto a la URL, permite el acceso y toca \"Activar cámara\"."
            else if (/NotFound|Devices|Overconstrained|NO_CAMERAS/i.test(raw))
                msg = "No se detectó ninguna cámara en este dispositivo."
            else if (/NotReadable|TrackStart|in use/i.test(raw))
                msg = "La cámara está siendo usada por otra aplicación. Ciérrala e inténtalo de nuevo."
            // Adjuntamos el detalle técnico para diagnóstico rápido.
            setCameraError(raw ? `${msg}  ·  [${raw.slice(0, 90)}]` : msg)
        } finally {
            startingRef.current = false
        }
    }, [handleScan])

    // Cambia a la siguiente cámara disponible (para elegir la correcta según el
    // montaje). La elección queda guardada por dispositivo.
    const switchCamera = useCallback(async () => {
        if (cameras.length < 2) return
        const idx = cameras.findIndex((c) => c.id === camIdRef.current)
        const next = cameras[(idx + 1) % cameras.length]
        camIdRef.current = next.id
        try { localStorage.setItem("kiosk_camera_id", next.id) } catch { /* ignore */ }
        // Detener la actual y reiniciar con la nueva
        if (scannerRef.current) {
            try { await (scannerRef.current as { stop: () => Promise<void> }).stop() } catch { /* ignore */ }
            scannerRef.current = null
        }
        setCameraReady(false)
        startScanner()
    }, [cameras, startScanner])

    // Arranca el escáner al entrar en modo scanning; lo detiene al salir.
    useEffect(() => {
        if (state === 'scanning') {
            const t = setTimeout(() => { startScanner() }, 300)
            return () => {
                clearTimeout(t)
                if (scannerRef.current) {
                    (scannerRef.current as { stop: () => Promise<void> }).stop().catch(() => { /* ignore */ })
                    scannerRef.current = null
                }
            }
        } else if (scannerRef.current) {
            (scannerRef.current as { stop: () => Promise<void> }).stop().catch(() => { /* ignore */ })
            scannerRef.current = null
        }
    }, [state, startScanner])

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

                {/* Scanner — SIEMPRE montado. No lo desmontamos al cambiar de estado
                    porque html5-qrcode inyecta un <video> dentro del contenedor y React
                    fallaría al removerlo (causa del "Application error"). Solo lo ocultamos. */}
                <div className={cn("w-full max-w-xs space-y-4", state !== 'scanning' && "hidden")}>
                        <div className="relative rounded-2xl overflow-hidden border-2 border-indigo-500/50 shadow-[0_0_40px_rgba(99,102,241,0.15)]">
                            {/* aspect-video (16:9) para que coincida con videoConstraints:
                                antes el contenedor era cuadrado y la cámara (16:9) dejaba
                                una franja vacía abajo — el recuadro de esquinas quedaba
                                "cortado"/desalineado del área real donde lee el QR. */}
                            <div id={containerId} className="w-full aspect-video bg-slate-900 [&_video]:!h-full [&_video]:!w-full [&_video]:object-cover" />
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
                        {cameraReady ? (
                            <div className="flex items-center justify-center gap-2 text-slate-400">
                                <Scan className="h-4 w-4 animate-pulse" />
                                <p className="text-xs font-bold uppercase tracking-widest">Acerque su carnet al lector</p>
                            </div>
                        ) : (
                            <div className="text-center space-y-3">
                                <p className="text-xs font-semibold text-amber-400 leading-snug px-2">
                                    {cameraError || 'Iniciando cámara…'}
                                </p>
                                <button
                                    type="button"
                                    onClick={() => startScanner()}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-colors active:scale-95"
                                >
                                    <Camera className="h-4 w-4" /> Activar cámara
                                </button>
                            </div>
                        )}
                        {cameras.length > 1 && (
                            <button
                                type="button"
                                onClick={switchCamera}
                                className="mx-auto flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-500 hover:text-slate-300 transition-colors"
                            >
                                <SwitchCamera className="h-3.5 w-3.5" /> Cambiar cámara
                            </button>
                        )}
                    </div>

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
                    {employeeCount} empleados registrados
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
