"use client"

import { useState } from "react"
import { Sparkles, Loader2, X } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/shared/components/ui/dialog"
import { analyzeModuleAction, type AnalyzableModule } from "@/features/ai/actions/analyzeActions"

interface Props {
    module: AnalyzableModule
    /** Texto del botón; por defecto "Analizar con IA". */
    label?: string
    /** Clases extra para el botón. */
    className?: string
}

/**
 * Botón que genera un análisis narrativo (solo lectura) del módulo con IA.
 * El permiso se verifica en el servidor (analyzeModuleAction); nada se modifica.
 */
export function AnalyzeWithAIButton({ module, label = "Analizar con IA", className }: Props) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [text, setText] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    async function run() {
        setOpen(true)
        setLoading(true)
        setText(null)
        setError(null)
        try {
            const res = await analyzeModuleAction(module)
            if (res.error) setError(res.error)
            else setText(res.text ?? "Sin resultado.")
        } catch {
            setError("No se pudo generar el análisis.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <Button
                type="button"
                variant="outline"
                onClick={run}
                className={className ?? "h-9 px-4 rounded-xl text-xs gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50"}
            >
                <Sparkles className="h-3.5 w-3.5" /> {label}
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-[640px] max-h-[85vh] overflow-y-auto rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base">
                            <Sparkles className="h-4 w-4 text-indigo-600" /> Análisis con IA
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Resumen generado con los datos reales de tu empresa. Solo lectura — no modifica nada.
                        </DialogDescription>
                    </DialogHeader>

                    {loading && (
                        <div className="flex flex-col items-center justify-center gap-3 py-12">
                            <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
                            <p className="text-sm text-slate-500 font-medium">Analizando tus datos…</p>
                        </div>
                    )}

                    {!loading && error && (
                        <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 rounded-xl p-4">
                            <X className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                            <p className="text-sm text-rose-700 font-medium">{error}</p>
                        </div>
                    )}

                    {!loading && text && (
                        <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-medium">
                            {text}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    )
}
