import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
    FileCode,
    ExternalLink,
    ShieldCheck,
    Settings,
    History,
    Key,
    Cloud,
    CheckCircle2,
    XCircle,
    Zap,
} from "lucide-react";
import { ResolutionManager } from '@/features/dian/components/ResolutionManager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { DianConfigForm } from "@/features/dian/components/DianConfigForm";
import { getDianConfigAction } from "@/features/dian/actions";
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function DianDashboard() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: transmissions } = await supabase
        .from('electronic_documents')
        .select(`
            *,
            document:documents(number, doc_type, total, issue_date)
        `)
        .order('sent_at', { ascending: false });

    const { data: resolutions } = await supabase
        .from('dian_resolutions')
        .select('*')
        .order('created_at', { ascending: false });

    const config = await getDianConfigAction();

    const acceptedCount = transmissions?.filter((t: any) => t.dian_status === 'ACCEPTED').length ?? 0;
    const rejectedCount = transmissions?.filter((t: any) => t.dian_status !== 'ACCEPTED').length ?? 0;
    const txTotal = transmissions?.length ?? 0;

    return (
        <div className="space-y-10 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {/* 🏭 V3 INDUSTRIAL HERO HEADER */}
            <div className="bg-slate-900 rounded-[4rem] p-12 md:p-16 text-white shadow-active relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-16 opacity-[0.03] pointer-events-none group-hover:scale-110 group-hover:rotate-6 transition-all duration-1000">
                    <ShieldCheck className="h-80 w-80 text-white" />
                </div>

                <div className="relative z-10 flex flex-col xl:flex-row justify-between items-start xl:items-end gap-10">
                    <div className="space-y-5">
                        <div className="flex items-center gap-4">
                            <div className="h-2 w-12 bg-emerald-500 rounded-full" />
                            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-emerald-400">Sistema de Facturación Electrónica</span>
                        </div>
                        <h1 className="text-6xl md:text-8xl font-black tracking-tighter italic uppercase leading-[0.8]">
                            DIAN<br /><span className="text-slate-500">Control</span>
                        </h1>
                        <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.4em]">Transmisiones · Resoluciones · Configuración</p>
                    </div>

                    <div className="flex flex-wrap gap-4">
                        <div className="h-24 px-8 rounded-[2rem] bg-emerald-500/10 backdrop-blur-md border border-emerald-500/20 flex flex-col justify-center items-end">
                            <span className="text-[10px] uppercase tracking-widest text-emerald-400 font-black">Aceptados</span>
                            <span className="text-3xl font-black italic tracking-tighter text-emerald-300">{acceptedCount}</span>
                        </div>
                        {rejectedCount > 0 && (
                            <div className="h-24 px-8 rounded-[2rem] bg-rose-500/10 backdrop-blur-md border border-rose-500/20 flex flex-col justify-center items-end">
                                <span className="text-[10px] uppercase tracking-widest text-rose-400 font-black">Rechazados</span>
                                <span className="text-3xl font-black italic tracking-tighter text-rose-300">{rejectedCount}</span>
                            </div>
                        )}
                        <div className="h-24 px-8 rounded-[2rem] bg-white/5 backdrop-blur-md border border-white/10 flex flex-col justify-center items-end">
                            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-black">Total</span>
                            <span className="text-3xl font-black italic tracking-tighter">{txTotal}</span>
                        </div>
                        <div className="h-24 px-8 rounded-[2rem] bg-indigo-500/10 backdrop-blur-md border border-indigo-500/20 flex flex-col justify-center items-end group/stat hover:bg-indigo-500/20 transition-all">
                            <span className="text-[10px] uppercase tracking-widest text-indigo-400 font-black">Estado</span>
                            <div className="flex items-center gap-2 mt-1">
                                <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
                                <span className="text-sm font-black italic text-indigo-100 uppercase">Operativo</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* TABS */}
            <Tabs defaultValue="transmissions" className="w-full">
                <TabsList className="bg-white border-none shadow-premium p-1.5 rounded-[1.5rem] h-14">
                    <TabsTrigger value="transmissions" className="rounded-xl px-6 data-[state=active]:bg-slate-900 data-[state=active]:text-white font-black text-[11px] uppercase tracking-widest transition-all text-slate-400 flex items-center gap-2">
                        <History className="h-4 w-4" /> Transmisiones
                        {txTotal > 0 && <span className="h-5 min-w-5 px-1.5 rounded-full bg-indigo-100 text-indigo-600 data-[state=active]:bg-white/20 data-[state=active]:text-white text-[9px] font-black flex items-center justify-center">{txTotal}</span>}
                    </TabsTrigger>
                    <TabsTrigger value="resolutions" className="rounded-xl px-6 data-[state=active]:bg-slate-900 data-[state=active]:text-white font-black text-[11px] uppercase tracking-widest transition-all text-slate-400 flex items-center gap-2">
                        <FileCode className="h-4 w-4" /> Resoluciones
                        {(resolutions?.length ?? 0) > 0 && <span className="h-5 min-w-5 px-1.5 rounded-full bg-slate-100 text-slate-500 text-[9px] font-black flex items-center justify-center">{resolutions!.length}</span>}
                    </TabsTrigger>
                    <TabsTrigger value="config" className="rounded-xl px-6 data-[state=active]:bg-slate-900 data-[state=active]:text-white font-black text-[11px] uppercase tracking-widest transition-all text-slate-400 flex items-center gap-2">
                        <Settings className="h-4 w-4" /> Configuración
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="transmissions" className="space-y-8 mt-10">
                    <div className="grid grid-cols-1 gap-6">
                        {transmissions?.map((tx: any) => (
                            <Card key={tx.id} className="group overflow-hidden rounded-[2.5rem] border-none bg-white shadow-premium hover:shadow-lg hover:scale-[1.01] transition-all duration-300">
                                <CardContent className="p-0">
                                    <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-50">
                                        <div className="p-8 flex-1 space-y-5">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-3 bg-slate-50 rounded-2xl group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all">
                                                        <FileCode className="h-6 w-6 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                                                    </div>
                                                    <div>
                                                        <span className="text-xl font-black text-slate-900 tracking-tighter">{tx.document?.number}</span>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <Badge className="bg-indigo-50 text-indigo-600 border-none text-[9px] font-black uppercase px-2 py-0">
                                                                {tx.document?.doc_type}
                                                            </Badge>
                                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Emitido {format(new Date(tx.sent_at), 'dd MMM yyyy, HH:mm', { locale: es }).toUpperCase()}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end gap-1">
                                                    {tx.dian_status === 'ACCEPTED' ? (
                                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-full">
                                                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">ACEPTADO</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 rounded-full">
                                                            <XCircle className="h-3 w-3 text-rose-500" />
                                                            <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">RECHAZADO</span>
                                                        </div>
                                                    )}
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Ambiente: {tx.environment}</span>
                                                </div>
                                            </div>

                                            <div className="bg-slate-50 rounded-2xl p-4">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                    <Key className="h-3 w-3" /> Identificador Único (CUFE / CUNE)
                                                </p>
                                                <p className="text-[10px] font-mono text-slate-500 break-all leading-relaxed">
                                                    {tx.cufe}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="p-8 bg-slate-50/30 w-fit md:w-64 flex flex-col justify-center gap-4">
                                            <div className="space-y-1">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Valor Transmitido</p>
                                                <p className="text-xl font-black text-slate-900 tracking-tighter">${tx.document?.total.toLocaleString('es-CO')}</p>
                                            </div>
                                            <Button variant="outline" className="w-full border-none bg-white shadow-sm hover:shadow-premium text-slate-600 rounded-xl h-11 font-bold text-xs uppercase tracking-widest transition-all">
                                                <FileCode className="h-4 w-4 mr-2" /> Descargar XML
                                            </Button>
                                            <Button variant="outline" className="w-full border-none bg-white shadow-sm hover:shadow-premium text-slate-600 rounded-xl h-11 font-bold text-xs uppercase tracking-widest transition-all" asChild>
                                                <a href={tx.xml_url} target="_blank" rel="noopener noreferrer">
                                                    <ExternalLink className="h-4 w-4 mr-2" /> Auditoría DIAN
                                                </a>
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}

                        {(!transmissions || transmissions.length === 0) && (
                            <div className="text-center py-32 bg-white border-2 border-dashed border-slate-100 rounded-[3rem] shadow-premium animate-in zoom-in duration-500">
                                <div className="inline-flex p-6 rounded-[2rem] bg-slate-50 mb-6">
                                    <Cloud className="h-12 w-12 text-slate-200 mx-auto" />
                                </div>
                                <h3 className="text-xl font-black text-slate-900 tracking-tight italic">Sin registros de emisión</h3>
                                <p className="text-slate-400 text-sm max-w-xs mx-auto mt-2 font-medium">Inicia la transformación digital emitiendo documentos desde los módulos de Ventas o Nómina.</p>
                                <Button asChild className="mt-8 bg-slate-900 hover:bg-primary text-white rounded-[1.5rem] h-14 px-8 font-black uppercase text-xs tracking-widest shadow-active transition-all hover:scale-105">
                                    <Link href="/sales">Ir a Facturación</Link>
                                </Button>
                            </div>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="resolutions" className="mt-10">
                    <ResolutionManager resolutions={resolutions || []} />
                </TabsContent>

                <TabsContent value="config" className="mt-10">
                    <DianConfigForm initialConfig={config} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
