"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { bankStatementSchema, BankStatement } from "../types"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Textarea } from "@/shared/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import {
    FileUp,
    Trash2,
    Plus,
    Landmark,
    Calendar,
    DollarSign,
    Zap,
    Activity,
    Clipboard,
    FileText,
    ChevronRight,
    ArrowRight
} from "lucide-react"
import { cn } from "@/shared/lib/utils"

interface BankStatementLineInput {
    date: string;
    description: string;
    amount: number;
}

interface BankStatementImportFormProps {
    accountId: string;
    onSubmit: (statement: Partial<BankStatement>, lines: BankStatementLineInput[]) => Promise<void>;
    isLoading?: boolean;
}

export function BankStatementImportForm({ accountId, onSubmit, isLoading }: BankStatementImportFormProps) {
    const [lines, setLines] = useState<BankStatementLineInput[]>([])
    const [pasteData, setPasteData] = useState("")

    const form = useForm<Partial<BankStatement>>({
        resolver: zodResolver(bankStatementSchema.partial()) as any,
        defaultValues: {
            account_id: accountId,
            start_date: new Date().toISOString().split('T')[0],
            end_date: new Date().toISOString().split('T')[0],
            opening_balance: 0,
            closing_balance: 0,
            status: 'DRAFT'
        }
    })

    const handlePaste = () => {
        const rows = pasteData.trim().split('\n');
        const parsedLines: BankStatementLineInput[] = rows.map(row => {
            const [date, description, amount] = row.split(',').map(s => s.trim());
            return {
                date: date || new Date().toISOString().split('T')[0],
                description: description || 'MOVIMIENTO BANCARIO',
                amount: parseFloat(amount) || 0
            };
        });
        setLines([...lines, ...parsedLines]);
        setPasteData("");
    }

    const addLine = () => {
        setLines([...lines, { date: new Date().toISOString().split('T')[0], description: '', amount: 0 }]);
    }

    const removeLine = (index: number) => {
        setLines(lines.filter((_, i) => i !== index));
    }

    const updateLine = (index: number, field: keyof BankStatementLineInput, value: any) => {
        const newLines = [...lines];
        newLines[index] = { ...newLines[index], [field]: value };
        setLines(newLines);
    }

    const handleFormSubmit = async (data: Partial<BankStatement>) => {
        if (lines.length === 0) {
            alert("Debe agregar al menos una línea al extracto.");
            return;
        }
        await onSubmit(data, lines);
    }

    return (
        <div className="grid gap-12 lg:grid-cols-3 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            {/* 📝 PARAMETERS PANEL */}
            <div className="lg:col-span-1 space-y-8">
                <div className="flex items-center gap-4 px-1">
                    <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-sm">
                        <Activity className="h-5 w-5" />
                    </div>
                    <div className="space-y-0.5">
                        <h2 className="text-xl font-black tracking-tight text-slate-900 uppercase italic">Parámetros</h2>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Cabecera del protocolo</p>
                    </div>
                </div>

                <Card className="rounded-[3rem] bg-white border-none shadow-premium p-10 space-y-10 border border-slate-50">
                    <div className="space-y-6">
                        <div className="space-y-4">
                            <Label className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 ml-4 block italic">Rango Cronológico</Label>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="relative group/field">
                                    <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within/field:text-primary transition-colors" />
                                    <Input
                                        type="date"
                                        {...form.register('start_date')}
                                        className="h-14 pl-12 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs focus-visible:ring-4 focus-visible:ring-primary/10 transition-all shadow-inner"
                                    />
                                </div>
                                <div className="relative group/field">
                                    <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within/field:text-primary transition-colors" />
                                    <Input
                                        type="date"
                                        {...form.register('end_date')}
                                        className="h-14 pl-12 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs focus-visible:ring-4 focus-visible:ring-primary/10 transition-all shadow-inner"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <Label className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 ml-4 block italic">Balances de Verificación</Label>
                            <div className="space-y-4">
                                <div className="relative group/field">
                                    <DollarSign className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-200 group-focus-within/field:text-emerald-500 transition-colors" />
                                    <Input
                                        type="number"
                                        step="0.01"
                                        placeholder="SALDO INICIAL"
                                        {...form.register('opening_balance', { valueAsNumber: true })}
                                        className="h-16 pl-14 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-lg font-mono focus-visible:ring-4 focus-visible:ring-primary/10 transition-all shadow-inner"
                                    />
                                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[8px] font-black text-slate-300 uppercase tracking-widest">Apertura</span>
                                </div>
                                <div className="relative group/field">
                                    <DollarSign className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-200 group-focus-within/field:text-indigo-500 transition-colors" />
                                    <Input
                                        type="number"
                                        step="0.01"
                                        placeholder="SALDO FINAL"
                                        {...form.register('closing_balance', { valueAsNumber: true })}
                                        className="h-16 pl-14 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-lg font-mono focus-visible:ring-4 focus-visible:ring-primary/10 transition-all shadow-inner"
                                    />
                                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[8px] font-black text-slate-300 uppercase tracking-widest">Cierre</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-slate-50 space-y-6">
                        <div className="flex items-center gap-3">
                            <Clipboard className="h-4 w-4 text-slate-300" />
                            <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] italic">Inyección Masiva de Datos</h3>
                        </div>
                        <div className="relative group">
                            <Textarea
                                value={pasteData}
                                onChange={(e: any) => setPasteData(e.target.value)}
                                placeholder="YYYY-MM-DD, DESCRIPCIÓN, MONTO"
                                className="bg-slate-50 border-none rounded-[2rem] text-slate-600 min-h-[140px] p-6 text-[10px] font-mono focus:ring-4 focus:ring-primary/10 transition-all shadow-inner resize-none"
                            />
                            <div className="absolute bottom-4 right-4 text-[8px] font-black text-slate-300 uppercase tracking-widest bg-white/50 px-3 py-1 rounded-full border border-slate-100 italic">Formato CSV</div>
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handlePaste}
                            className="w-full h-14 rounded-2xl border-slate-100 bg-white text-slate-400 hover:text-slate-900 font-black text-[10px] uppercase tracking-widest transition-all shadow-sm group"
                        >
                            <FileUp className="mr-3 h-4 w-4 group-hover:scale-110 transition-transform" /> Procesar Pegado
                        </Button>
                    </div>
                </Card>
            </div>

            {/* 📊 DATA LINES PANEL */}
            <div className="lg:col-span-2 space-y-8">
                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-sm">
                            <Zap className="h-5 w-5" />
                        </div>
                        <div className="space-y-0.5">
                            <h2 className="text-xl font-black tracking-tight text-slate-900 uppercase italic">Líneas de Registro ({lines.length})</h2>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Carga documental automatizada</p>
                        </div>
                    </div>
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={addLine}
                        className="h-12 px-6 rounded-xl text-indigo-600 hover:bg-indigo-50 font-black text-[10px] uppercase tracking-widest transition-all"
                    >
                        <Plus className="h-4 w-4 mr-2" /> Agregar Línea
                    </Button>
                </div>

                <Card className="rounded-[3rem] bg-white border-none shadow-premium overflow-hidden border border-slate-50">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-slate-50/50">
                                <TableRow className="border-slate-100 hover:bg-transparent">
                                    <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-8 py-6">Fecha Valor</TableHead>
                                    <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest py-6">Concepto / Referencia</TableHead>
                                    <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-right py-6">Monto Inyectado</TableHead>
                                    <TableHead className="w-[80px] pr-8"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {lines.map((line, index) => (
                                    <TableRow key={index} className="border-slate-50 group hover:bg-slate-50/30 transition-colors">
                                        <TableCell className="pl-8 py-4">
                                            <Input
                                                type="date"
                                                value={line.date}
                                                onChange={(e) => updateLine(index, 'date', e.target.value)}
                                                className="bg-transparent border-none text-slate-900 font-black text-[11px] font-mono h-10 p-0 focus-visible:ring-0"
                                            />
                                        </TableCell>
                                        <TableCell className="py-4">
                                            <Input
                                                value={line.description}
                                                onChange={(e) => updateLine(index, 'description', e.target.value)}
                                                className="bg-transparent border-none text-slate-600 font-bold text-[10px] uppercase h-10 p-0 focus-visible:ring-0 placeholder:text-slate-200"
                                                placeholder="DESCRIBIR MOVIMIENTO..."
                                            />
                                        </TableCell>
                                        <TableCell className="text-right py-4">
                                            <Input
                                                type="number"
                                                step="0.01"
                                                value={line.amount}
                                                onChange={(e) => updateLine(index, 'amount', parseFloat(e.target.value) || 0)}
                                                className={cn(
                                                    "bg-transparent border-none text-right h-10 p-0 focus-visible:ring-0 font-black font-mono text-sm italic",
                                                    line.amount > 0 ? "text-emerald-600" : "text-rose-600"
                                                )}
                                            />
                                        </TableCell>
                                        <TableCell className="pr-8 py-4 text-right">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => removeLine(index)}
                                                className="h-8 w-8 rounded-lg text-slate-200 hover:text-rose-500 hover:bg-rose-50 transition-all"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {lines.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-32 space-y-4">
                                            <div className="mx-auto w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-200 shadow-sm border border-slate-50">
                                                <FileText className="h-8 w-8" />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest italic">Cero Datos Detectados</p>
                                                <p className="text-[9px] font-medium text-slate-300 uppercase tracking-[0.2em]">Pegue datos o agregue líneas manualmente para iniciar</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="p-10 bg-slate-50/50 border-t border-slate-100 flex justify-end">
                        <Button
                            onClick={form.handleSubmit(handleFormSubmit)}
                            disabled={isLoading}
                            className="h-16 px-12 rounded-[2rem] bg-slate-900 hover:bg-primary text-white font-black text-[11px] uppercase tracking-[0.2em] shadow-active group transition-all"
                        >
                            {isLoading ? (
                                <div className="flex items-center gap-4">
                                    <div className="h-5 w-5 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                                    <span>Compilando Protocolo...</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-4">
                                    <span>Lanzar Proceso de Cruce</span>
                                    <ArrowRight className="h-5 w-5 group-hover:translate-x-2 transition-transform" />
                                </div>
                            )}
                        </Button>
                    </div>
                </Card>
            </div>
        </div>
    )
}
