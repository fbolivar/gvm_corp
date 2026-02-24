"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Switch } from "@/shared/components/ui/switch"
import { Label } from "@/shared/components/ui/label"
import { Input } from "@/shared/components/ui/input"
import { Button } from "@/shared/components/ui/button"
import { Brain, ShieldCheck, Clock, Bell, Settings2, Sparkles, Save, Play } from "lucide-react"
import { cn } from "@/shared/lib/utils"

interface Props {
    initialConfig?: any;
    onSave: (config: any) => Promise<void>;
    onRunInference?: () => Promise<void>;
}

export function PortfolioAgentConfig({ initialConfig, onSave, onRunInference }: Props) {
    const [config, setConfig] = useState(initialConfig || {
        is_active: false,
        grace_days: 3,
        min_amount_threshold: 50000,
        reminder_frequency_days: 7,
        auto_escalate_days: 90
    });
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        setLoading(true);
        try {
            await onSave(config);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="space-y-10 max-w-4xl mx-auto">
            {/* Header con Estado del Agente */}
            <Card className={cn(
                "relative overflow-hidden transition-all duration-500",
                config.is_active ? "ring-2 ring-indigo-500/20 bg-indigo-50/50" : "bg-white"
            )}>
                <div className="absolute top-0 right-0 p-8">
                    <div className={cn(
                        "w-3 h-3 rounded-full animate-pulse",
                        config.is_active ? "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]" : "bg-slate-300"
                    )} />
                </div>

                <CardHeader className="p-10">
                    <div className="flex items-center gap-6">
                        <div className={cn(
                            "p-5 rounded-[1.5rem] transition-all duration-500",
                            config.is_active ? "bg-indigo-600 text-white rotate-12 scale-110" : "bg-slate-100 text-slate-400"
                        )}>
                            <Brain className="w-10 h-10" />
                        </div>
                        <div>
                            <CardTitle className="text-3xl font-black italic tracking-tight uppercase">Portfolio IQ Agent</CardTitle>
                            <CardDescription className="text-lg font-bold text-slate-400 uppercase tracking-widest italic mt-1">
                                El Cerebro Autónomo de Cobranza
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-10 pt-0 flex items-center justify-between">
                    <div className="space-y-2">
                        <Label htmlFor="agent-status" className="text-sm font-black uppercase text-slate-500 tracking-wider italic">
                            {config.is_active ? "AGENT ACTIVE & WATCHING" : "AGENT STANDBY"}
                        </Label>
                        <p className="text-slate-400 text-sm font-medium">
                            {config.is_active
                                ? "El agente está monitorizando facturas y ejecutando acciones."
                                : "El agente no ejecutará acciones hasta que lo actives."}
                        </p>
                    </div>
                    <Switch
                        id="agent-status"
                        checked={config.is_active}
                        onCheckedChange={(checked) => setConfig({ ...config, is_active: checked })}
                        className="scale-150"
                    />
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* Reglas de Tiempo */}
                <Card className="hover:shadow-2xl transition-all duration-500 border-none group">
                    <CardHeader className="p-10">
                        <div className="flex items-center gap-4">
                            <Clock className="w-6 h-6 text-indigo-500 group-hover:rotate-45 transition-transform" />
                            <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-900 italic">Gestión de Tiempos</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="p-10 pt-0 space-y-8">
                        <div className="space-y-4">
                            <Label className="text-xs font-black uppercase text-slate-400 tracking-wider">Días de Gracia</Label>
                            <Input
                                type="number"
                                value={config.grace_days}
                                onChange={(e) => setConfig({ ...config, grace_days: parseInt(e.target.value) })}
                                className="bg-slate-50 border-none rounded-2xl h-14 text-lg font-black italic"
                            />
                            <p className="text-xs text-slate-400">Espera estos días después del vencimiento antes del primer aviso.</p>
                        </div>
                        <div className="space-y-4">
                            <Label className="text-xs font-black uppercase text-slate-400 tracking-wider">Frecuencia de Re-Aviso</Label>
                            <Input
                                type="number"
                                value={config.reminder_frequency_days}
                                onChange={(e) => setConfig({ ...config, reminder_frequency_days: parseInt(e.target.value) })}
                                className="bg-slate-50 border-none rounded-2xl h-14 text-lg font-black italic"
                            />
                            <p className="text-xs text-slate-400">Días entre cada seguimiento consecutivo.</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Umbrales y Escalamiento */}
                <Card className="hover:shadow-2xl transition-all duration-500 border-none group">
                    <CardHeader className="p-10">
                        <div className="flex items-center gap-4">
                            <ShieldCheck className="w-6 h-6 text-emerald-500 group-hover:scale-125 transition-transform" />
                            <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-900 italic">Umbrales & Seguridad</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="p-10 pt-0 space-y-8">
                        <div className="space-y-4">
                            <Label className="text-xs font-black uppercase text-slate-400 tracking-wider">Monto Mínimo de Acción (COP)</Label>
                            <Input
                                type="number"
                                value={config.min_amount_threshold}
                                onChange={(e) => setConfig({ ...config, min_amount_threshold: parseFloat(e.target.value) })}
                                className="bg-slate-50 border-none rounded-2xl h-14 text-lg font-black italic"
                            />
                            <p className="text-xs text-slate-400">El agente ignorará facturas por debajo de este monto.</p>
                        </div>
                        <div className="space-y-4">
                            <Label className="text-xs font-black uppercase text-slate-400 tracking-wider">Auto-Escalamiento Detracción (Días)</Label>
                            <Input
                                type="number"
                                value={config.auto_escalate_days}
                                onChange={(e) => setConfig({ ...config, auto_escalate_days: parseInt(e.target.value) })}
                                className="bg-slate-50 border-none rounded-2xl h-14 text-lg font-black italic"
                            />
                            <p className="text-xs text-slate-400">Días después de los cuales el caso se marca como 'Crítico'.</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="flex justify-between items-center p-4">
                <Button
                    variant="outline"
                    onClick={onRunInference}
                    className="h-16 px-10 rounded-full border-2 border-indigo-500 text-indigo-600 font-black uppercase tracking-widest italic flex gap-4 hover:bg-indigo-50 transition-all"
                >
                    <Play className="w-5 h-5 fill-current" />
                    Ejecutar Ciclo de Cobro
                </Button>

                <Button
                    onClick={handleSave}
                    disabled={loading}
                    className="h-16 px-12 rounded-full bg-slate-900 hover:bg-black text-white font-black uppercase tracking-[0.2em] italic shadow-2xl flex gap-4 transition-all hover:scale-105 active:scale-95"
                >
                    {loading ? "SAVING..." : (
                        <>
                            <Save className="w-6 h-6" />
                            SAVE AGENT SETTINGS
                        </>
                    )}
                </Button>
            </div>
        </div>
    )
}
