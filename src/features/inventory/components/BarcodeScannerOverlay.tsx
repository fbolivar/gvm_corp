"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
    Barcode,
    X,
    Scan,
    Box,
    Zap,
    History,
    ArrowUpRight,
    ArrowDownRight,
    Search,
    Loader2,
    Link as LinkIcon,
    CheckCircle2
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
import { cn } from "@/shared/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

interface Product {
    id: string;
    name: string;
    sku: string;
    barcode: string;
    price: number;
    uom: string;
}

export function BarcodeScannerOverlay() {
    const [isOpen, setIsOpen] = useState(false)
    const [scannedCode, setScannedCode] = useState("")
    const [product, setProduct] = useState<Product | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [qty, setQty] = useState("1")

    // Linking mode states
    const [isLinking, setIsLinking] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [searchResults, setSearchResults] = useState<Product[]>([])
    const [isSearching, setIsSearching] = useState(false)

    const scanBuffer = useRef("")
    const lastKeyTime = useRef(0)

    // Global listener for HID Scanners
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const currentTime = Date.now()
            if (currentTime - lastKeyTime.current > 50) scanBuffer.current = ""

            if (e.key === "Enter") {
                if (scanBuffer.current.length > 3) {
                    processBarcode(scanBuffer.current)
                    scanBuffer.current = ""
                }
            } else if (e.key.length === 1) {
                scanBuffer.current += e.key
            }
            lastKeyTime.current = currentTime
        }

        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [])

    const processBarcode = async (code: string) => {
        setIsOpen(true)
        setIsLoading(true)
        setScannedCode(code)
        setIsLinking(false)

        const supabase = createClient()
        try {
            const { data, error } = await supabase
                .from('products')
                .select('id, name, sku, barcode, price, uom')
                .eq('barcode', code)
                .maybeSingle()

            if (error) throw error

            if (data) {
                setProduct(data)
                toast.success("PRODUCTO IDENTIFICADO")
            } else {
                setProduct(null)
                // We leave it here so the user can click "Link Product"
            }
        } catch (error) {
            console.error(error)
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
                .from('products')
                .select('id, name, sku, barcode, price, uom')
                .or(`name.ilike.%${query}%,sku.ilike.%${query}%`)
                .limit(5)

            if (error) throw error
            setSearchResults(data || [])
        } catch (error) {
            console.error(error)
        } finally {
            setIsSearching(false)
        }
    }

    const linkBarcodeToProduct = async (productId: string) => {
        setIsLoading(true)
        const supabase = createClient()
        try {
            const { error } = await supabase
                .from('products')
                .update({ barcode: scannedCode })
                .eq('id', productId)

            if (error) throw error

            toast.success("VÍNCULO EXITOSO", {
                description: `El código ${scannedCode} ha sido asociado al producto.`
            })

            // Re-load product
            processBarcode(scannedCode)
        } catch (error: any) {
            toast.error("ERROR AL VINCULAR", { description: error.message })
        } finally {
            setIsLoading(false)
            setIsLinking(false)
        }
    }

    const handleMovement = async (type: 'IN' | 'OUT') => {
        if (!product) return
        const supabase = createClient()
        try {
            setIsLoading(true)
            const { data: warehouse } = await supabase.from('warehouses').select('id').limit(1).single()
            if (!warehouse) throw new Error("No hay bodegas")

            const { error } = await supabase
                .from('inventory_movements')
                .insert({
                    product_id: product.id,
                    warehouse_id: warehouse.id,
                    type,
                    qty: Number(qty),
                    reason: `Escáner: ${type === 'IN' ? 'Entrada' : 'Salida'}`,
                    occurred_at: new Date().toISOString()
                })

            if (error) throw error

            toast.success("MOVIMIENTO REGISTRADO")
            setIsOpen(false)
            setProduct(null)
            setScannedCode("")
        } catch (error: any) {
            toast.error("ERROR", { description: error.message })
        } finally {
            setIsLoading(false)
        }
    }

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

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
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
                                    Gestión Industrial de Inventarios
                                </p>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="p-8 space-y-8">
                        {!product && !isLoading && !isLinking && (
                            <div className="space-y-6 py-8 text-center flex flex-col items-center">
                                <div className="h-24 w-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center border-4 border-white shadow-premium relative overflow-hidden">
                                    <div className="absolute inset-x-0 top-0 h-0.5 bg-primary animate-[scan_2s_infinite]" />
                                    <Scan className="h-10 w-10 text-slate-200" />
                                </div>
                                <div className="space-y-3">
                                    <h3 className="text-xl font-black italic tracking-tighter uppercase text-slate-900 leading-none">
                                        {scannedCode ? 'Código no registrado' : 'Esperando Escaneo...'}
                                    </h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest max-w-[200px] leading-relaxed">
                                        {scannedCode
                                            ? `El código ${scannedCode} no existe en la base de datos.`
                                            : 'Pasa el láser sobre el código o escribe abajo.'}
                                    </p>
                                </div>

                                {scannedCode && (
                                    <Button
                                        onClick={() => setIsLinking(true)}
                                        className="w-full h-12 bg-white border-2 border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-active transition-all"
                                    >
                                        <LinkIcon className="h-4 w-4 mr-2" />
                                        Vincular a un Producto
                                    </Button>
                                )}

                                <div className="w-full relative px-4">
                                    <Input
                                        autoFocus
                                        placeholder="Ingreso Manual..."
                                        className="h-12 bg-white border-2 border-slate-100 focus:border-primary rounded-xl font-bold text-center tracking-widest"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') processBarcode((e.target as HTMLInputElement).value)
                                        }}
                                    />
                                </div>
                            </div>
                        )}

                        {isLinking && (
                            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Vincular Código: <span className="text-primary">{scannedCode}</span></p>
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
                                        <div className="py-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-slate-200" /></div>
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
                                    Volver al escáner
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
                                                <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest">Código Vínculo</p>
                                                <p className="text-xs font-mono font-bold tracking-[0.2em]">{product.barcode || scannedCode}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest">Precio</p>
                                                <p className="text-xl font-black italic tracking-tighter">${product.price?.toLocaleString('es-CO')}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
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
                                        <Button onClick={() => handleMovement('IN')} className="h-20 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[1.5rem] shadow-active transition-all group">
                                            <div className="flex flex-col items-center gap-1">
                                                <ArrowDownRight className="h-6 w-6 group-hover:translate-y-1 transition-transform" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Entrada</span>
                                            </div>
                                        </Button>
                                        <Button onClick={() => handleMovement('OUT')} className="h-20 bg-rose-600 hover:bg-rose-700 text-white rounded-[1.5rem] shadow-active transition-all group">
                                            <div className="flex flex-col items-center gap-1">
                                                <ArrowUpRight className="h-6 w-6 group-hover:-translate-y-1 transition-transform" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Salida</span>
                                            </div>
                                        </Button>
                                    </div>
                                </div>

                                <Button variant="ghost" onClick={() => { setProduct(null); setScannedCode(""); }} className="w-full text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    Limpiar y Escanear otro
                                </Button>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <style jsx global>{`
                @keyframes scan {
                    0% { transform: translateY(0); opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { transform: translateY(96px); opacity: 0; }
                }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
            `}</style>
        </>
    )
}
