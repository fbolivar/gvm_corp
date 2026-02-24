"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { productionOrderSchema, ProductionOrder, ProductionRecipe } from "../types"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Textarea } from "@/shared/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Warehouse } from "@/features/inventory/types"
import { ClipboardList, Play, Save, Factory, Warehouse as WarehouseIcon, Hash, ChevronDown, Sparkles, Target, AlertCircle } from "lucide-react"
import { cn } from "@/shared/lib/utils"

interface OrderFormProps {
    recipes: ProductionRecipe[]
    warehouses: Warehouse[]
    initialData?: Partial<ProductionOrder>
    onSubmit: (data: ProductionOrder) => Promise<void>
    isLoading?: boolean
}

export function OrderForm({ recipes, warehouses, initialData, onSubmit, isLoading }: OrderFormProps) {
    const {
        register,
        handleSubmit,
        formState: { errors }
    } = useForm<ProductionOrder>({
        resolver: zodResolver(productionOrderSchema) as any,
        defaultValues: {
            status: 'DRAFT',
            qty_produced: 0,
            order_number: `OP-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
            ...initialData
        }
    })

    return (
        <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-10 animate-in fade-in slide-in-from-bottom-5 duration-1000 max-w-5xl mx-auto pb-20">
            <Card className="rounded-[2.5rem] bg-white border-none shadow-premium overflow-hidden group">
                <CardHeader className="p-10 bg-slate-50/50 border-b border-slate-50">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="h-14 w-14 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600 shadow-sm group-hover:scale-110 transition-transform duration-500">
                                <ClipboardList className="h-7 w-7" />
                            </div>
                            <div className="space-y-1">
                                <CardTitle className="text-2xl font-black text-slate-900 tracking-tight italic">Orden de Producción</CardTitle>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Liberación de carga industrial</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-rose-50/50 rounded-full">
                            <Sparkles className="h-3 w-3 text-rose-500 animate-pulse" />
                            <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest">Prioridad 01</span>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-10 space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-5 block">Identificador OP</Label>
                            <div className="relative group/field">
                                <Hash className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within/field:text-primary transition-colors" />
                                <Input
                                    {...register("order_number")}
                                    placeholder="OP-2025-XXXX"
                                    className="h-14 pl-14 bg-slate-50 border-none rounded-2xl font-black text-slate-900 focus-visible:ring-4 focus-visible:ring-primary/10 transition-all font-mono tracking-tighter"
                                />
                            </div>
                            {errors.order_number && <p className="text-rose-500 text-[10px] font-black uppercase tracking-tight ml-5">{errors.order_number.message}</p>}
                        </div>

                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-5 block">Ficha Técnica (BOM)</Label>
                            <div className="relative group/field">
                                <Factory className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within/field:text-primary transition-colors" />
                                <select
                                    {...register("recipe_id")}
                                    className="w-full h-14 pl-14 pr-12 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus:ring-4 focus:ring-primary/10 transition-all appearance-none"
                                >
                                    <option value="">Seleccionar Receta...</option>
                                    {recipes.map(r => (
                                        <option key={r.id} value={r.id}>{r.name}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 pointer-events-none" />
                            </div>
                            {errors.recipe_id && <p className="text-rose-500 text-[10px] font-black uppercase tracking-tight ml-5">{errors.recipe_id.message}</p>}
                        </div>

                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-5 block">Bodega Destino</Label>
                            <div className="relative group/field">
                                <WarehouseIcon className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within/field:text-primary transition-colors" />
                                <select
                                    {...register("warehouse_id")}
                                    className="w-full h-14 pl-14 pr-12 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus:ring-4 focus:ring-primary/10 transition-all appearance-none"
                                >
                                    <option value="">Seleccionar Bodega...</option>
                                    {warehouses.map(w => (
                                        <option key={w.id} value={w.id}>{w.name}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 pointer-events-none" />
                            </div>
                            {errors.warehouse_id && <p className="text-rose-500 text-[10px] font-black uppercase tracking-tight ml-5">{errors.warehouse_id.message}</p>}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                        <div className="md:col-span-4 space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-5 block">Cantidad Objetivo</Label>
                            <div className="relative group/field">
                                <Target className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within/field:text-primary transition-colors" />
                                <Input
                                    type="number"
                                    {...register("qty_target", { valueAsNumber: true })}
                                    className="h-14 pl-14 bg-slate-50 border-none rounded-2xl font-black text-slate-900 focus-visible:ring-4 focus-visible:ring-primary/10 transition-all text-xl"
                                />
                                <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 uppercase tracking-widest">UNDS</span>
                            </div>
                            {errors.qty_target && <p className="text-rose-500 text-[10px] font-black uppercase tracking-tight ml-5">{errors.qty_target.message}</p>}
                        </div>

                        <div className="md:col-span-8 space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-5 block">Observaciones de Planta</Label>
                            <div className="relative group/field">
                                <AlertCircle className="absolute left-6 top-4 h-5 w-5 text-slate-300 group-focus-within/field:text-primary transition-colors" />
                                <Textarea
                                    {...register("notes")}
                                    placeholder="Instrucciones adicionales para el equipo de producción..."
                                    className="pl-14 pt-4 bg-slate-50 border-none rounded-2xl font-medium text-slate-900 focus-visible:ring-4 focus-visible:ring-primary/10 transition-all min-h-[90px] resize-none"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-10 border-t border-slate-50 flex flex-col sm:flex-row gap-6">
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="flex-1 h-20 rounded-[2rem] bg-slate-900 hover:bg-primary text-white font-black italic tracking-tight text-xl transition-all shadow-active active:scale-95 group overflow-hidden relative"
                        >
                            {isLoading ? (
                                <div className="flex items-center gap-4">
                                    <div className="h-7 w-7 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                                    <span>SINCRONIZANDO...</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <Play className="h-7 w-7 fill-current group-hover:scale-110 transition-transform" />
                                    <span>LIBERAR ÓRDEN A PLANTA</span>
                                    <Sparkles className="h-6 w-6 absolute -top-1 right-4 opacity-10 group-hover:opacity-100 transition-opacity" />
                                </div>
                            )}
                        </Button>

                        <Button
                            type="button"
                            variant="ghost"
                            className="h-20 px-10 rounded-[2rem] text-slate-400 hover:text-slate-900 font-black uppercase tracking-widest text-[10px] transition-all"
                        >
                            <Save className="h-5 w-5 mr-3" />
                            Guardar Borrador
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </form>
    )
}
