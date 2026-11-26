"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { usePathname } from "next/navigation"
import {
    Barcode,
    Scan,
    Zap,
    ArrowUpRight,
    ArrowDownRight,
    Search,
    Loader2,
    Link as LinkIcon,
    CheckCircle2,
    Camera,
    CameraOff,
    Layers,
    CalendarClock,
    Ban
} from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle
} from "@/shared/components/ui/dialog"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Badge } from "@/shared/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import { registerScanMovement } from "@/features/inventory/actions/scanActions"
import { toast } from "sonner"

interface ScannerProduct {
    id: string
    name: string
    sku: string
    barcode: string
    selling_price: number
    uom: string
}

const ALLOWED_PATHS = ['/inventory', '/products']

export function BarcodeScanner() {
    const pathname = usePathname()
    const [isOpen, setIsOpen] = useState(false)
    const [scannedCode, setScannedCode] = useState("")
    const [product, setProduct] = useState<ScannerProduct | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [qty, setQty] = useState("1")

    // Lote + vencimiento (para la carga de inventario del go-live). El movimiento
    // es la ÚNICA fuente de la cantidad; el lote solo se etiqueta en el movimiento.
    const [lots, setLots] = useState<{ id: string; lot_number: string; expiration_date: string; qty: number }[]>([])
    const [lotMode, setLotMode] = useState<"existing" | "new" | "none">("none")
    const [selectedLotId, setSelectedLotId] = useState("")
    const [newLotNumber, setNewLotNumber] = useState("")
    const [newLotExp, setNewLotExp] = useState("")

    const resetLot = () => {
        setLotMode("none"); setSelectedLotId(""); setNewLotNumber(""); setNewLotExp(""); setLots([])
    }

    const [isLinking, setIsLinking] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [searchResults, setSearchResults] = useState<ScannerProduct[]>([])
    const [isSearching, setIsSearching] = useState(false)

    // Camera state
    const [isCameraActive, setIsCameraActive] = useState(false)
    const [cameraStartRequested, setCameraStartRequested] = useState(false)
    const [cameraError, setCameraError] = useState<string | null>(null)
    const zxingControlsRef = useRef<{ stop: () => void } | null>(null)
    const videoRef = useRef<HTMLVideoElement>(null)

    const scanBuffer = useRef("")
    const lastKeyTime = useRef(0)

    // Bodega donde se registra la entrada/salida. GVM tiene muchas bodegas: NO se
    // puede asumir "la primera". Se recuerda la última elegida (localStorage).
    const [warehouses, setWarehouses] = useState<{ id: string; name: string }[]>([])
    const [warehouseId, setWarehouseId] = useState("")

    const isVisible = ALLOWED_PATHS.some(p => pathname.startsWith(p))

    useEffect(() => {
        if (!isVisible) return
        const supabase = createClient()
        supabase.from("warehouses").select("id, name").order("name").then(({ data }: { data: { id: string; name: string }[] | null }) => {
            const list = (data ?? []) as { id: string; name: string }[]
            setWarehouses(list)
            let saved: string | null = null
            try { saved = localStorage.getItem("scanner_wh") } catch { /* storage bloqueado */ }
            setWarehouseId(prev => prev || (saved && list.some(w => w.id === saved) ? saved : (list[0]?.id ?? "")))
        })
    }, [isVisible])

    // Lotes activos del producto en la bodega elegida (orden FEFO). Si el producto
    // ya maneja lotes → se sugiere el próximo a vencer; si no, se asume "nuevo lote"
    // (típico en la carga: la caja que llega trae su lote y vencimiento).
    useEffect(() => {
        if (!product || !warehouseId) { setLots([]); return }
        const supabase = createClient()
        supabase
            .from("product_lots")
            .select("id, lot_number, expiration_date, qty")
            .eq("product_id", product.id)
            .eq("warehouse_id", warehouseId)
            .eq("status", "ACTIVE")
            .order("expiration_date", { ascending: true })
            .then(({ data }: { data: { id: string; lot_number: string; expiration_date: string; qty: number }[] | null }) => {
                const list = (data ?? []) as { id: string; lot_number: string; expiration_date: string; qty: number }[]
                setLots(list)
                if (list.length > 0) { setLotMode("existing"); setSelectedLotId(list[0].id) }
                else { setLotMode("new"); setSelectedLotId("") }
            })
    }, [product, warehouseId])

    // HID scanner keyboard listener
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!e.key) return
            const now = Date.now()
            if (now - lastKeyTime.current > 50) scanBuffer.current = ""

            if (e.key === "Enter") {
                if (scanBuffer.current.length > 3) {
                    lookupBarcode(scanBuffer.current)
                    scanBuffer.current = ""
                }
            } else if (e.key.length === 1) {
                scanBuffer.current += e.key
            }
            lastKeyTime.current = now
        }

        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [])

    const stopCamera = useCallback(() => {
        try { zxingControlsRef.current?.stop() } catch { /* ignore */ }
        zxingControlsRef.current = null
        const v = videoRef.current
        if (v && v.srcObject) {
            try { (v.srcObject as MediaStream).getTracks().forEach(t => t.stop()) } catch { /* ignore */ }
            v.srcObject = null
        }
        setIsCameraActive(false)
        setCameraError(null)
    }, [])

    // Stop camera when dialog closes
    useEffect(() => {
        if (!isOpen) {
            stopCamera()
        }
    }, [isOpen, stopCamera])

    const startCamera = () => {
        setCameraError(null)
        setIsCameraActive(true)
        setCameraStartRequested(true)
    }

    // Actually initialize the scanner once the container is rendered
    useEffect(() => {
        if (!cameraStartRequested) return
        setCameraStartRequested(false)

        const initScanner = async () => {
            try {
                const { BrowserMultiFormatReader } = await import("@zxing/browser")
                const { DecodeHintType, BarcodeFormat } = await import("@zxing/library")

                // Esperar a que el <video> esté montado.
                await new Promise(r => setTimeout(r, 150))
                const video = videoRef.current
                if (!video) {
                    setCameraError("No se encontro el contenedor de camara. Intenta de nuevo.")
                    setIsCameraActive(false)
                    return
                }

                // ZXing lee códigos 1D (EAN/UPC/Code128…) de forma confiable TAMBIÉN en
                // iPhone, donde el navegador NO tiene detector de códigos por hardware
                // (por eso html5-qrcode mostraba la cámara pero no enganchaba). TRY_HARDER
                // mejora la captura con poca luz o el código algo inclinado.
                const hints = new Map()
                hints.set(DecodeHintType.POSSIBLE_FORMATS, [
                    BarcodeFormat.EAN_13, BarcodeFormat.EAN_8,
                    BarcodeFormat.UPC_A, BarcodeFormat.UPC_E,
                    BarcodeFormat.CODE_128, BarcodeFormat.CODE_39,
                    BarcodeFormat.ITF, BarcodeFormat.CODABAR,
                    BarcodeFormat.QR_CODE,
                ])
                hints.set(DecodeHintType.TRY_HARDER, true)

                const reader = new BrowserMultiFormatReader(hints)
                const controls = await reader.decodeFromConstraints(
                    { video: { facingMode: { ideal: "environment" } } },
                    video,
                    (result) => {
                        if (!result) return
                        const text = result.getText()
                        toast.success("CODIGO DETECTADO", { description: text })
                        stopCamera()
                        lookupBarcode(text)
                    },
                )
                zxingControlsRef.current = controls
            } catch (err: unknown) {
                console.error("Camera error:", err)
                const msg = err instanceof Error ? err.message : String(err)
                if (msg.includes("NotAllowedError") || msg.includes("Permission")) {
                    setCameraError("Permiso de camara denegado. Permite el acceso en la configuracion del navegador.")
                } else if (msg.includes("NotFoundError") || msg.includes("no camera")) {
                    setCameraError("No se encontro ninguna camara en este dispositivo.")
                } else {
                    setCameraError(`Error al iniciar camara: ${msg}`)
                }
                setIsCameraActive(false)
            }
        }

        initScanner()
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cameraStartRequested])

    const lookupBarcode = async (code: string) => {
        setIsOpen(true)
        setIsLoading(true)
        setScannedCode(code)
        setIsLinking(false)

        const supabase = createClient()
        try {
            const { data, error } = await supabase
                .from("products")
                .select("id, name, sku, barcode, selling_price, uom")
                .eq("barcode", code)
                .maybeSingle()

            if (error) throw error

            if (data) {
                setProduct(data)
                toast.success("PRODUCTO IDENTIFICADO")
            } else {
                setProduct(null)
            }
        } catch (err) {
            console.error(err)
            toast.error("Error al buscar producto")
        } finally {
            setIsLoading(false)
        }
    }

    const searchProducts = async (query: string) => {
        if (!query) return
        setIsSearching(true)
        const supabase = createClient()
        try {
            const { data, error } = await supabase
                .from("products")
                .select("id, name, sku, barcode, selling_price, uom")
                .or(`name.ilike.%${query}%,sku.ilike.%${query}%`)
                .limit(5)

            if (error) throw error
            setSearchResults(data || [])
        } catch (err) {
            console.error(err)
        } finally {
            setIsSearching(false)
        }
    }

    const linkBarcodeToProduct = async (productId: string) => {
        setIsLoading(true)
        const supabase = createClient()
        try {
            const { error } = await supabase
                .from("products")
                .update({ barcode: scannedCode })
                .eq("id", productId)

            if (error) throw error

            toast.success("VINCULO EXITOSO", {
                description: `El codigo ${scannedCode} ha sido asociado al producto.`
            })

            lookupBarcode(scannedCode)
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : "Error desconocido"
            toast.error("ERROR AL VINCULAR", { description: msg })
        } finally {
            setIsLoading(false)
            setIsLinking(false)
        }
    }

    const handleMovement = async (type: "IN" | "OUT") => {
        if (!product) return
        if (!warehouseId) { toast.error("Elige una bodega"); return }
        const nQty = Number(qty)
        if (!nQty || nQty <= 0) { toast.error("Cantidad inválida"); return }

        // Resolver el lote según el modo elegido.
        let lotArgs: { lotId?: string | null; newLotNumber?: string | null; expirationDate?: string | null } = {}
        if (lotMode === "existing") {
            if (!selectedLotId) { toast.error("Elige un lote"); return }
            lotArgs = { lotId: selectedLotId }
        } else if (lotMode === "new") {
            if (!newLotNumber.trim()) { toast.error("Ingresa el número de lote"); return }
            if (!newLotExp) { toast.error("Ingresa la fecha de vencimiento del lote"); return }
            lotArgs = { newLotNumber: newLotNumber.trim(), expirationDate: newLotExp }
        } // "none" → sin lote

        try {
            setIsLoading(true)
            const res = await registerScanMovement({
                productId: product.id,
                warehouseId,
                type,
                qty: nQty,
                ...lotArgs,
            })
            if (res.error) { toast.error("ERROR", { description: res.error }); return }

            toast.success("MOVIMIENTO REGISTRADO", {
                description: lotMode === "none" ? undefined : `Lote ${lotMode === "new" ? newLotNumber.trim() : (lots.find(l => l.id === selectedLotId)?.lot_number ?? "")}`,
            })
            setIsOpen(false)
            setProduct(null)
            setScannedCode("")
            resetLot()
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : "Error desconocido"
            toast.error("ERROR", { description: msg })
        } finally {
            setIsLoading(false)
        }
    }

    if (!isVisible) return null

    return (
        <>
            <div className="fixed bottom-[6.5rem] right-8 z-50">
                <Button
                    onClick={() => setIsOpen(true)}
                    className="h-12 w-12 rounded-2xl bg-slate-900 border-2 border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.25)] hover:scale-110 active:scale-95 transition-all group"
                >
                    <Barcode className="h-5 w-5 text-white group-hover:animate-pulse" />
                    <div className="absolute top-0 right-0 h-3 w-3 bg-primary rounded-full border-2 border-white">
                        <Zap className="h-1.5 w-1.5 text-white fill-white" />
                    </div>
                </Button>
            </div>

            <Dialog open={isOpen} onOpenChange={(open) => {
                if (!open) stopCamera()
                setIsOpen(open)
            }}>
                <DialogContent className="max-w-md bg-white p-0 overflow-hidden border-none shadow-premium rounded-3xl">
                    <DialogHeader className="p-8 pb-4 bg-slate-50 border-b border-slate-100">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <DialogTitle className="text-2xl font-black italic tracking-tighter uppercase flex items-center gap-3">
                                    <div className="h-10 w-10 bg-slate-900 rounded-xl flex items-center justify-center text-white rotate-3">
                                        <Barcode className="h-6 w-6" />
                                    </div>
                                    Smart <span className="text-primary">Scanner</span>
                                </DialogTitle>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                                    Gestion Industrial de Inventarios
                                </p>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="p-8 space-y-8">
                        {!product && !isLoading && !isLinking && (
                            <div className="space-y-6 text-center flex flex-col items-center">
                                {/* Camera scanner area */}
                                {isCameraActive ? (
                                    <div className="w-full space-y-3">
                                        <video
                                            ref={videoRef}
                                            id="barcode-camera-reader"
                                            className="w-full aspect-video object-cover rounded-2xl overflow-hidden bg-black"
                                            muted
                                            playsInline
                                        />
                                        <Button
                                            onClick={stopCamera}
                                            variant="outline"
                                            className="w-full h-10 rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 font-black uppercase text-[10px] tracking-widest"
                                        >
                                            <CameraOff className="h-4 w-4 mr-2" />
                                            Detener Camara
                                        </Button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="h-24 w-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center border-4 border-white shadow-premium relative overflow-hidden">
                                            <div className="absolute inset-x-0 top-0 h-0.5 bg-primary animate-[scan_2s_infinite]" />
                                            <Scan className="h-10 w-10 text-slate-200" />
                                        </div>
                                        <div className="space-y-3">
                                            <h3 className="text-xl font-black italic tracking-tighter uppercase text-slate-900 leading-none">
                                                {scannedCode ? "Codigo no registrado" : "Esperando Escaneo..."}
                                            </h3>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest max-w-[200px] leading-relaxed">
                                                {scannedCode
                                                    ? `El codigo ${scannedCode} no existe en la base de datos.`
                                                    : "Pasa el laser, usa la camara o escribe abajo."}
                                            </p>
                                        </div>

                                        {/* Camera button */}
                                        <Button
                                            onClick={startCamera}
                                            className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-active transition-all"
                                        >
                                            <Camera className="h-4 w-4 mr-2" />
                                            Escanear con Camara
                                        </Button>

                                        {cameraError && (
                                            <div className="w-full p-3 bg-rose-50 rounded-xl border border-rose-100">
                                                <p className="text-[10px] font-bold text-rose-600">{cameraError}</p>
                                            </div>
                                        )}

                                        {scannedCode && (
                                            <Button
                                                onClick={() => setIsLinking(true)}
                                                className="w-full h-12 bg-white border-2 border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-active transition-all"
                                            >
                                                <LinkIcon className="h-4 w-4 mr-2" />
                                                Vincular a un Producto
                                            </Button>
                                        )}
                                    </>
                                )}

                                {/* Manual input — always visible */}
                                {!isCameraActive && (
                                    <div className="w-full relative px-4">
                                        <Input
                                            autoFocus
                                            placeholder="Ingreso Manual..."
                                            className="h-12 bg-white border-2 border-slate-100 focus:border-primary rounded-xl font-bold text-center tracking-widest"
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") lookupBarcode((e.target as HTMLInputElement).value)
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {isLinking && (
                            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                        Vincular Codigo: <span className="text-primary">{scannedCode}</span>
                                    </p>
                                    <div className="relative">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                                        <Input
                                            autoFocus
                                            placeholder="Buscar producto por nombre o SKU..."
                                            className="h-12 pl-12 bg-slate-50 border-none rounded-xl font-bold"
                                            value={searchQuery}
                                            onChange={(e) => {
                                                setSearchQuery(e.target.value)
                                                searchProducts(e.target.value)
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2 max-h-[240px] overflow-y-auto pr-2 custom-scrollbar">
                                    {isSearching ? (
                                        <div className="py-8 flex justify-center">
                                            <Loader2 className="h-6 w-6 animate-spin text-slate-200" />
                                        </div>
                                    ) : searchResults.map(p => (
                                        <button
                                            key={p.id}
                                            onClick={() => linkBarcodeToProduct(p.id)}
                                            className="w-full p-4 rounded-2xl border border-slate-100 hover:border-primary hover:bg-slate-50 transition-all text-left flex items-center justify-between group"
                                        >
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{p.sku}</p>
                                                <p className="font-black italic uppercase tracking-tighter text-slate-900 group-hover:text-primary transition-colors">{p.name}</p>
                                            </div>
                                            <CheckCircle2 className="h-5 w-5 text-slate-200 group-hover:text-primary transition-colors" />
                                        </button>
                                    ))}
                                    {!isSearching && searchQuery && searchResults.length === 0 && (
                                        <p className="text-center py-8 text-[10px] font-black text-slate-300 uppercase italic">Sin resultados</p>
                                    )}
                                </div>

                                <Button
                                    variant="ghost"
                                    onClick={() => setIsLinking(false)}
                                    className="w-full text-[10px] font-black text-slate-400 uppercase tracking-widest"
                                >
                                    Volver al escaner
                                </Button>
                            </div>
                        )}

                        {isLoading && (
                            <div className="py-20 flex flex-col items-center justify-center gap-6">
                                <Loader2 className="h-12 w-12 text-primary animate-spin" />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sincronizando...</span>
                            </div>
                        )}

                        {product && !isLoading && (
                            <div className="animate-in zoom-in-95 duration-300 space-y-8">
                                <div className="p-6 bg-slate-900 rounded-[2rem] text-white relative overflow-hidden shadow-active">
                                    <Zap className="absolute -right-4 -top-4 h-24 w-24 text-white/5 rotate-12" />
                                    <div className="relative z-10 space-y-4">
                                        <div className="flex items-start justify-between">
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">{product.sku}</p>
                                                <h4 className="text-2xl font-black italic uppercase tracking-tighter leading-tight">{product.name}</h4>
                                            </div>
                                            <Badge className="bg-primary text-white border-none font-black italic uppercase text-[8px] px-3">{product.uom}</Badge>
                                        </div>
                                        <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest">Codigo Vinculo</p>
                                                <p className="text-xs font-mono font-bold tracking-[0.2em]">{product.barcode || scannedCode}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest">Precio</p>
                                                <p className="text-xl font-black italic tracking-tighter">${product.selling_price?.toLocaleString("es-CO")}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Bodega</label>
                                        <select
                                            value={warehouseId}
                                            onChange={(e) => { setWarehouseId(e.target.value); try { localStorage.setItem("scanner_wh", e.target.value) } catch { /* storage bloqueado */ } }}
                                            className="h-12 bg-slate-50/50 border-none rounded-2xl px-4 font-bold text-slate-800 shadow-inner focus:ring-2 focus:ring-primary outline-none"
                                        >
                                            {warehouses.length === 0 && <option value="">Sin bodegas</option>}
                                            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                        </select>
                                    </div>
                                    {/* LOTE + VENCIMIENTO */}
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                                            <Layers className="h-3 w-3" /> Lote
                                        </label>
                                        <div className={`grid gap-2 ${lots.length > 0 ? "grid-cols-3" : "grid-cols-2"}`}>
                                            {lots.length > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() => { setLotMode("existing"); if (!selectedLotId && lots[0]) setSelectedLotId(lots[0].id) }}
                                                    className={`h-9 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${lotMode === "existing" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
                                                >
                                                    Existente
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => setLotMode("new")}
                                                className={`h-9 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all inline-flex items-center justify-center gap-1 ${lotMode === "new" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
                                            >
                                                <CalendarClock className="h-3 w-3" /> Nuevo
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setLotMode("none")}
                                                className={`h-9 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all inline-flex items-center justify-center gap-1 ${lotMode === "none" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
                                            >
                                                <Ban className="h-3 w-3" /> Sin lote
                                            </button>
                                        </div>

                                        {lotMode === "existing" && lots.length > 0 && (
                                            <select
                                                value={selectedLotId}
                                                onChange={(e) => setSelectedLotId(e.target.value)}
                                                className="h-11 bg-slate-50/50 border-none rounded-2xl px-4 font-bold text-slate-800 shadow-inner focus:ring-2 focus:ring-primary outline-none"
                                            >
                                                {lots.map((l) => (
                                                    <option key={l.id} value={l.id}>
                                                        {l.lot_number} · vence {l.expiration_date} · {l.qty} und
                                                    </option>
                                                ))}
                                            </select>
                                        )}
                                        {lotMode === "new" && (
                                            <div className="grid grid-cols-2 gap-2">
                                                <Input
                                                    placeholder="N° de lote"
                                                    value={newLotNumber}
                                                    onChange={(e) => setNewLotNumber(e.target.value)}
                                                    className="h-11 bg-slate-50/50 border-none rounded-2xl font-bold text-center shadow-inner"
                                                />
                                                <Input
                                                    type="date"
                                                    value={newLotExp}
                                                    onChange={(e) => setNewLotExp(e.target.value)}
                                                    title="Fecha de vencimiento"
                                                    className="h-11 bg-slate-50/50 border-none rounded-2xl font-bold px-3 shadow-inner"
                                                />
                                            </div>
                                        )}
                                        {lotMode === "new" && (
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Vencimiento obligatorio para un lote nuevo</p>
                                        )}
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Cantidad</label>
                                        <Input
                                            type="number"
                                            value={qty}
                                            onChange={(e) => setQty(e.target.value)}
                                            className="h-16 text-3xl font-black text-center bg-slate-50/50 border-none rounded-2xl focus:ring-primary shadow-inner italic"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <Button onClick={() => handleMovement("IN")} className="h-20 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[1.5rem] shadow-active transition-all group">
                                            <div className="flex flex-col items-center gap-1">
                                                <ArrowDownRight className="h-6 w-6 group-hover:translate-y-1 transition-transform" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Entrada</span>
                                            </div>
                                        </Button>
                                        <Button onClick={() => handleMovement("OUT")} className="h-20 bg-rose-600 hover:bg-rose-700 text-white rounded-[1.5rem] shadow-active transition-all group">
                                            <div className="flex flex-col items-center gap-1">
                                                <ArrowUpRight className="h-6 w-6 group-hover:-translate-y-1 transition-transform" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Salida</span>
                                            </div>
                                        </Button>
                                    </div>
                                </div>

                                <Button variant="ghost" onClick={() => { setProduct(null); setScannedCode(""); resetLot() }} className="w-full text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    Limpiar y Escanear otro
                                </Button>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}
