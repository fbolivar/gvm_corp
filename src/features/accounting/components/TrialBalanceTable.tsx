"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Scale, CheckCircle2, AlertCircle, Activity, FileX2 } from "lucide-react"
import { Badge } from "@/shared/components/ui/badge"
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

export function TrialBalanceTable({ rows, startDate, endDate }: Props) {
    const totalDebit = rows.reduce((sum, r) => sum + r.debit, 0);
    const totalCredit = rows.reduce((sum, r) => sum + r.credit, 0);
    const diff = Math.abs(totalDebit - totalCredit);
    const isBalanced = diff < 0.01;

    const fmt = (val: number) =>
        val.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    if (rows.length === 0) {
        return (
            <Card className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                <CardContent className="py-16 flex flex-col items-center justify-center text-center">
                    <div className="h-14 w-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 mb-4">
                        <FileX2 className="h-7 w-7" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-700 mb-1">Sin movimientos contables</h3>
                    <p className="text-xs text-slate-400 max-w-sm">
                        No se encontraron asientos contables entre {startDate} y {endDate}.
                        Verifica que existan registros en el libro diario para este periodo.
                    </p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
            <CardHeader className="py-5 px-6 border-b border-slate-100 bg-slate-50/30">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                            <Scale className="h-5 w-5" />
                        </div>
                        <div>
                            <CardTitle className="text-base font-bold text-slate-900">
                                Balance de Comprobación
                            </CardTitle>
                            <div className="flex items-center gap-2 mt-0.5">
                                <p className="text-[10px] text-slate-400">Integridad de saldos maestro</p>
                                <Badge className={cn(
                                    "border-none px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider",
                                    isBalanced ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                                )}>
                                    {isBalanced ? "Balanceado" : "Descuadre"}
                                </Badge>
                            </div>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-slate-100 hover:bg-transparent bg-slate-50/50">
                                <TableHead className="w-[140px] text-slate-400 font-semibold uppercase text-[10px] tracking-wider py-3 pl-6">Cuenta PUC</TableHead>
                                <TableHead className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider py-3">Denominación</TableHead>
                                <TableHead className="text-right text-slate-400 font-semibold uppercase text-[10px] tracking-wider py-3 w-[160px]">Débito</TableHead>
                                <TableHead className="text-right text-slate-400 font-semibold uppercase text-[10px] tracking-wider py-3 w-[160px]">Crédito</TableHead>
                                <TableHead className="text-right text-slate-400 font-semibold uppercase text-[10px] tracking-wider py-3 pr-6 w-[160px]">Saldo</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rows.map((row) => (
                                <TableRow key={row.code} className="border-slate-50 hover:bg-indigo-50/20 transition-colors">
                                    <TableCell className="py-3.5 pl-6">
                                        <span className="font-mono text-xs text-slate-900 font-semibold tracking-wide">
                                            {row.code}
                                        </span>
                                    </TableCell>
                                    <TableCell className="py-3.5">
                                        <span className="text-xs font-medium text-slate-600 line-clamp-1">{row.name}</span>
                                    </TableCell>
                                    <TableCell className="py-3.5 text-right font-mono text-sm font-medium text-slate-500">
                                        {row.debit > 0 ? fmt(row.debit) : "—"}
                                    </TableCell>
                                    <TableCell className="py-3.5 text-right font-mono text-sm font-medium text-slate-500">
                                        {row.credit > 0 ? fmt(row.credit) : "—"}
                                    </TableCell>
                                    <TableCell className={cn(
                                        "py-3.5 text-right pr-6 font-mono text-sm font-bold",
                                        row.balance < 0 ? 'text-rose-600' : 'text-slate-900'
                                    )}>
                                        ${fmt(row.balance)}
                                    </TableCell>
                                </TableRow>
                            ))}

                            {/* Totals Footer */}
                            <TableRow className="bg-slate-900 border-none hover:bg-slate-900">
                                <TableCell colSpan={2} className="py-5 pl-6">
                                    <div className="flex items-center gap-3">
                                        <div className="h-9 w-9 bg-white/10 rounded-xl flex items-center justify-center text-white">
                                            <Activity className="h-5 w-5" />
                                        </div>
                                        <span className="text-white text-sm font-bold">Totales Consolidados</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right py-5">
                                    <p className="text-[9px] text-white/40 uppercase tracking-wider mb-1">Total Débitos</p>
                                    <span className="text-lg font-bold text-white font-mono tabular-nums tracking-tight">
                                        {fmt(totalDebit)}
                                    </span>
                                </TableCell>
                                <TableCell className="text-right py-5">
                                    <p className="text-[9px] text-white/40 uppercase tracking-wider mb-1">Total Créditos</p>
                                    <span className="text-lg font-bold text-white font-mono tabular-nums tracking-tight">
                                        {fmt(totalCredit)}
                                    </span>
                                </TableCell>
                                <TableCell className="text-right pr-6 py-5">
                                    {isBalanced ? (
                                        <div className="flex items-center justify-end gap-2 text-emerald-400">
                                            <CheckCircle2 className="h-4 w-4" />
                                            <span className="text-xs font-bold">Cuadrado</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-end gap-2 text-rose-400">
                                            <AlertCircle className="h-4 w-4" />
                                            <span className="text-xs font-bold">${fmt(diff)}</span>
                                        </div>
                                    )}
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
