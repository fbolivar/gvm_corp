"use client"

import { useState } from "react"
import { Gavel, Loader2, ShieldCheck, RefreshCw } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { generateBoardReportAction } from "@/features/ai/actions/boardActions"
import { toast } from "sonner"

export default function BoardReportClient() {
    const [loading, setLoading] = useState(false)
    const [text, setText] = useState<string | null>(null)
    const [areas, setAreas] = useState<string[]>([])
    const [generatedAt, setGeneratedAt] = useState<string | null>(null)

    async function run() {
        setLoading(true)
        try {
            const res = await generateBoardReportAction()
            if (res.error) {
                toast.error(res.error)
                return
            }
            setText(res.text ?? "Sin resultado.")
            setAreas(res.areas ?? [])
            setGeneratedAt(new Date().toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" }))
        } catch {
            toast.error("No se pudo generar el informe.")
        } finally {
            setLoading(false)
        }
    }

    if (!text) {
        return (
            <div className="bg-white border border-slate-100 rounded-[2rem] shadow-sm p-10 flex flex-col items-center text-center gap-5">
                <div className="h-16 w-16 rounded-2xl bg-indigo-50 flex items-center justify-center">
                    <Gavel className="h-8 w-8 text-indigo-500" />
                </div>
                <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-800">Convoca la junta directiva</p>
                    <p className="text-xs text-slate-400 max-w-md">
                        La IA revisará las áreas a las que tienes acceso, las cruzará y te dará recomendaciones priorizadas.
                        Solo lectura — no modifica nada.
                    </p>
                </div>
                <Button onClick={run} disabled={loading} className="h-11 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold gap-2">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gavel className="h-4 w-4" />}
                    {loading ? "Analizando el negocio…" : "Convocar junta"}
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Áreas analizadas:</span>
                    {areas.map(a => (
                        <span key={a} className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">{a}</span>
                    ))}
                    {generatedAt && <span className="text-[10px] text-slate-400">· {generatedAt}</span>}
                </div>
                <Button onClick={run} disabled={loading} variant="outline" className="h-9 px-4 rounded-xl text-xs gap-2">
                    {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    Volver a convocar
                </Button>
            </div>

            <div className="bg-white border border-slate-100 rounded-[2rem] shadow-sm p-8">
                <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-medium">
                    {text}
                </div>
            </div>

            <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-xs text-emerald-800 font-medium">
                    Estas son <span className="font-bold">propuestas</span>. Ninguna se ejecuta automáticamente: tú decides qué aprobar y lo haces en el módulo correspondiente.
                </p>
            </div>
        </div>
    )
}
