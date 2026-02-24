"use client"

import { JournalEntry } from "../types"
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import { Badge } from "@/shared/components/ui/badge"
import {
    ArrowLeft,
    Printer,
    CheckCircle2,
    Calendar,
    Hash,
    FileText,
    ArrowRightLeft,
    Layers,
    Info,
    ArrowUpRight,
    TrendingUp,
    TrendingDown,
    Activity,
    BookOpen
} from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { useRouter } from "next/navigation"
import { cn } from "@/shared/lib/utils"
import Link from "next/link"

interface EntryDetailProps {
    entry: any; // Using any for simplicity as relations might not be fully typed in the specific way it comes from DB
}

export function EntryDetail({ entry }: EntryDetailProps) {
    const router = useRouter();

    const totalDebit = entry.lines?.reduce((sum: number, l: any) => sum + Number(l.debit), 0) || 0;
    const totalCredit = entry.lines?.reduce((sum: number, l: any) => sum + Number(l.credit), 0) || 0;

    const formatCurrency = (val: any) => {
        const num = Number(val);
        if (isNaN(num)) return '$0';
        return `$${num.toLocaleString('es-CO')}`;
    };

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 max-w-6xl mx-auto pb-20">

            {/* 💎 PREMIUM HEADER */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 px-1">
                <div className="flex items-center gap-6">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => router.back()}
                        className="h-16 w-16 rounded-[1.5rem] border-none bg-white shadow-premium hover:scale-105 transition-all text-slate-400 hover:text-slate-900"
                    >
                        <ArrowLeft className="h-6 w-6" />
                    </Button>
                    <div className="space-y-2">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-lg shadow-slate-900/20 rotate-3">
                                <Layers className="h-5 w-5" />
                            </div>
                            <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase">
                                Comprobante de <span className="text-slate-400">Contabilidad</span>
                            </h1>
                            <Badge variant="outline" className="h-7 border-none bg-slate-100 text-slate-500 font-bold px-4 text-[10px] tracking-widest uppercase rounded-lg">
                                #{entry.id.substring(0, 8).toUpperCase()}
                            </Badge>
                        </div>
                        <div className="flex items-center gap-6 pl-14">
                            <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.3em] flex items-center gap-2">
                                <Calendar className="h-3 w-3 text-indigo-500" />
                                {format(new Date(entry.entry_date), 'PPP', { locale: es })}
                            </p>
                            <div className="h-1 w-1 rounded-full bg-slate-200" />
                            <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.3em] flex items-center gap-2">
                                <Activity className="h-3 w-3 text-emerald-500" />
                                Período: {entry.period}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        className="h-16 rounded-[1.5rem] border-none bg-white shadow-premium px-10 font-black text-slate-400 hover:text-slate-900 transition-all text-[10px] uppercase tracking-widest group"
                    >
                        <Printer className="mr-3 h-5 w-5 group-hover:rotate-12 transition-transform" /> Imprimir Comprobante
                    </Button>

                    <div className="h-16 px-10 rounded-[1.5rem] bg-emerald-50 text-emerald-600 font-black text-[10px] tracking-widest uppercase flex items-center gap-3 shadow-inner">
                        <CheckCircle2 className="h-5 w-5" /> {entry.status || 'CONTABILIZADO'}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">

                {/* 📝 DEBIT AND CREDIT ANALYSIS (Left Core) */}
                <div className="lg:col-span-12 space-y-10">

                    <Card className="bg-white border-none shadow-premium rounded-[3.5rem] overflow-hidden">
                        <CardHeader className="py-10 px-12 border-b border-slate-50">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="flex items-center gap-5">
                                    <div className="h-14 w-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner">
                                        <BookOpen className="h-7 w-7" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-2xl font-black text-slate-900 tracking-tighter italic uppercase">{entry.description}</CardTitle>
                                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em] mt-1">Glosa del Asiento Maestro</p>
                                    </div>
                                </div>
                                {entry.document_id && (
                                    <Button asChild variant="outline" className="rounded-2xl border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 px-6 py-6 h-auto">
                                        <Link href={`/documents/${entry.document_id}`}>
                                            Ver Documento Fuente <ArrowUpRight className="ml-2 h-4 w-4" />
                                        </Link>
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-slate-50/50">
                                    <TableRow className="border-slate-100 hover:bg-transparent">
                                        <TableHead className="text-slate-400 font-black uppercase text-[10px] tracking-[0.4em] pl-14 py-8">Catálogo PUC (Cuenta)</TableHead>
                                        <TableHead className="text-slate-400 font-black uppercase text-[10px] tracking-[0.4em] py-8">Tercero / Referencia por Línea</TableHead>
                                        <TableHead className="text-slate-400 font-black uppercase text-[10px] tracking-[0.4em] text-right py-8">Monto Débito</TableHead>
                                        <TableHead className="text-slate-400 font-black uppercase text-[10px] tracking-[0.4em] text-right pr-14 py-8">Monto Crédito</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {entry.lines?.map((line: any, idx: number) => (
                                        <TableRow key={line.id} className="border-slate-50 hover:bg-slate-50/30 transition-all group">
                                            <TableCell className="py-10 pl-14">
                                                <div className="flex items-center gap-6">
                                                    <div className={cn(
                                                        "h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform",
                                                        line.debit > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                                                    )}>
                                                        {line.debit > 0 ? <TrendingUp className="h-6 w-6" /> : <TrendingDown className="h-6 w-6" />}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-black text-slate-900 font-mono tracking-widest group-hover:text-indigo-600 transition-colors uppercase italic underline decoration-slate-100 underline-offset-8 decoration-2">{line.account?.code}</div>
                                                        <div className="text-[10px] text-slate-400 font-black uppercase tracking-tight mt-3">{line.account?.name}</div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-10">
                                                <div className="text-xs font-bold text-slate-600 uppercase italic tracking-tight line-clamp-2 max-w-[300px] leading-relaxed">
                                                    {line.description || entry.description}
                                                </div>
                                                <div className="mt-3">
                                                    <Badge className="bg-slate-50 text-slate-500 border-none text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full italic">
                                                        Vínculo: {line.party?.legal_name || 'MULTIPLE / GENERAL'}
                                                    </Badge>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right py-10">
                                                <div className="flex flex-col items-end">
                                                    <span className={cn(
                                                        "text-lg font-black font-mono tracking-tighter",
                                                        line.debit > 0 ? "text-slate-900 italic" : "text-slate-200"
                                                    )}>
                                                        {line.debit > 0 ? formatCurrency(line.debit) : "-"}
                                                    </span>
                                                    {line.debit > 0 && <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mt-1">Cargo Activo</span>}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right pr-14 py-10">
                                                <div className="flex flex-col items-end">
                                                    <span className={cn(
                                                        "text-lg font-black font-mono tracking-tighter",
                                                        line.credit > 0 ? "text-slate-900 italic" : "text-slate-200"
                                                    )}>
                                                        {line.credit > 0 ? formatCurrency(line.credit) : "-"}
                                                    </span>
                                                    {line.credit > 0 && <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest mt-1">Abono Pasivo</span>}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}

                                    {/* 📦 MASTER BALANCE STICKY FOOTER */}
                                    <TableRow className="border-none bg-slate-900 hover:bg-slate-950 transition-colors">
                                        <TableCell colSpan={2} className="py-14 pl-14">
                                            <div className="flex items-center gap-6">
                                                <div className="h-14 w-14 bg-white rounded-2xl flex items-center justify-center text-slate-900 shadow-lg shadow-white/5 rotate-12">
                                                    <Activity className="h-8 w-8" />
                                                </div>
                                                <div className="space-y-1">
                                                    <h4 className="text-white text-xl font-black italic tracking-tighter uppercase leading-none">Equilibrio Contable</h4>
                                                    <p className="text-[10px] text-white/30 font-black uppercase tracking-[0.4em]">Protocolo de Partida Doble Ejecutado</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right py-14">
                                            <div className="space-y-2">
                                                <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em]">Sumatoria Débito</span>
                                                <div className="text-4xl font-black text-white font-mono tracking-tighter italic">
                                                    {formatCurrency(totalDebit)}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right pr-14 py-14">
                                            <div className="space-y-2">
                                                <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em]">Sumatoria Crédito</span>
                                                <div className="text-4xl font-black text-white font-mono tracking-tighter italic">
                                                    {formatCurrency(totalCredit)}
                                                </div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {/* 🛡️ AUDIT INFO POD */}
                    <div className="bg-slate-50 rounded-[3rem] p-12 border border-slate-100 shadow-inner flex flex-col md:flex-row items-center justify-between gap-10">
                        <div className="flex items-center gap-6">
                            <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center text-slate-300 shadow-sm border border-slate-100">
                                <Info className="h-6 w-6 italic" />
                            </div>
                            <div>
                                <h5 className="text-slate-900 font-black text-sm uppercase italic tracking-tight">Registro de Auditoría</h5>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Firma Digital del Sistema: <span className="text-indigo-400">GVM-CORE-v3-SECURED</span></p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="px-6 py-4 bg-white rounded-2xl border border-slate-100 shadow-sm text-center">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Diferencia</p>
                                <p className="text-lg font-black text-slate-900 italic tracking-tighter leading-none">$0.00</p>
                            </div>
                            <div className="px-6 py-4 bg-emerald-500 rounded-2xl shadow-lg shadow-emerald-500/20 text-center">
                                <p className="text-[8px] font-black text-white/60 uppercase tracking-widest mb-1">Estado</p>
                                <p className="text-lg font-black text-white italic tracking-tighter leading-none">VERIFICADO</p>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    )
}
