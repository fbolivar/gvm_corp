import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/shared/components/ui/card";
import { CreditCard, Sparkles, Receipt, ArrowUpRight, Zap } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";

export default async function BillingPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");
    return (
        <div className="p-8 lg:p-12 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div>
                <h2 className="text-3xl font-black tracking-tight text-slate-900">Facturación & Plan</h2>
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Gestión de Suscripción y Pagos</p>
            </div>

            <div className="grid gap-8 lg:grid-cols-12">
                <div className="lg:col-span-8 space-y-8">
                    <Card className="border-none bg-slate-900 text-white rounded-[2.5rem] overflow-hidden relative group">
                        <Zap className="absolute -bottom-10 -right-10 h-20 w-20 text-white/5 rotate-12 transition-transform duration-700 group-hover:scale-110" />
                        <CardContent className="p-12 relative z-10">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <Sparkles className="h-5 w-5 text-amber-400" />
                                        <span className="text-[10px] font-black uppercase tracking-widest leading-none">Tu Plan Actual</span>
                                    </div>
                                    <h3 className="text-3xl font-black tracking-tight">Enterprise Pro</h3>
                                    <p className="text-slate-400 font-medium max-w-md">
                                        Tienes acceso ilimitado a todos los módulos: Nómina, Contabilidad, Facturación Electrónica e Inteligencia de Datos.
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-black">$450,000<span className="text-sm font-bold text-slate-500">/mes</span></p>
                                    <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mt-2">Siguiente cobro: Mar 15, 2026</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none bg-white shadow-premium rounded-[2.5rem] overflow-hidden">
                        <CardContent className="p-10 space-y-8">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xl font-black text-slate-900 italic">Métodos de Pago</h4>
                                <Button variant="outline" className="h-10 rounded-xl font-bold border-slate-100">Agregar Método</Button>
                            </div>

                            <div className="flex items-center justify-between p-6 rounded-2xl bg-slate-50 border border-slate-100">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-xl bg-white flex items-center justify-center shadow-sm">
                                        <CreditCard className="h-6 w-6 text-slate-600" />
                                    </div>
                                    <div>
                                        <p className="font-black text-slate-900 italic">Visa ending in 4242</p>
                                        <p className="text-xs font-bold text-slate-400 uppercase">Expires 12/28</p>
                                    </div>
                                </div>
                                <Badge className="bg-emerald-50 text-emerald-600 border-none font-black text-[10px]">PRINCIPAL</Badge>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-4 space-y-8">
                    <Card className="border-none bg-white shadow-premium rounded-[2.5rem] h-full">
                        <CardContent className="p-10 space-y-8">
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                    <Receipt className="h-5 w-5" />
                                </div>
                                <h4 className="text-lg font-black text-slate-900 italic tracking-tight">Últimas Facturas</h4>
                            </div>

                            <div className="space-y-4">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="flex items-center justify-between group cursor-pointer hover:bg-slate-50 p-2 rounded-xl transition-colors">
                                        <div>
                                            <p className="text-sm font-bold text-slate-900 leading-none">INV-2026-00{i}</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Feb {i}, 2026</p>
                                        </div>
                                        <ArrowUpRight className="h-4 w-4 text-slate-200 group-hover:text-primary transition-colors" />
                                    </div>
                                ))}
                            </div>

                            <Button variant="ghost" className="w-full text-primary font-black uppercase tracking-widest text-[10px]">
                                Ver Historial Completo
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
