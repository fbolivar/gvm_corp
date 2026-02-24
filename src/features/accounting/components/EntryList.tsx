import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/shared/components/ui/table";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
    BookOpen,
    Calendar,
    Hash,
    Layers,
    ArrowRightLeft,
    CheckCircle2,
    ArrowUpRight,
    Search,
    ChevronRight,
    Box
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import Link from "next/link";
import { Button } from "@/shared/components/ui/button";

interface EntryListProps {
    entries: any[];
}

export function EntryList({ entries }: EntryListProps) {
    if (!entries.length) {
        return (
            <div className="flex flex-col items-center justify-center py-32 bg-slate-50 rounded-[4rem] border border-dashed border-slate-200 shadow-inner">
                <Box className="h-16 w-16 text-slate-200 mb-6" />
                <p className="text-slate-400 font-black uppercase tracking-[0.4em] text-xs underline decoration-slate-200 underline-offset-8">Bóveda de Asientos Vacía</p>
            </div>
        );
    }

    return (
        <div className="space-y-12">
            {entries.map((entry) => {
                const totalDebit = entry.lines?.reduce((sum: number, l: any) => sum + Number(l.debit), 0) || 0;
                const totalCredit = entry.lines?.reduce((sum: number, l: any) => sum + Number(l.credit), 0) || 0;

                return (
                    <Card key={entry.id} className="rounded-[4rem] border-none bg-white shadow-premium overflow-hidden group hover:translate-y-[-4px] transition-all duration-500">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-10 px-12">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                                <div className="flex items-center gap-6">
                                    <div className="h-16 w-16 bg-slate-900 rounded-2xl flex items-center justify-center shadow-active rotate-3 group-hover:rotate-0 transition-all shrink-0">
                                        <Layers className="h-8 w-8 text-white" />
                                    </div>
                                    <div className="space-y-1">
                                        <CardTitle className="text-slate-900 text-2xl font-black italic tracking-tighter uppercase leading-none">
                                            {entry.description}
                                        </CardTitle>
                                        <div className="flex items-center gap-4 text-[10px] text-slate-400 font-black uppercase tracking-[0.3em]">
                                            <span className="flex items-center gap-2">
                                                <Calendar className="h-3 w-3 text-indigo-500" />
                                                {format(new Date(entry.entry_date), 'PPP', { locale: es })}
                                            </span>
                                            <span className="h-1 w-1 rounded-full bg-slate-200" />
                                            <span className="flex items-center gap-2 font-mono">
                                                <Hash className="h-3 w-3 text-amber-500" />
                                                {entry.id.substring(0, 8).toUpperCase()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-100 rounded-full px-6 py-2 flex items-center gap-2 text-[10px] font-black tracking-widest uppercase">
                                        <CheckCircle2 className="h-3 w-3" /> {entry.status}
                                    </Badge>
                                    <Button variant="ghost" size="icon" asChild className="h-12 w-12 rounded-2xl text-slate-200 hover:text-indigo-600 hover:bg-white hover:shadow-premium transition-all active:scale-90">
                                        <Link href={`/accounting/entries/${entry.id}`}><Search className="h-6 w-6" /></Link>
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-slate-50/30">
                                    <TableRow className="border-slate-50 hover:bg-transparent">
                                        <TableHead className="text-slate-400 font-black uppercase text-[9px] tracking-[0.4em] py-8 pl-14">Cuenta Maestría (PUC)</TableHead>
                                        <TableHead className="text-slate-400 font-black uppercase text-[9px] tracking-[0.4em] py-8">Descriptor / Tercero</TableHead>
                                        <TableHead className="text-slate-400 font-black uppercase text-[9px] tracking-[0.4em] py-8 text-right">Débito Ejecutivo</TableHead>
                                        <TableHead className="text-slate-400 font-black uppercase text-[9px] tracking-[0.4em] py-8 text-right pr-14">Crédito Ejecutivo</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {entry.lines?.map((line: any) => (
                                        <TableRow key={line.id} className="border-slate-50 hover:bg-slate-50/50 transition-all group/row">
                                            <TableCell className="py-8 pl-14">
                                                <div className="flex items-center gap-6">
                                                    <div className={cn(
                                                        "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 shadow-inner group-hover/row:rotate-12 transition-transform",
                                                        line.debit > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                                                    )}>
                                                        <ArrowRightLeft className="h-4 w-4" />
                                                    </div>
                                                    <div>
                                                        <div className="font-black text-xs text-slate-900 tracking-widest font-mono italic underline decoration-slate-200 underline-offset-4">{line.account?.code}</div>
                                                        <div className="text-[10px] text-slate-400 font-black uppercase tracking-tight mt-1">{line.account?.name}</div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-8">
                                                <div className="text-[11px] text-slate-600 font-bold max-w-[300px] line-clamp-1 italic uppercase">{line.description}</div>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <Badge className="bg-slate-50 text-slate-400 border-none text-[8px] font-black uppercase tracking-widest px-2">
                                                        Tercero: {line.party?.legal_name || 'GENERAL'}
                                                    </Badge>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-8 text-right font-mono text-base font-black tracking-tighter text-emerald-600 italic">
                                                {line.debit > 0 ? `$${line.debit.toLocaleString('es-CO')}` : '-'}
                                            </TableCell>
                                            <TableCell className="py-8 text-right pr-14 font-mono text-base font-black tracking-tighter text-rose-600 italic">
                                                {line.credit > 0 ? `$${line.credit.toLocaleString('es-CO')}` : '-'}
                                            </TableCell>
                                        </TableRow>
                                    ))}

                                    {/* Subtotal Balance Row */}
                                    <TableRow className="bg-slate-900 border-none hover:bg-slate-950 transition-colors">
                                        <TableCell colSpan={2} className="py-10 pl-14">
                                            <div className="flex items-center gap-4">
                                                <div className="h-8 w-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                                                    <ChevronRight className="h-5 w-5" />
                                                </div>
                                                <div className="space-y-0.5">
                                                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em]">Liquidación del Asiento</p>
                                                    <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest italic font-mono">Partida Doble Verificada</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-10 text-right">
                                            <div className="flex flex-col items-end">
                                                <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mb-2">Total Débito</span>
                                                <span className="text-2xl font-black text-white font-mono tracking-tighter italic">${totalDebit.toLocaleString('es-CO')}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-10 text-right pr-14">
                                            <div className="flex flex-col items-end">
                                                <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mb-2">Total Crédito</span>
                                                <span className="text-2xl font-black text-white font-mono tracking-tighter italic">${totalCredit.toLocaleString('es-CO')}</span>
                                            </div>
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
