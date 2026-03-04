import { FinancialNode } from '../types';
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { ClipboardList, Activity } from "lucide-react"
import { cn } from "@/shared/lib/utils"

interface Props {
    title: string;
    nodes: FinancialNode[];
    totalLabel: string;
    totalValue: number;
}

export function HierarchicalFinancialTable({ title, nodes, totalLabel, totalValue }: Props) {

    const renderNode = (node: FinancialNode): React.ReactNode => {
        return (
            <React.Fragment key={node.code}>
                <TableRow className={cn(
                    "transition-colors border-slate-50",
                    node.level === 1 ? "bg-slate-50/50 border-t border-slate-100" : "",
                    node.level === 2 ? "bg-white" : "",
                    node.level >= 3 ? "hover:bg-indigo-50/20" : ""
                )}>
                    <TableCell className="py-3.5 pl-6">
                        <div style={{ paddingLeft: `${(node.level - 1) * 24}px` }} className="flex items-center gap-3">
                            <span className={cn(
                                "font-mono text-[11px] px-2 py-0.5 rounded-md shrink-0",
                                node.level === 1 ? "font-bold bg-slate-900 text-white" :
                                    node.level === 2 ? "font-semibold bg-slate-100 text-slate-500" :
                                        "font-medium text-slate-300"
                            )}>
                                {node.code}
                            </span>
                            <span className={cn(
                                "text-xs",
                                node.level === 1 ? "font-bold text-slate-900" :
                                    node.level === 2 ? "font-semibold text-slate-700" :
                                        "text-slate-500 font-medium"
                            )}>
                                {node.name}
                            </span>
                        </div>
                    </TableCell>
                    <TableCell className={cn(
                        "py-3.5 text-right pr-6 font-mono tabular-nums",
                        node.level === 1 ? "font-bold text-slate-900 text-base" :
                            node.level === 2 ? "font-semibold text-slate-700 text-sm" :
                                "text-slate-500 font-medium text-sm"
                    )}>
                        ${node.balance.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                </TableRow>
                {node.children.map(child => renderNode(child))}
            </React.Fragment>
        )
    }

    return (
        <Card className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
            <CardHeader className="py-5 px-6 border-b border-slate-100 bg-slate-50/30">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                        <ClipboardList className="h-5 w-5" />
                    </div>
                    <div>
                        <CardTitle className="text-base font-bold text-slate-900">{title}</CardTitle>
                        <p className="text-[10px] text-slate-400 mt-0.5">Desglose jerarquico por cuenta</p>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-slate-100 hover:bg-transparent bg-slate-50/50">
                                <TableHead className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider py-3 pl-6">Cuenta</TableHead>
                                <TableHead className="w-[220px] text-right text-slate-400 font-semibold uppercase text-[10px] tracking-wider py-3 pr-6">Saldo</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {nodes.map(node => renderNode(node))}
                        </TableBody>
                    </Table>
                </div>

                {/* Total Footer */}
                <div className="bg-slate-900 py-5 px-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 bg-white/10 rounded-xl flex items-center justify-center text-white">
                            <Activity className="h-5 w-5" />
                        </div>
                        <span className="text-white text-sm font-bold">{totalLabel}</span>
                    </div>
                    <span className="text-2xl font-bold text-white font-mono tabular-nums tracking-tight">
                        ${totalValue.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                </div>
            </CardContent>
        </Card>
    )
}
