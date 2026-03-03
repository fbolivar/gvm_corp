"use client"

import { useEffect, useState } from "react"
import { PortfolioAgentConfig } from "@/features/portfolio/components/PortfolioAgentConfig"
import { PortfolioAgentMetrics } from "@/features/portfolio/components/PortfolioAgentMetrics"
import { PortfolioAgentActivity } from "@/features/portfolio/components/PortfolioAgentActivity"
import { PortfolioAgentExclusions } from "@/features/portfolio/components/PortfolioAgentExclusions"
import { PortfolioAgentTemplates } from "@/features/portfolio/components/PortfolioAgentTemplates"
import { portfolioAgentService } from "@/features/portfolio/services/portfolioAgentService"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/shared/components/ui/card"
import { Sparkles, Brain } from "lucide-react"
import { toast } from "sonner"

export default function PortfolioAgentPage() {
    const [config, setConfig] = useState<any>(null)
    const [metrics, setMetrics] = useState<any>(null)
    const [activity, setActivity] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    const loadData = async () => {
        try {
            const [configRes, metricsRes, activityRes] = await Promise.all([
                portfolioAgentService.getConfig(supabase),
                portfolioAgentService.getAgentMetrics(supabase),
                portfolioAgentService.getRecentActions(supabase)
            ])
            setConfig(configRes)
            setMetrics(metricsRes)
            setActivity(activityRes)
        } catch (error) {
            console.error("Error loading agent data:", error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [])

    const handleSave = async (newConfig: any) => {
        try {
            await portfolioAgentService.saveConfig(supabase, newConfig)
            toast.success("CONFIGURACIÓN DEL AGENTE ACTUALIZADA", {
                description: "El Portfolio IQ Agent aplicará las nuevas reglas de inmediato.",
                className: "font-black italic uppercase"
            })
        } catch (error) {
            toast.error("ERROR AL GUARDAR CONFIGURACIÓN")
        }
    }

    const handleRunInference = async () => {
        const promise = portfolioAgentService.runAgentInference(supabase, "")
        toast.promise(promise, {
            loading: 'EJECUTANDO MOTOR DE INTELIGENCIA...',
            success: (res: any) => {
                loadData(); // Refrescar datos después de la inferencia
                if (res.skipped) return `MOTOR EN STANDBY: ${res.reason}`;
                return `CICLO COMPLETADO: ${res.actions?.length || 0} ACCIONES EJECUTADAS`;
            },
            error: 'ERROR EN EL MOTOR DE INFERENCIA',
        });
    }

    if (loading) return (
        <div className="p-20 flex justify-center">
            <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-indigo-600 border-solid"></div>
        </div>
    )

    return (
        <div className="container py-16 space-y-16">
            <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                    <Sparkles className="w-8 h-8 text-indigo-500" />
                    <span className="text-sm font-black text-indigo-500 uppercase tracking-[0.5em] italic">Intelligence Hub</span>
                </div>
                <h1 className="text-4xl font-black tracking-tighter uppercase text-slate-900 leading-tight">
                    Agentes <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Autónomos</span>
                </h1>
                <p className="text-xl font-bold text-slate-400 uppercase tracking-widest italic max-w-2xl">
                    Configura los parámetros de operación de la inteligencia artificial que gestiona tu flujo de caja.
                </p>
            </div>

            {metrics && <PortfolioAgentMetrics metrics={metrics} />}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
                {/* Columna Izquierda: Actividad (8/12) */}
                <div className="lg:col-span-8 space-y-16">
                    <PortfolioAgentActivity
                        actions={activity}
                        onRefresh={loadData}
                    />

                    <Card className="bg-slate-900 border-none overflow-hidden relative group">
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                        <CardContent className="p-12 relative z-10 flex flex-col md:flex-row items-center gap-10">
                            <div className="bg-white/10 p-6 rounded-full backdrop-blur-xl">
                                <Brain className="w-16 h-16 text-indigo-400" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-4">¿Cómo funciona el agente?</h2>
                                <p className="text-indigo-200/70 font-medium text-lg leading-relaxed">
                                    Portfolio IQ analiza diariamente tus facturas de venta. Si detecta una mora superior a tus <span className="text-white font-black italic underline decoration-indigo-500 underline-offset-4">días de gracia</span>, el sistema activará una <span className="text-white font-black italic">Acción de Cobro</span> automática enviando recordatorios y escalando los casos según el riesgo del deudor.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <PortfolioAgentTemplates
                        config={config}
                        onUpdate={handleSave}
                    />
                </div>

                {/* Columna Derecha: Controles y Exclusiones (4/12) */}
                <div className="lg:col-span-4 space-y-12">
                    <PortfolioAgentConfig
                        initialConfig={config}
                        onSave={handleSave}
                        onRunInference={handleRunInference}
                    />
                    <PortfolioAgentExclusions />
                </div>
            </div>
        </div>
    )
}
