"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Switch } from "@/shared/components/ui/switch"
import { Label } from "@/shared/components/ui/label"
import { Input } from "@/shared/components/ui/input"
import { Button } from "@/shared/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"
import { Brain, ShieldCheck, Clock, Bell, Settings2, Sparkles, Save, Play, MessageSquareQuote, Smartphone, MessageCircle } from "lucide-react"
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
        auto_escalate_days: 90,
        tone: 'PROFESSIONAL',
        whatsapp_active: false,
        whatsapp_phone: '',
        sms_active: false
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
                "relative overflow-hidden transition-all duration-500 rounded-[3rem] border-none shadow-premium",
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
                            "p-5 rounded-[1.5rem] transition-all duration-500 shadow-lg",
                            config.is_active ? "bg-slate-900 text-white rotate-12 scale-110" : "bg-slate-100 text-slate-400"
                        )}>
                            <Brain className="w-10 h-10" />
                        </div>
                        <div>
                            <CardTitle className="text-3xl font-black italic tracking-tighter uppercase">Portfolio IQ Agent</CardTitle>
                            <CardDescription className="text-lg font-bold text-slate-400 uppercase tracking-widest italic mt-1">
                                El Cerebro Autónomo de Cobranza
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-10 pt-0 flex items-center justify-between">
                    <div className="space-y-2">
                        <Label htmlFor="agent-status" className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] italic">
                            {config.is_active ? "AGENT ACTIVE & WATCHING" : "AGENT STANDBY"}
                        </Label>
                        <p className="text-slate-400 text-sm font-medium italic">
                            {config.is_active
                                ? "El agente está monitorizando facturas y ejecutando acciones autónomas."
                                : "El agente no ejecutará acciones hasta que lo actives manualmente."}
                        </p>
                    </div>
                    <Switch
                        id="agent-status"
                        checked={config.is_active}
                        onCheckedChange={(checked) => setConfig({ ...config, is_active: checked })}
                        className="scale-150 data-[state=checked]:bg-slate-900"
                    />
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* Reglas de Tiempo */}
                <Card className="hover:shadow-2xl transition-all duration-500 border-none group bg-white rounded-[2.5rem]">
                    <CardHeader className="p-10 text-center md:text-left">
                        <div className="flex items-center gap-4 justify-center md:justify-start">
                            <Clock className="w-6 h-6 text-indigo-500 group-hover:rotate-45 transition-transform" />
                            <CardTitle className="text-xs font-black uppercase tracking-[0.3em] text-slate-900 italic">Cronograma Bot</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="p-10 pt-0 space-y-8">
                        <div className="space-y-4">
                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Días de Gracia</Label>
                            <Input
                                type="number"
                                value={config.grace_days}
                                onChange={(e) => setConfig({ ...config, grace_days: parseInt(e.target.value) })}
                                className="bg-slate-50 border-none rounded-2xl h-14 text-lg font-black italic focus-visible:ring-indigo-500"
                            />
                            <p className="text-[10px] text-slate-400 italic font-bold uppercase tracking-tighter">Delay inicial antes del protocolo de contacto.</p>
                        </div>
                        <div className="space-y-4">
                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Frecuencia de Re-Aviso</Label>
                            <Input
                                type="number"
                                value={config.reminder_frequency_days}
                                onChange={(e) => setConfig({ ...config, reminder_frequency_days: parseInt(e.target.value) })}
                                className="bg-slate-50 border-none rounded-2xl h-14 text-lg font-black italic focus-visible:ring-indigo-500"
                            />
                            <p className="text-[10px] text-slate-400 italic font-bold uppercase tracking-tighter">Ciclo de reincidencia para deudores activos.</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Umbrales y Tono */}
                <Card className="hover:shadow-2xl transition-all duration-500 border-none group bg-white rounded-[2.5rem]">
                    <CardHeader className="p-10 text-center md:text-left">
                        <div className="flex items-center gap-4 justify-center md:justify-start">
                            <MessageSquareQuote className="w-6 h-6 text-emerald-500 group-hover:scale-125 transition-transform" />
                            <CardTitle className="text-xs font-black uppercase tracking-[0.3em] text-slate-900 italic">Personalidad & IA</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="p-10 pt-0 space-y-8">
                        <div className="space-y-4">
                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Tono de Comunicación</Label>
                            <Select
                                value={config.tone || 'PROFESSIONAL'}
                                onValueChange={(val) => setConfig({ ...config, tone: val })}
                            >
                                <SelectTrigger className="bg-slate-50 border-none rounded-2xl h-14 text-lg font-black italic focus:ring-indigo-500">
                                    <SelectValue placeholder="Seleccionar tono" />
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl border-none shadow-premium bg-white">
                                    <SelectItem value="PROFESSIONAL" className="font-bold py-3 uppercase text-[10px] tracking-widest">PROFESIONAL (Estándar)</SelectItem>
                                    <SelectItem value="FRIENDLY" className="font-bold py-3 uppercase text-[10px] tracking-widest">AMIGABLE (Cercano)</SelectItem>
                                    <SelectItem value="FIRM" className="font-bold py-3 uppercase text-[10px] tracking-widest">FIRME (Directo)</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-[10px] text-slate-400 italic font-bold uppercase tracking-tighter">Define el "temperamento" del agente en sus mensajes.</p>
                        </div>
                        <div className="space-y-4">
                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Monto Mínimo de Acción (COP)</Label>
                            <Input
                                type="number"
                                value={config.min_amount_threshold}
                                onChange={(e) => setConfig({ ...config, min_amount_threshold: parseFloat(e.target.value) })}
                                className="bg-slate-50 border-none rounded-2xl h-14 text-lg font-black italic focus-visible:ring-indigo-500"
                            />
                            <p className="text-[10px] text-slate-400 italic font-bold uppercase tracking-tighter">Se ignorarán facturas por debajo de este umbral de ruido.</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Multicanal */}
                <Card className="hover:shadow-2xl transition-all duration-500 border-none group bg-white rounded-[2.5rem] lg:col-span-2">
                    <CardHeader className="p-10 text-center md:text-left">
                        <div className="flex items-center gap-4 justify-center md:justify-start">
                            <Smartphone className="w-6 h-6 text-indigo-500 group-hover:scale-125 transition-transform" />
                            <CardTitle className="text-xs font-black uppercase tracking-[0.3em] text-slate-900 italic">Expansión Multicanal</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="p-10 pt-0 grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6 bg-slate-50 p-6 rounded-3xl">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <Label className="text-sm font-black italic uppercase text-slate-800 flex items-center gap-2">
                                        <MessageCircle className="w-4 h-4 text-emerald-500" /> WhatsApp Bot
                                    </Label>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Protocolo de Chat Rápido</p>
                                </div>
                                <Switch
                                    checked={config.whatsapp_active}
                                    onCheckedChange={(val) => setConfig({ ...config, whatsapp_active: val })}
                                    className="data-[state=checked]:bg-emerald-500"
                                />
                            </div>
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Número Origen (Gateway)</Label>
                                <Input
                                    placeholder="+57 300 000 0000"
                                    value={config.whatsapp_phone}
                                    onChange={(e) => setConfig({ ...config, whatsapp_phone: e.target.value })}
                                    disabled={!config.whatsapp_active}
                                    className="bg-white border-none rounded-2xl h-14 text-sm font-black italic focus-visible:ring-emerald-500 disabled:opacity-50"
                                />
                            </div>
                        </div>

                        <div className="space-y-6 bg-slate-50 p-6 rounded-3xl">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <Label className="text-sm font-black italic uppercase text-slate-800 flex items-center gap-2">
                                        <Smartphone className="w-4 h-4 text-indigo-500" /> Mensajería SMS
                                    </Label>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Protocolo de Red Móvil</p>
                                </div>
                                <Switch
                                    checked={config.sms_active}
                                    onCheckedChange={(val) => setConfig({ ...config, sms_active: val })}
                                    className="data-[state=checked]:bg-indigo-500"
                                />
                            </div>
                            <div className="mt-4 p-4 bg-indigo-500/10 rounded-2xl flex gap-3 opacity-60">
                                <ShieldCheck className="w-5 h-5 text-indigo-500 shrink-0" />
                                <p className="text-[10px] font-black uppercase text-indigo-700 tracking-tight">Requiere integración Twilio habilitada en variables de entorno.</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center gap-6 p-4">
                <Button
                    variant="outline"
                    onClick={onRunInference}
                    className="h-20 px-12 rounded-full border-2 border-slate-900 text-slate-900 font-black uppercase tracking-[0.2em] italic flex gap-4 hover:bg-slate-900 hover:text-white transition-all shadow-xl w-full sm:w-auto"
                >
                    <Play className="w-6 h-6 fill-current" />
                    Ejecutar Ciclo de Cobro
                </Button>

                <Button
                    onClick={handleSave}
                    disabled={loading}
                    className="h-20 px-16 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-[0.3em] italic shadow-2xl flex gap-4 transition-all hover:scale-105 active:scale-95 w-full sm:w-auto"
                >
                    {loading ? "CONFIGURING..." : (
                        <>
                            <Save className="w-6 h-6" />
                            SAVE MASTER PROTOCOL
                        </>
                    )}
                </Button>
            </div>
        </div>
    )
}
