"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { toast } from "sonner";
import { ShieldCheck, Lock, Smartphone, RefreshCcw, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const securitySchema = z.object({
    current_password: z.string().min(6, "Mínimo 6 caracteres"),
    new_password: z.string().min(6, "Mínimo 6 caracteres"),
    confirm_password: z.string().min(6, "Mínimo 6 caracteres")
}).refine((data) => data.new_password === data.confirm_password, {
    message: "Las contraseñas no coinciden",
    path: ["confirm_password"]
});

type SecurityFormValues = z.infer<typeof securitySchema>;

export function SecuritySettingsForm() {
    const [loading, setLoading] = useState(false);
    const supabase = createClient();

    const form = useForm<SecurityFormValues>({
        resolver: zodResolver(securitySchema)
    });

    async function onSubmit(data: SecurityFormValues) {
        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({
                password: data.new_password
            });
            if (error) throw error;
            toast.success("Contraseña actualizada correctamente");
            form.reset();
        } catch (error: any) {
            toast.error("Error al actualizar: " + error.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 px-4 md:px-0">
            <div>
                <h2 className="text-3xl md:text-4xl font-black tracking-tighter text-slate-900 italic leading-none">Seguridad & Acceso</h2>
                <p className="text-slate-400 font-bold text-[10px] md:text-xs uppercase tracking-widest mt-1">Protección de Cuenta y Verificación</p>
            </div>

            <div className="grid gap-8 lg:grid-cols-12">
                <div className="lg:col-span-7">
                    <Card className="border-none bg-white shadow-premium rounded-[3rem] overflow-hidden">
                        <CardHeader className="p-8 md:p-10 pb-4">
                            <CardTitle className="text-lg md:text-xl font-black text-slate-900 flex items-center gap-3 italic">
                                <Lock className="h-6 w-6 text-primary" />
                                Cambiar Contraseña
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 md:p-10 pt-0 space-y-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Contraseña Actual</Label>
                                <Input
                                    {...form.register("current_password")}
                                    type="password"
                                    className="h-14 bg-slate-50 border-none rounded-2xl font-bold"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nueva Contraseña</Label>
                                <Input
                                    {...form.register("new_password")}
                                    type="password"
                                    className="h-14 bg-slate-50 border-none rounded-2xl font-bold"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Confirmar Nueva Contraseña</Label>
                                <Input
                                    {...form.register("confirm_password")}
                                    type="password"
                                    className="h-14 bg-slate-50 border-none rounded-2xl font-bold"
                                />
                                {form.formState.errors.confirm_password && (
                                    <p className="text-[10px] font-bold text-rose-500">{form.formState.errors.confirm_password.message}</p>
                                )}
                            </div>
                            <Button
                                onClick={form.handleSubmit(onSubmit)}
                                disabled={loading}
                                className="w-full h-14 rounded-2xl bg-slate-900 hover:bg-primary text-white font-black shadow-active transition-all active:scale-95 mt-4"
                            >
                                {loading ? "Actualizando..." : "ACTUALIZAR CONTRASEÑA"}
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-5 space-y-8">
                    <Card className="border-none bg-slate-900 text-white rounded-[2.5rem] md:rounded-[3rem] p-8 md:p-10 overflow-hidden relative group">
                        <Smartphone className="absolute -bottom-6 -right-6 h-32 w-32 text-white/5 rotate-12 transition-transform group-hover:scale-110" />
                        <div className="relative z-10 space-y-4">
                            <div className="flex items-center gap-3">
                                <ShieldCheck className="h-5 w-5 text-emerald-400" />
                                <span className="text-[10px] font-black uppercase tracking-widest leading-none">2FA ACTIVO</span>
                            </div>
                            <h4 className="text-xl font-black italic tracking-tighter">Autenticación de Dos Factores</h4>
                            <p className="text-xs font-medium text-slate-400 leading-relaxed">
                                Tu cuenta está protegida con verificación por SMS/Authenticator. Esto añade una capa extra de seguridad proactiva.
                            </p>
                            <Button variant="outline" className="h-10 px-4 rounded-xl border-white/10 bg-white/5 text-white font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all active:scale-95">
                                GESTIONAR 2FA
                            </Button>
                        </div>
                    </Card>

                    <Card className="border-none bg-white shadow-premium rounded-[2.5rem] md:rounded-[3rem] p-8 md:p-10">
                        <div className="space-y-6">
                            <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-sm">
                                <RefreshCcw className="h-6 w-6" />
                            </div>
                            <div>
                                <h4 className="text-lg font-black text-slate-900 italic tracking-tight uppercase tracking-tight">Sesiones Activas</h4>
                                <p className="text-[11px] md:text-xs font-medium text-slate-400 mt-1 leading-relaxed">
                                    Actualmente tienes 2 sesiones activas en diferentes dispositivos.
                                </p>
                            </div>
                            <Button variant="ghost" className="w-full text-rose-500 font-black text-[10px] uppercase tracking-widest hover:bg-rose-50 rounded-xl py-6">
                                Cerrar todas las sesiones
                            </Button>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
