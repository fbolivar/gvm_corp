"use client"

import { useState, useEffect, useTransition, useRef, useCallback } from "react"
import { getEmployeeCarnetAction } from "../actions/kioskActions"
import { CarnetFront, CarnetBack, loadPhotos, savePhoto, removePhoto, type EmployeeQR } from "./EmployeeQRCards"
import { Button } from "@/shared/components/ui/button"
import { Loader2, Printer, Camera, X, RotateCcw, CreditCard } from "lucide-react"
import { toast } from "sonner"

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
    const fileRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        startTransition(async () => {
            try {
                const data = await getEmployeeCarnetAction(employeeId)
                setEmp(data as EmployeeQR | null)
                if (data) setPhoto(loadPhotos()[data.id])
            } catch {
                toast.error("No se pudo cargar el carnet")
            }
        })
    }, [employeeId])

    const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !emp) return
        if (file.size > 2 * 1024 * 1024) { toast.error("Máximo 2 MB"); return }
        const reader = new FileReader()
        reader.onloadend = () => {
            const url = reader.result as string
            setPhoto(url)
            savePhoto(emp.id, url)
        }
        reader.readAsDataURL(file)
        e.target.value = ""
    }, [emp])

    const handleRemovePhoto = () => {
        if (!emp) return
        setPhoto(undefined)
        removePhoto(emp.id)
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
                    @page { margin: 8mm; size: A4; }
                }
            `}</style>

            {/* Capa de impresión: frente + reverso */}
            {emp && (
                <div id="gvm-print-carnet-single" style={{ display: "none" }}>
                    <CarnetFront emp={emp} photo={photo} />
                    <CarnetBack emp={emp} />
                </div>
            )}

            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-indigo-600" />
                    Carnet QR
                </h3>
                {emp && (
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
                            <button onClick={handleRemovePhoto} title="Quitar foto"
                                className="h-7 w-7 rounded-lg bg-rose-50 hover:bg-rose-100 flex items-center justify-center transition-colors">
                                <X className="h-3.5 w-3.5 text-rose-500" />
                            </button>
                        )}
                        <button onClick={handlePrint} title="Imprimir" disabled={printing}
                            className="h-7 w-7 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 flex items-center justify-center transition-colors">
                            <Printer className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300" />
                        </button>
                        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
                    </div>
                )}
            </div>

            <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-4">
                Frente con foto y datos · Reverso con QR · Usa <RotateCcw className="h-2.5 w-2.5 inline" /> para alternar · La foto se guarda en el navegador.
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
