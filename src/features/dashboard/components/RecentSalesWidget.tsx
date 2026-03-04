import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import { Button } from "@/shared/components/ui/button"
import Link from "next/link"
import { ArrowUpRight, History, Search } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Badge } from "@/shared/components/ui/badge"
import { cn } from "@/shared/lib/utils"

/** Deterministic number formatter — avoids server/client locale mismatch */
function fmtNum(n: number): string {
    const abs = Math.abs(Math.round(n));
    const formatted = abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return n < 0 ? `-${formatted}` : formatted;
}

interface RecentSalesWidgetProps {
    data: any[]
}

export function RecentSalesWidget({ data }: RecentSalesWidgetProps) {
    return (
        <Card className="rounded-2xl border-none bg-white shadow-sm overflow-hidden animate-in fade-in duration-1000">
            <CardHeader className="p-6 border-b border-slate-50 flex flex-row items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-active">
                        <History className="h-5 w-5" />
                    </div>
                    <div className="space-y-0.5">
                        <CardTitle className="text-xl font-bold text-slate-900 tracking-tight italic uppercase leading-none">Flujo Operativo</CardTitle>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Movimientos Recientes</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-none bg-slate-50 text-slate-400 hover:bg-slate-900 hover:text-white transition-all shadow-inner">
                        <Search className="h-4 w-4" />
                    </Button>
                    <Button asChild className="h-9 px-6 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-[9px] uppercase tracking-widest shadow-active">
                        <Link href="/documents" className="flex items-center gap-2">
                            Monitor <ArrowUpRight className="h-3.5 w-3.5" />
                        </Link>
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader className="bg-slate-50/50">
                        <TableRow className="border-slate-50 hover:bg-transparent">
                            <TableHead className="text-[8px] font-bold uppercase tracking-widest text-slate-400 pl-8 py-4 italic text-left">Referencia</TableHead>
                            <TableHead className="text-[8px] font-bold uppercase tracking-widest text-slate-400 py-4 italic text-left">Contraparte</TableHead>
                            <TableHead className="text-[8px] font-bold uppercase tracking-widest text-slate-400 py-4 italic text-right pr-8">Importe</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.length === 0 ? (
                            <TableRow className="hover:bg-transparent">
                                <TableCell colSpan={3} className="py-20 text-center">
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="h-14 w-14 rounded-xl bg-slate-50 flex items-center justify-center text-slate-200">
                                            <History className="h-7 w-7" />
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest italic">Sin Movimientos</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            data.map((item) => (
                                <TableRow key={item.id} className="border-slate-50 hover:bg-slate-50/50 transition-all duration-300 group">
                                    <TableCell className="py-4 pl-8">
                                        <div className="flex items-center gap-4">
                                            <div className="h-9 w-9 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all duration-300 shadow-sm">
                                                <History className="h-4 w-4" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-900 italic tracking-tight group-hover:text-primary transition-colors leading-none">{item.number || 'DOC-001'}</span>
                                                <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-1">{format(new Date(item.issue_date), 'MMM d, yyyy', { locale: es }).toUpperCase()}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-7 w-7 rounded-lg bg-slate-900 flex items-center justify-center text-white font-bold text-[9px] italic shadow-sm">
                                                {item.party?.legal_name?.substring(0, 1) || 'C'}
                                            </div>
                                            <div className="flex flex-col leading-none">
                                                <span className="text-xs font-bold text-slate-700 uppercase italic tracking-tight group-hover:text-slate-900 transition-colors">{item.party?.legal_name || 'CONSUMIDOR FINAL'}</span>
                                                <span className="text-[7px] font-bold text-slate-300 uppercase tracking-widest mt-0.5">Entidad Fiscal</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-4 text-right pr-8">
                                        <div className="flex flex-col items-end gap-1">
                                            <span className="text-lg font-bold text-slate-900 font-mono tracking-tight italic group-hover:scale-105 transition-transform origin-right leading-none">
                                                ${fmtNum(item.total ?? 0)}
                                            </span>
                                            <Badge variant="outline" className={cn(
                                                "text-[7px] font-bold border-none h-4 px-2 rounded tracking-widest leading-none flex items-center gap-1",
                                                item.status === 'SENT' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                                            )}>
                                                <div className={cn("h-1 w-1 rounded-full", item.status === 'SENT' ? "bg-emerald-500" : "bg-amber-500")} />
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
    )
}
