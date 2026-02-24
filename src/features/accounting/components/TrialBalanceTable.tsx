"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Scale, CheckCircle2, AlertCircle, FileText, Download, TrendingUp, TrendingDown, Activity, Info } from "lucide-react"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { pdfReportService } from "../services/pdfReportService"
import { excelReportService } from "../services/excelReportService"
import { TenantInfo } from "../../settings/services/settingsService"
import { cn } from "@/shared/lib/utils"

interface TrialBalanceData {
    code: string
    name: string
    debit: number
    credit: number
    balance: number
}

interface Props {
    rows: TrialBalanceData[]
    startDate: string
    endDate: string
    tenant: TenantInfo | null
}

export function TrialBalanceTable({ rows, startDate, endDate, tenant }: Props) {
    const totalDebit = rows.reduce((sum, r) => sum + r.debit, 0);
    const totalCredit = rows.reduce((sum, r) => sum + r.credit, 0);
    const diff = Math.abs(totalDebit - totalCredit);
    const isBalanced = diff < 0.01;

    const formatCurrency = (val: number) => {
        return val.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    return (
        <Card className="rounded-[3.5rem] border-none bg-white shadow-premium overflow-hidden">
            <CardHeader className="py-10 px-12 border-b border-slate-50">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                    <div className="flex items-center gap-5">
                        <div className="h-14 w-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner">
                            <Scale className="h-7 w-7" />
                        </div>
                        <div>
                            <CardTitle className="text-2xl font-black text-slate-900 tracking-tighter italic uppercase">
                                Balance de Comprobación
                            </CardTitle>
                            <div className="flex items-center gap-3 mt-1">
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em]">Integridad de Saldos Maestro</p>
                                <div className="h-1 w-1 rounded-full bg-slate-200" />
                                <Badge className={cn(
                                    "border-none px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all duration-700",
                                    isBalanced ? "bg-emerald-50 text-emerald-600 shadow-sm" : "bg-rose-50 text-rose-600 animate-pulse shadow-sm"
                                )}>
                                    {isBalanced ? "✓ Balanceado" : "⚠ Descuadre Detectado"}
                                </Badge>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <Button
                            variant="outline"
                            className="bg-slate-900 border-none hover:bg-slate-800 text-white gap-3 h-14 px-8 rounded-2xl shadow-active transition-all hover:scale-105 active:scale-95 group"
                            onClick={async () => {
                                await pdfReportService.generateTrialBalance(rows.map(r => ({
                                    code: r.code,
                                    name: r.name,
                                    initial_balance: 0,
                                    debits: r.debit,
                                    credits: r.credit,
                                    final_balance: r.balance
                                })), {
                                    title: 'Balance de Prueba',
                                    companyName: tenant?.name || 'EMPRESA',
                                    companyNit: tenant?.nit,
                                    companyAddress: tenant?.address,
                                    companyPhone: tenant?.phone,
                                    period: `${startDate} - ${endDate}`,
                                    logoUrl: tenant?.logo_url || undefined
                                });
                            }}
                        >
                            <Download className="h-5 w-5 text-indigo-400 group-hover:animate-bounce" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Generar PDF Premium</span>
                        </Button>
                        <Button
                            variant="outline"
                            className="h-14 w-14 rounded-2xl border-slate-100 bg-white text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all flex items-center justify-center shadow-sm"
                            onClick={() => excelReportService.exportToExcel(rows, 'Balance_Prueba', 'Balance')}
                        >
                            <FileText className="h-5 w-5" />
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-slate-50 hover:bg-transparent bg-slate-50/50">
                                <TableHead className="w-[180px] text-slate-400 font-black uppercase text-[9px] tracking-[0.5em] py-8 pl-14">Cuenta PUC</TableHead>
                                <TableHead className="text-slate-400 font-black uppercase text-[9px] tracking-[0.5em] py-8">Concepto / Denominación</TableHead>
                                <TableHead className="text-right text-slate-400 font-black uppercase text-[9px] tracking-[0.5em] py-8">Mov. Débito</TableHead>
                                <TableHead className="text-right text-slate-400 font-black uppercase text-[9px] tracking-[0.5em] py-8">Mov. Crédito</TableHead>
                                <TableHead className="text-right text-slate-400 font-black uppercase text-[9px] tracking-[0.5em] py-8 pr-14">Saldo Ejecución</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rows.map((row) => (
                                <TableRow key={row.code} className="border-slate-50 hover:bg-indigo-50/20 transition-all group">
                                    <TableCell className="py-8 pl-14">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 font-mono text-[10px] font-black group-hover:bg-white transition-all group-hover:shadow-sm">
                                                {row.code[0]}
                                            </div>
                                            <span className="font-mono text-[13px] text-slate-900 font-black tracking-widest italic group-hover:text-indigo-600 transition-colors">
                                                {row.code}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-8">
                                        <div className="text-sm font-black text-slate-800 uppercase italic tracking-tighter line-clamp-1">{row.name}</div>
                                        <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Libro Auxiliar Verificado</div>
                                    </TableCell>
                                    <TableCell className="py-8 text-right font-mono text-sm font-bold text-slate-500 italic">
                                        {row.debit > 0 ? formatCurrency(row.debit) : "—"}
                                    </TableCell>
                                    <TableCell className="py-8 text-right font-mono text-sm font-bold text-slate-500 italic">
                                        {row.credit > 0 ? formatCurrency(row.credit) : "—"}
                                    </TableCell>
                                    <TableCell className={cn(
                                        "py-8 text-right pr-14 font-mono text-lg font-black tracking-tighter italic",
                                        row.balance < 0 ? 'text-rose-600' : 'text-slate-900 group-hover:text-indigo-600 transition-colors'
                                    )}>
                                        ${formatCurrency(row.balance)}
                                    </TableCell>
                                </TableRow>
                            ))}

                            {/* 📊 MASTER FOOTER TOTALS */}
                            <TableRow className="bg-slate-900 border-none hover:bg-slate-950 transition-colors">
                                <TableCell colSpan={2} className="py-12 pl-14">
                                    <div className="flex items-center gap-6">
                                        <div className="h-14 w-14 bg-white/5 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-white/5 border border-white/10 rotate-12 transition-transform group-hover:rotate-0">
                                            <Activity className="h-8 w-8" />
                                        </div>
                                        <div className="space-y-1">
                                            <h4 className="text-white text-xl font-black italic tracking-tighter uppercase leading-none">Consolidación</h4>
                                            <p className="text-[10px] text-white/30 font-black uppercase tracking-[0.4em]">Sumas Iguales Verificadas NIIF</p>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right py-12">
                                    <div className="space-y-2">
                                        <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.4em]">Total Débitos</span>
                                        <div className="text-3xl font-black text-white font-mono tracking-tighter italic">
                                            {formatCurrency(totalDebit)}
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right py-12">
                                    <div className="space-y-2">
                                        <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.4em]">Total Créditos</span>
                                        <div className="text-3xl font-black text-white font-mono tracking-tighter italic">
                                            {formatCurrency(totalCredit)}
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right pr-14 py-12">
                                    <div className="flex flex-col items-end gap-3">
                                        {isBalanced ? (
                                            <>
                                                <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Estado Maestro</span>
                                                <div className="h-14 px-8 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3 text-emerald-400 text-sm font-black italic uppercase shadow-inner">
                                                    <CheckCircle2 className="h-5 w-5" /> Saldo Cuadrado
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest">Alerta de Descuadre</span>
                                                <div className="h-14 px-8 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3 text-rose-400 text-sm font-black italic uppercase shadow-inner animate-pulse">
                                                    <AlertCircle className="h-5 w-5" /> ${formatCurrency(diff)}
                                                </div>
                                            </>
                                        )}
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
