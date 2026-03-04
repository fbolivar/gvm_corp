"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { toast } from "sonner";
import { User, Save, Camera, Mail, ShieldCheck, BadgeCheck, Lock, Eye, EyeOff, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { settingsService } from "../services/settingsService";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";

const profileSchema = z.object({
    full_name: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
    email: z.string().email("Email no editable aquí")
});

const passwordSchema = z.object({
    new_password: z.string().min(8, "Mínimo 8 caracteres"),
    confirm_password: z.string().min(8, "Mínimo 8 caracteres"),
}).refine(d => d.new_password === d.confirm_password, {
    message: "Las contraseñas no coinciden",
    path: ["confirm_password"],
});

type ProfileFormValues = z.infer<typeof profileSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

interface Props {
    initialData: any;
}

export function ProfileSettingsForm({ initialData }: Props) {
    const [loading, setLoading] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState(initialData?.avatar_url || "");
    const [uploading, setUploading] = useState(false);
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [savingPassword, setSavingPassword] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);
    const supabase = createClient();

    const form = useForm<ProfileFormValues>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            full_name: initialData?.full_name || "",
            email: initialData?.email || ""
        }
    });

    const pwForm = useForm<PasswordFormValues>({
        resolver: zodResolver(passwordSchema),
        defaultValues: { new_password: "", confirm_password: "" }
    });

    async function onSubmit(data: ProfileFormValues) {
        setLoading(true);
        try {
            await settingsService.updateUserProfile(supabase, { full_name: data.full_name });
            toast.success("Perfil actualizado correctamente");
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : "Error desconocido";
            toast.error("Error al actualizar: " + msg);
        } finally {
            setLoading(false);
        }
    }

    async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file || !initialData?.id) return;

        if (file.size > 2 * 1024 * 1024) {
            toast.error("La imagen no debe superar 2 MB");
            return;
        }

        setUploading(true);
        try {
            const url = await settingsService.uploadAvatar(supabase, initialData.id, file);
            setAvatarUrl(url);
            toast.success("Foto de perfil actualizada");
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : "Error desconocido";
            toast.error("Error al subir imagen: " + msg);
        } finally {
            setUploading(false);
            if (fileRef.current) fileRef.current.value = "";
        }
    }

    async function onPasswordSubmit(data: PasswordFormValues) {
        setSavingPassword(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: data.new_password });
            if (error) throw error;
            toast.success("Contraseña actualizada correctamente");
            pwForm.reset();
            setShowPasswordForm(false);
            setShowNew(false);
            setShowConfirm(false);
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : "Error desconocido";
            toast.error("Error al cambiar contraseña: " + msg);
        } finally {
            setSavingPassword(false);
        }
    }

    const initials = initialData?.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'U';

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 px-4 md:px-0">
                <div>
                    <h2 className="text-3xl font-black tracking-tight text-slate-900 leading-tight">Mi Perfil</h2>
                    <p className="text-slate-400 font-bold text-[10px] md:text-xs uppercase tracking-widest mt-1">Gestión de Identidad de Usuario</p>
                </div>
                <Button
                    onClick={form.handleSubmit(onSubmit)}
                    disabled={loading}
                    className="w-full sm:w-auto h-12 md:h-14 px-8 rounded-2xl bg-slate-900 hover:bg-primary text-white font-black shadow-active transition-all active:scale-95 group"
                >
                    {loading ? "Guardando..." : (
                        <span className="flex items-center justify-center gap-3">
                            <Save className="h-5 w-5 group-hover:rotate-12 transition-transform" />
                            ACTUALIZAR PERFIL
                        </span>
                    )}
                </Button>
            </div>

            <div className="grid gap-8 lg:grid-cols-12">
                <div className="lg:col-span-4 space-y-8">
                    {/* Avatar Card */}
                    <Card className="border-none bg-white shadow-premium rounded-[2.5rem] overflow-hidden group">
                        <CardContent className="p-10 flex flex-col items-center text-center space-y-6">
                            <div
                                className="relative group/avatar cursor-pointer"
                                onClick={() => !uploading && fileRef.current?.click()}
                            >
                                <Avatar className="h-28 w-28 md:h-32 md:w-32 border-4 border-slate-50 shadow-inner group-hover:scale-105 transition-transform duration-500">
                                    <AvatarImage src={avatarUrl} />
                                    <AvatarFallback className="text-3xl md:text-4xl font-black bg-primary text-white italic">{initials}</AvatarFallback>
                                </Avatar>
                                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                                    {uploading ? (
                                        <Loader2 className="h-8 w-8 text-white animate-spin" />
                                    ) : (
                                        <Camera className="h-8 w-8 text-white" />
                                    )}
                                </div>
                                <input
                                    ref={fileRef}
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp"
                                    className="hidden"
                                    onChange={handleAvatarUpload}
                                />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900 italic tracking-tight leading-none">{initialData?.full_name || 'Nuevo Usuario'}</h3>
                                <p className="text-xs font-black text-primary uppercase tracking-widest mt-2">{initialData?.role || 'User'}</p>
                            </div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                Click en la foto para cambiarla
                            </p>
                        </CardContent>
                    </Card>

                    {/* Security Badge */}
                    <Card className="border-none bg-slate-900 text-white rounded-[2.5rem] p-8 overflow-hidden relative">
                        <ShieldCheck className="absolute -bottom-6 -right-6 h-24 w-24 text-white/5 rotate-12" />
                        <div className="relative z-10 space-y-4">
                            <div className="flex items-center gap-3">
                                <BadgeCheck className="h-5 w-5 text-emerald-400" />
                                <span className="text-[10px] font-black uppercase tracking-widest leading-none">Cuenta Verificada</span>
                            </div>
                            <p className="text-xs font-medium text-slate-400 leading-relaxed">
                                Tu identidad está protegida por encriptación AES-256 y autenticación multi-factor activa.
                            </p>
                        </div>
                    </Card>
                </div>

                <div className="lg:col-span-8 space-y-8">
                    {/* Personal Info */}
                    <Card className="border-none bg-white shadow-premium rounded-[2.5rem] overflow-hidden">
                        <CardHeader className="p-10 pb-4">
                            <CardTitle className="text-xl font-black text-slate-900 flex items-center gap-3 italic">
                                <User className="h-6 w-6 text-primary" />
                                Información Personal
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-10 pt-0 space-y-8">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nombre Completo</Label>
                                <Input
                                    {...form.register("full_name")}
                                    className="h-14 bg-slate-50 border-none rounded-2xl font-bold text-lg"
                                />
                                {form.formState.errors.full_name && (
                                    <p className="text-[10px] font-bold text-rose-500">{form.formState.errors.full_name.message}</p>
                                )}
                            </div>

                            <div className="space-y-2 opacity-60">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex flex-wrap items-center gap-2">
                                    Correo Electrónico
                                    <span className="bg-slate-100 text-[8px] px-2 py-0.5 rounded-full">LECTURA</span>
                                </Label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                    <Input
                                        {...form.register("email")}
                                        readOnly
                                        className="h-14 bg-slate-50 border-none rounded-2xl font-bold pl-12 cursor-not-allowed text-sm md:text-base"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Password Change */}
                    <Card className="border-none bg-white shadow-premium rounded-[2.5rem] overflow-hidden">
                        <CardContent className="p-10 space-y-6">
                            <button
                                type="button"
                                onClick={() => setShowPasswordForm(!showPasswordForm)}
                                className="w-full flex items-center justify-between group"
                            >
                                <div className="flex items-center gap-3">
                                    <Lock className="h-6 w-6 text-primary" />
                                    <span className="text-xl font-black text-slate-900 italic">Cambiar Contraseña</span>
                                </div>
                                {showPasswordForm ? (
                                    <ChevronUp className="h-5 w-5 text-slate-400 group-hover:text-slate-900 transition-colors" />
                                ) : (
                                    <ChevronDown className="h-5 w-5 text-slate-400 group-hover:text-slate-900 transition-colors" />
                                )}
                            </button>

                            {showPasswordForm && (
                                <div className="space-y-6 pt-4 border-t border-slate-100 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nueva Contraseña</Label>
                                        <div className="relative">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                                            <Input
                                                {...pwForm.register("new_password")}
                                                type={showNew ? "text" : "password"}
                                                placeholder="Mínimo 8 caracteres"
                                                className="h-14 bg-slate-50 border-none rounded-2xl font-medium pl-11 pr-11 text-sm"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowNew(!showNew)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600 transition-colors"
                                            >
                                                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                        {pwForm.formState.errors.new_password && (
                                            <p className="text-[10px] font-bold text-rose-500">{pwForm.formState.errors.new_password.message}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Confirmar Contraseña</Label>
                                        <div className="relative">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                                            <Input
                                                {...pwForm.register("confirm_password")}
                                                type={showConfirm ? "text" : "password"}
                                                placeholder="Repite la contraseña"
                                                className="h-14 bg-slate-50 border-none rounded-2xl font-medium pl-11 pr-11 text-sm"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirm(!showConfirm)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600 transition-colors"
                                            >
                                                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                        {pwForm.formState.errors.confirm_password && (
                                            <p className="text-[10px] font-bold text-rose-500">{pwForm.formState.errors.confirm_password.message}</p>
                                        )}
                                    </div>

                                    <Button
                                        onClick={pwForm.handleSubmit(onPasswordSubmit)}
                                        disabled={savingPassword}
                                        className="h-14 w-full rounded-2xl bg-slate-900 hover:bg-primary text-white font-black tracking-widest text-[10px] transition-all active:scale-[0.98]"
                                    >
                                        {savingPassword ? (
                                            <span className="flex items-center gap-3">
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                GUARDANDO...
                                            </span>
                                        ) : "GUARDAR CONTRASEÑA"}
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
