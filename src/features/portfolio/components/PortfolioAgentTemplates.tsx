import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Textarea } from "@/shared/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs"
import { Mail, Save, RefreshCw, Info, Send } from "lucide-react"
import { collectionTemplates } from "../templates/collectionTemplates"
import { portfolioAgentService } from "../services/portfolioAgentService"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

interface Props {
    config: any;
    onUpdate: (newConfig: any) => void;
}

export function PortfolioAgentTemplates({ config, onUpdate }: Props) {
    const [templates, setTemplates] = useState<any>(config?.config_json?.templates || collectionTemplates)
    const [activeTab, setActiveTab] = useState("REMINDER_1")

    useEffect(() => {
        if (config?.config_json?.templates) {
            setTemplates(config.config_json.templates)
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
        setTemplates(collectionTemplates)
        toast.info("Valores restaurados a predeterminados")
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
        <Card className="border-none shadow-premium overflow-hidden bg-white">
            <CardHeader className="p-8 border-b border-slate-100 flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-xl font-black italic tracking-tighter uppercase flex items-center gap-2">
                        <Mail className="w-5 h-5 text-indigo-500" />
                        Personalización de Mensajes
                    </CardTitle>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                        Define el tono y contenido de las comunicaciones automáticas
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleSendTest} className="h-9 px-3 border-slate-200 text-slate-600 hover:bg-slate-50">
                        <Send className="w-4 h-4 mr-2" />
                        Enviar Prueba
                    </Button>
                    <Button variant="ghost" size="sm" onClick={resetToDefault} className="h-9 px-3 text-slate-400 hover:text-slate-600">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Reset
                    </Button>
                    <Button size="sm" onClick={handleSave} className="h-9 px-4 bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200 shadow-lg">
                        <Save className="w-4 h-4 mr-2" />
                        Guardar
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-8">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <TabsList className="bg-slate-100/50 p-1 rounded-xl w-full grid grid-cols-3 h-12">
                        <TabsTrigger value="REMINDER_1" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-[10px] font-black uppercase tracking-widest">Aviso 1</TabsTrigger>
                        <TabsTrigger value="REMINDER_2" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-[10px] font-black uppercase tracking-widest">Aviso 2</TabsTrigger>
                        <TabsTrigger value="FINAL_NOTICE" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-[10px] font-black uppercase tracking-widest">Aviso Final</TabsTrigger>
                    </TabsList>

                    {Object.keys(templates).map((key) => (
                        <TabsContent key={key} value={key} className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Asunto del Email</label>
                                <Input
                                    value={templates[key].subject}
                                    onChange={(e) => handleTemplateChange(key, 'subject', e.target.value)}
                                    className="h-12 border-slate-200 bg-slate-50/30 focus-visible:ring-indigo-500 font-bold text-slate-700"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Cuerpo del Mensaje (HTML compatible)</label>
                                <Textarea
                                    value={templates[key].body}
                                    onChange={(e) => handleTemplateChange(key, 'body', e.target.value)}
                                    className="min-h-[300px] border-slate-200 bg-slate-50/30 focus-visible:ring-indigo-500 font-mono text-sm leading-relaxed p-6"
                                />
                            </div>

                            <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl flex items-start gap-4">
                                <Info className="w-5 h-5 text-indigo-500 mt-0.5" />
                                <div className="space-y-1">
                                    <p className="text-xs font-bold text-indigo-900 uppercase">Variables Disponibles</p>
                                    <p className="text-[10px] text-indigo-700 leading-relaxed italic">
                                        Utiliza etiquetas como <code className="bg-white px-1 py-0.5 rounded text-indigo-600 font-black">{`{name}`}</code>,
                                        <code className="bg-white px-1 py-0.5 rounded text-indigo-600 font-black">{`{total}`}</code>,
                                        <code className="bg-white px-1 py-0.5 rounded text-indigo-600 font-black">{`{number}`}</code>,
                                        o <code className="bg-white px-1 py-0.5 rounded text-indigo-600 font-black">{`{company}`}</code> para dinamizar el contenido.
                                    </p>
                                </div>
                            </div>
                        </TabsContent>
                    ))}
                </Tabs>
            </CardContent>
        </Card>
    )
}
