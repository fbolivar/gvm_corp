"use client"

import { useState, useEffect, useTransition, useRef, useCallback } from "react"
import { createPortal } from "react-dom"
import { getEmployeeCarnetAction, saveEmployeePhotoAction, removeEmployeePhotoAction } from "../actions/kioskActions"
import { CarnetFront, CarnetBack, type EmployeeQR } from "./EmployeeQRCards"
import { fileToResizedDataUrl } from "@/shared/lib/imageResize"
import { Button } from "@/shared/components/ui/button"
import { Loader2, Printer, Camera, X, RotateCcw, CreditCard } from "lucide-react"
import { toast } from "sonner"
import { Hint } from "@/shared/components/ui/hint"

/**
 * Carnet QR individual para la ficha de un empleado.
 * Reutiliza CarnetFront/CarnetBack del generador masivo (fuente única).
 */
export function EmployeeCarnet({ employeeId }: { employeeId: string }) {
    const [emp, setEmp] = useState<EmployeeQR | null>(null)
    const [isPending, startTransition] = useTransition()
    const [photo, setPhoto] = useState<string | undefined>(undefined)
    const [showBack, setShowBack] = useState(false)
    const [printing, setPrinting] = useState(false)
    const [mounted, setMounted] = useState(false)
    const fileRef = useRef<HTMLInputElement>(null)

    useEffect(() => { setMounted(true) }, [])

    useEffect(() => {
        startTransition(async () => {
            try {
                const data = await getEmployeeCarnetAction(employeeId)
                setEmp(data as EmployeeQR | null)
                if (data?.photo_url) setPhoto(data.photo_url)
            } catch {
                toast.error("No se pudo cargar el carnet")
            }
        })
    }, [employeeId])

    const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        e.target.value = ""
        if (!file || !emp) return
        const prev = photo
        try {
            const dataUrl = await fileToResizedDataUrl(file) // reduce en el navegador
            setPhoto(dataUrl) // optimista
            const res = await saveEmployeePhotoAction(emp.id, dataUrl)
            if (res.ok) {
                if (res.url) setPhoto(res.url)
                toast.success("Foto guardada")
            } else {
                toast.error(res.error)
                setPhoto(prev)
            }
        } catch {
            toast.error("No se pudo procesar la foto")
            setPhoto(prev)
        }
    }, [emp, photo])

    const handleRemovePhoto = async () => {
        if (!emp) return
        const prev = photo
        setPhoto(undefined)
        const res = await removeEmployeePhotoAction(emp.id)
        if (!res.ok) { toast.error(res.error); setPhoto(prev) }
    }

    const handlePrint = () => {
        setPrinting(true)
        setTimeout(() => { window.print(); setPrinting(false) }, 80)
    }

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm p-5">
            <style>{`
                @media print {
                    body > * { display: none !important; }
                    #gvm-print-carnet-single {
                        display: flex !important;
                        position: fixed; top: 0; left: 0;
                        width: 100vw; justify-content: center;
                        gap: 8mm; padding: 12mm;
                        background: #fff;
                        align-items: flex-start;
                    }
                    #gvm-print-carnet-single > div {
                        page-break-inside: avoid; break-inside: avoid;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    /* Tamaño físico exacto 5.5 x 8.5 cm (diseño vectorial escalado). */
                    .gvm-carnet-slot {
                        width: 5.5cm; height: 8.5cm; overflow: hidden;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .gvm-carnet-slot > div {
                        transform: scale(0.7995, 0.7798);
                        transform-origin: top left;
                    }
                    @page { margin: 8mm; size: A4; }
                }
            `}</style>

            {/* Capa de impresión: se monta en <body> vía portal para que
                `body > * { display:none }` no la oculte por herencia. */}
            {mounted && emp && createPortal(
                <div id="gvm-print-carnet-single" style={{ display: "none" }}>
                    <div className="gvm-carnet-slot"><CarnetFront emp={emp} photo={photo} /></div>
                    <div className="gvm-carnet-slot"><CarnetBack emp={emp} /></div>
                </div>,
                document.body
            )}

            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-indigo-600" />
                    Carnet QR
                </h3>
                {emp && (
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
                                <button onClick={handleRemovePhoto}
                                    className="h-7 w-7 rounded-lg bg-rose-50 hover:bg-rose-100 flex items-center justify-center transition-colors">
                                    <X className="h-3.5 w-3.5 text-rose-500" />
                                </button>
                            </Hint>
                        )}
                        <Hint label="Imprimir" side="top">
                            <button onClick={handlePrint} disabled={printing}
                                className="h-7 w-7 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 flex items-center justify-center transition-colors">
                                <Printer className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300" />
                            </button>
                        </Hint>
                        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
                    </div>
                )}
            </div>

            <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-4">
                Frente con foto y datos · Reverso con QR · Usa <RotateCcw className="h-2.5 w-2.5 inline" /> para alternar · La foto queda guardada de forma permanente.
            </p>

            <div className="flex justify-center">
                {isPending ? (
                    <div className="flex items-center gap-2 text-slate-400 py-12">
                        <Loader2 className="h-5 w-5 animate-spin" /> Cargando carnet...
                    </div>
                ) : !emp ? (
                    <p className="text-center text-xs text-slate-400 py-12">No se pudo generar el carnet de este empleado.</p>
                ) : showBack ? (
                    <CarnetBack emp={emp} />
                ) : (
                    <CarnetFront emp={emp} photo={photo} />
                )}
            </div>
        </div>
    )
}
