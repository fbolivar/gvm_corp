"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { BookOpen, Download, FileText, CheckCircle2, AlertCircle, Activity, FileX2 } from "lucide-react"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { pdfReportService } from "../services/pdfReportService"
import { excelReportService } from "../services/excelReportService"
import { TenantInfo } from "../../settings/services/settingsService"
import { cn } from "@/shared/lib/utils"

interface Props {
    data: Record<string, unknown>[]
    tenant: TenantInfo | null
    startDate: string
    endDate: string
}

export function AuxiliaryLedgerTable({ data, tenant, startDate, endDate }: Props) {
    const totalDebit = data.reduce((sum, r) => sum + (Number(r.debit) || 0), 0);
    const totalCredit = data.reduce((sum, r) => sum + (Number(r.credit) || 0), 0);
    const diff = Math.abs(totalDebit - totalCredit);
    const isBalanced = diff < 0.01;

    const fmt = (val: number) =>
        val.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const getEntry = (row: Record<string, unknown>) => row.journal_entries as { entry_date?: string; number?: string } | null;
    const getAccount = (row: Record<string, unknown>) => row.chart_accounts as { code?: string; name?: string } | null;
    const getParty = (row: Record<string, unknown>) => row.parties as { legal_name?: string } | null;

    return (
        <Card className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
            <CardHeader className="py-5 px-6 border-b border-slate-100 bg-slate-50/30">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                            <BookOpen className="h-5 w-5" />
                        </div>
                        <div>
                            <CardTitle className="text-base font-bold text-slate-900">Libro Auxiliar</CardTitle>
                            <div className="flex items-center gap-2 mt-0.5">
                                <p className="text-[10px] text-slate-400">Detalle por movimiento</p>
                                <Badge className={cn(
                                    "border-none px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider",
                                    isBalanced ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                                )}>
                                    {data.length} asientos
                                </Badge>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-300 gap-2 h-9 px-4 rounded-xl"
                            onClick={async () => {
                                await pdfReportService.generateAuxiliaryLedger(data.map(r => {
                                    const entry = getEntry(r);
                                    const account = getAccount(r);
                                    const party = getParty(r);
                                    return {
                                        date: entry?.entry_date,
                                        journal_number: entry?.number,
                                        account_code: account?.code,
                                        account_name: account?.name,
                                        party: party?.legal_name || '—',
                                        debit: Number(r.debit) || 0,
                                        credit: Number(r.credit) || 0,
                                        description: (r.description as string) || ''
                                    };
                                }), {
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
                            <Download className="h-4 w-4 text-emerald-400" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">PDF</span>
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-300 gap-2 h-9 px-4 rounded-xl"
                            onClick={() => excelReportService.exportToExcel(data as Record<string, unknown>[], 'Libro_Auxiliar', 'Auxiliar')}
                        >
                            <FileText className="h-4 w-4 text-blue-400" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Excel</span>
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-slate-100 hover:bg-transparent bg-slate-50/50">
                                <TableHead className="w-[120px] text-slate-400 font-semibold uppercase text-[10px] tracking-wider py-3 pl-6">Fecha</TableHead>
                                <TableHead className="w-[90px] text-slate-400 font-semibold uppercase text-[10px] tracking-wider py-3">Asiento #</TableHead>
                                <TableHead className="w-[100px] text-slate-400 font-semibold uppercase text-[10px] tracking-wider py-3">Cuenta</TableHead>
                                <TableHead className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider py-3">Descripción / Tercero</TableHead>
                                <TableHead className="text-right text-slate-400 font-semibold uppercase text-[10px] tracking-wider py-3 w-[140px]">Débito</TableHead>
                                <TableHead className="text-right text-slate-400 font-semibold uppercase text-[10px] tracking-wider py-3 pr-6 w-[140px]">Crédito</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.length === 0 ? (
                                <TableRow className="hover:bg-transparent">
                                    <TableCell colSpan={6} className="text-center py-16">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="h-14 w-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300">
                                                <FileX2 className="h-7 w-7" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-700 mb-1">Sin movimientos</p>
                                                <p className="text-xs text-slate-400">No se encontraron registros entre {startDate} y {endDate}</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data.map((row, idx) => {
                                    const entry = getEntry(row);
                                    const account = getAccount(row);
                                    const party = getParty(row);
                                    return (
                                        <TableRow key={(row.id as string) || idx} className="border-slate-50 hover:bg-indigo-50/20 transition-colors">
                                            <TableCell className="py-3.5 pl-6">
                                                <span className="text-xs font-medium text-slate-600 tabular-nums">
                                                    {entry?.entry_date ? format(new Date(entry.entry_date), 'dd MMM yyyy', { locale: es }) : '—'}
                                                </span>
                                            </TableCell>
                                            <TableCell className="py-3.5">
                                                <span className="text-xs font-mono font-semibold text-slate-500">
                                                    #{entry?.number || '—'}
                                                </span>
                                            </TableCell>
                                            <TableCell className="py-3.5">
                                                <div>
                                                    <span className="font-mono text-xs font-semibold text-slate-900">{account?.code || '—'}</span>
                                                    <p className="text-[10px] text-slate-400 line-clamp-1">{account?.name || ''}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-3.5">
                                                <p className="text-xs text-slate-600 line-clamp-1">{(row.description as string) || '—'}</p>
                                                {party?.legal_name && (
                                                    <p className="text-[10px] text-slate-400 mt-0.5">{party.legal_name}</p>
                                                )}
                                            </TableCell>
                                            <TableCell className="py-3.5 text-right font-mono text-sm font-medium text-slate-500">
                                                {Number(row.debit) > 0 ? fmt(Number(row.debit)) : '—'}
                                            </TableCell>
                                            <TableCell className="py-3.5 text-right pr-6 font-mono text-sm font-medium text-slate-500">
                                                {Number(row.credit) > 0 ? fmt(Number(row.credit)) : '—'}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}

                            {/* Totals Footer */}
                            {data.length > 0 && (
                                <TableRow className="bg-slate-900 border-none hover:bg-slate-900">
                                    <TableCell colSpan={4} className="py-5 pl-6">
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 bg-white/10 rounded-xl flex items-center justify-center text-white">
                                                <Activity className="h-5 w-5" />
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-white text-sm font-bold">Totales</span>
                                                {isBalanced ? (
                                                    <div className="flex items-center gap-1.5 text-emerald-400">
                                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                                        <span className="text-[9px] font-bold uppercase tracking-wider">Cuadrado</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1.5 text-rose-400">
                                                        <AlertCircle className="h-3.5 w-3.5" />
                                                        <span className="text-[9px] font-bold uppercase tracking-wider">Dif: ${fmt(diff)}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right py-5">
                                        <p className="text-[9px] text-white/40 uppercase tracking-wider mb-1">Débitos</p>
                                        <span className="text-lg font-bold text-white font-mono tabular-nums tracking-tight">
                                            {fmt(totalDebit)}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right pr-6 py-5">
                                        <p className="text-[9px] text-white/40 uppercase tracking-wider mb-1">Créditos</p>
                                        <span className="text-lg font-bold text-white font-mono tabular-nums tracking-tight">
                                            {fmt(totalCredit)}
                                        </span>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
