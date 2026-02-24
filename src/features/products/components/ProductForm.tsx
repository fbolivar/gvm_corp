"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { productSchema, Product } from "../types"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import {
    Package,
    Tag,
    DollarSign,
    Percent,
    Scale,
    Info,
    CheckCircle2,
    Save
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
            status: 'active',
            sku: '',
            name: '',
            uom: 'UNIT',
            price: 0,
            cost: 0,
            tax_rate: 0
        }
    })

    return (
        <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Basic Information */}
                <Card className="lg:col-span-2 rounded-3xl border-slate-800 bg-slate-900/40 backdrop-blur-md shadow-xl overflow-hidden">
                    <CardHeader className="bg-slate-950/20 border-b border-slate-800 py-4">
                        <CardTitle className="text-white text-base font-bold flex items-center gap-2">
                            <Info className="h-4 w-4 text-blue-400" />
                            Información General
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="sku" className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Código Único (SKU)</Label>
                                <div className="relative">
                                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                    <Input
                                        id="sku"
                                        {...form.register('sku')}
                                        className="pl-10 bg-slate-950/50 border-slate-800 text-white placeholder:text-slate-600 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                        placeholder="Ej: PRD-001"
                                    />
                                </div>
                                {form.formState.errors.sku && <p className="text-rose-500 text-[10px] font-bold uppercase mt-1">{form.formState.errors.sku.message}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nombre Comercial</Label>
                                <div className="relative">
                                    <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                    <Input
                                        id="name"
                                        {...form.register('name')}
                                        className="pl-10 bg-slate-950/50 border-slate-800 text-white placeholder:text-slate-600 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                        placeholder="Nombre del producto o servicio"
                                    />
                                </div>
                                {form.formState.errors.name && <p className="text-rose-500 text-[10px] font-bold uppercase mt-1">{form.formState.errors.name.message}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2 font-not-found">
                                <Label htmlFor="type" className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tipo</Label>
                                <select id="type" {...form.register('type')} className="w-full h-12 px-4 rounded-xl bg-slate-950/50 border border-slate-800 text-white focus:ring-blue-500 focus:border-blue-500 transition-all outline-none appearance-none">
                                    <option value="GOOD">Bien / Producto</option>
                                    <option value="SERVICE">Servicio</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="uom" className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Unidad de Medida</Label>
                                <div className="relative">
                                    <Scale className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                    <Input
                                        id="uom"
                                        {...form.register('uom')}
                                        className="pl-10 bg-slate-950/50 border-slate-800 text-white placeholder:text-slate-600"
                                        placeholder="Ej: UNIDAD, KG"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="status" className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Estado</Label>
                                <select id="status" {...form.register('status')} className="w-full h-12 px-4 rounded-xl bg-slate-950/50 border border-slate-800 text-white focus:ring-blue-500 focus:border-blue-500 transition-all outline-none appearance-none">
                                    <option value="active">Activo</option>
                                    <option value="inactive">Inactivo</option>
                                    <option value="archived">Archivado</option>
                                </select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Pricing & Taxes */}
                <Card className="rounded-3xl border-slate-800 bg-slate-900/40 backdrop-blur-md shadow-xl overflow-hidden">
                    <CardHeader className="bg-slate-950/20 border-b border-slate-800 py-4">
                        <CardTitle className="text-white text-base font-bold flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-emerald-400" />
                            Precios e Impuestos
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="price" className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Precio de Venta</Label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500/70" />
                                <Input
                                    id="price"
                                    type="number"
                                    step="0.01"
                                    {...form.register('price', { valueAsNumber: true })}
                                    className="pl-10 bg-slate-950/50 border-slate-800 text-white font-mono text-lg font-bold"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="cost" className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Costo Promedio (CPP)</Label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-500/70" />
                                <Input
                                    id="cost"
                                    type="number"
                                    step="0.01"
                                    {...form.register('cost', { valueAsNumber: true })}
                                    className="pl-10 bg-slate-950/10 border-slate-800/50 text-slate-400 font-mono italic cursor-not-allowed"
                                    readOnly
                                    title="El costo se calcula automáticamente basandose en movimientos de inventario."
                                />
                            </div>
                            <p className="text-[9px] text-slate-500 italic">Valor calculado por el sistema (CPP)</p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="tax_rate" className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Impuesto IVA (%)</Label>
                            <div className="relative">
                                <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-500/70" />
                                <Input
                                    id="tax_rate"
                                    type="number"
                                    step="1"
                                    {...form.register('tax_rate', { valueAsNumber: true })}
                                    className="pl-10 bg-slate-950/50 border-slate-800 text-white font-mono"
                                />
                            </div>
                        </div>

                        <div className="pt-4">
                            <Button
                                type="submit"
                                disabled={isLoading}
                                className="w-full rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold h-12 shadow-lg shadow-blue-900/40 transition-all"
                            >
                                {isLoading ? (
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>Procesando...</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <Save className="h-4 w-4" />
                                        <span>Guardar Cambios</span>
                                    </div>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </form>
    )
}
