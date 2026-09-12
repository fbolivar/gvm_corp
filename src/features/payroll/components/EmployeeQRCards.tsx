"use client"

import { useState, useTransition, useRef, useCallback, useEffect } from "react"
import { createPortal } from "react-dom"
import { generateEmployeeQrPayloadsAction, saveEmployeePhotoAction, removeEmployeePhotoAction } from "../actions/kioskActions"
import { Button } from "@/shared/components/ui/button"
import { Loader2, Printer, CreditCard, Download, Camera, X, RefreshCw, ChevronDown, ChevronUp, Search, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { QRCodeSVG } from "qrcode.react"
import { contractLabel, formatDocNumber, getInitials, splitName } from "../utils/carnetHelpers"
import { Hint } from "@/shared/components/ui/hint"
import { fileToResizedDataUrl } from "@/shared/lib/imageResize"

export interface EmployeeQR {
    id: string
    name: string
    doc_number: string
    contract_type: string
    /** Cargo del empleado (rol). Puede faltar en carnets viejos → fallback al contrato. */
    cargo?: string
    /** Foto del carnet (URL permanente en Storage). Puede faltar si aún no se subió. */
    photo_url?: string | null
    /** Afiliaciones de seguridad social — se imprimen en el frente si existen. */
    eps_name?: string | null
    arl_name?: string | null
    qrPayload: string
}

// ─── Dimensiones CR80 portrait ───────────────────────────────────────────────
const W = 260, H = 412   // ratio ~0.631 (igual que CR80)

// ─── Paleta de marca GVM: azul + verde (sigue la línea del logo) ─────────────
const BLUE_DARK  = "#0B5F93"   // azul corporativo oscuro
const GREEN      = "#10B981"   // esmeralda (acento de marca, PDF_ACCENT)
const GREEN_DEEP = "#0E9E6E"   // verde para texto sobre blanco

// ─── FRENTE del carnet ───────────────────────────────────────────────────────
export function CarnetFront({ emp, photo }: { emp: EmployeeQR; photo?: string }) {
    const initials = getInitials(emp.name)
    const { line1, line2 } = splitName(emp.name)
    const doc = formatDocNumber(emp.doc_number)
    // Cargo real del empleado; si un carnet viejo no lo trae, cae al contrato.
    const cargo = emp.cargo?.trim() || contractLabel(emp.contract_type)
    // Seguridad social: solo se dibuja si hay dato. Sin EPS/ARL el carnet queda
    // EXACTAMENTE igual que antes (mismo espaciado); con datos, el separador se
    // compacta 4px a cada lado para que la línea nueva no toque la ola inferior.
    const eps = emp.eps_name?.trim() || ''
    const arl = emp.arl_name?.trim() || ''
    const hasSocial = Boolean(eps || arl)
    // SVG paths — header en dos tonos SÓLIDOS (verde detrás asomando como borde,
    // azul delante donde va el texto). Sin degradados: legible y fiable al imprimir.
    const headerBlue  = `M 0 0 L ${W} 0 L ${W} 82 C ${W * 0.78} 97 ${W * 0.55} 80 ${W * 0.38} 93 C ${W * 0.2} 106 ${W * 0.08} 99 0 89 Z`
    const headerGreen = `M 0 0 L ${W} 0 L ${W} 92 C ${W * 0.78} 107 ${W * 0.55} 90 ${W * 0.38} 103 C ${W * 0.2} 116 ${W * 0.08} 109 0 99 Z`
    const waveBack  = `M 0 ${H} L 0 ${H - 68} C 55 ${H - 88} 115 ${H - 66} 170 ${H - 80} C 210 ${H - 90} 240 ${H - 74} ${W} ${H - 80} L ${W} ${H} Z`
    const waveFront = `M 0 ${H} L 0 ${H - 40} C 60 ${H - 58} 118 ${H - 38} 172 ${H - 50} C 210 ${H - 58} 238 ${H - 44} ${W} ${H - 50} L ${W} ${H} Z`

    return (
        <div style={{ width: W, height: H, background: "#f8faff", borderRadius: 0, overflow: "hidden", position: "relative", fontFamily: "'Inter','Helvetica Neue',Arial,sans-serif", boxShadow: "0 8px 32px rgba(16,185,129,0.14), 0 2px 8px rgba(0,0,0,0.08)", border: "1px solid #bbf7d0" }}>
            <svg viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
                {/* Header dos tonos: verde detrás (asoma abajo), azul sólido delante */}
                <path d={headerGreen} fill={GREEN} />
                <path d={headerBlue}  fill={BLUE_DARK} />
                {/* Acento circular verde tenue */}
                <circle cx={W - 18} cy={18} r={30} fill={GREEN} opacity="0.25" />
                {/* Olas inferiores: verde detrás, azul delante */}
                <path d={waveBack}  fill={GREEN} />
                <path d={waveFront} fill={BLUE_DARK} />
            </svg>

            <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%" }}>
                {/* Header */}
                <div style={{ width: "100%", padding: "13px 16px 0", display: "flex", alignItems: "center", gap: 9 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 9, background: "rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/logo-gvm.png" alt="GVM" style={{ width: 28, height: 28, objectFit: "contain" }} onError={e => { (e.target as HTMLImageElement).style.display = "none" }} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontSize: 12, fontWeight: 900, color: "#fff", letterSpacing: "0.08em" }}>GVM S.A.S</p>
                        <p style={{ margin: 0, fontSize: 7, color: "rgba(255,255,255,0.78)", letterSpacing: "0.06em" }}>CARNET CORPORATIVO</p>
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: 6, padding: "3px 9px", flexShrink: 0 }}>
                        <p style={{ margin: 0, fontSize: 7.5, fontWeight: 700, color: "#fff", letterSpacing: "0.08em" }}>EMPLEADO</p>
                    </div>
                </div>

                {/* Foto */}
                <div style={{ marginTop: 20, marginBottom: 16 }}>
                    <div style={{ width: 108, height: 126, borderRadius: 14, overflow: "hidden", border: "3px solid #fff", boxShadow: "0 6px 20px rgba(67,56,202,0.22)", background: photo ? "transparent" : "linear-gradient(135deg,#e0e7ff,#c7d2fe)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {photo
                            // eslint-disable-next-line @next/next/no-img-element
                            ? <img src={photo} alt={emp.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            : <span style={{ fontSize: 34, fontWeight: 900, color: "#0B5F93" }}>{initials}</span>
                        }
                    </div>
                </div>

                {/* Nombre */}
                <div style={{ textAlign: "center", padding: "0 16px" }}>
                    <p style={{ margin: 0, fontSize: 16, fontWeight: 900, color: "#0f172a", lineHeight: 1.2 }}>{line1}</p>
                    {line2 && <p style={{ margin: 0, fontSize: 16, fontWeight: 900, color: "#0f172a", lineHeight: 1.2 }}>{line2}</p>}
                    <p style={{ margin: "6px 0 0", fontSize: 9.5, fontWeight: 700, color: GREEN_DEEP }}>{cargo}</p>
                </div>

                {/* Separador con tinte verde */}
                <div style={{ width: "70%", height: 1, background: "linear-gradient(90deg,transparent,#6ee7b7,transparent)", margin: hasSocial ? "10px 0" : "14px 0" }} />

                {/* CC */}
                <div style={{ textAlign: "center" }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#1e293b" }}>
                        <span style={{ color: "#0B5F93" }}>CC: </span>{doc}
                    </p>
                </div>

                {/* EPS / ARL — una sola línea compacta, no altera el resto del diseño */}
                {hasSocial && (
                    <p style={{
                        margin: "7px 0 0", fontSize: 8, fontWeight: 700, color: "#334155",
                        maxWidth: W - 28, textAlign: "center", whiteSpace: "nowrap",
                        overflow: "hidden", textOverflow: "ellipsis", letterSpacing: "0.01em",
                    }}>
                        {eps && <><span style={{ color: BLUE_DARK }}>EPS </span>{eps}</>}
                        {eps && arl && <span style={{ color: "#94a3b8" }}>{"  ·  "}</span>}
                        {arl && <><span style={{ color: GREEN_DEEP }}>ARL </span>{arl}</>}
                    </p>
                )}

                {/* Pie sobre ola */}
                <div style={{ marginTop: "auto", textAlign: "center", paddingBottom: 12 }}>
                    <p style={{ margin: 0, fontSize: 7, color: "rgba(255,255,255,0.9)", fontWeight: 600, letterSpacing: "0.04em" }}>Este carnet es personal e intransferible</p>
                    <p style={{ margin: "2px 0 0", fontSize: 6.5, color: "rgba(255,255,255,0.65)", letterSpacing: "0.04em" }}>COLOMBIA</p>
                </div>
            </div>
        </div>
    )
}

// ─── REVERSO del carnet ──────────────────────────────────────────────────────
export function CarnetBack({ emp }: { emp: EmployeeQR }) {
    const headerBlue  = `M 0 0 L ${W} 0 L ${W} 70 C ${W * 0.75} 84 ${W * 0.5} 68 ${W * 0.3} 82 C ${W * 0.12} 96 0 84 0 76 Z`
    const headerGreen = `M 0 0 L ${W} 0 L ${W} 80 C ${W * 0.75} 94 ${W * 0.5} 78 ${W * 0.3} 92 C ${W * 0.12} 106 0 94 0 86 Z`
    const waveBack  = `M 0 ${H} L 0 ${H - 60} C 55 ${H - 78} 115 ${H - 58} 170 ${H - 70} C 210 ${H - 79} 240 ${H - 65} ${W} ${H - 70} L ${W} ${H} Z`
    const waveFront = `M 0 ${H} L 0 ${H - 34} C 60 ${H - 52} 118 ${H - 32} 172 ${H - 43} C 210 ${H - 51} 238 ${H - 38} ${W} ${H - 44} L ${W} ${H} Z`

    return (
        <div style={{ width: W, height: H, background: "#f8faff", borderRadius: 0, overflow: "hidden", position: "relative", fontFamily: "'Inter','Helvetica Neue',Arial,sans-serif", boxShadow: "0 8px 32px rgba(16,185,129,0.14), 0 2px 8px rgba(0,0,0,0.08)", border: "1px solid #bbf7d0" }}>
            <svg viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
                <path d={headerGreen} fill={GREEN} />
                <path d={headerBlue}  fill={BLUE_DARK} />
                <circle cx={W - 16} cy={16} r={26} fill={GREEN} opacity="0.25" />
                <path d={waveBack}  fill={GREEN} />
                <path d={waveFront} fill={BLUE_DARK} />
            </svg>

            <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%" }}>
                {/* Header mini */}
                <div style={{ width: "100%", padding: "11px 16px 0", display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: "rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/logo-gvm.png" alt="GVM" style={{ width: 22, height: 22, objectFit: "contain" }} onError={e => { (e.target as HTMLImageElement).style.display = "none" }} />
                    </div>
                    <p style={{ margin: 0, fontSize: 10, fontWeight: 900, color: "#fff", letterSpacing: "0.08em" }}>GVM S.A.S</p>
                </div>

                {/* QR grande centrado */}
                <div style={{ marginTop: 28, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                    <div style={{ background: "#fff", borderRadius: 14, padding: 10, border: "1px solid #e0e7ff", boxShadow: "0 4px 18px rgba(67,56,202,0.14)" }}>
                        <QRCodeSVG value={emp.qrPayload} size={120} level="H" bgColor="#ffffff" fgColor="#0f172a" />
                    </div>
                    <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: GREEN_DEEP, letterSpacing: "0.08em" }}>ESCANEAR PARA REGISTRAR ASISTENCIA</p>
                </div>

                {/* Separador de puntos */}
                <div style={{ display: "flex", gap: 5, margin: "18px 0 14px" }}>
                    {Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} style={{ width: 4, height: 4, borderRadius: "50%", background: i % 2 ? "#6ee7b7" : "#93c5fd" }} />
                    ))}
                </div>

                {/* Texto legal */}
                <div style={{ textAlign: "center", padding: "0 24px" }}>
                    <p style={{ margin: "0 0 6px", fontSize: 10, fontWeight: 700, color: "#1e293b" }}>Información</p>
                    <p style={{ margin: 0, fontSize: 8.5, color: "#475569", lineHeight: 1.6, textAlign: "center" }}>
                        Este carnet es personal e intransferible. El uso inadecuado de este documento es responsabilidad del titular.
                    </p>
                </div>

                {/* Pie */}
                <div style={{ marginTop: "auto", textAlign: "center", paddingBottom: 12 }}>
                    <p style={{ margin: 0, fontSize: 7, color: "rgba(255,255,255,0.9)", fontWeight: 600 }}>GVM S.A.S • COLOMBIA</p>
                </div>
            </div>
        </div>
    )
}

// ─── Tarjeta con controles + flip ────────────────────────────────────────────
function CarnetCard({ emp, photo, onPhotoChange, onPrintSingle }: {
    emp: EmployeeQR
    photo?: string
    onPhotoChange: (id: string, url: string | null) => void
    onPrintSingle: (id: string) => void
}) {
    const [showBack, setShowBack] = useState(false)
    const fileRef = useRef<HTMLInputElement>(null)

    const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        e.target.value = ""
        if (!file) return
        try {
            const dataUrl = await fileToResizedDataUrl(file) // reduce en el navegador
            onPhotoChange(emp.id, dataUrl)
        } catch {
            toast.error("No se pudo procesar la foto")
        }
    }, [emp.id, onPhotoChange])

    return (
        <div className="flex flex-col gap-1.5">
            {/* Controles */}
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate max-w-[130px]">
                    {emp.name.split(" ").slice(0, 3).join(" ")}
                </span>
                <div className="flex gap-1 items-center">
                    <span className="text-[9px] text-slate-400 mr-0.5">{showBack ? "Reverso" : "Frente"}</span>
                    <Hint label="Ver frente/reverso" side="top">
                        <button onClick={() => setShowBack(v => !v)}
                            className="h-7 w-7 rounded-lg bg-violet-50 hover:bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center transition-colors">
                            <RotateCcw className="h-3.5 w-3.5 text-violet-600" />
                        </button>
                    </Hint>
                    {!showBack && (
                        <Hint label="Cargar foto" side="top">
                            <button onClick={() => fileRef.current?.click()}
                                className="h-7 w-7 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center transition-colors">
                                <Camera className="h-3.5 w-3.5 text-indigo-600" />
                            </button>
                        </Hint>
                    )}
                    {photo && !showBack && (
                        <Hint label="Quitar foto" side="top">
                            <button onClick={() => onPhotoChange(emp.id, null)}
                                className="h-7 w-7 rounded-lg bg-rose-50 hover:bg-rose-100 flex items-center justify-center transition-colors">
                                <X className="h-3.5 w-3.5 text-rose-500" />
                            </button>
                        </Hint>
                    )}
                    <Hint label="Imprimir" side="top">
                        <button onClick={() => onPrintSingle(emp.id)}
                            className="h-7 w-7 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 flex items-center justify-center transition-colors">
                            <Printer className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300" />
                        </button>
                    </Hint>
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
            </div>

            {/* Carnet */}
            {showBack
                ? <CarnetBack emp={emp} />
                : <CarnetFront emp={emp} photo={photo} />
            }
        </div>
    )
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function EmployeeQRCards() {
    const [employees, setEmployees] = useState<EmployeeQR[]>([])
    const [isPending, startTransition] = useTransition()
    const [generated, setGenerated] = useState(false)
    const [photos, setPhotos] = useState<Record<string, string>>({})
    const [search, setSearch] = useState("")
    const [expanded, setExpanded] = useState(true)
    const [printTarget, setPrintTarget] = useState<string | null>(null)
    const [mounted, setMounted] = useState(false)

    useEffect(() => { setMounted(true) }, [])

    const handleGenerate = () => {
        startTransition(async () => {
            try {
                const data = await generateEmployeeQrPayloadsAction()
                setEmployees(data as EmployeeQR[])
                // Fotos permanentes desde el servidor (employees.photo_url).
                const initial: Record<string, string> = {}
                for (const e of data as EmployeeQR[]) if (e.photo_url) initial[e.id] = e.photo_url
                setPhotos(initial)
                setGenerated(true)
                toast.success(`${data.length} carnets generados`)
            } catch {
                toast.error("Error al generar carnets")
            }
        })
    }

    const handlePhotoChange = useCallback((id: string, url: string | null) => {
        if (url) {
            // Optimista: muestra ya la imagen, luego reemplaza por la URL permanente.
            setPhotos(prev => ({ ...prev, [id]: url }))
            saveEmployeePhotoAction(id, url).then(res => {
                if (res.ok) {
                    if (res.url) setPhotos(prev => ({ ...prev, [id]: res.url! }))
                } else {
                    toast.error(res.error)
                    setPhotos(prev => { const n = { ...prev }; delete n[id]; return n })
                }
            })
        } else {
            setPhotos(prev => { const n = { ...prev }; delete n[id]; return n })
            removeEmployeePhotoAction(id).then(res => { if (!res.ok) toast.error(res.error) })
        }
    }, [])

    const handlePrintAll = () => { setPrintTarget("all"); setTimeout(() => { window.print(); setPrintTarget(null) }, 80) }
    const handlePrintSingle = (id: string) => { setPrintTarget(id); setTimeout(() => { window.print(); setPrintTarget(null) }, 80) }

    const filtered = employees.filter(e =>
        !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.doc_number.includes(search)
    )
    const printList = printTarget === "all" ? employees : employees.filter(e => e.id === printTarget)

    return (
        <>
            <style>{`
                @media print {
                    body > * { display: none !important; }
                    #gvm-print-carnets {
                        display: flex !important;
                        position: fixed; top: 0; left: 0;
                        width: 100vw; flex-wrap: wrap;
                        gap: 6mm; padding: 8mm;
                        background: #f1f5f9;
                        align-items: flex-start;
                    }
                    #gvm-print-carnets > div {
                        page-break-inside: avoid; break-inside: avoid;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    /* Cada carnet se imprime en tamaño físico exacto 5.5 x 8.5 cm.
                       El diseño (260x412 px) se escala vectorialmente para llenar la casilla. */
                    .gvm-carnet-slot {
                        width: 5.5cm; height: 8.5cm; overflow: hidden;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .gvm-carnet-slot > div {
                        transform: scale(0.7995, 0.7798);
                        transform-origin: top left;
                    }
                    @page { margin: 5mm; size: A4; }
                }
            `}</style>

            {/* Capa de impresión: se monta en <body> vía portal para que
                `body > * { display:none }` no la oculte por herencia. */}
            {mounted && createPortal(
                <div id="gvm-print-carnets" style={{ display: "none" }}>
                    {printList.map(emp => (
                        <div key={emp.id} style={{ display: "flex", flexDirection: "column", gap: "3mm" }}>
                            <div className="gvm-carnet-slot"><CarnetFront emp={emp} photo={photos[emp.id]} /></div>
                            <div className="gvm-carnet-slot"><CarnetBack emp={emp} /></div>
                        </div>
                    ))}
                </div>,
                document.body
            )}

            {/* Panel de control */}
            <div className="space-y-4">
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-indigo-600" />
                            Carnets QR de Empleados
                        </h3>
                        {generated && (
                            <Hint label={expanded ? "Contraer" : "Expandir"} side="top">
                                <button onClick={() => setExpanded(v => !v)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                    {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </button>
                            </Hint>
                        )}
                    </div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">
                        Frente con foto y datos · Reverso con QR · Usa <RotateCcw className="h-2.5 w-2.5 inline" /> para alternar · La foto se guarda en el navegador.
                    </p>
                    <div className="flex gap-2">
                        <Button onClick={handleGenerate} disabled={isPending} className="h-9 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 flex-1">
                            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                                <>{generated ? <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> : <Download className="h-3.5 w-3.5 mr-1.5" />}{generated ? "Actualizar" : "Generar"} Carnets</>
                            )}
                        </Button>
                        {generated && employees.length > 0 && (
                            <Button onClick={handlePrintAll} variant="outline" className="h-9 rounded-lg text-xs font-bold px-4 dark:border-slate-700 dark:text-slate-300">
                                <Printer className="h-3.5 w-3.5 mr-1.5" /> Imprimir
                            </Button>
                        )}
                    </div>
                </div>

                {generated && employees.length > 0 && expanded && (
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Buscar empleado o CC..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full h-9 pl-9 pr-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                        />
                    </div>
                )}

                {generated && expanded && (
                    <div>
                        {filtered.length === 0 ? (
                            <p className="text-center text-xs text-slate-400 py-8">
                                {search ? "No se encontraron empleados." : "No hay empleados activos."}
                            </p>
                        ) : (
                            <>
                                <div className="space-y-6 max-h-[72vh] overflow-y-auto pr-1 pb-2">
                                    {filtered.map(emp => (
                                        <CarnetCard key={emp.id} emp={emp} photo={photos[emp.id]} onPhotoChange={handlePhotoChange} onPrintSingle={handlePrintSingle} />
                                    ))}
                                </div>
                                <p className="text-[10px] text-center text-slate-400 dark:text-slate-500 pt-2">
                                    {filtered.length} carnet{filtered.length !== 1 ? "s" : ""} · Al imprimir se incluyen frente y reverso
                                </p>
                            </>
                        )}
                    </div>
                )}
            </div>
        </>
    )
}
