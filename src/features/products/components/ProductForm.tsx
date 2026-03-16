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
    AlertTriangle, FileText, Percent, Boxes, PiggyBank
} from "lucide-react"

interface ProductFormProps {
    initialData?: Product
    onSubmit: (data: Product) => Promise<void>
    isLoading?: boolean
}

export function ProductForm({ initialData, onSubmit, isLoading }: ProductFormProps) {
    const form = useForm<Product>({
        resolver: zodResolver(productSchema) as any, // eslint-disable-line @typescript-eslint/no-explicit-any
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
            is_fixed_asset: false,
            asset_category: null,
        }
    })

    const errors = form.formState.errors
    const watchIsFixedAsset = form.watch('is_fixed_asset')

    return (
        <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-6"> {/* eslint-disable-line @typescript-eslint/no-explicit-any */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Informacion General */}
                <Card className="lg:col-span-2 border border-slate-100 bg-white shadow-sm rounded-2xl overflow-hidden">
                    <CardHeader className="p-5 pb-3 border-b border-slate-100">
                        <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <Info className="h-4 w-4 text-blue-600" />
                            Informacion General
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-5 space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Codigo / SKU</Label>
                                <div className="relative">
                                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <Input
                                        {...form.register('sku')}
                                        className="pl-10 h-9 bg-slate-50 border-slate-200 font-mono uppercase text-sm"
                                        placeholder="PRD-001"
                                    />
                                </div>
                                {errors.sku && <p className="text-rose-500 text-[10px]">{errors.sku.message}</p>}
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Nombre Comercial</Label>
                                <div className="relative">
                                    <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <Input
                                        {...form.register('name')}
                                        className="pl-10 h-9 bg-slate-50 border-slate-200 text-sm"
                                        placeholder="Nombre del producto o servicio"
                                    />
                                </div>
                                {errors.name && <p className="text-rose-500 text-[10px]">{errors.name.message}</p>}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                <FileText className="h-3 w-3" /> Descripcion
                            </Label>
                            <Textarea
                                {...form.register('description')}
                                rows={3}
                                className="bg-slate-50 border-slate-200 text-sm resize-none"
                                placeholder="Descripcion tecnica, composicion, uso, etc."
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Tipo</Label>
                                <select
                                    {...form.register('type')}
                                    className="w-full h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 outline-none text-sm"
                                >
                                    <option value="GOOD">Bien / Producto</option>
                                    <option value="SERVICE">Servicio</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <Scale className="h-3 w-3" /> Unidad de Medida
                                </Label>
                                <select
                                    {...form.register('uom')}
                                    className="w-full h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 outline-none text-sm"
                                >
                                    {UOM_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Estado</Label>
                                <select
                                    {...form.register('status')}
                                    className="w-full h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 outline-none text-sm"
                                >
                                    <option value="ACTIVE">Activo</option>
                                    <option value="INACTIVE">Inactivo</option>
                                    <option value="ARCHIVED">Archivado</option>
                                </select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Precios, IVA y Stock */}
                <div className="flex flex-col gap-4">
                    <Card className="border border-slate-100 bg-white shadow-sm rounded-2xl overflow-hidden">
                        <CardHeader className="p-5 pb-3 border-b border-slate-100">
                            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-emerald-600" />
                                Precios e IVA
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-5 space-y-4">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Precio de Venta</Label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                                    <Input
                                        type="number"
                                        step="1"
                                        {...form.register('selling_price', { valueAsNumber: true })}
                                        className="pl-10 h-9 bg-slate-50 border-slate-200 font-mono text-sm font-bold"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Costo (CPP)</Label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-500" />
                                    <Input
                                        type="number"
                                        step="1"
                                        {...form.register('cost', { valueAsNumber: true })}
                                        className="pl-10 h-9 bg-slate-50 border-slate-200 text-slate-400 font-mono text-sm cursor-not-allowed"
                                        readOnly
                                        title="Calculado automaticamente por movimientos de inventario"
                                    />
                                </div>
                                <p className="text-[10px] text-slate-400">Calculado por el sistema (CPP)</p>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <Percent className="h-3 w-3" /> Categoria IVA
                                </Label>
                                <select
                                    {...form.register('tax_category')}
                                    className="w-full h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 outline-none text-sm"
                                >
                                    {(Object.keys(TAX_LABELS) as (keyof typeof TAX_LABELS)[]).map(k => (
                                        <option key={k} value={k}>{TAX_LABELS[k]}</option>
                                    ))}
                                </select>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border border-slate-100 bg-white shadow-sm rounded-2xl overflow-hidden">
                        <CardHeader className="p-5 pb-3 border-b border-slate-100">
                            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                <Boxes className="h-4 w-4 text-amber-600" />
                                Control de Inventario
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-5">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <AlertTriangle className="h-3 w-3 text-amber-500" /> Stock Minimo (alerta)
                                </Label>
                                <Input
                                    type="number"
                                    step="1"
                                    {...form.register('min_stock', { valueAsNumber: true })}
                                    className="h-9 bg-slate-50 border-slate-200 font-mono text-sm"
                                    placeholder="0"
                                />
                                <p className="text-[10px] text-slate-400">Alerta cuando el stock baje de este valor</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Fixed Asset Configuration */}
                    <Card className="border border-slate-100 bg-white shadow-sm rounded-2xl overflow-hidden">
                        <CardHeader className="p-5 pb-3 border-b border-slate-100">
                            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                <PiggyBank className="h-4 w-4 text-violet-600" />
                                Activo Fijo
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-5 space-y-4">
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="is_fixed_asset"
                                    {...form.register('is_fixed_asset')}
                                    className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                                />
                                <Label htmlFor="is_fixed_asset" className="text-xs font-medium text-slate-700 cursor-pointer">
                                    Este producto es un activo fijo
                                </Label>
                            </div>
                            {watchIsFixedAsset && (
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Categoria de Activo</Label>
                                    <select
                                        {...form.register('asset_category')}
                                        className="w-full h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 outline-none text-sm"
                                    >
                                        <option value="">Seleccionar...</option>
                                        <option value="LAND">Terreno</option>
                                        <option value="BUILDING">Edificio</option>
                                        <option value="VEHICLE">Vehiculo</option>
                                        <option value="EQUIPMENT">Maquinaria / Equipo</option>
                                        <option value="FURNITURE">Muebles y Enseres</option>
                                        <option value="COMPUTER">Equipos de Computo</option>
                                        <option value="OTHER">Otros</option>
                                    </select>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold h-9 text-xs"
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
