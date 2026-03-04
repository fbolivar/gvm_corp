"use client"

import { Button } from "@/shared/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import { Badge } from "@/shared/components/ui/badge"
import {
    ArrowLeft, Printer, CheckCircle2, Calendar, BookOpen,
    ArrowUpRight, Activity, Info
} from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { useRouter } from "next/navigation"
import { cn } from "@/shared/lib/utils"
import Link from "next/link"

interface EntryDetailProps {
    entry: Record<string, unknown>;
}

export function EntryDetail({ entry }: EntryDetailProps) {
    const router = useRouter();

    const lines = entry.lines as Array<Record<string, unknown>> | null;
    const totalDebit = lines?.reduce((sum, l) => sum + Number(l.debit), 0) || 0;
    const totalCredit = lines?.reduce((sum, l) => sum + Number(l.credit), 0) || 0;
    const diff = Math.abs(totalDebit - totalCredit);
    const isBalanced = diff < 0.01;

    const fmt = (val: unknown) => {
        const num = Number(val);
        if (isNaN(num)) return '$0';
        return `$${num.toLocaleString('es-CO')}`;
    };

    return (
        <div className="page-container space-y-8 pb-20 animate-in fade-in duration-500 max-w-5xl mx-auto">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => router.back()}
                        className="h-10 w-10 rounded-xl"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                                Comprobante Contable
                            </h1>
                            <Badge variant="outline" className="text-[10px] font-mono text-slate-400 px-2 py-0.5">
                                #{(entry.id as string).substring(0, 8)}
                            </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-1">
                            <span className="text-xs text-slate-400 flex items-center gap-1.5">
                                <Calendar className="h-3 w-3 text-indigo-500" />
                                {format(new Date(entry.entry_date as string), 'PPP', { locale: es })}
                            </span>
                            <span className="text-xs text-slate-400">
                                Período: {entry.period as string}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-9 px-4 rounded-xl gap-2">
                        <Printer className="h-3.5 w-3.5" />
                        <span className="text-xs">Imprimir</span>
                    </Button>
                    <Badge className={cn(
                        "h-8 px-3 rounded-xl border-none text-[10px] font-bold uppercase tracking-wider gap-1.5",
                        "bg-emerald-50 text-emerald-600"
                    )}>
                        <CheckCircle2 className="h-3.5 w-3.5" /> {(entry.status as string) || 'CONTABILIZADO'}
                    </Badge>
                </div>
            </div>

            {/* Table */}
            <Card className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                <CardHeader className="py-5 px-6 border-b border-slate-100 bg-slate-50/30">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                <BookOpen className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-base font-bold text-slate-900">{entry.description as string}</CardTitle>
                                <p className="text-[10px] text-slate-400 mt-0.5">Glosa del asiento</p>
                            </div>
                        </div>
                        {typeof entry.document_id === 'string' && (
                            <Button asChild variant="outline" size="sm" className="h-9 rounded-xl gap-2 text-xs">
                                <Link href={`/documents/${entry.document_id}`}>
                                    Documento Fuente <ArrowUpRight className="h-3 w-3" />
                                </Link>
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-slate-100 hover:bg-transparent bg-slate-50/50">
                                <TableHead className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider pl-6 py-3">Cuenta (PUC)</TableHead>
                                <TableHead className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider py-3">Descripción / Tercero</TableHead>
                                <TableHead className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider text-right py-3 w-[150px]">Débito</TableHead>
                                <TableHead className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider text-right pr-6 py-3 w-[150px]">Crédito</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {lines?.map((line) => {
                                const account = line.account as { code?: string; name?: string } | null;
                                const party = line.party as { legal_name?: string } | null;
                                return (
                                    <TableRow key={line.id as string} className="border-slate-50 hover:bg-indigo-50/20 transition-colors">
                                        <TableCell className="py-3.5 pl-6">
                                            <span className="font-mono text-xs font-semibold text-slate-900">{account?.code}</span>
                                            <p className="text-[10px] text-slate-400 line-clamp-1">{account?.name}</p>
                                        </TableCell>
                                        <TableCell className="py-3.5">
                                            <p className="text-xs text-slate-600 line-clamp-1">
                                                {(line.description as string) || (entry.description as string)}
                                            </p>
                                            {party?.legal_name && (
                                                <p className="text-[10px] text-slate-400 mt-0.5">{party.legal_name}</p>
                                            )}
                                        </TableCell>
                                        <TableCell className={cn(
                                            "py-3.5 text-right font-mono text-sm font-medium",
                                            Number(line.debit) > 0 ? "text-slate-900" : "text-slate-200"
                                        )}>
                                            {Number(line.debit) > 0 ? fmt(line.debit) : '—'}
                                        </TableCell>
                                        <TableCell className={cn(
                                            "py-3.5 text-right pr-6 font-mono text-sm font-medium",
                                            Number(line.credit) > 0 ? "text-slate-900" : "text-slate-200"
                                        )}>
                                            {Number(line.credit) > 0 ? fmt(line.credit) : '—'}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}

                            {/* Totals */}
                            <TableRow className="bg-slate-900 border-none hover:bg-slate-900">
                                <TableCell colSpan={2} className="py-5 pl-6">
                                    <div className="flex items-center gap-3">
                                        <div className="h-9 w-9 bg-white/10 rounded-xl flex items-center justify-center text-white">
                                            <Activity className="h-5 w-5" />
                                        </div>
                                        <span className="text-white text-sm font-bold">Totales del Asiento</span>
                                    </div>
                                </TableCell>
                                <TableCell className="py-5 text-right">
                                    <p className="text-[9px] text-white/40 uppercase tracking-wider mb-1">Débito</p>
                                    <span className="text-lg font-bold text-white font-mono tabular-nums tracking-tight">
                                        {fmt(totalDebit)}
                                    </span>
                                </TableCell>
                                <TableCell className="py-5 text-right pr-6">
                                    <p className="text-[9px] text-white/40 uppercase tracking-wider mb-1">Crédito</p>
                                    <span className="text-lg font-bold text-white font-mono tabular-nums tracking-tight">
                                        {fmt(totalCredit)}
                                    </span>
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Audit Footnote */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center text-slate-300 shadow-sm shrink-0">
                        <Info className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-slate-600">Registro de Auditoría</p>
                        <p className="text-[10px] text-slate-400">Partida doble verificada automáticamente</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-center px-4 py-2 bg-white rounded-xl border border-slate-100">
                        <p className="text-[9px] text-slate-400 uppercase tracking-wider">Diferencia</p>
                        <p className="text-sm font-bold text-slate-900 font-mono">{fmt(diff)}</p>
                    </div>
                    <Badge className={cn(
                        "h-8 px-3 rounded-xl border-none text-[10px] font-bold uppercase tracking-wider",
                        isBalanced ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                    )}>
                        {isBalanced ? 'VERIFICADO' : 'DESCUADRE'}
                    </Badge>
                </div>
            </div>
        </div>
    )
}
