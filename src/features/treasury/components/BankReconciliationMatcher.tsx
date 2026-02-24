"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { treasuryService } from "../services/treasuryService"
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import {
    CheckCircle2,
    XCircle,
    AlertCircle,
    ArrowRight,
    Search,
    Check,
    Activity,
    Zap,
    Cpu,
    ChevronRight,
    Landmark,
    ShieldCheck,
    ArrowRightLeft
} from "lucide-react"
import { Badge } from "@/shared/components/ui/badge"
import { useToast } from "@/shared/hooks/use-toast"
import { cn } from "@/shared/lib/utils"

interface Props {
    statementId: string;
}

export function BankReconciliationMatcher({ statementId }: Props) {
    const supabase = createClient()
    const { toast } = useToast()
    const [lines, setLines] = useState<any[]>([])
    const [selectedLine, setSelectedLine] = useState<any>(null)
    const [suggestions, setSuggestions] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        loadLines()
    }, [statementId])

    const loadLines = async () => {
        const data = await treasuryService.getStatementLines(supabase, statementId)
        setLines(data)
    }

    const handleSelectLine = async (line: any) => {
        setSelectedLine(line)
        setSuggestions([])
        if (line.status === 'UNMATCHED') {
            setIsLoading(true)
            try {
                const matches = await treasuryService.suggestMatches(supabase, line.amount, line.date)
                setSuggestions(matches)
            } finally {
                setIsLoading(false)
            }
        }
    }

    const handleMatch = async (transactionId: string) => {
        try {
            await treasuryService.matchTransaction(supabase, selectedLine.id, transactionId)
            toast({
                title: "Cruce realizado",
                description: "La línea ha sido conciliada correctamente.",
            })
            // Update local state
            setLines(lines.map(l => l.id === selectedLine.id ? { ...l, status: 'MATCHED', transaction_id: transactionId } : l))
            setSelectedLine(null)
            setSuggestions([])
        } catch (error: any) {
            toast({
                title: "Error al conciliar",
                description: error.message,
                variant: "destructive"
            })
        }
    }

    return (
        <div className="grid gap-12 lg:grid-cols-2 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            {/* Left: Statement Lines */}
            <div className="space-y-8">
                <div className="flex items-center gap-4 px-1">
                    <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-sm">
                        <Activity className="h-5 w-5" />
                    </div>
                    <div className="space-y-0.5">
                        <h2 className="text-xl font-black tracking-tight text-slate-900 uppercase italic">Líneas de Auditoría</h2>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Protocolo de verificación de extracto</p>
                    </div>
                </div>

                <div className="bg-white rounded-[3rem] shadow-premium overflow-hidden border border-slate-50">
                    <Table>
                        <TableHeader className="bg-slate-50/50">
                            <TableRow className="border-slate-100 hover:bg-transparent">
                                <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-8 py-6">Fecha / Ref</TableHead>
                                <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest py-6">Descripción Operativa</TableHead>
                                <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-right py-6">Magnitud</TableHead>
                                <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center pr-8 py-6">Estado</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {lines.map((line) => (
                                <TableRow
                                    key={line.id}
                                    className={cn(
                                        "border-slate-50 cursor-pointer transition-all duration-300 group",
                                        selectedLine?.id === line.id
                                            ? "bg-indigo-50/50"
                                            : "hover:bg-slate-50/30"
                                    )}
                                    onClick={() => handleSelectLine(line)}
                                >
                                    <TableCell className="pl-8 py-6">
                                        <div className="flex flex-col">
                                            <span className="text-[11px] font-black text-slate-900 italic font-mono">{line.date}</span>
                                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">BANC-SYS</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-6">
                                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-tight leading-relaxed max-w-[200px] truncate group-hover:text-slate-900 transition-colors">
                                            {line.description}
                                        </p>
                                    </TableCell>
                                    <TableCell className="text-right py-6">
                                        <span className={cn(
                                            "text-sm font-black font-mono tracking-tighter italic",
                                            line.amount > 0 ? "text-emerald-600" : "text-rose-600"
                                        )}>
                                            ${line.amount.toLocaleString()}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-center pr-8 py-6">
                                        {line.status === 'MATCHED' ? (
                                            <div className="flex items-center justify-center">
                                                <div className="h-8 w-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100 shadow-sm">
                                                    <CheckCircle2 className="h-4 w-4" />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-center">
                                                <div className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-200 border border-slate-100 group-hover:border-indigo-200 group-hover:text-indigo-400 transition-all">
                                                    <ChevronRight className="h-4 w-4" />
                                                </div>
                                            </div>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Right: Matcher Details */}
            <div className="space-y-8">
                <div className="flex items-center gap-4 px-1">
                    <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-sm">
                        <Zap className="h-5 w-5" />
                    </div>
                    <div className="space-y-0.5">
                        <h2 className="text-xl font-black tracking-tight text-slate-900 uppercase italic">Motor de Cruce Inteligente</h2>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">IA Conciliación v3.0 // Activo</p>
                    </div>
                </div>

                {selectedLine ? (
                    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
                        {/* Selected Line Card */}
                        <Card className="rounded-[3rem] bg-slate-900 border-none shadow-active p-10 relative overflow-hidden group">
                            <div className="absolute right-0 top-0 p-10 opacity-[0.05] pointer-events-none group-hover:scale-110 transition-transform duration-1000">
                                <Landmark className="h-24 w-24 text-white" />
                            </div>

                            <CardContent className="p-0 space-y-8">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center text-white shadow-sm border border-white/5">
                                        <Activity className="h-6 w-6" />
                                    </div>
                                    <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em] italic leading-none">Datos de la Entidad Bancaria</span>
                                </div>

                                <div className="flex justify-between items-end">
                                    <div className="space-y-2">
                                        <h3 className="text-2xl font-black text-white uppercase italic tracking-tight leading-tight max-w-[300px]">
                                            {selectedLine.description}
                                        </h3>
                                        <p className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.3em]">Fecha Valor: {selectedLine.date}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className={cn(
                                            "text-4xl font-black font-mono tracking-tighter italic",
                                            selectedLine.amount > 0 ? "text-emerald-400" : "text-rose-400"
                                        )}>
                                            ${selectedLine.amount.toLocaleString()}
                                        </span>
                                        <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mt-1">Magnitud Auditada</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Suggestions / Results */}
                        <div className="space-y-6">
                            {selectedLine.status === 'MATCHED' ? (
                                <div className="p-16 bg-white rounded-[3rem] shadow-premium border border-slate-50 flex flex-col items-center justify-center text-center space-y-6">
                                    <div className="h-20 w-20 rounded-[2rem] bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-100">
                                        <ShieldCheck className="h-10 w-10 animate-pulse" />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Protocolo Finalizado</h3>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest max-w-[280px] mx-auto leading-relaxed underline decoration-emerald-500/30 underline-offset-4">
                                            Esta línea ya está vinculada a un movimiento fiducitario en el sistema central.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between px-2">
                                        <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] italic flex items-center gap-2">
                                            <Search className="h-4 w-4 text-primary" /> Coincidencias Detectadas
                                        </h4>
                                        {isLoading && <div className="h-4 w-4 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />}
                                    </div>

                                    {suggestions.length > 0 ? (
                                        <div className="grid gap-6">
                                            {suggestions.map(tx => (
                                                <Card key={tx.id} className="rounded-[2.5rem] bg-white border border-slate-100 shadow-premium p-8 hover:translate-y-[-4px] transition-all duration-500 group cursor-default">
                                                    <div className="flex justify-between items-start mb-6">
                                                        <div className="flex items-center gap-4">
                                                            <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all">
                                                                <ArrowRightLeft className="h-5 w-5" />
                                                            </div>
                                                            <div className="space-y-0.5">
                                                                <div className="text-[11px] font-black text-slate-900 uppercase italic tracking-tight">{tx.party?.legal_name || 'MOVIMIENTO INTERNO'}</div>
                                                                <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Ref: {tx.reference_number || 'TRX-DEFAULT'} • {tx.date}</div>
                                                            </div>
                                                        </div>
                                                        <span className="text-xl font-black font-mono tracking-tighter italic text-slate-900">
                                                            ${tx.amount.toLocaleString()}
                                                        </span>
                                                    </div>
                                                    <Button
                                                        onClick={() => handleMatch(tx.id!)}
                                                        className="w-full h-14 bg-slate-900 hover:bg-emerald-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-active transition-all group-hover:scale-[1.02]"
                                                    >
                                                        Ejecutar Cruce Maestro
                                                    </Button>
                                                </Card>
                                            ))}
                                        </div>
                                    ) : !isLoading && (
                                        <div className="p-16 bg-white rounded-[3rem] shadow-premium border border-slate-50 flex flex-col items-center justify-center text-center space-y-6">
                                            <div className="h-20 w-20 rounded-[2rem] bg-rose-50 flex items-center justify-center text-rose-500 shadow-sm border border-rose-100">
                                                <XCircle className="h-10 w-10" />
                                            </div>
                                            <div className="space-y-2">
                                                <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Sin Coincidencias</h3>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest max-w-[280px] mx-auto leading-relaxed">
                                                    No se detectaron movimientos con la magnitud o fecha requerida.
                                                </p>
                                                <Button variant="link" className="text-indigo-600 font-black text-[9px] uppercase tracking-widest mt-4">
                                                    Crear movimiento de ajuste
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="h-[500px] flex flex-col items-center justify-center bg-white rounded-[3rem] border border-dashed border-slate-200 p-20 text-center space-y-8 shadow-inner shadow-slate-50/50">
                        <div className="relative">
                            <Cpu className="h-24 w-24 text-slate-100 animate-pulse" />
                            <div className="absolute inset-0 bg-indigo-500/5 blur-3xl rounded-full" />
                        </div>
                        <div className="space-y-3">
                            <h3 className="text-2xl font-black text-slate-300 uppercase italic tracking-tighter">Esperando Protocolo</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] max-w-[300px] mx-auto leading-loose">
                                Seleccione una línea de auditoría a la izquierda para iniciar el análisis de cruce de datos.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
