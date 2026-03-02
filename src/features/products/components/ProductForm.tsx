"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { productSchema, Product, TAX_LABELS, UOM_OPTIONS } from "../types"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Textarea } from "@/shared/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import {
    Package, Tag, DollarSign, Scale, Info, Save,
    AlertTriangle, FileText, Percent, Boxes
} from "lucide-react"

interface ProductFormProps {
    initialData?: Product
    onSubmit: (data: Product) => Promise<void>
    isLoading?: boolean
}

export function ProductForm({ initialData, onSubmit, isLoading }: ProductFormProps) {
    const form = useForm<Product>({
        resolver: zodResolver(productSchema) as any,
        defaultValues: initialData || {
            type: 'GOOD',
            status: 'ACTIVE',
            sku: '',
            name: '',
            description: '',
            uom: 'UND',
            selling_price: 0,
            cost: 0,
            tax_category: 'IVA_19',
            min_stock: 0,
        }
    })

    const errors = form.formState.errors

    return (
        <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* ── Información General ─────────────────────── */}
                <Card className="lg:col-span-2 rounded-3xl border-slate-800 bg-slate-900/40 backdrop-blur-md shadow-xl overflow-hidden">
                    <CardHeader className="bg-slate-950/20 border-b border-slate-800 py-4 px-6">
                        <CardTitle className="text-white text-sm font-bold flex items-center gap-2">
                            <Info className="h-4 w-4 text-blue-400" />
                            Información General
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">

                        {/* SKU + Nombre */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Código / SKU</Label>
                                <div className="relative">
                                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                    <Input
                                        {...form.register('sku')}
                                        className="pl-10 bg-slate-950/50 border-slate-800 text-white placeholder:text-slate-600 focus:ring-blue-500 focus:border-blue-500 font-mono uppercase"
                                        placeholder="PRD-001"
                                    />
                                </div>
                                {errors.sku && <p className="text-rose-500 text-[10px] font-bold uppercase">{errors.sku.message}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nombre Comercial</Label>
                                <div className="relative">
                                    <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                    <Input
                                        {...form.register('name')}
                                        className="pl-10 bg-slate-950/50 border-slate-800 text-white placeholder:text-slate-600 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Nombre del producto o servicio"
                                    />
                                </div>
                                {errors.name && <p className="text-rose-500 text-[10px] font-bold uppercase">{errors.name.message}</p>}
                            </div>
                        </div>

                        {/* Descripción */}
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                                <FileText className="h-3 w-3" /> Descripción
                            </Label>
                            <Textarea
                                {...form.register('description')}
                                rows={3}
                                className="bg-slate-950/50 border-slate-800 text-white placeholder:text-slate-600 focus:ring-blue-500 focus:border-blue-500 resize-none"
                                placeholder="Descripción técnica, composición, uso, etc."
                            />
                        </div>

                        {/* Tipo + UOM + Estado */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tipo</Label>
                                <select
                                    {...form.register('type')}
                                    className="w-full h-11 px-4 rounded-xl bg-slate-950/50 border border-slate-800 text-white focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none text-sm"
                                >
                                    <option value="GOOD">Bien / Producto</option>
                                    <option value="SERVICE">Servicio</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                                    <Scale className="h-3 w-3" /> Unidad de Medida
                                </Label>
                                <select
                                    {...form.register('uom')}
                                    className="w-full h-11 px-4 rounded-xl bg-slate-950/50 border border-slate-800 text-white focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none text-sm"
                                >
                                    {UOM_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Estado</Label>
                                <select
                                    {...form.register('status')}
                                    className="w-full h-11 px-4 rounded-xl bg-slate-950/50 border border-slate-800 text-white focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none text-sm"
                                >
                                    <option value="ACTIVE">Activo</option>
                                    <option value="INACTIVE">Inactivo</option>
                                    <option value="ARCHIVED">Archivado</option>
                                </select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* ── Precios, IVA y Stock Mínimo ──────────────── */}
                <div className="flex flex-col gap-4">
                    <Card className="rounded-3xl border-slate-800 bg-slate-900/40 backdrop-blur-md shadow-xl overflow-hidden">
                        <CardHeader className="bg-slate-950/20 border-b border-slate-800 py-4 px-6">
                            <CardTitle className="text-white text-sm font-bold flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-emerald-400" />
                                Precios e IVA
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-5">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Precio de Venta</Label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500/70" />
                                    <Input
                                        type="number"
                                        step="1"
                                        {...form.register('selling_price', { valueAsNumber: true })}
                                        className="pl-10 bg-slate-950/50 border-slate-800 text-white font-mono text-lg font-bold"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Costo (CPP)</Label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-500/70" />
                                    <Input
                                        type="number"
                                        step="1"
                                        {...form.register('cost', { valueAsNumber: true })}
                                        className="pl-10 bg-slate-950/10 border-slate-800/50 text-slate-400 font-mono italic cursor-not-allowed"
                                        readOnly
                                        title="Calculado automáticamente por movimientos de inventario"
                                    />
                                </div>
                                <p className="text-[9px] text-slate-500 italic">Calculado por el sistema (CPP)</p>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                                    <Percent className="h-3 w-3" /> Categoría IVA
                                </Label>
                                <select
                                    {...form.register('tax_category')}
                                    className="w-full h-11 px-4 rounded-xl bg-slate-950/50 border border-slate-800 text-white focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none text-sm"
                                >
                                    {(Object.keys(TAX_LABELS) as (keyof typeof TAX_LABELS)[]).map(k => (
                                        <option key={k} value={k}>{TAX_LABELS[k]}</option>
                                    ))}
                                </select>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Stock Mínimo */}
                    <Card className="rounded-3xl border-slate-800 bg-slate-900/40 backdrop-blur-md shadow-xl overflow-hidden">
                        <CardHeader className="bg-slate-950/20 border-b border-slate-800 py-4 px-6">
                            <CardTitle className="text-white text-sm font-bold flex items-center gap-2">
                                <Boxes className="h-4 w-4 text-amber-400" />
                                Control de Inventario
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                                    <AlertTriangle className="h-3 w-3 text-amber-400" /> Stock Mínimo (alerta)
                                </Label>
                                <Input
                                    type="number"
                                    step="1"
                                    {...form.register('min_stock', { valueAsNumber: true })}
                                    className="bg-slate-950/50 border-slate-800 text-white font-mono"
                                    placeholder="0"
                                />
                                <p className="text-[9px] text-slate-500 italic">Alerta cuando el stock baje de este valor</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold h-12 shadow-lg shadow-blue-900/40 transition-all"
                    >
                        {isLoading ? (
                            <span className="flex items-center gap-2">
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Procesando...
                            </span>
                        ) : (
                            <span className="flex items-center gap-2">
                                <Save className="h-4 w-4" />
                                Guardar Cambios
                            </span>
                        )}
                    </Button>
                </div>
            </div>
        </form>
    )
}
