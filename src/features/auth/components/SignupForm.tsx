"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signupSchema, SignupCredentials } from "../types/index";
import { authService } from "../services/authService";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Lock, Mail, Loader2, ArrowRight, UserCircle, ShieldCheck, Eye, EyeOff, Zap } from "lucide-react";
import Link from "next/link";
import { cn } from "@/shared/lib/utils";

export function SignupForm() {
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const router = useRouter();

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<SignupCredentials>({
        resolver: zodResolver(signupSchema),
        defaultValues: {
            fullName: "",
            email: "",
            password: "",
            confirmPassword: "",
        },
    });

    const onSubmit = async (data: SignupCredentials) => {
        setIsLoading(true);
        try {
            await authService.signUp(data);
            toast.success("¡Cuenta creada! Revisa tu correo para confirmar.");
            router.push("/login");
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : "Error al crear la cuenta";
            toast.error(msg);
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-8 duration-1000">
            {/* Header */}
            <div className="mb-8 space-y-3">
                <div className="flex items-center gap-2 mb-6">
                    <div className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse shadow-[0_0_8px_#818cf8]" />
                    <span className="text-[9px] font-black text-indigo-400/80 uppercase tracking-[0.5em] italic">Protocolo de Registro</span>
                </div>
                <h2 className="text-4xl font-black text-white tracking-tighter italic">
                    Crear Cuenta
                </h2>
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em]">
                    Solicita acceso al ecosistema empresarial
                </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {/* Full Name */}
                <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-500 ml-1">Nombre Completo</Label>
                    <div className="relative group">
                        <UserCircle className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-700 group-focus-within:text-emerald-400 transition-colors duration-500" />
                        <Input
                            {...register("fullName")}
                            placeholder="Juan Pérez"
                            className={cn(
                                "h-14 pl-14 pr-6 bg-white/5 border border-white/10 rounded-2xl font-bold text-white placeholder:text-slate-700 focus-visible:ring-2 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500/30 transition-all duration-500",
                                errors.fullName && "ring-2 ring-rose-500/50 border-rose-500/30"
                            )}
                        />
                    </div>
                    {errors.fullName && (
                        <p className="text-[9px] font-black text-rose-400 uppercase tracking-[0.3em] ml-1 flex items-center gap-1">
                            <span className="h-1 w-1 rounded-full bg-rose-400" />
                            {errors.fullName.message}
                        </p>
                    )}
                </div>

                {/* Email */}
                <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-500 ml-1">Email Corporativo</Label>
                    <div className="relative group">
                        <Mail className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-700 group-focus-within:text-emerald-400 transition-colors duration-500" />
                        <Input
                            {...register("email")}
                            type="email"
                            placeholder="tu@empresa.com"
                            className={cn(
                                "h-14 pl-14 pr-6 bg-white/5 border border-white/10 rounded-2xl font-bold text-white placeholder:text-slate-700 focus-visible:ring-2 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500/30 transition-all duration-500",
                                errors.email && "ring-2 ring-rose-500/50 border-rose-500/30"
                            )}
                        />
                    </div>
                    {errors.email && (
                        <p className="text-[9px] font-black text-rose-400 uppercase tracking-[0.3em] ml-1 flex items-center gap-1">
                            <span className="h-1 w-1 rounded-full bg-rose-400" />
                            {errors.email.message}
                        </p>
                    )}
                </div>

                {/* Passwords */}
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                        <Label className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-500 ml-1">Contraseña</Label>
                        <div className="relative group">
                            <Lock className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-700 group-focus-within:text-emerald-400 transition-colors duration-500" />
                            <Input
                                {...register("password")}
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                className={cn(
                                    "h-14 pl-12 pr-12 bg-white/5 border border-white/10 rounded-2xl font-bold text-white placeholder:text-slate-700 focus-visible:ring-2 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500/30 transition-all duration-500",
                                    errors.password && "ring-2 ring-rose-500/50 border-rose-500/30"
                                )}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-700 hover:text-white transition-colors"
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-500 ml-1">Confirmar</Label>
                        <div className="relative group">
                            <Lock className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-700 group-focus-within:text-emerald-400 transition-colors duration-500" />
                            <Input
                                {...register("confirmPassword")}
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                className={cn(
                                    "h-14 pl-12 pr-6 bg-white/5 border border-white/10 rounded-2xl font-bold text-white placeholder:text-slate-700 focus-visible:ring-2 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500/30 transition-all duration-500",
                                    errors.confirmPassword && "ring-2 ring-rose-500/50 border-rose-500/30"
                                )}
                            />
                        </div>
                    </div>
                </div>
                {(errors.password || errors.confirmPassword) && (
                    <p className="text-[9px] font-black text-rose-400 uppercase tracking-[0.3em] ml-1 flex items-center gap-1">
                        <span className="h-1 w-1 rounded-full bg-rose-400" />
                        {errors.password?.message || errors.confirmPassword?.message}
                    </p>
                )}

                {/* Security Notice */}
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
                    <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0" />
                    <p className="text-[9px] font-bold text-emerald-400/70 leading-relaxed">
                        Al registrarte, aceptas los términos de servicio y políticas de seguridad corporativa de GVM S.A.S.
                    </p>
                </div>

                {/* Submit */}
                <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-16 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black italic tracking-tight text-lg transition-all duration-500 shadow-[0_0_30px_rgba(16,185,129,0.2)] hover:shadow-[0_0_40px_rgba(16,185,129,0.3)] active:scale-[0.98] group mt-2"
                >
                    {isLoading ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                        <span className="flex items-center gap-3">
                            SOLICITAR ACCESO <ArrowRight className="h-5 w-5 group-hover:translate-x-2 transition-transform" />
                        </span>
                    )}
                </Button>
            </form>

            {/* Divider */}
            <div className="mt-8 pt-6 border-t border-white/5 text-center">
                <p className="text-xs font-bold text-slate-600">
                    ¿Ya tienes credenciales?{" "}
                    <Link href="/login" className="text-emerald-400 font-black italic hover:text-emerald-300 transition-colors">
                        Iniciar Sesión
                    </Link>
                </p>
            </div>

            {/* Security Badge */}
            <div className="mt-4 flex items-center justify-center gap-2">
                <Zap className="h-3 w-3 text-slate-700" />
                <span className="text-[8px] font-black text-slate-700 uppercase tracking-[0.4em]">Onboarding protegido por Supabase Auth</span>
            </div>
        </div>
    );
}
