"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, LoginCredentials, SignupCredentials } from '../types/index';
import { authService } from "../services/authService";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/shared/components/ui/card";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Lock, Mail, Loader2, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/shared/lib/utils";

export function LoginForm() {
    const [isLoading, setIsLoading] = useState(false);
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
        } catch (error: any) {
            toast.error(error.message || "Error al iniciar sesión");
            setIsLoading(false);
        }
    };

    return (
        <Card className="border-none bg-white/80 backdrop-blur-xl shadow-premium rounded-[3rem] overflow-hidden w-full max-w-lg animate-in fade-in zoom-in-95 duration-700">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary via-indigo-500 to-rose-500" />

            <CardHeader className="p-10 pb-6 text-center space-y-4">
                <div className="flex justify-center">
                    <div className="h-20 w-20 rounded-[2rem] bg-slate-900 flex items-center justify-center text-white shadow-active transform -rotate-6 group-hover:rotate-0 transition-transform duration-500">
                        <Sparkles className="h-10 w-10 text-primary animate-pulse" />
                    </div>
                </div>
                <div className="space-y-1">
                    <CardTitle className="text-3xl sm:text-4xl font-black tracking-tighter text-slate-900 italic">GVM S.A.S</CardTitle>
                    <CardDescription className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-widest">
                        Intelligence Engine V3
                    </CardDescription>
                </div>
            </CardHeader>

            <CardContent className="p-10 pt-0">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Email Corporativo</Label>
                        <div className="relative group">
                            <Mail className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-primary transition-colors" />
                            <Input
                                {...register("email")}
                                type="email"
                                placeholder="tu@empresa.com"
                                className={cn(
                                    "h-16 pl-14 pr-6 bg-slate-50 border-none rounded-2xl font-bold placeholder:text-slate-300 focus:ring-4 focus:ring-primary/10 transition-all",
                                    errors.email && "ring-2 ring-rose-500/50"
                                )}
                            />
                        </div>
                        {errors.email && (
                            <p className="text-[10px] font-black text-rose-500 uppercase tracking-tighter ml-4">{errors.email.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-center ml-4 mr-4">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Contraseña</Label>
                            <Link href="/forgot-password" className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline">
                                ¿ Olvidaste ?
                            </Link>
                        </div>
                        <div className="relative group">
                            <Lock className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-primary transition-colors" />
                            <Input
                                {...register("password")}
                                type="password"
                                placeholder="••••••••"
                                className={cn(
                                    "h-16 pl-14 pr-6 bg-slate-50 border-none rounded-2xl font-bold placeholder:text-slate-300 focus:ring-4 focus:ring-primary/10 transition-all",
                                    errors.password && "ring-2 ring-rose-500/50"
                                )}
                            />
                        </div>
                        {errors.password && (
                            <p className="text-[10px] font-black text-rose-500 uppercase tracking-tighter ml-4">{errors.password.message}</p>
                        )}
                    </div>

                    <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full h-16 sm:h-20 rounded-[1.5rem] sm:rounded-[2rem] bg-slate-900 hover:bg-primary text-white font-black italic tracking-tight text-xl sm:text-2xl transition-all shadow-active active:scale-95 group"
                    >
                        {isLoading ? (
                            <Loader2 className="h-6 w-6 animate-spin" />
                        ) : (
                            <span className="flex items-center gap-3">
                                INICIAR SESIÓN <ArrowRight className="h-6 w-6 group-hover:translate-x-2 transition-transform" />
                            </span>
                        )}
                    </Button>
                </form>
            </CardContent>

            <CardFooter className="p-10 pt-0 flex justify-center border-t border-slate-50 bg-slate-50/50">
                <p className="text-xs font-medium text-slate-400">
                    ¿No tienes cuenta?{" "}
                    <Link href="/signup" className="text-slate-900 font-black italic hover:text-primary transition-colors">
                        Solicitar Acceso
                    </Link>
                </p>
            </CardFooter>
        </Card>
    );
}
