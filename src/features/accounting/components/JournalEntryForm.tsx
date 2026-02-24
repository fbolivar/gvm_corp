"use client"

import { useState, useEffect } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { journalEntrySchema } from "../types"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import {
    Plus,
    Trash2,
    Save,
    ArrowLeft,
    Calculator,
    BookOpen,
    Layers,
    X,
    CheckCircle2,
    Search,
    User,
    ChevronDown,
    Activity
} from "lucide-react"
import { useRouter } from "next/navigation"
import { Account } from "@/features/accounting/types"
import { Party } from "@/features/parties/types"
import { cn } from "@/shared/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/shared/hooks/use-toast"

interface JournalEntryFormProps {
    accounts: any[]
    parties: any[]
}

export function JournalEntryForm({ accounts, parties }: JournalEntryFormProps) {
    const router = useRouter()
    const { toast } = useToast()
    const [isSubmitting, setIsSubmitting] = useState(false)

    const form = useForm({
        resolver: zodResolver(journalEntrySchema),
        defaultValues: {
            entry_date: new Date().toISOString().split('T')[0],
            description: "",
            lines: [
                { account_id: "", party_id: null, debit: 0, credit: 0, description: "" },
                { account_id: "", party_id: null, debit: 0, credit: 0, description: "" }
            ]
        }
    })

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "lines"
    })

    const watchLines = form.watch("lines")
    const totalDebit = watchLines.reduce((acc, line) => acc + (Number(line.debit) || 0), 0)
    const totalCredit = watchLines.reduce((acc, line) => acc + (Number(line.credit) || 0), 0)
    const difference = Math.abs(totalDebit - totalCredit)
    const isBalanced = difference < 0.01 && totalDebit > 0

    const onSubmit = async (data: any) => {
        setIsSubmitting(true)
        try {
            const supabase = createClient()

            // 1. Create Entry
            const { data: entry, error: entryError } = await supabase
                .from('journal_entries')
                .insert({
                    entry_date: data.entry_date,
                    description: data.description,
                    period: data.entry_date.substring(0, 7),
                    status: 'CONTABILIZADO'
                })
                .select()
                .single()

            if (entryError) throw entryError

            // 2. Insert Lines
            const linesToInsert = data.lines.map((l: any) => ({
                ...l,
                entry_id: entry.id,
                debit: Number(l.debit),
                credit: Number(l.credit)
            }))

            const { error: linesError } = await supabase
                .from('journal_lines')
                .insert(linesToInsert)

            if (linesError) throw linesError

            toast({
                title: "Asiento Creado",
                description: "El movimiento contable se ha registrado exitosamente.",
                variant: "default"
            })
            router.push('/accounting/entries')
            router.refresh()
        } catch (err: any) {
            toast({
                title: "Error",
                description: err.message || "No se pudo crear el asiento.",
                variant: "destructive"
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 max-w-6xl mx-auto pb-24">

            {/* 💎 PREMIUM HEADER */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 px-1">
                <div className="flex items-center gap-6">
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => router.back()}
                        className="h-16 w-16 rounded-[1.5rem] border-none bg-white shadow-premium hover:scale-105 transition-all text-slate-400 hover:text-slate-900"
                    >
                        <ArrowLeft className="h-6 w-6" />
                    </Button>
                    <div className="space-y-2">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-lg shadow-slate-900/20 rotate-3">
                                <Plus className="h-5 w-5" />
                            </div>
                            <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase underline decoration-indigo-500/30 underline-offset-8">
                                Nuevo Comprobante <span className="text-slate-400">Manual</span>
                            </h1>
                        </div>
                        <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.4em] pl-14">Registro Directo en Libro Diario</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className={cn(
                        "h-16 px-8 rounded-[1.5rem] flex items-center gap-4 transition-all duration-500",
                        isBalanced ? "bg-emerald-50 text-emerald-600 shadow-inner" : "bg-rose-50 text-rose-600 shadow-inner animate-pulse"
                    )}>
                        <Activity className="h-5 w-5" />
                        <span className="text-[10px] font-black tracking-widest uppercase">
                            {isBalanced ? "Asiento Balanceado" : `Desbalance: ${difference.toLocaleString('es-CO')}`}
                        </span>
                    </div>

                    <Button
                        type="submit"
                        disabled={!isBalanced || isSubmitting}
                        className="h-16 rounded-[1.5rem] bg-slate-900 hover:bg-slate-800 text-white font-black px-12 shadow-active transition-all hover:scale-105 active:scale-95 text-[10px] uppercase tracking-[0.2em] disabled:opacity-50 disabled:grayscale"
                    >
                        {isSubmitting ? "Procesando..." : "Registrar Comprobante"}
                        <Save className="ml-4 h-5 w-5" />
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

                {/* 📝 HEADER INFO */}
                <Card className="lg:col-span-12 border-none bg-white shadow-premium rounded-[3rem] overflow-hidden">
                    <CardHeader className="py-8 px-10 border-b border-slate-50 flex flex-row items-center gap-4">
                        <div className="h-10 w-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                            <Layers className="h-5 w-5" />
                        </div>
                        <CardTitle className="text-lg font-black text-slate-900 uppercase italic tracking-tighter">Información del Encabezado</CardTitle>
                    </CardHeader>
                    <CardContent className="p-10 grid grid-cols-1 md:grid-cols-3 gap-10">
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Fecha Contable</Label>
                            <Input
                                type="date"
                                {...form.register("entry_date")}
                                className="h-14 rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all text-xs font-bold"
                            />
                        </div>
                        <div className="md:col-span-2 space-y-3">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Descripción / Glosa General</Label>
                            <Input
                                placeholder="EJ: AJUSTE DE CAJA MENOR CORRESPONDIENTE A FEBRERO..."
                                {...form.register("description")}
                                className="h-14 rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all text-xs font-bold uppercase"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* 🏗️ LINES EDITOR */}
                <Card className="lg:col-span-12 border-none bg-white shadow-premium rounded-[3.5rem] overflow-hidden">
                    <CardHeader className="py-8 px-10 border-b border-slate-50 flex flex-row items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                                <Calculator className="h-5 w-5" />
                            </div>
                            <CardTitle className="text-lg font-black text-slate-900 uppercase italic tracking-tighter">Asignación de Partidas</CardTitle>
                        </div>
                        <Button
                            type="button"
                            onClick={() => append({ account_id: "", party_id: null, debit: 0, credit: 0, description: "" })}
                            variant="outline"
                            className="h-12 rounded-2xl border-indigo-100 text-indigo-600 font-black text-[10px] tracking-widest uppercase hover:bg-indigo-50"
                        >
                            <Plus className="mr-2 h-4 w-4" /> Añadir Línea
                        </Button>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-slate-50/30">
                                <TableRow className="border-slate-50">
                                    <TableHead className="py-6 pl-10 text-[9px] font-black text-slate-400 uppercase tracking-widest">Cuenta P.U.C</TableHead>
                                    <TableHead className="py-6 text-[9px] font-black text-slate-400 uppercase tracking-widest">Tercero / Referencia</TableHead>
                                    <TableHead className="py-6 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Débito</TableHead>
                                    <TableHead className="py-6 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Crédito</TableHead>
                                    <TableHead className="py-6 pr-10"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {fields.map((field, index) => (
                                    <TableRow key={field.id} className="border-slate-50 hover:bg-slate-50/50 transition-all">
                                        <TableCell className="py-6 pl-10">
                                            <div className="relative">
                                                <select
                                                    {...form.register(`lines.${index}.account_id`)}
                                                    className="w-full h-12 bg-white rounded-xl border border-slate-100 px-4 text-[11px] font-bold appearance-none focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                                >
                                                    <option value="">Seleccionar Cuenta...</option>
                                                    {accounts.map(acc => (
                                                        <option key={acc.id} value={acc.id}>{acc.code} - {acc.name}</option>
                                                    ))}
                                                </select>
                                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 pointer-events-none" />
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-6">
                                            <div className="flex flex-col gap-2">
                                                <div className="relative">
                                                    <select
                                                        {...form.register(`lines.${index}.party_id`)}
                                                        className="w-full h-12 bg-white rounded-xl border border-slate-100 px-4 text-[10px] font-bold appearance-none outline-none"
                                                    >
                                                        <option value="">Tercero (Opcional)...</option>
                                                        {parties.map(p => (
                                                            <option key={p.id} value={p.id}>{p.legal_name}</option>
                                                        ))}
                                                    </select>
                                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 pointer-events-none" />
                                                </div>
                                                <Input
                                                    placeholder="Glosilla de línea..."
                                                    {...form.register(`lines.${index}.description`)}
                                                    className="h-10 text-[9px] rounded-xl border-slate-50 bg-slate-50/30"
                                                />
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-6">
                                            <Input
                                                type="number"
                                                step="0.01"
                                                {...form.register(`lines.${index}.debit`, { valueAsNumber: true })}
                                                className="h-12 rounded-xl text-right font-mono text-xs font-black text-emerald-600 border-slate-100"
                                            />
                                        </TableCell>
                                        <TableCell className="py-6">
                                            <Input
                                                type="number"
                                                step="0.01"
                                                {...form.register(`lines.${index}.credit`, { valueAsNumber: true })}
                                                className="h-12 rounded-xl text-right font-mono text-xs font-black text-rose-600 border-slate-100"
                                            />
                                        </TableCell>
                                        <TableCell className="py-6 pr-10">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => remove(index)}
                                                className="h-10 w-10 text-slate-200 hover:text-rose-600 hover:bg-rose-50"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>

                        {/* 📊 FOOTER TOTALS */}
                        <div className="bg-slate-900 p-10 flex flex-col md:flex-row items-center justify-between gap-10">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 group-hover:rotate-12 transition-transform">
                                    <BookOpen className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                    <h4 className="text-white font-black text-lg italic tracking-tight uppercase leading-none">Sumatoria de Partida</h4>
                                    <p className="text-[10px] text-white/30 font-black tracking-widest uppercase mt-1">Verificación de Cierre de Ciclo</p>
                                </div>
                            </div>

                            <div className="flex gap-12">
                                <div className="space-y-2 text-right">
                                    <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Total Débitos</p>
                                    <p className="text-3xl font-black text-white font-mono tracking-tighter italic">${totalDebit.toLocaleString('es-CO')}</p>
                                </div>
                                <div className="space-y-2 text-right pr-4">
                                    <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Total Créditos</p>
                                    <p className="text-3xl font-black text-white font-mono tracking-tighter italic">${totalCredit.toLocaleString('es-CO')}</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </form>
    )
}
