import { createClient } from '@/lib/supabase/server';
import { documentService } from '@/features/documents/services/documentService';
import { DocumentList } from '@/features/documents/components/DocumentList';
import { redirect } from 'next/navigation';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import Link from 'next/link';
import {
    Plus,
    FileText,
    Receipt,
    ShoppingCart,
    ShieldCheck,
    TrendingUp,
    Clock,
    Send,
    ChevronRight,
    Zap
} from 'lucide-react';

export default async function DocumentsPage() {
    const supabase = await createClient();

    // Auth Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    // Fetch with pagination
    const { data } = await documentService.getDocuments(supabase, { page: 1, per_page: 50 });

    // Quick stats
    const drafts = data.filter(d => d.status === 'DRAFT').length;
    const emitted = data.filter(d => d.status === 'SENT' || d.status === 'ACCEPTED').length;
    const totalAmount = data.reduce((sum, d) => sum + (d.total || 0), 0);
    const invoices = data.filter(d => d.doc_type === 'INVOICE').length;

    return (
        <div className="page-container space-y-8 md:space-y-12 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {/* 🛡️ MASTER CONTROL HEADER */}
            <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-active relative overflow-hidden group">
                {/* Background Decor */}
                <div className="absolute top-0 right-0 p-16 opacity-[0.03] pointer-events-none group-hover:scale-110 group-hover:rotate-12 transition-all duration-1000">
                    <FileText className="h-24 w-24 text-white" />
                </div>

                <div className="relative z-10 space-y-8">
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="h-2 w-12 bg-indigo-500 rounded-full" />
                            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-indigo-400">Documentation Core v3.0</span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black tracking-tight uppercase leading-tight">
                            Centro <br /><span className="text-slate-500">Documental</span>
                        </h1>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                        <div className="flex flex-wrap items-center gap-6">
                            <div className="flex items-center gap-2 bg-indigo-500/10 px-4 py-2 rounded-xl border border-indigo-500/20">
                                <ShieldCheck className="h-4 w-4 text-indigo-400" />
                                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest italic leading-none">Certificado DIAN</span>
                            </div>
                            <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.4em]">Auditando Facturación Electrónica & Trazabilidad</p>
                        </div>

                        <div className="flex flex-wrap items-center gap-4">
                            <Button asChild variant="ghost" className="h-14 px-8 rounded-2xl bg-white/5 border border-white/10 text-white font-black hover:bg-white/10 transition-all active:scale-95">
                                <Link href="/sales">
                                    <ShoppingCart className="mr-3 h-4 w-4 text-indigo-400" />
                                    <span className="text-xs uppercase tracking-widest italic">Ventas</span>
                                </Link>
                            </Button>
                            <Button asChild className="h-14 px-10 rounded-2xl bg-white text-slate-950 hover:bg-indigo-500 hover:text-white font-black shadow-active transition-all hover:scale-105 active:scale-95 border-none">
                                <Link href="/documents/new" className="flex items-center gap-3">
                                    <Plus className="h-6 w-6" />
                                    <span className="text-xs uppercase tracking-widest italic">Nuevo Documento</span>
                                </Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* 📊 KPI GRID */}
            <div className="grid gap-4 sm:gap-6 md:gap-8 grid-cols-2 lg:grid-cols-4">
                <Card className="rounded-[2.5rem] border-none bg-white shadow-premium relative overflow-hidden group hover:scale-105 transition-all duration-500">
                    <CardContent className="p-8">
                        <div className="flex items-center justify-between mb-4">
                            <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-sm group-hover:bg-primary group-hover:text-white transition-colors">
                                <FileText className="h-6 w-6" />
                            </div>
                            <Badge className="bg-blue-50 text-blue-600 border-none text-[8px] font-black px-2 py-0">TOTAL</Badge>
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 opacity-60">Documentos</p>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">
                            {data.length}
                        </h3>
                    </CardContent>
                </Card>

                <Card className="rounded-[2.5rem] border-none bg-white shadow-premium relative overflow-hidden group hover:scale-105 transition-all duration-500">
                    <CardContent className="p-8">
                        <div className="flex items-center justify-between mb-4">
                            <div className="h-12 w-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 shadow-sm group-hover:bg-primary group-hover:text-white transition-colors">
                                <Clock className="h-6 w-6" />
                            </div>
                            <Badge className="bg-amber-50 text-amber-600 border-none text-[8px] font-black px-2 py-0">PENDIENTE</Badge>
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 opacity-60">Borradores</p>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">
                            {drafts}
                        </h3>
                    </CardContent>
                </Card>

                <Card className="rounded-[2.5rem] border-none bg-white shadow-premium relative overflow-hidden group hover:scale-105 transition-all duration-500">
                    <CardContent className="p-8">
                        <div className="flex items-center justify-between mb-4">
                            <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-sm group-hover:bg-primary group-hover:text-white transition-colors">
                                <Send className="h-6 w-6" />
                            </div>
                            <Badge className="bg-emerald-50 text-emerald-600 border-none text-[8px] font-black px-2 py-0">DIAN</Badge>
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 opacity-60">Emitidos</p>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">
                            {emitted}
                        </h3>
                    </CardContent>
                </Card>

                <Card className="rounded-[2.5rem] border-none bg-slate-900 shadow-lg relative overflow-hidden group hover:scale-105 transition-all duration-500">
                    <Receipt className="absolute -bottom-10 -right-10 h-40 w-40 text-white/5 rotate-12" />
                    <CardContent className="p-8 relative z-10 text-white">
                        <div className="flex items-center justify-between mb-4">
                            <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center text-white border border-white/10">
                                <TrendingUp className="h-6 w-6" />
                            </div>
                            <Badge className="bg-white/10 text-white border-none text-[8px] font-black px-2 py-0">VOLUMEN</Badge>
                        </div>
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Facturación Total</p>
                        <h3 className="text-xl font-black tracking-tight leading-tight truncate">
                            ${totalAmount.toLocaleString('es-CO')}
                        </h3>
                    </CardContent>
                </Card>
            </div>

            {/* 📋 TABLA DOCUMENTAL */}
            <div className="space-y-8">
                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center text-white">
                            <Zap className="h-5 w-5" />
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Registro Documental</h2>
                    </div>
                    <Badge variant="outline" className="bg-slate-50 text-slate-400 border-none px-4 py-1.5 font-black text-[10px] uppercase tracking-widest">
                        {data.length} registros
                    </Badge>
                </div>
                <DocumentList documents={data} />
            </div>
        </div>
    );
}
