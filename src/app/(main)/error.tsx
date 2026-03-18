"use client"

import { useEffect } from "react"
import { AlertTriangle, RotateCcw, Home } from "lucide-react"
import Link from "next/link"

export default function MainErrorBoundary({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error("[GVM Error Boundary]", error)
    }, [error])

    return (
        <div className="min-h-[60vh] flex items-center justify-center p-8">
            <div className="max-w-md w-full text-center space-y-8">
                <div className="mx-auto h-20 w-20 rounded-[2rem] bg-rose-50 flex items-center justify-center">
                    <AlertTriangle className="h-10 w-10 text-rose-500" />
                </div>

                <div className="space-y-3">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
                        Error del Sistema
                    </h2>
                    <p className="text-sm text-slate-500 leading-relaxed">
                        Ha ocurrido un error inesperado. Nuestro equipo ha sido notificado.
                        Puedes intentar recargar o volver al inicio.
                    </p>
                    {error.digest && (
                        <p className="text-[10px] font-mono text-slate-300 uppercase tracking-widest">
                            REF: {error.digest}
                        </p>
                    )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                        onClick={reset}
                        className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-700 transition-all active:scale-95"
                    >
                        <RotateCcw className="h-4 w-4" />
                        Reintentar
                    </button>
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm hover:bg-slate-200 transition-all active:scale-95"
                    >
                        <Home className="h-4 w-4" />
                        Ir al Dashboard
                    </Link>
                </div>
            </div>
        </div>
    )
}
