import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Textarea } from "@/shared/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs"
import { Mail, Save, RefreshCw, Info, Send } from "lucide-react"
import { collectionTemplates, CollectionTone } from "../templates/collectionTemplates"
import { portfolioAgentService } from "../services/portfolioAgentService"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

interface Props {
    config: any;
    onUpdate: (newConfig: any) => void;
}

export function PortfolioAgentTemplates({ config, onUpdate }: Props) {
    const currentTone = (config?.tone || 'PROFESSIONAL') as CollectionTone
    const [templates, setTemplates] = useState<any>(config?.config_json?.templates || collectionTemplates[currentTone])
    const [activeTab, setActiveTab] = useState("REMINDER_1")

    useEffect(() => {
        if (config?.config_json?.templates) {
            setTemplates(config.config_json.templates)
        } else {
            setTemplates(collectionTemplates[(config?.tone || 'PROFESSIONAL') as CollectionTone])
        }
    }, [config])

    const handleTemplateChange = (type: string, field: string, value: string) => {
        setTemplates((prev: any) => ({
            ...prev,
            [type]: {
                ...prev[type],
                [field]: value
            }
        }))
    }

    const handleSave = () => {
        const newConfig = {
            ...config,
            config_json: {
                ...config.config_json,
                templates
            }
        }
        onUpdate(newConfig)
        toast.success("PLANTILLAS ACTUALIZADAS", {
            description: "El agente usará estos nuevos mensajes en el próximo ciclo."
        })
    }

    const resetToDefault = () => {
        setTemplates(collectionTemplates[(config.tone || 'PROFESSIONAL') as CollectionTone])
        toast.info("Valores restaurados a predeterminados para el tono " + config.tone)
    }

    const handleSendTest = async () => {
        const supabase = createClient()
        try {
            await portfolioAgentService.sendTestEmail(supabase, activeTab, templates)
            toast.success("CORREO DE PRUEBA ENVIADO", {
                description: "Revisa tu bandeja de entrada para verificar el diseño."
            })
        } catch (error) {
            toast.error("ERROR AL ENVIAR PRUEBA")
            console.error(error)
        }
    }

    return (
        <Card className="border-none shadow-premium overflow-hidden bg-white rounded-[2.5rem]">
            <CardHeader className="p-10 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                    <CardTitle className="text-2xl font-black italic tracking-tighter uppercase flex items-center gap-3">
                        <Mail className="w-6 h-6 text-indigo-500" />
                        Scripting de Cobranza
                    </CardTitle>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">
                        Personaliza los protocolos de comunicación por tono
                    </p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <Button variant="outline" size="lg" onClick={handleSendTest} className="rounded-full border-2 border-slate-100 hover:border-indigo-100 transition-all font-black uppercase text-[10px] tracking-widest flex-1 md:flex-none">
                        <Send className="w-4 h-4 mr-2" />
                        Prueba
                    </Button>
                    <Button variant="ghost" size="lg" onClick={resetToDefault} className="rounded-full hover:bg-slate-50 font-black uppercase text-[10px] tracking-widest flex-1 md:flex-none">
                        <RefreshCw className="w-4 h-4 mr-2 text-slate-400" />
                        Reset
                    </Button>
                    <Button size="lg" onClick={handleSave} className="rounded-full bg-slate-900 hover:bg-black text-white shadow-xl font-black uppercase text-[10px] tracking-widest flex-1 md:flex-none">
                        <Save className="w-4 h-4 mr-2" />
                        Guardar
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-10">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-10">
                    <TabsList className="bg-slate-100/50 p-2 rounded-[1.5rem] w-full grid grid-cols-3 h-16 shadow-inner">
                        <TabsTrigger value="REMINDER_1" className="rounded-2xl data-[state=active]:bg-white data-[state=active]:shadow-lg text-[10px] font-black uppercase tracking-widest transition-all">Protocolo Alpha</TabsTrigger>
                        <TabsTrigger value="REMINDER_2" className="rounded-2xl data-[state=active]:bg-white data-[state=active]:shadow-lg text-[10px] font-black uppercase tracking-widest transition-all">Protocolo Beta</TabsTrigger>
                        <TabsTrigger value="FINAL_NOTICE" className="rounded-2xl data-[state=active]:bg-white data-[state=active]:shadow-lg text-[10px] font-black uppercase tracking-widest transition-all">Protocolo Omega</TabsTrigger>
                    </TabsList>

                    {Object.keys(templates).map((key) => (
                        <TabsContent key={key} value={key} className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 outline-none">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Header / Subject</label>
                                <Input
                                    value={templates[key].subject}
                                    onChange={(e) => handleTemplateChange(key, 'subject', e.target.value)}
                                    className="h-16 border-none bg-slate-50/50 rounded-2xl focus-visible:ring-2 focus-visible:ring-indigo-500 font-black italic text-slate-700 text-lg px-6"
                                />
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Main Transmission Body (HTML)</label>
                                <Textarea
                                    value={templates[key].body}
                                    onChange={(e) => handleTemplateChange(key, 'body', e.target.value)}
                                    className="min-h-[400px] border-none bg-slate-50/50 rounded-[2rem] focus-visible:ring-2 focus-visible:ring-indigo-500 font-mono text-sm leading-relaxed p-8 shadow-inner"
                                />
                            </div>

                            <Card className="p-6 bg-indigo-50/50 border-none rounded-3xl flex items-start gap-6">
                                <div className="p-3 bg-white rounded-2xl shadow-sm">
                                    <Info className="w-5 h-5 text-indigo-500" />
                                </div>
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">Inyección de Variables AI</p>
                                    <p className="text-[10px] text-indigo-700 leading-relaxed font-bold italic opacity-80 uppercase tracking-tighter">
                                        Tokens activos: <code className="bg-white/50 px-2 py-0.5 rounded text-indigo-600">{"{name}"}</code>,
                                        <code className="bg-white/50 px-2 py-0.5 rounded text-indigo-600">{"{total}"}</code>,
                                        <code className="bg-white/50 px-2 py-0.5 rounded text-indigo-600">{"{number}"}</code>,
                                        o <code className="bg-white/50 px-2 py-0.5 rounded text-indigo-600">{"{company}"}</code>. El motor los reemplazará durante el ciclo.
                                    </p>
                                </div>
                            </Card>
                        </TabsContent>
                    ))}
                </Tabs>
            </CardContent>
        </Card>
    )
}
