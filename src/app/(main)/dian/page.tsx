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

    return (
        <div className="space-y-12 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {/* 💎 PREMIUM HEADER */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 px-1">
                <div className="space-y-2">
                    <h1 className="text-5xl font-black tracking-tighter text-slate-900 italic">Cumplimiento DIAN</h1>
                    <div className="flex items-center gap-4">
                        <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">Facturación & Documentos Electrónicos</p>
                        <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1 rounded-full">
                            <ShieldCheck className="h-3 w-3 text-emerald-600" />
                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Operativo</span>
                        </div>
                    </div>
                </div>

                <Badge variant="outline" className="h-14 px-6 rounded-[1.5rem] border-none bg-white shadow-premium text-slate-400 font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
                    <Zap className="h-4 w-4 text-emerald-500" />
                    Conexión Segura
                </Badge>
            </div>

            {/* TABS */}
            <Tabs defaultValue="transmissions" className="w-full">
                <TabsList className="bg-white border-none shadow-premium p-1.5 rounded-[1.5rem] h-14">
                    <TabsTrigger value="transmissions" className="rounded-xl px-6 data-[state=active]:bg-slate-900 data-[state=active]:text-white font-black text-[11px] uppercase tracking-widest transition-all text-slate-400">
                        <History className="h-4 w-4 mr-2" /> Transmisiones
                    </TabsTrigger>
                    <TabsTrigger value="resolutions" className="rounded-xl px-6 data-[state=active]:bg-slate-900 data-[state=active]:text-white font-black text-[11px] uppercase tracking-widest transition-all text-slate-400">
                        <FileCode className="h-4 w-4 mr-2" /> Resoluciones
                    </TabsTrigger>
                    <TabsTrigger value="config" className="rounded-xl px-6 data-[state=active]:bg-slate-900 data-[state=active]:text-white font-black text-[11px] uppercase tracking-widest transition-all text-slate-400">
                        <Settings className="h-4 w-4 mr-2" /> Configuración
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
