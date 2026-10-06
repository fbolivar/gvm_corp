"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { usePathname } from "next/navigation"

/**
 * Protección contra "version skew" (desfase de versión).
 *
 * Al desplegar, Next genera IDs nuevos para las Server Actions. Una pestaña que
 * lleva horas abierta sigue usando el bundle viejo y, al guardar, envía un ID que
 * ya no existe → "Server Action ... was not found on the server" y el usuario
 * pierde lo que escribió sin entender por qué.
 *
 * Dos capas:
 *  1. ACTUALIZACIÓN SILENCIOSA: consulta /api/version (al volver a la pestaña y
 *     cada 5 min). Si el deploy cambió, NO avisa: espera a que el usuario cambie
 *     de pantalla y en ese momento recarga la página completa, que ya trae el
 *     bundle nuevo. El usuario no pierde nada (acaba de salir de la pantalla) y
 *     no ve ningún mensaje. Con Skew Protection activa en Vercel, mientras tanto
 *     la pestaña vieja sigue funcionando contra su propio deploy.
 *     (Antes había una barra "Hay una versión nueva…": con varios deploys al día
 *     confundía a los empleados. 2026-09-17.)
 *  2. RED DE SEGURIDAD: intercepta las respuestas de Server Actions. Si una vuelve
 *     404 (acción inexistente), corta el error técnico y muestra un aviso claro.
 */
// Sello del build que sirvió ESTA pestaña (inlinado por next.config).
const BUILD_ID = process.env.NEXT_PUBLIC_APP_BUILD || 'dev'

export function AppUpdateGuard() {
    const buildId = BUILD_ID
    const [updateAvailable, setUpdateAvailable] = useState(false)
    const [skewDetected, setSkewDetected] = useState(false)
    const pathname = usePathname()
    const lastPathRef = useRef(pathname)

    const checkVersion = useCallback(async () => {
        if (!buildId || buildId === 'dev') return
        try {
            const res = await fetch('/api/version', { cache: 'no-store' })
            if (!res.ok) return
            const data = (await res.json()) as { id?: string }
            if (data?.id && data.id !== 'dev' && data.id !== buildId) {
                setUpdateAvailable(true)
            }
        } catch {
            // Sin red o servidor ocupado: no molestamos al usuario.
        }
    }, [buildId])

    // Capa 1 — sondeo suave: al volver a la pestaña y cada 5 minutos.
    useEffect(() => {
        const onFocus = () => { if (document.visibilityState === 'visible') checkVersion() }
        document.addEventListener('visibilitychange', onFocus)
        window.addEventListener('focus', onFocus)
        const timer = setInterval(checkVersion, 5 * 60 * 1000)
        return () => {
            document.removeEventListener('visibilitychange', onFocus)
            window.removeEventListener('focus', onFocus)
            clearInterval(timer)
        }
    }, [checkVersion])

    // Capa 1b — al cambiar de pantalla con una versión nueva pendiente, recarga
    // completa: la página destino se carga ya con el bundle nuevo.
    useEffect(() => {
        if (pathname === lastPathRef.current) return
        lastPathRef.current = pathname
        if (updateAvailable) window.location.reload()
    }, [pathname, updateAvailable])

    // Capa 2 — intercepta las llamadas a Server Actions (llevan header Next-Action).
    // Un 404 en una de ellas SIEMPRE es desfase de versión.
    useEffect(() => {
        const originalFetch = window.fetch
        window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
            const response = await originalFetch(input, init)
            try {
                const headers = new Headers(
                    init?.headers ?? (input instanceof Request ? input.headers : undefined)
                )
                const isServerAction = headers.has('next-action')
                if (isServerAction && response.status === 404) {
                    setSkewDetected(true)
                }
            } catch {
                // Nunca romper el fetch por culpa del guard.
            }
            return response
        }
        return () => { window.fetch = originalFetch }
    }, [])

    // Respaldo: errores no capturados con el mensaje característico.
    useEffect(() => {
        const isSkewMessage = (msg: unknown) =>
            typeof msg === 'string' &&
            (msg.includes('was not found on the server') || msg.includes('Failed to find Server Action'))

        const onError = (e: ErrorEvent) => { if (isSkewMessage(e.message)) setSkewDetected(true) }
        const onRejection = (e: PromiseRejectionEvent) => {
            const reason = e.reason
            if (isSkewMessage(reason instanceof Error ? reason.message : reason)) setSkewDetected(true)
        }
        window.addEventListener('error', onError)
        window.addEventListener('unhandledrejection', onRejection)
        return () => {
            window.removeEventListener('error', onError)
            window.removeEventListener('unhandledrejection', onRejection)
        }
    }, [])

    const reload = () => window.location.reload()

    // Bloqueante solo cuando algo YA falló: el usuario debe recargar para continuar.
    if (skewDetected) {
        return (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
                    <h2 className="text-base font-black text-slate-900">La aplicación se actualizó</h2>
                    <p className="text-sm text-slate-600 leading-relaxed">
                        Se publicó una versión nueva mientras tenías esta pestaña abierta, por eso la
                        última acción no se pudo completar. <span className="font-semibold">Tus datos
                        guardados están intactos.</span>
                    </p>
                    <p className="text-xs text-slate-500 leading-relaxed">
                        Si tienes texto sin guardar en pantalla, cópialo antes de recargar.
                    </p>
                    <div className="flex justify-end gap-2">
                        <button
                            onClick={() => setSkewDetected(false)}
                            className="h-10 px-4 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50"
                        >
                            Copiar primero
                        </button>
                        <button
                            onClick={reload}
                            className="h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
                        >
                            Recargar ahora
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    // Sin aviso preventivo: la versión nueva se aplica sola en la siguiente navegación.
    return null
}
