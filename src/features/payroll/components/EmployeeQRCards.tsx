"use client"

import { useState, useTransition, useRef, useCallback, useEffect } from "react"
import { generateEmployeeQrPayloadsAction } from "../actions/kioskActions"
import { Button } from "@/shared/components/ui/button"
import { Loader2, Printer, CreditCard, Download, Camera, X, RefreshCw, ChevronDown, ChevronUp, Search, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { QRCodeSVG } from "qrcode.react"

interface EmployeeQR {
    id: string
    name: string
    doc_number: string
    contract_type: string
    qrPayload: string
}

const CONTRACT_LABELS: Record<string, string> = {
    // Inglés
    INDEFINITE: "Contrato Indefinido",
    FIXED_TERM: "Término Fijo",
    TEMPORARY:  "Contrato Temporal",
    FREELANCE:  "Prestación de Servicios",
    INTERN:     "Practicante",
    // Español (valores reales en BD)
    INDEFINIDO:            "Contrato Indefinido",
    TERMINO_FIJO:          "Término Fijo",
    FIJO:                  "Término Fijo",
    TEMPORAL:              "Contrato Temporal",
    PRESTACION_SERVICIOS:  "Prestación de Servicios",
    SERVICIOS:             "Prestación de Servicios",
    PRACTICANTE:           "Practicante",
    APRENDIZ:              "Aprendiz",
}

const STORAGE_KEY = "gvm_carnet_photos"
function loadPhotos(): Record<string, string> {
    if (typeof window === "undefined") return {}
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") } catch { return {} }
}
function savePhoto(id: string, url: string) { const p = loadPhotos(); p[id] = url; localStorage.setItem(STORAGE_KEY, JSON.stringify(p)) }
function removePhoto(id: string) { const p = loadPhotos(); delete p[id]; localStorage.setItem(STORAGE_KEY, JSON.stringify(p)) }

// ─── Dimensiones CR80 portrait ───────────────────────────────────────────────
const W = 260, H = 412   // ratio ~0.631 (igual que CR80)

// ─── FRENTE del carnet ───────────────────────────────────────────────────────
function CarnetFront({ emp, photo }: { emp: EmployeeQR; photo?: string }) {
    const initials = emp.name.split(" ").filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase()
    const words = emp.name.split(" ").filter(Boolean)
    const line1 = words.slice(0, 2).join(" ")
    const line2 = words.slice(2, 4).join(" ")
    const doc = emp.doc_number ? emp.doc_number.replace(/\B(?=(\d{3})+(?!\d))/g, ".") : "—"
    const cargo = CONTRACT_LABELS[emp.contract_type] || "Empleado Activo"

    // SVG paths
    const headerPath = `M 0 0 L ${W} 0 L ${W} 85 C ${W * 0.78} 100 ${W * 0.55} 82 ${W * 0.38} 96 C ${W * 0.2} 110 ${W * 0.08} 102 0 92 Z`
    const waveBack  = `M 0 ${H} L 0 ${H - 68} C 55 ${H - 88} 115 ${H - 66} 170 ${H - 80} C 210 ${H - 90} 240 ${H - 74} ${W} ${H - 80} L ${W} ${H} Z`
    const waveFront = `M 0 ${H} L 0 ${H - 40} C 60 ${H - 58} 118 ${H - 38} 172 ${H - 50} C 210 ${H - 58} 238 ${H - 44} ${W} ${H - 50} L ${W} ${H} Z`

    return (
        <div style={{ width: W, height: H, background: "#f8faff", borderRadius: 22, overflow: "hidden", position: "relative", fontFamily: "'Inter','Helvetica Neue',Arial,sans-serif", boxShadow: "0 8px 32px rgba(67,56,202,0.18), 0 2px 8px rgba(0,0,0,0.08)", border: "1px solid #c7d2fe" }}>
            <svg viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
                {/* Header completo de ancho */}
                <path d={headerPath} fill="#4338ca" />
                <path d={headerPath} fill="#3730a3" opacity="0.45" />
                {/* Pequeño acento circulo superior derecho */}
                <circle cx={W - 18} cy={18} r={32} fill="#6366f1" opacity="0.35" />
                {/* Olas inferiores */}
                <path d={waveBack}  fill="#6366f1" />
                <path d={waveFront} fill="#4338ca" />
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
                            : <span style={{ fontSize: 34, fontWeight: 900, color: "#4338ca" }}>{initials}</span>
                        }
                    </div>
                </div>

                {/* Nombre */}
                <div style={{ textAlign: "center", padding: "0 16px" }}>
                    <p style={{ margin: 0, fontSize: 16, fontWeight: 900, color: "#0f172a", lineHeight: 1.2 }}>{line1}</p>
                    {line2 && <p style={{ margin: 0, fontSize: 16, fontWeight: 900, color: "#0f172a", lineHeight: 1.2 }}>{line2}</p>}
                    <p style={{ margin: "6px 0 0", fontSize: 9.5, fontWeight: 600, color: "#4338ca" }}>{cargo}</p>
                </div>

                {/* Separador */}
                <div style={{ width: "70%", height: 1, background: "linear-gradient(90deg,transparent,#c7d2fe,transparent)", margin: "14px 0" }} />

                {/* CC + ID */}
                <div style={{ textAlign: "center" }}>
                    <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 800, color: "#1e293b" }}>
                        <span style={{ color: "#4338ca" }}>CC: </span>{doc}
                    </p>
                    <p style={{ margin: 0, fontSize: 8.5, color: "#94a3b8", fontFamily: "monospace", letterSpacing: "0.04em" }}>ID: {emp.id.slice(0, 12).toUpperCase()}</p>
                </div>

                {/* Pie sobre ola */}
                <div style={{ marginTop: "auto", textAlign: "center", paddingBottom: 12 }}>
                    <p style={{ margin: 0, fontSize: 7, color: "rgba(255,255,255,0.9)", fontWeight: 600, letterSpacing: "0.04em" }}>Este carnet es personal e intransferible</p>
                    <p style={{ margin: "2px 0 0", fontSize: 6.5, color: "rgba(255,255,255,0.65)", letterSpacing: "0.04em" }}>COLOMBIA • {new Date().getFullYear()}</p>
                </div>
            </div>
        </div>
    )
}

// ─── REVERSO del carnet ──────────────────────────────────────────────────────
function CarnetBack({ emp }: { emp: EmployeeQR }) {
    const headerPath = `M 0 0 L ${W} 0 L ${W} 70 C ${W * 0.75} 84 ${W * 0.5} 68 ${W * 0.3} 82 C ${W * 0.12} 96 0 84 0 76 Z`
    const waveBack  = `M 0 ${H} L 0 ${H - 60} C 55 ${H - 78} 115 ${H - 58} 170 ${H - 70} C 210 ${H - 79} 240 ${H - 65} ${W} ${H - 70} L ${W} ${H} Z`
    const waveFront = `M 0 ${H} L 0 ${H - 34} C 60 ${H - 52} 118 ${H - 32} 172 ${H - 43} C 210 ${H - 51} 238 ${H - 38} ${W} ${H - 44} L ${W} ${H} Z`

    return (
        <div style={{ width: W, height: H, background: "#f8faff", borderRadius: 22, overflow: "hidden", position: "relative", fontFamily: "'Inter','Helvetica Neue',Arial,sans-serif", boxShadow: "0 8px 32px rgba(67,56,202,0.18), 0 2px 8px rgba(0,0,0,0.08)", border: "1px solid #c7d2fe" }}>
            <svg viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
                <path d={headerPath} fill="#4338ca" />
                <circle cx={W - 16} cy={16} r={28} fill="#6366f1" opacity="0.35" />
                <path d={waveBack}  fill="#6366f1" />
                <path d={waveFront} fill="#4338ca" />
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
                    <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: "#4338ca", letterSpacing: "0.08em" }}>ESCANEAR PARA REGISTRAR ASISTENCIA</p>
                </div>

                {/* Separador de puntos */}
                <div style={{ display: "flex", gap: 5, margin: "18px 0 14px" }}>
                    {Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} style={{ width: 4, height: 4, borderRadius: "50%", background: "#c7d2fe" }} />
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
                    <p style={{ margin: 0, fontSize: 7, color: "rgba(255,255,255,0.9)", fontWeight: 600 }}>GVM S.A.S • COLOMBIA • {new Date().getFullYear()}</p>
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

    const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        if (file.size > 2 * 1024 * 1024) { toast.error("Máximo 2 MB"); return }
        const reader = new FileReader()
        reader.onloadend = () => onPhotoChange(emp.id, reader.result as string)
        reader.readAsDataURL(file)
        e.target.value = ""
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
                    <button onClick={() => setShowBack(v => !v)} title="Ver frente/reverso"
                        className="h-7 w-7 rounded-lg bg-violet-50 hover:bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center transition-colors">
                        <RotateCcw className="h-3.5 w-3.5 text-violet-600" />
                    </button>
                    {!showBack && (
                        <button onClick={() => fileRef.current?.click()} title="Cargar foto"
                            className="h-7 w-7 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center transition-colors">
                            <Camera className="h-3.5 w-3.5 text-indigo-600" />
                        </button>
                    )}
                    {photo && !showBack && (
                        <button onClick={() => onPhotoChange(emp.id, null)} title="Quitar foto"
                            className="h-7 w-7 rounded-lg bg-rose-50 hover:bg-rose-100 flex items-center justify-center transition-colors">
                            <X className="h-3.5 w-3.5 text-rose-500" />
                        </button>
                    )}
                    <button onClick={() => onPrintSingle(emp.id)} title="Imprimir"
                        className="h-7 w-7 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 flex items-center justify-center transition-colors">
                        <Printer className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300" />
                    </button>
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

    useEffect(() => { setPhotos(loadPhotos()) }, [])

    const handleGenerate = () => {
        startTransition(async () => {
            try {
                const data = await generateEmployeeQrPayloadsAction()
                setEmployees(data as EmployeeQR[])
                setGenerated(true)
                toast.success(`${data.length} carnets generados`)
            } catch {
                toast.error("Error al generar carnets")
            }
        })
    }

    const handlePhotoChange = useCallback((id: string, url: string | null) => {
        setPhotos(prev => {
            const next = { ...prev }
            if (url) { next[id] = url; savePhoto(id, url) }
            else { delete next[id]; removePhoto(id) }
            return next
        })
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
                    @page { margin: 5mm; size: A4; }
                }
            `}</style>

            {/* Capa de impresión: frente + reverso juntos */}
            <div id="gvm-print-carnets" style={{ display: "none" }}>
                {printList.map(emp => (
                    <div key={emp.id} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <CarnetFront emp={emp} photo={photos[emp.id]} />
                        <CarnetBack emp={emp} />
                    </div>
                ))}
            </div>

            {/* Panel de control */}
            <div className="space-y-4">
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-indigo-600" />
                            Carnets QR de Empleados
                        </h3>
                        {generated && (
                            <button onClick={() => setExpanded(v => !v)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </button>
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
