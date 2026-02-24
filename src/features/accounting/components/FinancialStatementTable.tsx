import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { BarChart3, TrendingUp, DollarSign } from "lucide-react"

interface AccountData {
    code: string
    name: string
    balance: number
}

interface Props {
    title: string
    rows: AccountData[]
    totalLabel: string
    totalValue: number
}

export function FinancialStatementTable({ title, rows, totalLabel, totalValue }: Props) {
    return (
        <Card className="rounded-2xl border-slate-800 bg-slate-900/40 backdrop-blur-sm shadow-2xl overflow-hidden border">
            <CardHeader className="bg-slate-950/30 border-b border-slate-800 py-5 px-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600/10 rounded-xl">
                        <BarChart3 className="h-5 w-5 text-blue-400" />
                    </div>
                    <CardTitle className="text-white text-lg font-bold tracking-tight">
                        {title}
                    </CardTitle>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader className="bg-slate-950/20">
                        <TableRow className="border-slate-800 hover:bg-transparent">
                            <TableHead className="w-[150px] text-slate-500 font-bold uppercase text-[10px] tracking-widest py-4 pl-6">Código P.U.C</TableHead>
                            <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-widest py-4">Cuenta / Nombre</TableHead>
                            <TableHead className="w-[200px] text-right text-slate-500 font-bold uppercase text-[10px] tracking-widest py-4 pr-6">Saldo Neto</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rows.map((row) => (
                            <TableRow key={row.code} className="border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                                <TableCell className="py-4 pl-6 font-mono text-xs text-slate-400 font-bold tracking-wider">
                                    {row.code}
                                </TableCell>
                                <TableCell className="py-4">
                                    <span className="text-sm font-medium text-slate-200">{row.name}</span>
                                </TableCell>
                                <TableCell className="py-4 text-right pr-6 font-mono font-bold text-slate-200">
                                    ${row.balance.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>

                {/* Total Footer */}
                <div className="bg-slate-950/40 border-t-2 border-slate-800 py-6 px-10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/10 rounded-lg">
                            <TrendingUp className="h-4 w-4 text-emerald-500" />
                        </div>
                        <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{totalLabel}</span>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest mb-1">Valor Consolidado</span>
                        <div className="flex items-center gap-2">
                            <span className="text-2xl font-black text-white font-mono tracking-tighter">
                                ${totalValue.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <span className="text-xs text-slate-500 font-mono">COP</span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
