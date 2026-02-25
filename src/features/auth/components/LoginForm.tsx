"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, LoginCredentials } from '../types/index';
import { authService } from "../services/authService";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Lock, Mail, Loader2, ArrowRight, Zap, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { cn } from "@/shared/lib/utils";

export function LoginForm() {
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const router = useRouter();

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginCredentials>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });

    const onSubmit = async (data: LoginCredentials) => {
        setIsLoading(true);
        try {
            await authService.signIn(data);
            toast.success("¡Bienvenido de nuevo!");
            router.push("/dashboard");
            router.refresh();
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : "Error al iniciar sesión";
            toast.error(msg);
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-8 duration-1000">
            {/* Header */}
            <div className="mb-10 space-y-3">
                <div className="flex items-center gap-2 mb-6">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                    <span className="text-[9px] font-black text-emerald-600 uppercase tracking-[0.5em] italic">Enlace Seguro Activo</span>
                </div>
                <h2 className="text-4xl font-black text-slate-900 tracking-tighter italic">
                    Iniciar Sesión
                </h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                    Ingresa tus credenciales de acceso corporativo
                </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Email */}
                <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-400 ml-1">Email Corporativo</Label>
                    <div className="relative group">
                        <Mail className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-indigo-600 transition-colors duration-500" />
                        <Input
                            {...register("email")}
                            type="email"
                            placeholder="operador@gvm.com"
                            className={cn(
                                "h-14 pl-14 pr-6 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-900 placeholder:text-slate-300 focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500/30 transition-all duration-500",
                                errors.email && "ring-2 ring-rose-500/30 border-rose-300"
                            )}
                        />
                    </div>
                    {errors.email && (
                        <p className="text-[9px] font-black text-rose-500 uppercase tracking-[0.3em] ml-1 flex items-center gap-1">
                            <span className="h-1 w-1 rounded-full bg-rose-500" />
                            {errors.email.message}
                        </p>
                    )}
                </div>

                {/* Password */}
                <div className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                        <Label className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-400">Contraseña</Label>
                        <Link href="/forgot-password" className="text-[9px] font-black text-indigo-600 uppercase tracking-[0.3em] hover:text-indigo-500 transition-colors">
                            ¿Olvidaste?
                        </Link>
                    </div>
                    <div className="relative group">
                        <Lock className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-indigo-600 transition-colors duration-500" />
                        <Input
                            {...register("password")}
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            className={cn(
                                "h-14 pl-14 pr-14 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-900 placeholder:text-slate-300 focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500/30 transition-all duration-500",
                                errors.password && "ring-2 ring-rose-500/30 border-rose-300"
                            )}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600 transition-colors"
                        >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                    {errors.password && (
                        <p className="text-[9px] font-black text-rose-500 uppercase tracking-[0.3em] ml-1 flex items-center gap-1">
                            <span className="h-1 w-1 rounded-full bg-rose-500" />
                            {errors.password.message}
                        </p>
                    )}
                </div>

                {/* Submit */}
                <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-16 rounded-2xl bg-slate-900 hover:bg-indigo-600 text-white font-black italic tracking-tight text-lg transition-all duration-500 shadow-lg hover:shadow-xl active:scale-[0.98] group"
                >
                    {isLoading ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                        <span className="flex items-center gap-3">
                            ACCEDER AL SISTEMA <ArrowRight className="h-5 w-5 group-hover:translate-x-2 transition-transform" />
                        </span>
                    )}
                </Button>
            </form>

            {/* Divider */}
            <div className="mt-10 pt-8 border-t border-slate-100 text-center">
                <p className="text-xs font-bold text-slate-400">
                    ¿No tienes credenciales?{" "}
                    <Link href="/signup" className="text-slate-900 font-black italic hover:text-indigo-600 transition-colors">
                        Solicitar Acceso
                    </Link>
                </p>
            </div>

            {/* Security info */}
            <div className="mt-6 flex items-center justify-center gap-2">
                <Zap className="h-3 w-3 text-slate-300" />
                <span className="text-[8px] font-black text-slate-300 uppercase tracking-[0.4em]">Protegido con Supabase Auth + JWT</span>
            </div>
        </div>
    );
}
