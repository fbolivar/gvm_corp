"use client";

import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Switch } from "@/shared/components/ui/switch";
import { Label } from "@/shared/components/ui/label";
import { Card, CardContent } from "@/shared/components/ui/card";
import { toast } from "sonner";
import { Bell, Mail, Smartphone, ShieldCheck, Box, FileCheck, Save, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { settingsService } from "../services/settingsService";
import { Badge } from "@/shared/components/ui/badge";
import { cn } from "@/shared/lib/utils";

interface Props {
    initialData: any;
}

export function NotificationSettingsForm({ initialData }: Props) {
    const [loading, setLoading] = useState(false);
    const [settings, setSettings] = useState(initialData?.notifications || {});
    const supabase = createClient();

    const categories = [
        {
            id: "operations",
            title: "Operaciones & Inventario",
            description: "Alertas críticas sobre el flujo de trabajo principal.",
            icon: Box,
            color: "text-amber-600",
            bg: "bg-amber-50",
            items: [
                { id: "email_invoices", name: "Nuevas Facturas", desc: "Correo al firmar/recibir un documento.", type: "email" },
                { id: "app_invoices", name: "Alertas en App", desc: "Notificaciones push sobre facturación.", type: "push" },
                { id: "email_low_stock", name: "Stock Bajo (Email)", desc: "Aviso cuando un SKU llegue al nivel crítico.", type: "email" },
                { id: "app_low_stock", name: "Stock Bajo (App)", desc: "Alerta visual en el dashboard principal.", type: "push" }
            ]
        },
        {
            id: "security",
            title: "Seguridad & Acceso",
            description: "Protección proactiva de su cuenta empresarial.",
            icon: ShieldCheck,
            color: "text-rose-600",
            bg: "bg-rose-50",
            items: [
                { id: "email_security", name: "Inicios de Sesión", desc: "Avisar si se accede desde un nuevo dispositivo.", type: "email" },
                { id: "app_security", name: "Alertas de Auditoría", desc: "Notificar cambios en roles o permisos.", type: "push" }
            ]
        }
    ];

    const handleToggle = (id: string) => {
        setSettings((prev: any) => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    async function handleSave() {
        setLoading(true);
        try {
            await settingsService.updateNotificationSettings(supabase, settings);
            toast.success("Preferencias guardadas", {
                description: "Tus ajustes de notificación se han actualizado correctamente."
            });
        } catch (error: any) {
            toast.error("Error al guardar: " + error.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                <div>
                    <h2 className="text-4xl font-black tracking-tighter text-slate-900 italic">Notificaciones</h2>
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Configuración de Alertas y Canales</p>
                </div>
                <Button
                    onClick={handleSave}
                    disabled={loading}
                    className="h-14 px-10 rounded-2xl bg-slate-900 hover:bg-primary text-white font-black shadow-active transition-all active:scale-95 group"
                >
                    {loading ? "GUARDANDO..." : (
                        <span className="flex items-center gap-3">
                            <Save className="h-5 w-5 group-hover:rotate-12 transition-transform" />
                            GUARDAR AJUSTES
                        </span>
                    )}
                </Button>
            </div>

            {/* Main Content */}
            <div className="grid gap-8">
                {categories.map((cat) => (
                    <Card key={cat.id} className="border-none bg-white shadow-premium rounded-[2.5rem] overflow-hidden">
                        <CardContent className="p-0">
                            {/* Category Header */}
                            <div className="p-10 pb-6 flex items-start gap-6 leading-none border-b border-slate-50">
                                <div className={cn("h-16 w-16 rounded-[1.5rem] flex items-center justify-center shrink-0 shadow-sm", cat.bg, cat.color)}>
                                    <cat.icon className="h-8 w-8" />
                                </div>
                                <div className="space-y-1 pt-1">
                                    <h3 className="text-2xl font-black text-slate-900 italic tracking-tight">{cat.title}</h3>
                                    <p className="text-sm font-medium text-slate-400">{cat.description}</p>
                                </div>
                            </div>

                            {/* Options List */}
                            <div className="p-6 md:p-10 space-y-4">
                                {cat.items.map((item) => (
                                    <div
                                        key={item.id}
                                        className={cn(
                                            "flex flex-col sm:flex-row sm:items-center justify-between p-6 rounded-[2rem] transition-all duration-300 border border-transparent",
                                            settings[item.id] ? "bg-slate-900 text-white shadow-xl shadow-slate-200" : "bg-slate-50 hover:bg-slate-100/80"
                                        )}
                                    >
                                        <div className="flex items-start gap-4 flex-1">
                                            <div className={cn(
                                                "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                                                settings[item.id] ? "bg-white/10 text-white" : "bg-white text-slate-400 border border-slate-100 shadow-sm"
                                            )}>
                                                {item.type === "email" ? <Mail className="h-5 w-5" /> : <Smartphone className="h-5 w-5" />}
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <Label className={cn("text-base font-black italic", settings[item.id] ? "text-white" : "text-slate-900")}>
                                                        {item.name}
                                                    </Label>
                                                    <Badge className={cn(
                                                        "text-[8px] font-black border-none rounded-full px-2",
                                                        settings[item.id] ? "bg-primary text-white" : "bg-slate-200 text-slate-500"
                                                    )}>
                                                        {item.type.toUpperCase()}
                                                    </Badge>
                                                </div>
                                                <p className={cn("text-xs font-medium max-w-sm leading-relaxed", settings[item.id] ? "text-slate-400" : "text-slate-400")}>
                                                    {item.desc}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="mt-4 sm:mt-0 flex justify-end">
                                            <Switch
                                                checked={!!settings[item.id]}
                                                onCheckedChange={() => handleToggle(item.id)}
                                                className={cn(
                                                    "data-[state=checked]:bg-primary ring-offset-slate-900",
                                                    settings[item.id] ? "border-white/20" : ""
                                                )}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Info Footer */}
            <Card className="border-none bg-indigo-50/50 border border-indigo-100/50 rounded-[2.5rem] p-10">
                <div className="flex flex-col md:flex-row items-center gap-8">
                    <div className="h-14 w-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-indigo-200">
                        <Sparkles className="h-8 w-8" />
                    </div>
                    <div className="space-y-2 text-center md:text-left">
                        <h4 className="text-lg font-black text-indigo-900 uppercase tracking-tight">Optimización Inteligente</h4>
                        <p className="text-sm font-medium text-indigo-600/80 leading-relaxed">
                            Nuestro motor de notificaciones agrupa alertas similares para evitar saturar su bandeja de entrada.
                            Las notificaciones críticas de seguridad siempre se enviarán independientemente de estos ajustes.
                        </p>
                    </div>
                </div>
            </Card>
        </div>
    );
}
