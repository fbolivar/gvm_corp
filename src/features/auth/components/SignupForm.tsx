"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signupSchema, SignupCredentials } from "../types/index";
import { authService } from "../services/authService";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/shared/components/ui/card";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Lock, Mail, Loader2, Sparkles, ArrowRight, UserPlus, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { cn } from "@/shared/lib/utils";

export function SignupForm() {
    const [isLoading, setIsLoading] = useState(false);
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
        } catch (error: any) {
            toast.error(error.message || "Error al crear la cuenta");
            setIsLoading(false);
        }
    };

    return (
        <Card className="border-none bg-white/80 backdrop-blur-xl shadow-premium rounded-[3rem] overflow-hidden w-full max-w-lg animate-in fade-in zoom-in-95 duration-700">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary via-indigo-500 to-rose-500" />

            <CardHeader className="p-10 pb-6 text-center space-y-4">
                <div className="flex justify-center">
                    <div className="h-20 w-20 rounded-[2rem] bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-sm transform rotate-6 hover:rotate-0 transition-transform duration-500">
                        <UserPlus className="h-10 w-10" />
                    </div>
                </div>
                <div className="space-y-1">
                    <CardTitle className="text-4xl font-black tracking-tighter text-slate-900 italic">Crear Cuenta</CardTitle>
                    <CardDescription className="text-slate-400 font-bold text-xs uppercase tracking-widest">
                        Únete a GVM S.A.S
                    </CardDescription>
                </div>
            </CardHeader>

            <CardContent className="p-10 pt-0">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Nombre Completo</Label>
                        <Input
                            {...register("fullName")}
                            placeholder="John Doe"
                            className={cn(
                                "h-14 px-6 bg-slate-50 border-none rounded-2xl font-bold placeholder:text-slate-300 focus:ring-4 focus:ring-primary/10 transition-all",
                                errors.fullName && "ring-2 ring-rose-500/50"
                            )}
                        />
                        {errors.fullName && (
                            <p className="text-[10px] font-black text-rose-500 uppercase tracking-tighter ml-4">{errors.fullName.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Email Corporativo</Label>
                        <div className="relative group">
                            <Mail className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-primary transition-colors" />
                            <Input
                                {...register("email")}
                                type="email"
                                placeholder="tu@empresa.com"
                                className={cn(
                                    "h-14 pl-14 pr-6 bg-slate-50 border-none rounded-2xl font-bold placeholder:text-slate-300 focus:ring-4 focus:ring-primary/10 transition-all",
                                    errors.email && "ring-2 ring-rose-500/50"
                                )}
                            />
                        </div>
                        {errors.email && (
                            <p className="text-[10px] font-black text-rose-500 uppercase tracking-tighter ml-4">{errors.email.message}</p>
                        )}
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Contraseña</Label>
                            <Input
                                {...register("password")}
                                type="password"
                                placeholder="••••••••"
                                className={cn(
                                    "h-14 px-6 bg-slate-50 border-none rounded-2xl font-bold placeholder:text-slate-300 focus:ring-4 focus:ring-primary/10 transition-all",
                                    errors.password && "ring-2 ring-rose-500/50"
                                )}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Confirmar</Label>
                            <Input
                                {...register("confirmPassword")}
                                type="password"
                                placeholder="••••••••"
                                className={cn(
                                    "h-14 px-6 bg-slate-50 border-none rounded-2xl font-bold placeholder:text-slate-300 focus:ring-4 focus:ring-primary/10 transition-all",
                                    errors.confirmPassword && "ring-2 ring-rose-500/50"
                                )}
                            />
                        </div>
                    </div>
                    {(errors.password || errors.confirmPassword) && (
                        <p className="text-[10px] font-black text-rose-500 uppercase tracking-tighter ml-4 font-bold">
                            {errors.password?.message || errors.confirmPassword?.message}
                        </p>
                    )}

                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100">
                        <ShieldCheck className="h-5 w-5 text-indigo-600 shrink-0" />
                        <p className="text-[10px] font-bold text-indigo-600 leading-tight">
                            Al registrarte, aceptas nuestros términos de servicio y políticas de seguridad empresarial.
                        </p>
                    </div>

                    <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full h-18 rounded-[2rem] bg-slate-900 hover:bg-primary text-white font-black italic tracking-tight text-xl transition-all shadow-active active:scale-95 group mt-4 flex items-center justify-center gap-3"
                    >
                        {isLoading ? (
                            <Loader2 className="h-6 w-6 animate-spin" />
                        ) : (
                            <>
                                EMPEZAR AHORA <ArrowRight className="h-6 w-6 group-hover:translate-x-2 transition-transform" />
                            </>
                        )}
                    </Button>
                </form>
            </CardContent>

            <CardFooter className="p-10 pt-0 flex justify-center border-t border-slate-50 bg-slate-50/50">
                <p className="text-xs font-medium text-slate-400">
                    ¿Ya tienes cuenta?{" "}
                    <Link href="/login" className="text-slate-900 font-black italic hover:text-primary transition-colors">
                        Iniciar Sesión
                    </Link>
                </p>
            </CardFooter>
        </Card>
    );
}
