"use client"

import { useState, useTransition } from "react"
import { generateEmployeeQrPayloadsAction } from "../actions/kioskActions"
import { Button } from "@/shared/components/ui/button"
import { Loader2, Printer, CreditCard, Download } from "lucide-react"
import { toast } from "sonner"
import { QRCodeSVG } from "qrcode.react"

interface EmployeeQR {
    id: string
    name: string
    doc_number: string
    qrPayload: string
}

export function EmployeeQRCards() {
    const [employees, setEmployees] = useState<EmployeeQR[]>([])
    const [isPending, startTransition] = useTransition()
    const [generated, setGenerated] = useState(false)

    const handleGenerate = () => {
        startTransition(async () => {
            try {
                const data = await generateEmployeeQrPayloadsAction()
                setEmployees(data)
                setGenerated(true)
                toast.success(`${data.length} carnets generados`)
            } catch {
                toast.error("Error al generar carnets")
            }
        })
    }

    const handlePrint = () => {
        window.print()
    }

    return (
        <div className="space-y-4">
            {/* Generate button */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4 print:hidden">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-indigo-600" />
                    Carnets QR de Empleados
                </h3>
                <p className="text-[10px] text-slate-400">
                    Genera e imprime carnets con codigo QR para cada empleado. Los empleados escanean su carnet en la tablet para registrar asistencia.
                </p>

                <div className="flex gap-2">
                    <Button
                        onClick={handleGenerate}
                        disabled={isPending}
                        className="h-9 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 flex-1"
                    >
                        {isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <><Download className="h-4 w-4 mr-1" /> {generated ? 'Regenerar' : 'Generar'} Carnets</>
                        )}
                    </Button>
                    {generated && employees.length > 0 && (
                        <Button
                            onClick={handlePrint}
                            variant="outline"
                            className="h-9 rounded-lg text-xs font-bold px-4"
                        >
                            <Printer className="h-4 w-4 mr-1" /> Imprimir
                        </Button>
                    )}
                </div>
            </div>

            {/* Preview cards (visible on screen) */}
            {generated && employees.length > 0 && (
                <div className="space-y-3 print:hidden">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">
                        Vista previa ({employees.length} carnets)
                    </p>
                    <div className="grid grid-cols-1 gap-3 max-h-[60vh] overflow-y-auto pr-2">
                        {employees.map(emp => (
                            <div key={emp.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
                                <QRCodeSVG value={emp.qrPayload} size={64} level="M" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-slate-900 truncate">{emp.name}</p>
                                    <p className="text-[10px] text-slate-400">CC {emp.doc_number}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Printable cards (only visible when printing) */}
            {generated && employees.length > 0 && (
                <div className="hidden print:block">
                    <style>{`
                        @media print {
                            body * { visibility: hidden; }
                            .print-cards, .print-cards * { visibility: visible; }
                            .print-cards { position: absolute; left: 0; top: 0; width: 100%; }
                            @page { margin: 10mm; }
                        }
                    `}</style>
                    <div className="print-cards grid grid-cols-2 gap-4">
                        {employees.map(emp => (
                            <div key={emp.id} className="border-2 border-slate-300 rounded-xl p-4 flex flex-col items-center gap-3 page-break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
                                <div className="text-center">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">GVM Corp</p>
                                    <p className="text-[8px] text-slate-300 uppercase tracking-widest">Carnet de Asistencia</p>
                                </div>
                                <QRCodeSVG value={emp.qrPayload} size={120} level="H" />
                                <div className="text-center">
                                    <p className="text-sm font-black text-slate-900">{emp.name}</p>
                                    <p className="text-[10px] text-slate-500">CC {emp.doc_number}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
