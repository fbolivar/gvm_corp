"use client"

import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { productionRecipeSchema, ProductionRecipe } from "../types"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Textarea } from "@/shared/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Product } from "@/features/products/types"
import { Plus, Trash2, Save, Factory, Box, ChevronDown, Sparkles, AlertCircle, Hash, LayoutGrid } from "lucide-react"
import { cn } from "@/shared/lib/utils"

interface RecipeFormProps {
    products: Product[]
    initialData?: Partial<ProductionRecipe>
    onSubmit: (data: ProductionRecipe) => Promise<void>
    isLoading?: boolean
}

export function RecipeForm({ products, initialData, onSubmit, isLoading }: RecipeFormProps) {
    const {
        register,
        control,
        handleSubmit,
        formState: { errors }
    } = useForm<ProductionRecipe>({
        resolver: zodResolver(productionRecipeSchema) as any,
        defaultValues: {
            is_active: true,
            items: [{ product_id: '', qty_required: 1 }],
            ...initialData
        }
    })

    const { fields, append, remove } = useFieldArray({
        control,
        name: "items" as any
    })

    return (
        <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-12 animate-in fade-in slide-in-from-bottom-5 duration-1000 max-w-6xl mx-auto pb-20">
            <div className="grid gap-10 lg:grid-cols-12 items-start">
                {/* 🏷️ RECIPE HEADER INFO */}
                <Card className="lg:col-span-5 rounded-[2.5rem] bg-white border-none shadow-premium overflow-hidden group">
                    <CardHeader className="p-8 bg-slate-50/50 border-b border-slate-50">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-sm transition-transform group-hover:scale-110">
                                <Factory className="h-6 w-6" />
                            </div>
                            <div className="space-y-0.5">
                                <CardTitle className="text-xl font-black text-slate-900 tracking-tight italic">Ficha Técnica</CardTitle>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Definición de Salida</p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-8 space-y-8">
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4 block">Nombre de la Receta</Label>
                            <div className="relative group/field">
                                <LayoutGrid className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within/field:text-primary transition-colors" />
                                <Input
                                    {...register("name")}
                                    placeholder="Ej: Mezcla Vinilo Base A"
                                    className="h-12 pl-12 bg-slate-50 border-none rounded-[1.25rem] font-bold text-slate-900 focus-visible:ring-4 focus-visible:ring-primary/10 transition-all placeholder:text-slate-300"
                                />
                            </div>
                            {errors.name && <p className="text-rose-500 text-[10px] font-black uppercase tracking-tighter ml-4">{errors.name.message}</p>}
                        </div>

                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4 block">Producto a Generar (SKU)</Label>
                            <div className="relative group/field">
                                <Box className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within/field:text-primary transition-colors" />
                                <select
                                    {...register("product_id")}
                                    className="w-full h-12 pl-12 pr-10 bg-slate-50 border-none rounded-[1.25rem] font-bold text-slate-900 focus:ring-4 focus:ring-primary/10 transition-all appearance-none"
                                >
                                    <option value="">Seleccionar SKU Final...</option>
                                    {products.map(p => (
                                        <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 pointer-events-none" />
                            </div>
                            {errors.product_id && <p className="text-rose-500 text-[10px] font-black uppercase tracking-tighter ml-4">{errors.product_id.message}</p>}
                        </div>

                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4 block">Método de Transformación</Label>
                            <div className="relative group/field">
                                <AlertCircle className="absolute left-5 top-4 h-4 w-4 text-slate-300 group-focus-within/field:text-primary transition-colors" />
                                <Textarea
                                    {...register("description")}
                                    placeholder="Detalles sobre el proceso, tiempos y alertas..."
                                    className="pl-12 pt-4 bg-slate-50 border-none rounded-[1.25rem] font-medium text-slate-900 focus-visible:ring-4 focus-visible:ring-primary/10 transition-all min-h-[140px] resize-none"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* 📦 BOM ITEMS (MATERIALS) */}
                <Card className="lg:col-span-7 rounded-[2.5rem] bg-white border-none shadow-premium overflow-hidden group">
                    <CardHeader className="p-8 bg-slate-50/50 border-b border-slate-50">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 shadow-sm">
                                    <Box className="h-6 w-6" />
                                </div>
                                <div className="space-y-0.5">
                                    <CardTitle className="text-xl font-black text-slate-900 tracking-tight italic">Estructura BOM</CardTitle>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Lista de Materiales e Insumos</p>
                                </div>
                            </div>
                            <Button
                                type="button"
                                onClick={() => append({ product_id: '', qty_required: 1 })}
                                className="h-10 px-6 rounded-xl bg-slate-900 hover:bg-primary text-white font-black text-[10px] uppercase tracking-widest transition-all hover:scale-105 active:scale-95"
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Añadir Insumo
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-slate-50">
                            {fields.map((field, index) => (
                                <div key={field.id} className="p-8 grid grid-cols-1 md:grid-cols-12 gap-6 items-end group/item hover:bg-slate-50/50 transition-colors">
                                    <div className="md:col-span-7 space-y-3">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4 block">Materia Prima</Label>
                                        <div className="relative group/field2">
                                            <Hash className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within/field2:text-primary transition-colors" />
                                            <select
                                                {...register(`items.${index}.product_id` as const)}
                                                className="w-full h-12 pl-12 pr-10 bg-slate-50 border-none rounded-[1.25rem] font-bold text-slate-900 focus:ring-4 focus:ring-primary/10 transition-all appearance-none"
                                            >
                                                <option value="">Seleccionar Insumo...</option>
                                                {products.map(p => (
                                                    <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                                                ))}
                                            </select>
                                            <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 pointer-events-none" />
                                        </div>
                                    </div>

                                    <div className="md:col-span-4 space-y-3">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4 block">Cant. Necesaria</Label>
                                        <div className="relative group/field3">
                                            <Input
                                                type="number"
                                                step="0.0001"
                                                {...register(`items.${index}.qty_required` as const, { valueAsNumber: true })}
                                                className="h-12 pl-6 pr-12 bg-slate-50 border-none rounded-[1.25rem] font-black text-slate-900 focus-visible:ring-4 focus-visible:ring-primary/10 transition-all text-base tracking-tighter"
                                            />
                                            <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-300">UNDS</span>
                                        </div>
                                    </div>

                                    <div className="md:col-span-1 flex justify-end pb-1">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={() => remove(index)}
                                            className="h-12 w-12 text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all"
                                            disabled={fields.length === 1}
                                        >
                                            <Trash2 className="h-5 w-5" />
                                        </Button>
                                    </div>

                                    {errors.items?.[index]?.product_id && (
                                        <p className="col-span-12 text-rose-500 text-[9px] font-black uppercase tracking-tight ml-4 mt-1">
                                            ❌ Requerido: {errors.items[index]?.product_id?.message}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>

                        {errors.items?.message && (
                            <div className="p-6 bg-rose-50">
                                <p className="text-rose-500 text-[10px] font-black uppercase tracking-widest text-center flex items-center justify-center gap-2">
                                    <AlertCircle className="h-4 w-4" /> {errors.items.message}
                                </p>
                            </div>
                        )}

                        <div className="p-10 bg-slate-50/30 border-t border-slate-50">
                            <Button
                                type="submit"
                                disabled={isLoading}
                                className="w-full h-20 rounded-[2.5rem] bg-slate-900 hover:bg-primary text-white font-black italic tracking-tight text-xl transition-all shadow-active active:scale-95 group overflow-hidden relative"
                            >
                                {isLoading ? (
                                    <div className="flex items-center gap-4">
                                        <div className="h-7 w-7 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                                        <span>CERTIFICANDO...</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3">
                                        <Save className="h-7 w-7 group-hover:scale-110 transition-transform" />
                                        <span>GUARDAR FICHA MAESTRA</span>
                                        <Sparkles className="h-6 w-6 absolute -top-1 right-6 opacity-10 group-hover:opacity-100 transition-opacity" />
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
