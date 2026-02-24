"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Switch } from "@/shared/components/ui/switch";
import { Label } from "@/shared/components/ui/label";
import { Button } from "@/shared/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Mail, BarChart3, Users, CalendarCheck, Sparkles, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

interface DigestPreferences {
    enabled: boolean;
    frequency: 'weekly' | 'daily';
    day: string; // 'monday', etc.
    sections: {
        sales: boolean;
        customers: boolean;
        tasks: boolean;
        system: boolean;
    }
}

const DEFAULT_PREFS: DigestPreferences = {
    enabled: true,
    frequency: 'weekly',
    day: 'monday',
    sections: {
        sales: true,
        customers: true,
        tasks: true,
        system: false
    }
};

export function DigestSettingsForm({ initialPrefs }: { initialPrefs?: DigestPreferences }) {
    const [prefs, setPrefs] = useState<DigestPreferences>(initialPrefs || DEFAULT_PREFS);
    const [loading, setLoading] = useState(false);
    const supabase = createClient();

    const handleSave = async () => {
        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({
                data: { digest_preferences: prefs }
            });

            if (error) throw error;
            toast.success("Preferencias de Digest actualizadas", {
                description: "Recibirás tu resumen según la nueva configuración."
            });
        } catch (error) {
            toast.error("Error al guardar preferencias");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-black tracking-tighter text-slate-900 italic">Digest Semanal</h2>
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Tu resumen ejecutivo automático</p>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
                {/* Main Config */}
                <Card className="md:col-span-2 border-none shadow-premium rounded-[2.5rem] overflow-hidden">
                    <CardHeader className="bg-slate-900 text-white p-10 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-10 opacity-10">
                            <Sparkles className="h-40 w-40 text-white" />
                        </div>
                        <div className="relative z-10">
                            <div className="h-12 w-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-sm">
                                <Mail className="h-6 w-6 text-white" />
                            </div>
                            <CardTitle className="text-2xl font-black italic">Configuración de Envío</CardTitle>
                            <CardDescription className="text-slate-300 mt-2 font-medium">
                                Elige cuándo y qué información quieres recibir en tu correo.
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="p-10 space-y-8">

                        <div className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="space-y-1">
                                <Label className="text-base font-bold text-slate-900">Activar Resumen por Correo</Label>
                                <p className="text-xs text-slate-500 font-medium">Recibe un email con métricas clave.</p>
                            </div>
                            <Switch
                                checked={prefs.enabled}
                                onCheckedChange={(c) => setPrefs({ ...prefs, enabled: c })}
                            />
                        </div>

                        <div className="grid md:grid-cols-2 gap-6 opacity-100 transition-opacity" style={{ opacity: prefs.enabled ? 1 : 0.5 }}>
                            <div className="space-y-3">
                                <Label className="text-sm font-bold text-slate-700">Frecuencia</Label>
                                <Select
                                    value={prefs.frequency}
                                    onValueChange={(v: any) => setPrefs({ ...prefs, frequency: v })}
                                    disabled={!prefs.enabled}
                                >
                                    <SelectTrigger className="h-12 rounded-xl bg-white border-slate-200 font-medium">
                                        <SelectValue placeholder="Selecciona..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="weekly">Semanal</SelectItem>
                                        <SelectItem value="daily">Diaria (Moring Brief)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-3">
                                <Label className="text-sm font-bold text-slate-700">Día de envío</Label>
                                <Select
                                    value={prefs.day}
                                    onValueChange={(v) => setPrefs({ ...prefs, day: v })}
                                    disabled={!prefs.enabled || prefs.frequency === 'daily'}
                                >
                                    <SelectTrigger className="h-12 rounded-xl bg-white border-slate-200 font-medium">
                                        <SelectValue placeholder="Selecciona..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="monday">Lunes (Inicio de semana)</SelectItem>
                                        <SelectItem value="friday">Viernes (Cierre de semana)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-slate-100">
                            <Label className="text-sm font-bold text-slate-900 uppercase tracking-widest block mb-4">Contenido del Reporte</Label>

                            <div className="grid gap-4">
                                {[
                                    { key: 'sales', label: 'Resumen de Ventas e Ingresos', icon: BarChart3, desc: 'KPIs financieros y comparativas.' },
                                    { key: 'customers', label: 'Actividad de Clientes', icon: Users, desc: 'Nuevos registros y cuentas clave.' },
                                    { key: 'tasks', label: 'Tareas y Pendientes', icon: CalendarCheck, desc: 'Resumen de productividad del equipo.' },
                                ].map((item) => (
                                    <div key={item.key} className="flex items-center gap-4 p-4 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all group">
                                        <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                            <item.icon className="h-5 w-5" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-bold text-slate-900">{item.label}</p>
                                            <p className="text-xs text-slate-500 font-medium">{item.desc}</p>
                                        </div>
                                        <Switch
                                            checked={(prefs.sections as any)[item.key]}
                                            onCheckedChange={(c) => setPrefs({
                                                ...prefs,
                                                sections: { ...prefs.sections, [item.key]: c }
                                            })}
                                            disabled={!prefs.enabled}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="pt-6 flex justify-end">
                            <Button
                                onClick={handleSave}
                                disabled={loading}
                                className="h-14 px-8 rounded-2xl bg-slate-900 text-white font-bold hover:bg-slate-800 shadow-xl shadow-slate-200 transition-all active:scale-95"
                            >
                                {loading ? "Guardando..." : "Guardar Preferencias"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Preview Card */}
                <div className="space-y-6">
                    <Card className="border-dashed border-2 border-slate-200 shadow-none bg-transparent">
                        <CardHeader>
                            <CardTitle className="text-sm font-black text-slate-400 uppercase tracking-widest text-center">Vista Previa</CardTitle>
                        </CardHeader>
                        <CardContent className="flex justify-center">
                            <div className="w-full max-w-[280px] bg-white rounded-xl shadow-premium p-6 text-[10px] space-y-4 scale-90 origin-top">
                                <div className="h-3 w-20 bg-slate-200 rounded-full mb-6"></div>
                                <div className="space-y-2">
                                    <div className="h-2 w-full bg-slate-100 rounded-full"></div>
                                    <div className="h-2 w-2/3 bg-slate-100 rounded-full"></div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 my-4">
                                    <div className="h-16 bg-indigo-50 rounded-lg"></div>
                                    <div className="h-16 bg-emerald-50 rounded-lg"></div>
                                </div>
                                <div className="space-y-2">
                                    <div className="h-2 w-full bg-slate-100 rounded-full"></div>
                                    <div className="h-2 w-full bg-slate-100 rounded-full"></div>
                                    <div className="h-2 w-1/2 bg-slate-100 rounded-full"></div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="bg-emerald-50 p-6 rounded-[2rem] border border-emerald-100">
                        <div className="flex gap-4">
                            <div className="h-10 w-10 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
                                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                            </div>
                            <div>
                                <h4 className="font-bold text-emerald-900 text-sm">Todo listo</h4>
                                <p className="text-emerald-700 text-xs mt-1 leading-relaxed">
                                    Tu primer digest se enviará el próximo <strong>{prefs.day === 'monday' ? 'Lunes' : 'Viernes'}</strong> a las 08:00 AM.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
