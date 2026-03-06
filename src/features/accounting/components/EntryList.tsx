import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/components/ui/table";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { BookOpen, CheckCircle2, Activity, FileX2, ExternalLink } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import Link from "next/link";
import { Button } from "@/shared/components/ui/button";

interface EntryListProps {
    entries: Record<string, unknown>[];
}

export function EntryList({ entries }: EntryListProps) {
    if (!entries.length) {
        return (
            <Card className="rounded-2xl border border-slate-100 bg-white shadow-sm">
                <CardContent className="py-16 flex flex-col items-center justify-center text-center">
                    <div className="h-14 w-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 mb-4">
                        <FileX2 className="h-7 w-7" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-700 mb-1">Sin asientos contables</h3>
                    <p className="text-xs text-slate-400">No hay movimientos registrados en el periodo actual</p>
                </CardContent>
            </Card>
        );
    }

    const fmt = (val: number) => `$${val.toLocaleString('es-CO')}`;

    return (
        <div className="space-y-6">
            {entries.map((entry) => {
                const lines = entry.lines as Array<Record<string, unknown>> | null;
                const totalDebit = lines?.reduce((sum, l) => sum + Number(l.debit), 0) || 0;
                const totalCredit = lines?.reduce((sum, l) => sum + Number(l.credit), 0) || 0;

                return (
                    <Card key={entry.id as string} className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                        <CardHeader className="py-4 px-6 border-b border-slate-100 bg-slate-50/30">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
                                        <BookOpen className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-sm font-bold text-slate-900 line-clamp-1">
                                            {entry.description as string}
                                        </CardTitle>
                                        <div className="flex items-center gap-3 mt-0.5">
                                            <span className="text-[10px] text-slate-400">
                                                {format(new Date(entry.entry_date as string), 'dd MMM yyyy', { locale: es })}
                                            </span>
                                            <span className="text-[10px] font-mono text-slate-300">
                                                #{(entry.id as string).substring(0, 8)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge className="bg-emerald-50 text-emerald-600 border-none text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider gap-1">
                                        <CheckCircle2 className="h-3 w-3" /> {entry.status as string}
                                    </Badge>
                                    <Button variant="ghost" size="sm" asChild className="h-8 w-8 p-0 text-slate-300 hover:text-indigo-600">
                                        <Link href={`/accounting/entries/${entry.id}`}><ExternalLink className="h-4 w-4" /></Link>
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-slate-100 hover:bg-transparent bg-slate-50/50">
                                        <TableHead className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider py-3 pl-6">Cuenta (PUC)</TableHead>
                                        <TableHead className="hidden md:table-cell text-slate-400 font-semibold uppercase text-[10px] tracking-wider py-3">Descripción / Tercero</TableHead>
                                        <TableHead className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider py-3 text-right w-[130px]">Débito</TableHead>
                                        <TableHead className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider py-3 text-right pr-6 w-[130px]">Crédito</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {lines?.map((line) => {
                                        const account = line.account as { code?: string; name?: string } | null;
                                        const party = line.party as { legal_name?: string } | null;
                                        return (
                                            <TableRow key={line.id as string} className="border-slate-50 hover:bg-indigo-50/20 transition-colors">
                                                <TableCell className="py-3 pl-6">
                                                    <span className="font-mono text-xs font-semibold text-slate-900">{account?.code}</span>
                                                    <p className="text-[10px] text-slate-400 line-clamp-1">{account?.name}</p>
                                                </TableCell>
                                                <TableCell className="hidden md:table-cell py-3">
                                                    <p className="text-xs text-slate-600 line-clamp-1">{(line.description as string) || (entry.description as string)}</p>
                                                    {party?.legal_name && (
                                                        <p className="text-[10px] text-slate-400 mt-0.5">{party.legal_name}</p>
                                                    )}
                                                </TableCell>
                                                <TableCell className={cn(
                                                    "py-3 text-right font-mono text-sm font-medium",
                                                    Number(line.debit) > 0 ? "text-slate-900" : "text-slate-200"
                                                )}>
                                                    {Number(line.debit) > 0 ? fmt(Number(line.debit)) : '—'}
                                                </TableCell>
                                                <TableCell className={cn(
                                                    "py-3 text-right pr-6 font-mono text-sm font-medium",
                                                    Number(line.credit) > 0 ? "text-slate-900" : "text-slate-200"
                                                )}>
                                                    {Number(line.credit) > 0 ? fmt(Number(line.credit)) : '—'}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}

                                    {/* Totals */}
                                    <TableRow className="bg-slate-900 border-none hover:bg-slate-900">
                                        <TableCell className="py-4 pl-6 md:hidden">
                                            <div className="flex items-center gap-2">
                                                <Activity className="h-4 w-4 text-white/40" />
                                                <span className="text-white text-xs font-bold">Totales</span>
                                            </div>
                                        </TableCell>
                                        <TableCell colSpan={2} className="hidden md:table-cell py-4 pl-6">
                                            <div className="flex items-center gap-2">
                                                <Activity className="h-4 w-4 text-white/40" />
                                                <span className="text-white text-xs font-bold">Totales</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-4 text-right">
                                            <span className="text-sm font-bold text-white font-mono tabular-nums">{fmt(totalDebit)}</span>
                                        </TableCell>
                                        <TableCell className="py-4 text-right pr-6">
                                            <span className="text-sm font-bold text-white font-mono tabular-nums">{fmt(totalCredit)}</span>
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
