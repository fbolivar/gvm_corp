import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { Button } from '@/shared/components/ui/button';
import Link from 'next/link';
import { ArrowUpRight, History } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/shared/components/ui/badge';
import { cn } from '@/shared/lib/utils';

/** Deterministic number formatter — avoids server/client locale mismatch */
function fmtNum(n: number): string {
    const abs = Math.abs(Math.round(n));
    const formatted = abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return n < 0 ? `-${formatted}` : formatted;
}

interface RecentSalesWidgetProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any[];
}

export function RecentSalesWidget({ data }: RecentSalesWidgetProps) {
    return (
        <Card className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
            <CardHeader className="p-5 border-b border-slate-50 flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center text-white">
                        <History className="h-5 w-5" />
                    </div>
                    <div>
                        <CardTitle className="text-sm font-bold text-slate-900">Flujo Operativo</CardTitle>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Movimientos Recientes</p>
                    </div>
                </div>
                <Button asChild className="h-8 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-[10px] font-semibold gap-1.5">
                    <Link href="/documents">
                        Ver Todos <ArrowUpRight className="h-3 w-3" />
                    </Link>
                </Button>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow className="border-slate-50 hover:bg-transparent">
                            <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 pl-5 py-3">Referencia</TableHead>
                            <TableHead className="hidden md:table-cell text-[10px] font-semibold uppercase tracking-wider text-slate-400 py-3">Contraparte</TableHead>
                            <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 py-3 text-right pr-5">Importe</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.length === 0 ? (
                            <TableRow className="hover:bg-transparent">
                                <TableCell colSpan={3} className="py-12 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <History className="h-8 w-8 text-slate-200" />
                                        <span className="text-[10px] font-semibold text-slate-400">Sin Movimientos</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            data.map((item) => (
                                <TableRow key={item.id} className="border-slate-50 hover:bg-slate-50/50 transition-colors">
                                    <TableCell className="py-3 pl-5">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
                                                <History className="h-3.5 w-3.5" />
                                            </div>
                                            <div>
                                                <span className="text-sm font-bold text-slate-900">{item.number || 'DOC-001'}</span>
                                                <p className="text-[10px] text-slate-400 mt-0.5">
                                                    {format(new Date(item.issue_date), 'dd MMM yyyy', { locale: es })}
                                                </p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell py-3">
                                        <span className="text-sm text-slate-700">{item.party?.legal_name || 'CONSUMIDOR FINAL'}</span>
                                    </TableCell>
                                    <TableCell className="py-3 text-right pr-5">
                                        <div className="flex flex-col items-end gap-1">
                                            <span className="text-sm font-bold text-slate-900 tabular-nums">
                                                ${fmtNum(item.total ?? 0)}
                                            </span>
                                            <Badge variant="outline" className={cn(
                                                'text-[9px] font-semibold border-none px-1.5 py-0.5 rounded-full',
                                                item.status === 'SENT' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600',
                                            )}>
                                                {item.status}
                                            </Badge>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
