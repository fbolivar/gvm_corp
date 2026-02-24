import { FinancialNode } from '../types';
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { BarChart3, TrendingUp, Activity, ClipboardList } from "lucide-react"
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
                    "transition-all border-slate-50",
                    node.level === 1 ? "bg-slate-50/50 border-t border-slate-100" : "",
                    node.level === 2 ? "bg-white/50" : "",
                    node.level >= 3 ? "hover:bg-indigo-50/10" : "group"
                )}>
                    <TableCell className="py-5 pl-12">
                        <div style={{ paddingLeft: `${(node.level - 1) * 32}px` }} className="flex items-center gap-4">
                            <span className={cn(
                                "font-mono text-[11px] px-2 py-0.5 rounded-md",
                                node.level === 1 ? "font-black bg-slate-900 text-white" :
                                    node.level === 2 ? "font-black bg-slate-100 text-slate-500" :
                                        "font-bold text-slate-300"
                            )}>
                                {node.code}
                            </span>

                            <span className={cn(
                                "text-[13px] tracking-tight uppercase italic",
                                node.level === 1 ? "font-black text-slate-900 tracking-tighter" :
                                    node.level === 2 ? "font-black text-slate-700" :
                                        "text-slate-500 font-bold"
                            )}>
                                {node.name}
                            </span>
                        </div>
                    </TableCell>
                    <TableCell className={cn(
                        "py-5 text-right pr-12 font-mono",
                        node.level === 1 ? "font-black text-slate-900 text-lg tracking-tighter italic" :
                            node.level === 2 ? "font-black text-slate-700 text-base" :
                                "text-slate-500 font-bold text-sm"
                    )}>
                        ${node.balance.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                </TableRow>
                {node.children.map(child => renderNode(child))}
            </React.Fragment>
        )
    }

    return (
        <Card className="rounded-[3.5rem] border-none bg-white shadow-premium overflow-hidden">
            <CardHeader className="py-8 px-12 border-b border-slate-50 bg-slate-50/20">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-5">
                        <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner">
                            <ClipboardList className="h-6 w-6" />
                        </div>
                        <div>
                            <CardTitle className="text-xl font-black text-slate-900 tracking-tighter uppercase italic">
                                {title}
                            </CardTitle>
                            <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.3em] mt-0.5">Desglose Jerárquico v3</p>
                        </div>
                    </div>
                    <div className="h-1 w-12 bg-slate-100 rounded-full" />
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto overflow-y-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-slate-50 hover:bg-transparent bg-slate-50/50">
                                <TableHead className="text-slate-400 font-black uppercase text-[10px] tracking-[0.4em] py-6 pl-12 uppercase italic">Estructura de Cuenta</TableHead>
                                <TableHead className="w-[300px] text-right text-slate-400 font-black uppercase text-[10px] tracking-[0.4em] py-6 pr-12 uppercase italic">Saldo Consolidado</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {nodes.map(node => renderNode(node))}
                        </TableBody>
                    </Table>
                </div>

                {/* 📊 TOTAL BLOCK BRUTE FORCE AESTHETIC */}
                <div className="bg-slate-900 py-10 px-12 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="flex items-center gap-6">
                        <div className="h-14 w-14 bg-white/5 rounded-2xl flex items-center justify-center text-white border border-white/10 shadow-lg -rotate-6">
                            <Activity className="h-8 w-8" />
                        </div>
                        <div className="space-y-1">
                            <h4 className="text-white text-xl font-black italic tracking-tighter uppercase leading-none">{totalLabel}</h4>
                            <p className="text-[10px] text-white/30 font-black uppercase tracking-[0.4em]">Certificación de Cierre de Periodo</p>
                        </div>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-[9px] text-indigo-400 font-black uppercase tracking-[0.4em] mb-2 px-3 py-1 bg-indigo-500/10 rounded-full border border-indigo-500/20">Valor COP Oficial</span>
                        <div className="flex items-baseline gap-3">
                            <span className="text-4xl font-black text-white font-mono tracking-tighter italic">
                                ${totalValue.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <span className="text-xs text-white/30 font-black uppercase tracking-widest">Master Total</span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
