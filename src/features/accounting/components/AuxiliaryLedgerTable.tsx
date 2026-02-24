"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { BookOpen, Hash, Calendar, User, ArrowDownLeft, ArrowUpRight, Download, FileText, CheckCircle2, AlertCircle, Sparkles, Box, ArrowRight, Activity, ShieldCheck } from "lucide-react"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { pdfReportService } from "../services/pdfReportService"
import { excelReportService } from "../services/excelReportService"
import { TenantInfo } from "../../settings/services/settingsService"
import { cn } from "@/shared/lib/utils"

interface Props {
    data: any[]
    tenant: TenantInfo | null
    startDate: string
    endDate: string
}

export function AuxiliaryLedgerTable({ data, tenant, startDate, endDate }: Props) {
    const totalDebit = data.reduce((sum, r) => sum + (Number(r.debit) || 0), 0);
    const totalCredit = data.reduce((sum, r) => sum + (Number(r.credit) || 0), 0);
    const diff = Math.abs(totalDebit - totalCredit);
    const isBalanced = diff < 0.01;

    const formatCurrency = (val: number) => {
        return val.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    return (
        <Card className="rounded-[3.5rem] border-none bg-white shadow-premium overflow-hidden group">
            <CardHeader className="py-12 px-14 border-b border-slate-50 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform text-slate-900">
                    <BookOpen className="h-48 w-48" />
                </div>

                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-10 relative z-10">
                    <div className="flex items-center gap-8">
                        <div className="h-20 w-20 bg-indigo-50 rounded-[2rem] flex items-center justify-center text-indigo-600 shadow-inner group-hover:rotate-12 transition-transform duration-700">
                            <Activity className="h-10 w-10" />
                        </div>
                        <div>
                            <CardTitle className="text-3xl font-black text-slate-900 tracking-tighter italic uppercase leading-none">
                                Maestro Auxiliar
                            </CardTitle>
                            <div className="flex items-center gap-3 mt-3">
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em]">Trazabilidad Transaccional Forense</p>
                                <div className="h-1 w-1 rounded-full bg-slate-200" />
                                <Badge className="bg-emerald-50 text-emerald-600 border-none font-black text-[9px] tracking-widest px-3 py-1 rounded-full">
                                    {data.length} ASIENTOS
                                </Badge>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-5">
                        <Button
                            variant="outline"
                            className="bg-slate-900 border-none hover:bg-slate-800 text-white gap-3 h-14 px-10 rounded-2xl shadow-active transition-all hover:scale-105 active:scale-95 group/btn"
                            onClick={async () => {
                                await pdfReportService.generateAuxiliaryLedger(data.map(r => ({
                                    date: r.journal_entries?.entry_date,
                                    journal_number: r.journal_entries?.number,
                                    account_code: r.chart_accounts?.code,
                                    account_name: r.chart_accounts?.name,
                                    party: r.parties?.legal_name || '—',
                                    debit: Number(r.debit) || 0,
                                    credit: Number(r.credit) || 0,
                                    description: r.description || ''
                                })), {
                                    title: 'Libro Auxiliar',
                                    companyName: tenant?.name || 'EMPRESA',
                                    companyNit: tenant?.nit,
                                    companyAddress: tenant?.address,
                                    companyPhone: tenant?.phone,
                                    period: `${startDate} - ${endDate}`,
                                    logoUrl: tenant?.logo_url || undefined
                                });
                            }}
                        >
                            <Download className="h-5 w-5 text-indigo-400 group-hover/btn:animate-bounce" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Descargar Auditoría PDF</span>
                        </Button>
                        <Button
                            variant="outline"
                            className="h-14 w-14 rounded-2xl border-slate-100 bg-white text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all flex items-center justify-center shadow-sm"
                            onClick={() => excelReportService.exportToExcel(data, 'Libro_Auxiliar', 'Auxiliar')}
                        >
                            <FileText className="h-5 w-5" />
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto overflow-y-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-slate-50 hover:bg-transparent bg-slate-50/50">
                                <TableHead className="w-[200px] text-slate-400 font-black uppercase text-[9px] tracking-[0.5em] py-8 pl-14">Fecha / Hora</TableHead>
                                <TableHead className="w-[150px] text-slate-400 font-black uppercase text-[9px] tracking-[0.5em] py-8 text-center px-4">Master #</TableHead>
                                <TableHead className="text-slate-400 font-black uppercase text-[9px] tracking-[0.5em] py-8 px-4">Cuenta & Atribución</TableHead>
                                <TableHead className="text-right text-slate-400 font-black uppercase text-[9px] tracking-[0.5em] py-8 px-4">Imp. Débito</TableHead>
                                <TableHead className="text-right text-slate-400 font-black uppercase text-[9px] tracking-[0.5em] py-8 pr-14">Imp. Crédito</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.length === 0 ? (
                                <TableRow className="hover:bg-transparent">
                                    <TableCell colSpan={5} className="text-center py-48">
                                        <div className="flex flex-col items-center gap-10">
                                            <div className="h-28 w-28 bg-slate-50 rounded-[3rem] flex items-center justify-center border-8 border-white shadow-premium">
                                                <Activity className="h-12 w-12 text-slate-200" />
                                            </div>
                                            <div className="space-y-3">
                                                <p className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Silencio Transaccional</p>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No se detectaron movimientos en el espectro del periodo actual</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data.map((row) => (
                                    <TableRow key={row.id} className="border-slate-50 hover:bg-indigo-50/20 transition-all group/row">
                                        <TableCell className="py-8 pl-14">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-base font-black text-slate-900 tabular-nums tracking-tighter italic">
                                                    {row.journal_entries?.entry_date ? format(new Date(row.journal_entries.entry_date), 'dd · MMM · yyyy', { locale: es }) : '-'}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <Badge className="bg-slate-900 text-[8px] font-black text-white border-none py-0.5 px-2 rounded-md">
                                                        {row.journal_entries?.entry_date ? format(new Date(row.journal_entries.entry_date), 'HH:mm') : ''}
                                                    </Badge>
                                                    <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Audit Time-Stamp</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-8 text-center px-4">
                                            <div className="inline-flex items-center justify-center h-12 px-5 rounded-2xl bg-white border border-slate-100 shadow-sm group-hover/row:border-indigo-400 group-hover/row:shadow-active transition-all">
                                                <span className="text-xs font-black text-slate-900 font-mono tracking-tighter uppercase italic">
                                                    #{row.journal_entries?.number || 'GVM-00'}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-8 px-4">
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 font-black font-mono text-[10px] group-hover/row:bg-white group-hover/row:shadow-sm transition-all border border-slate-50">
                                                        {row.chart_accounts?.code[0]}
                                                    </div>
                                                    <div className="space-y-0.5">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-mono text-base font-black text-slate-900 tracking-tighter italic group-hover/row:text-indigo-600">
                                                                {row.chart_accounts?.code}
                                                            </span>
                                                            <ArrowRight className="h-3 w-3 text-slate-200 group-hover/row:translate-x-1 transition-all" />
                                                            <span className="text-sm font-black text-slate-800 uppercase tracking-tight italic">
                                                                {row.chart_accounts?.name}
                                                            </span>
                                                        </div>
                                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-none">Imputación Maestra PUC</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 ml-14">
                                                    <div className="h-px w-6 bg-slate-100" />
                                                    <span className="text-[10px] font-black font-mono text-slate-400 uppercase tracking-widest flex items-center gap-2 border-b border-dashed border-slate-200 pb-0.5 pr-2">
                                                        <User className="h-3 w-3 text-slate-300" />
                                                        {row.parties?.legal_name || 'TERCERO GENÉRICO / SISTEMA'}
                                                    </span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-8 text-right px-4">
                                            {Number(row.debit) > 0 ? (
                                                <div className="inline-flex flex-col items-end px-5 py-3 bg-indigo-50/50 rounded-2xl border border-indigo-100/50 group-hover/row:translate-y-[-4px] transition-transform shadow-inner">
                                                    <span className="text-lg font-black text-indigo-700 font-mono tracking-tighter italic leading-none">
                                                        ${formatCurrency(Number(row.debit))}
                                                    </span>
                                                    <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest leading-none mt-2">Mov. Débito (+)</span>
                                                </div>
                                            ) : (
                                                <div className="h-1 w-20 bg-slate-50 rounded-full ml-auto opacity-20" />
                                            )}
                                        </TableCell>
                                        <TableCell className="py-8 text-right pr-14">
                                            {Number(row.credit) > 0 ? (
                                                <div className="inline-flex flex-col items-end px-5 py-3 bg-slate-900 rounded-2xl border border-white/10 group-hover/row:translate-y-[-4px] transition-transform shadow-active text-white">
                                                    <span className="text-lg font-black text-white font-mono tracking-tighter italic leading-none">
                                                        ${formatCurrency(Number(row.credit))}
                                                    </span>
                                                    <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest leading-none mt-2">Mov. Crédito (-)</span>
                                                </div>
                                            ) : (
                                                <div className="h-1 w-20 bg-slate-50 rounded-full ml-auto opacity-20" />
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}

                            {/* 🦾 INDUSTRIAL CONSOLIDATION FOOTER */}
                            <TableRow className="bg-slate-900 border-none hover:bg-slate-950 transition-colors relative overflow-hidden group/footer">
                                <TableCell colSpan={3} className="py-16 pl-14 relative z-10">
                                    <div className="flex items-center gap-8">
                                        <div className="h-16 w-16 rounded-3xl bg-white/10 flex items-center justify-center border border-white/10 shadow-inner group-hover/footer:rotate-12 transition-transform duration-700">
                                            <ShieldCheck className="h-10 w-10 text-white" />
                                        </div>
                                        <div className="space-y-2">
                                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.5em] leading-none block">Protocolo de Cierre v3</span>
                                            <div className="flex items-center gap-4">
                                                <h4 className="text-2xl font-black text-white italic tracking-tighter uppercase leading-none">Ejecución del Libro</h4>
                                                <div className={cn(
                                                    "px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all duration-700",
                                                    isBalanced ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]" : "bg-rose-500/20 text-rose-400 border-rose-500/30 animate-pulse"
                                                )}>
                                                    {isBalanced ? '✓ Partida Doble Íntegra' : '⚠ Descuadre en Libro'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="py-16 text-right relative z-10 px-4">
                                    <div className="space-y-3">
                                        <span className="text-[10px] text-white/30 font-black uppercase tracking-[0.5em] italic">Total Débitos</span>
                                        <div className="text-4xl font-black text-white font-mono tracking-tighter italic leading-none">
                                            ${formatCurrency(totalDebit)}
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="py-16 text-right pr-14 relative z-10">
                                    <div className="space-y-3">
                                        <span className="text-[10px] text-white/30 font-black uppercase tracking-[0.5em] italic">Total Créditos</span>
                                        <div className="text-4xl font-black text-white font-mono tracking-tighter italic leading-none">
                                            ${formatCurrency(totalCredit)}
                                        </div>
                                    </div>
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
