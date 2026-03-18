"use client"

import { AlertTriangle, RotateCcw } from "lucide-react"

export default function AuthErrorBoundary({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    return (
        <div className="min-h-screen flex items-center justify-center p-8 bg-white">
            <div className="max-w-sm w-full text-center space-y-6">
                <div className="mx-auto h-16 w-16 rounded-2xl bg-rose-50 flex items-center justify-center">
                    <AlertTriangle className="h-8 w-8 text-rose-500" />
                </div>
                <div className="space-y-2">
                    <h2 className="text-xl font-black text-slate-900 uppercase">Error de Autenticacion</h2>
                    <p className="text-sm text-slate-500">No se pudo cargar la pagina. Intenta de nuevo.</p>
                </div>
                <button
                    onClick={reset}
                    className="inline-flex items-center gap-2 h-11 px-6 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-700 transition-all"
                >
                    <RotateCcw className="h-4 w-4" />
                    Reintentar
                </button>
            </div>
        </div>
    )
}
