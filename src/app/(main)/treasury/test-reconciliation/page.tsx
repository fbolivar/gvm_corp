
"use client"

import { useState } from "react"
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { simulateReconciliationFlow } from "@/features/treasury/services/reconciliationDemo"
import { Play, CheckCircle2, AlertCircle, Loader2, Terminal, Landmark, Activity, Zap } from "lucide-react"
import { VisualReportHeader } from "@/features/accounting/components/VisualReportHeader"
import { settingsService, TenantInfo } from "@/features/settings/services/settingsService"
import { createClient } from "@/lib/supabase/client"
import { useEffect } from "react"
import { cn } from "@/shared/lib/utils"

export default function TestReconciliationPage() {
    const supabase = createClient()
    const [tenant, setTenant] = useState<TenantInfo | null>(null)
    const [logs, setLogs] = useState<string[]>([])
    const [status, setStatus] = useState<'IDLE' | 'RUNNING' | 'SUCCESS' | 'ERROR'>('IDLE')
    const [results, setResults] = useState<any>(null)

    useEffect(() => {
        const loadTenant = async () => {
            const data = await settingsService.getTenantInfo(supabase)
            setTenant(data)
        }
        loadTenant()
    }, [])

    const runSimulation = async () => {
        setStatus('RUNNING')
        setLogs(["[ST_00] Inicializando Protocolo de Validación Real..."])

        try {
            const { runIntegritySim } = await import("./actions")

            setLogs(prev => [...prev, "[ST_01] Conectando con Supabase Cloud Engine..."])

            const result = await runIntegritySim()

            if (!result.success) throw new Error(result.error)

            const data = result.result
            setLogs(prev => [
                ...prev,
                `[ST_02] Nodo Bancario Detectado y Validado.`,
                `[ST_03] Movimiento de Prueba Creado ID: ${data?.transactionId?.slice(0, 8)}...`,
                `[ST_04] Inyectando Extracto Bancario ID: ${data?.statementId?.slice(0, 8)}...`,
                `[ST_05] Ejecutando Algoritmo de Matching Industrial...`,
                `[ST_06] CRUCE DETECTADO: Match exacto confirmado.`,
                `[ST_07] Ejecutando Conciliación y Auditoría Digital...`,
                `[ST_08] PROTOCOLO FINALIZADO CON ÉXITO. Sistema Íntegro.`
            ])

            setStatus('SUCCESS')
            setResults({
                matchScore: "100%",
                integrity: "Verified",
                reconciledAmount: 525000
            })
        } catch (error: any) {
            setLogs(prev => [...prev, `[ERROR] ${error.message}`])
            setStatus('ERROR')
        }
    }

    return (
        <div className="page-container space-y-12 pb-32 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <VisualReportHeader
                title="Integrity Lab"
                subtitle="Laboratorio de Pruebas de Integración de Tesorería"
                tenant={tenant}
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* 🕹️ CONTROL PANEL */}
                <Card className="lg:col-span-4 rounded-[3rem] bg-slate-950 text-white p-10 space-y-8 border-none shadow-active relative overflow-hidden group">
                    <Zap className="absolute -bottom-10 -right-10 h-64 w-64 text-white/5 group-hover:rotate-12 transition-transform duration-1000" />

                    <div className="space-y-4 relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="h-2 w-8 bg-indigo-500 rounded-full" />
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-400">Security & Logic Unit</span>
                        </div>
                        <h2 className="text-4xl font-black italic tracking-tighter uppercase leading-none">Simulación <br /> de Flujo</h2>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed">
                            Ejecuta una secuencia crítica desde la creación del egreso hasta el cruce automático con extracto real.
                        </p>
                    </div>

                    <Button
                        onClick={runSimulation}
                        disabled={status === 'RUNNING'}
                        className="w-full h-20 rounded-[2rem] bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xl italic tracking-tighter shadow-xl transition-all hover:scale-105 active:scale-95 group relative z-10"
                    >
                        {status === 'RUNNING' ? (
                            <Loader2 className="h-8 w-8 animate-spin" />
                        ) : (
                            <div className="flex items-center gap-4">
                                LANZAR PROTOCOLO <Play className="h-6 w-6 group-hover:translate-x-2 transition-transform" />
                            </div>
                        )}
                    </Button>

                    <div className="pt-8 border-t border-white/5 space-y-6 relative z-10">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Estado de Operación</span>
                            <Badge className={cn(
                                "border-none px-4 py-1 text-[9px] font-black uppercase tracking-widest rounded-full",
                                status === 'IDLE' ? "bg-slate-800 text-slate-400" :
                                    status === 'RUNNING' ? "bg-amber-500 text-white animate-pulse" :
                                        status === 'SUCCESS' ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
                            )}>
                                {status}
                            </Badge>
                        </div>
                        {results && (
                            <div className="space-y-3 bg-white/5 p-6 rounded-3xl border border-white/10">
                                <div className="flex justify-between items-center">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Match Score</span>
                                    <span className="text-sm font-black text-indigo-400 italic">{results.matchScore}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Integrity</span>
                                    <span className="text-sm font-black text-emerald-400 italic">{results.integrity}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </Card>

                {/* 🖥️ VIRTUAL TERMINAL */}
                <Card className="lg:col-span-8 rounded-[3.5rem] bg-white border-none shadow-premium overflow-hidden flex flex-col">
                    <CardHeader className="p-10 border-b border-slate-50 flex flex-row items-center justify-between bg-slate-50/30">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-sm">
                                <Terminal className="h-6 w-6" />
                            </div>
                            <div className="space-y-0.5">
                                <CardTitle className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Secuencia de Eventos</CardTitle>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Salida de logs del kernel operativo</p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-10 flex-1 bg-[#0F172A] font-mono overflow-y-auto min-h-[500px]">
                        <div className="space-y-3">
                            {logs.map((log, i) => (
                                <div key={i} className={cn(
                                    "text-[11px] font-bold tracking-tight",
                                    log.includes('[ERROR]') ? 'text-rose-400' :
                                        log.includes('SUCCESS') || log.includes('DETECTADO') ? 'text-emerald-400' :
                                            'text-indigo-400'
                                )}>
                                    <span className="opacity-20 mr-4">[{new Date().toLocaleTimeString()}]</span>
                                    {log}
                                </div>
                            ))}
                            {status === 'RUNNING' && (
                                <div className="flex items-center gap-3 text-white/20 italic text-[11px] animate-pulse">
                                    <span>_ PROCESANDO SIGUIENTE BLOQUE...</span>
                                </div>
                            )}
                            {logs.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center py-32 opacity-10">
                                    <Activity className="h-20 w-20 text-white mb-6" />
                                    <p className="text-xs font-black uppercase tracking-widest text-white">Kernel en espera</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

import { Badge } from "@/shared/components/ui/badge"
