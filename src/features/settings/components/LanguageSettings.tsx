"use client"

import { useLanguageStore } from "@/shared/stores/useLanguageStore"
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Label } from "@/shared/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"
import { toast } from "sonner"
import { Check, Languages } from "lucide-react"
import { cn } from "@/shared/lib/utils"

export function LanguageSettings() {
    const { language, setLanguage } = useLanguageStore()

    const handleSave = () => {
        toast.success(language === 'es' ? "Preferencias actualizadas" : "Preferences updated", {
            description: language === 'es' ? "El idioma ha sido cambiado correctamente." : "Language has been changed successfully."
        })
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div>
                <h2 className="text-3xl font-black tracking-tighter text-slate-900 italic">
                    {language === 'es' ? 'Preferencias de Idioma' : 'Language Preferences'}
                </h2>
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">
                    {language === 'es' ? 'Personaliza tu experiencia en GVM' : 'Customize your GVM experience'}
                </p>
            </div>

            <Card className="border-none shadow-premium rounded-[2rem] overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-sm">
                            <Languages className="h-6 w-6" />
                        </div>
                        <div>
                            <CardTitle className="text-xl font-bold text-slate-900">
                                {language === 'es' ? 'Idioma y Región' : 'Language & Region'}
                            </CardTitle>
                            <CardDescription className="font-medium text-slate-400">
                                {language === 'es'
                                    ? 'Selecciona el idioma de la interfaz y tu formato regional.'
                                    : 'Select the interface language and your regional format.'}
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                    <div className="grid gap-8 lg:grid-cols-2">
                        <div className="space-y-4">
                            <Label className="text-sm font-bold text-slate-700">
                                {language === 'es' ? 'Idioma de la Interfaz' : 'Interface Language'}
                            </Label>
                            <div className="grid gap-4">
                                <div
                                    className={cn(
                                        "cursor-pointer relative flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-300",
                                        language === "es" ? "border-blue-500 bg-blue-50/50 ring-4 ring-blue-500/10" : "border-slate-100 hover:border-slate-200 hover:bg-slate-50"
                                    )}
                                    onClick={() => setLanguage("es")}
                                >
                                    <div className="h-10 w-10 overflow-hidden rounded-full border border-slate-200 bg-white">
                                        <img src="https://flagcdn.com/co.svg" alt="Español" className="h-full w-full object-cover" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-bold text-slate-900">Español (Latam)</p>
                                        <p className="text-xs font-semibold text-slate-400">
                                            {language === 'es' ? 'Recomendado' : 'Recommended'}
                                        </p>
                                    </div>
                                    {language === "es" && (
                                        <div className="h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center text-white">
                                            <Check className="h-3 w-3" />
                                        </div>
                                    )}
                                </div>

                                <div
                                    className={cn(
                                        "cursor-pointer relative flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-300",
                                        language === "en" ? "border-blue-500 bg-blue-50/50 ring-4 ring-blue-500/10" : "border-slate-100 hover:border-slate-200 hover:bg-slate-50"
                                    )}
                                    onClick={() => setLanguage("en")}
                                >
                                    <div className="h-10 w-10 overflow-hidden rounded-full border border-slate-200 bg-white">
                                        <img src="https://flagcdn.com/us.svg" alt="English" className="h-full w-full object-cover" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-bold text-slate-900">English (US)</p>
                                        <p className="text-xs font-semibold text-slate-400">Beta</p>
                                    </div>
                                    {language === "en" && (
                                        <div className="h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center text-white">
                                            <Check className="h-3 w-3" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <Label className="text-sm font-bold text-slate-700">
                                {language === 'es' ? 'Zona Horaria' : 'Time Zone'}
                            </Label>
                            <Select defaultValue="bogota">
                                <SelectTrigger className="h-12 border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-offset-0 focus:ring-blue-500/20">
                                    <SelectValue placeholder={language === 'es' ? "Selecciona tu zona horaria" : "Select your time zone"} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="bogota">(GMT-05:00) Bogotá, Lima, Quito</SelectItem>
                                    <SelectItem value="mexico">(GMT-06:00) Ciudad de México</SelectItem>
                                    <SelectItem value="eastern">(GMT-05:00) Eastern Time (US & Canada)</SelectItem>
                                    <SelectItem value="pacific">(GMT-08:00) Pacific Time (US & Canada)</SelectItem>
                                    <SelectItem value="madrid">(GMT+01:00) Madrid, Paris</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-[10px] font-bold text-slate-400 leading-relaxed max-w-xs">
                                {language === 'es'
                                    ? 'Los horarios de eventos, notificaciones y reportes se generarán basados en esta zona horaria.'
                                    : 'Event times, notifications, and reports will be generated based on this time zone.'}
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-slate-100">
                        <Button
                            size="lg"
                            className="bg-slate-900 text-white hover:bg-slate-800 rounded-xl font-bold shadow-lg shadow-slate-900/20 px-8"
                            onClick={handleSave}
                        >
                            {language === 'es' ? 'Guardar Preferencias' : 'Save Preferences'}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
