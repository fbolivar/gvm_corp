"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { portfolioAgentService } from "@/features/portfolio/services/portfolioAgentService"
import { PortfolioAgentConfig } from "@/features/portfolio/components/PortfolioAgentConfig"
import { PortfolioAgentExclusions } from "@/features/portfolio/components/PortfolioAgentExclusions"
import { PortfolioAgentActivity } from "@/features/portfolio/components/PortfolioAgentActivity"
import { PortfolioAgentMetrics } from "@/features/portfolio/components/PortfolioAgentMetrics"
import { PortfolioAgentTemplates } from "@/features/portfolio/components/PortfolioAgentTemplates"
import { DebtorRiskMatrix } from "@/features/portfolio/components/DebtorRiskMatrix"
import { PaymentReportsManager } from "@/features/portfolio/components/PaymentReportsManager"
import { Card } from "@/shared/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs"
import { Brain, Settings2, ShieldOff, Activity, FileText, BarChart3, Bot, Sparkles, ChevronLeft, CheckSquare } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

export default function PortfolioAIPage() {
    const [config, setConfig] = useState<any>(null)
    const [metrics, setMetrics] = useState<any>(null)
    const [actions, setActions] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        setLoading(true)
        try {
            const [cfgData, metData, actData] = await Promise.all([
                portfolioAgentService.getConfig(supabase),
                portfolioAgentService.getAgentMetrics(supabase),
                portfolioAgentService.getRecentActions(supabase, 50)
            ])
            setConfig(cfgData)
            setMetrics(metData)
            setActions(actData || [])
        } catch (error) {
            console.error("Error loading Agent data:", error)
            toast.error("Error al cargar configuración del agente")
        } finally {
            setLoading(false)
        }
    }

    const handleSaveConfig = async (newConfig: any) => {
        try {
            await portfolioAgentService.saveConfig(supabase, newConfig)
            setConfig(newConfig)
            toast.success("Configuración guardada correctamente")
        } catch (error) {
            toast.error("Error al guardar configuración")
        }
    }

    const handleRunInference = async () => {
        const t = toast.loading("Disparando cerebro autónomo...")
        try {
            const result = await portfolioAgentService.triggerRemoteCycle(supabase)
            // Calculamos total de acciones de todos los tenants devueltos por la Edge Function
            const totalActions = result.results?.reduce((acc: number, res: any) => acc + (res.actions || 0), 0) || 0
            toast.success("Ciclo completado", {
                id: t,
                description: `${totalActions} acciones ejecutadas en la cola de despacho.`
            })
            loadData() // Recargar para ver nuevas acciones
        } catch (error) {
            console.error("Error triggering cycle:", error)
            toast.error("Error al disparar el ciclo de la Edge Function", { id: t })
        }
    }

    if (loading && !config) {
        return (
            <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
                <div className="w-12 h-12 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
                <p className="text-slate-500 font-black uppercase tracking-widest italic animate-pulse">Sincronizando Cerebro AI...</p>
            </div>
        )
    }

    return (
        <div className="space-y-10 pb-20 animate-in fade-in slide-in-from-bottom-5 duration-700">
            {/* 🤖 Header Premium */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <Link href="/accounting/cartera" className="p-2 hover:bg-slate-100 rounded-full transition-colors group">
                            <ChevronLeft className="w-5 h-5 text-slate-400 group-hover:text-slate-900" />
                        </Link>
                        <div className="h-1 w-8 bg-indigo-500 rounded-full" />
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-500 italic">Autonomous Collections Unit</span>
                    </div>
                    <h1 className="text-5xl font-black tracking-tighter italic uppercase text-slate-900 flex items-center gap-4">
                        Portfolio <span className="text-indigo-600 flex items-center gap-2">IQ <Brain className="w-10 h-10" /></span>
                    </h1>
                </div>

                <div className="flex items-center gap-4 bg-white/50 backdrop-blur-md p-2 rounded-3xl border border-slate-200/60 shadow-sm">
                    <div className="px-6 py-2">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Status del Sistema</p>
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full animate-pulse ${config?.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                            <span className="text-xs font-black uppercase italic tracking-tight">{config?.is_active ? "Operational" : "Standby"}</span>
                        </div>
                    </div>
                    <div className="h-10 w-[1px] bg-slate-200" />
                    <div className="px-6 py-2">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Precisión de Cobro</p>
                        <span className="text-xs font-black uppercase italic tracking-tight text-indigo-600">{metrics?.recoveryRate || 0}% Recovery</span>
                    </div>
                </div>
            </div>

            {/* 🎛️ Control Matrix */}
            <Tabs defaultValue="overview" className="space-y-10">
                <div className="flex justify-center">
                    <TabsList className="bg-slate-950/5 p-2 rounded-[2rem] h-auto gap-2 flex-wrap justify-center">
                        <TabsTrigger value="overview" className="rounded-full px-8 py-3 data-[state=active]:bg-slate-900 data-[state=active]:text-white flex gap-3 transition-all">
                            <BarChart3 className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Overview</span>
                        </TabsTrigger>
                        <TabsTrigger value="reports" className="rounded-full px-8 py-3 data-[state=active]:bg-indigo-600 data-[state=active]:text-white flex gap-3 transition-all">
                            <CheckSquare className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Conciliación</span>
                        </TabsTrigger>
                        <TabsTrigger value="config" className="rounded-full px-8 py-3 data-[state=active]:bg-slate-900 data-[state=active]:text-white flex gap-3 transition-all">
                            <Settings2 className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Config</span>
                        </TabsTrigger>
                        <TabsTrigger value="templates" className="rounded-full px-8 py-3 data-[state=active]:bg-slate-900 data-[state=active]:text-white flex gap-3 transition-all">
                            <FileText className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Plantillas</span>
                        </TabsTrigger>
                        <TabsTrigger value="exclusions" className="rounded-full px-8 py-3 data-[state=active]:bg-slate-900 data-[state=active]:text-white flex gap-3 transition-all">
                            <ShieldOff className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">VIP/Exclusiones</span>
                        </TabsTrigger>
                        <TabsTrigger value="activity" className="rounded-full px-8 py-3 data-[state=active]:bg-slate-900 data-[state=active]:text-white flex gap-3 transition-all">
                            <Activity className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Logs</span>
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="overview" className="space-y-10 focus-visible:outline-none outline-none">
                    <PortfolioAgentMetrics metrics={metrics} />

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
                        <div className="xl:col-span-2 space-y-10">
                            <DebtorRiskMatrix riskStats={metrics?.riskStats || []} />

                            <Card className="rounded-[3rem] border-none shadow-premium bg-slate-900 p-12 text-white relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-16 opacity-10 pointer-events-none group-hover:scale-110 transition-transform duration-1000">
                                    <Bot className="h-40 w-40" />
                                </div>
                                <div className="relative z-10 space-y-6">
                                    <h3 className="text-3xl font-black italic uppercase tracking-tighter">Próximo Escaneo Inteligente</h3>
                                    <p className="text-slate-400 text-sm font-medium max-w-md">El agente procesará la cartera automáticamente cada 24 horas. Puedes forzar una sincronización manual desde la configuración.</p>
                                    <div className="flex items-center gap-4">
                                        <div className="px-6 py-2 bg-white/10 rounded-full border border-white/10 backdrop-blur-md">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Próxima Ejecución: Mañana 08:00 AM</span>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </div>
                        <div className="xl:col-span-1 h-full">
                            <PortfolioAgentActivity actions={actions.slice(0, 10)} onRefresh={loadData} />
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="reports" className="focus-visible:outline-none outline-none">
                    <PaymentReportsManager />
                </TabsContent>

                <TabsContent value="config" className="focus-visible:outline-none outline-none">
                    <PortfolioAgentConfig
                        initialConfig={config}
                        onSave={handleSaveConfig}
                        onRunInference={handleRunInference}
                    />
                </TabsContent>

                <TabsContent value="templates" className="focus-visible:outline-none outline-none">
                    <PortfolioAgentTemplates config={config} onUpdate={handleSaveConfig} />
                </TabsContent>

                <TabsContent value="exclusions" className="focus-visible:outline-none outline-none">
                    <PortfolioAgentExclusions />
                </TabsContent>

                <TabsContent value="activity" className="focus-visible:outline-none outline-none">
                    <PortfolioAgentActivity actions={actions} onRefresh={loadData} />
                </TabsContent>
            </Tabs>

            {/* 🔥 Industrial Footer Decoration */}
            <div className="pt-20 border-t border-slate-100 flex flex-col items-center gap-6 opacity-30 select-none pointer-events-none">
                <div className="flex items-center gap-10">
                    <div className="h-[1px] w-20 bg-slate-300" />
                    <Bot className="w-8 h-8 text-slate-300" />
                    <Sparkles className="w-8 h-8 text-indigo-300" />
                    <div className="h-[1px] w-20 bg-slate-300" />
                </div>
                <p className="text-[8px] font-black uppercase tracking-[1em] text-slate-400">BC FABRIC SAS • PORTFOLIO AUTOMATION ENGINE 2026</p>
            </div>
        </div>
    )
}
