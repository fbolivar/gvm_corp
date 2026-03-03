"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { movementSchema, InventoryMovement } from "../types";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Product } from "@/features/products/types";
import { Warehouse } from "@/features/inventory/types";
import {
    ChevronDown,
    ArrowDownLeft,
    ArrowUpRight,
    Box,
    Warehouse as WarehouseIcon,
    Calendar,
    Tag,
    AlertCircle,
    CheckCircle2,
    DollarSign,
    Layers,
    FlaskConical
} from "lucide-react";
import { useEffect, useState } from "react";
import { inventoryService } from "../services/inventoryService";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/shared/lib/utils";
import { Badge } from "@/shared/components/ui/badge";

interface InventoryMovementFormProps {
    products: Product[];
    warehouses: Warehouse[];
    onSubmit: (data: InventoryMovement) => Promise<void>;
    isLoading?: boolean;
}

const selectClass = "w-full h-14 bg-white border-none rounded-2xl px-12 text-sm font-bold text-slate-900 appearance-none shadow-inner focus:ring-4 focus:ring-primary/5 outline-none hover:bg-slate-50 transition-all cursor-pointer";
const labelClass = "text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block";

export function InventoryMovementForm({ products, warehouses, onSubmit, isLoading }: InventoryMovementFormProps) {
    const [currentStock, setCurrentStock] = useState<number | null>(null);
    const [loadingStock, setLoadingStock] = useState(false);
    const [availableLots, setAvailableLots] = useState<Array<{ id: string; lot_number: string; batch_code: string | null; qty: number; expiration_date: string | null; status: string }>>([]);
    const supabase = createClient();

    const form = useForm<InventoryMovement>({
        resolver: zodResolver(movementSchema) as any,
        defaultValues: {
            type: 'IN',
            qty: 1,
            cost: 0,
            occurred_at: new Date().toISOString().slice(0, 16)
        }
    });

    const watchProductId = form.watch('product_id');
    const watchWarehouseId = form.watch('warehouse_id');
    const watchType = form.watch('type');

    useEffect(() => {
        if (watchProductId && watchWarehouseId) {
            fetchStock();
            fetchLots();
        } else {
            setCurrentStock(null);
            setAvailableLots([]);
        }
    }, [watchProductId, watchWarehouseId]);

    const fetchStock = async () => {
        setLoadingStock(true);
        try {
            const stock = await inventoryService.getStock(supabase, watchProductId, watchWarehouseId);
            setCurrentStock(stock);
        } catch (error) {
            console.error("Error fetching stock preview:", error);
        } finally {
            setLoadingStock(false);
        }
    };

    const fetchLots = async () => {
        try {
            const { data } = await supabase
                .from('product_lots')
                .select('id, lot_number, batch_code, qty, expiration_date, status')
                .eq('product_id', watchProductId)
                .eq('warehouse_id', watchWarehouseId)
                .in('status', ['ACTIVE', 'QUARANTINE'])
                .order('expiration_date', { ascending: true });
            setAvailableLots(data || []);
        } catch {
            setAvailableLots([]);
        }
    };

    const isEntry = watchType === 'IN';

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {/* Stock Preview Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className={cn(
                    "rounded-[2.5rem] border-none shadow-premium transition-all duration-500 overflow-hidden group",
                    isEntry ? "bg-emerald-500" : "bg-rose-500"
                )}>
                    <CardContent className="p-8 text-white relative">
                        <div className="absolute top-0 right-0 p-8 opacity-20 rotate-12 group-hover:rotate-0 transition-transform duration-700">
                            {isEntry ? <ArrowDownLeft className="h-24 w-24" /> : <ArrowUpRight className="h-24 w-24" />}
                        </div>
                        <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-1">Operación Seleccionada</p>
                        <h3 className="text-4xl font-black italic tracking-tighter">
                            {isEntry ? "Entrada" : "Salida"}
                        </h3>
                        <p className="text-[10px] font-bold text-white/50 mt-4 uppercase tracking-widest">
                            {isEntry ? "+ Incremento de activos" : "- Disminución de activos"}
                        </p>
                    </CardContent>
                </Card>

                <Card className="rounded-[2.5rem] border-none bg-white shadow-premium overflow-hidden group">
                    <CardContent className="p-8 relative">
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                            <Layers className="h-20 w-20 text-slate-900" />
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Disponibilidad en Bodega</p>
                        <div className="flex items-end gap-2">
                            <h3 className={cn(
                                "text-4xl font-black tracking-tighter italic",
                                loadingStock ? "text-slate-200" : "text-slate-900"
                            )}>
                                {currentStock !== null ? currentStock.toLocaleString() : '--'}
                            </h3>
                            <span className="text-slate-300 font-bold mb-1">UND</span>
                        </div>
                        {currentStock !== null && currentStock <= 5 && (
                            <Badge className="mt-4 bg-amber-50 text-amber-600 border-none text-[8px] font-black tracking-widest">
                                <AlertCircle className="h-3 w-3 mr-1" /> STOCK CRÍTICO
                            </Badge>
                        )}
                        {!watchProductId && <p className="text-[10px] text-slate-300 font-bold mt-4 italic uppercase">Seleccione producto y bodega</p>}
                    </CardContent>
                </Card>
            </div>

            {/* Main Form Card */}
            <Card className="rounded-[3rem] border-none bg-white shadow-premium overflow-hidden">
                <CardHeader className="p-10 pb-4">
                    <CardTitle className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-4 italic uppercase">
                        <div className="h-12 w-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-active">
                            <Box className="h-6 w-6" />
                        </div>
                        Detalles del Movimiento
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-10 pt-6">
                    <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <Label className={labelClass}>Tipo de Acción</Label>
                                <div className="relative">
                                    <div className="absolute left-5 top-1/2 -translate-y-1/2 z-10">
                                        {isEntry ? <ArrowDownLeft className="h-5 w-5 text-emerald-500" /> : <ArrowUpRight className="h-5 w-5 text-rose-500" />}
                                    </div>
                                    <select {...form.register('type')} className={selectClass}>
                                        <option value="IN">Entrada (Compra/Saldo Inicial)</option>
                                        <option value="OUT">Salida (Venta/Baja/Ajuste)</option>
                                    </select>
                                    <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 pointer-events-none" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className={labelClass}>Fecha de Ejecución</Label>
                                <div className="relative">
                                    <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
                                    <Input
                                        type="datetime-local"
                                        {...form.register('occurred_at')}
                                        className="h-14 pl-14 bg-white border-none rounded-2xl font-bold text-slate-900 shadow-inner focus:ring-4 focus:ring-primary/5"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <Label className={labelClass}>Origen / Bodega</Label>
                                <div className="relative">
                                    <WarehouseIcon className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 pointer-events-none z-10" />
                                    <select {...form.register('warehouse_id')} className={selectClass}>
                                        <option value="">Seleccionar Almacén</option>
                                        {warehouses.map(w => (
                                            <option key={w.id} value={w.id}>{w.name.toUpperCase()}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 pointer-events-none" />
                                </div>
                                {form.formState.errors.warehouse_id && <p className="text-rose-500 text-[10px] font-black uppercase tracking-widest mt-1 ml-1">{form.formState.errors.warehouse_id.message}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label className={labelClass}>Artículo Logístico</Label>
                                <div className="relative">
                                    <Tag className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 pointer-events-none z-10" />
                                    <select {...form.register('product_id')} className={selectClass}>
                                        <option value="">Seleccionar Producto</option>
                                        {products.map(p => (
                                            <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 pointer-events-none" />
                                </div>
                                {form.formState.errors.product_id && <p className="text-rose-500 text-[10px] font-black uppercase tracking-widest mt-1 ml-1">{form.formState.errors.product_id.message}</p>}
                            </div>
                        </div>

                        {/* Lot Selector — shows when product+warehouse selected and lots exist */}
                        {availableLots.length > 0 && (
                            <div className="space-y-2">
                                <Label className={labelClass}>
                                    <span className="flex items-center gap-1.5">
                                        <FlaskConical className="h-3 w-3" />
                                        Lote {watchType === 'OUT' ? '(FEFO — Primero en Vencer)' : '(Opcional)'}
                                    </span>
                                </Label>
                                <div className="relative">
                                    <FlaskConical className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-indigo-400 pointer-events-none z-10" />
                                    <select {...form.register('lot_id')} className={selectClass}>
                                        <option value="">Sin lote específico</option>
                                        {availableLots.map(lot => {
                                            const expDate = lot.expiration_date ? new Date(lot.expiration_date) : null;
                                            const daysLeft = expDate ? Math.ceil((expDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
                                            const expLabel = daysLeft !== null
                                                ? daysLeft <= 0 ? ' — VENCIDO' : daysLeft <= 30 ? ` — ${daysLeft}d restantes` : ` — Vence ${expDate!.toLocaleDateString('es-CO')}`
                                                : '';
                                            return (
                                                <option key={lot.id} value={lot.id}>
                                                    {lot.lot_number}{lot.batch_code ? ` / ${lot.batch_code}` : ''} — {lot.qty} UND{expLabel}
                                                </option>
                                            );
                                        })}
                                    </select>
                                    <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 pointer-events-none" />
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <Label className={labelClass}>Cantidad Operativa</Label>
                                <div className="relative">
                                    <Layers className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
                                    <Input
                                        type="number"
                                        step="0.01"
                                        {...form.register('qty', { valueAsNumber: true })}
                                        placeholder="0.00"
                                        className="h-14 pl-14 bg-white border-none rounded-2xl font-bold text-slate-900 shadow-inner focus:ring-4 focus:ring-primary/5 text-lg tracking-tighter"
                                    />
                                </div>
                                {form.formState.errors.qty && <p className="text-rose-500 text-[10px] font-black uppercase tracking-widest mt-1 ml-1">{form.formState.errors.qty.message}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label className={labelClass}>Valor de Auditoría (P.U.)</Label>
                                <div className="relative">
                                    <DollarSign className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-500" />
                                    <Input
                                        type="number"
                                        step="0.01"
                                        {...form.register('cost', { valueAsNumber: true })}
                                        placeholder="Costo Unitario"
                                        className="h-14 pl-14 bg-white border-none rounded-2xl font-bold text-slate-900 shadow-inner focus:ring-4 focus:ring-primary/5 text-lg tracking-tighter"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-6">
                            <Button
                                type="submit"
                                disabled={isLoading}
                                className={cn(
                                    "w-full h-16 rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-active transition-all active:scale-95",
                                    isEntry ? "bg-emerald-600 hover:bg-emerald-500" : "bg-rose-600 hover:bg-rose-500"
                                )}
                            >
                                {isLoading ? (
                                    <div className="flex items-center gap-3">
                                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        PROCESANDO KARDEX...
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="h-5 w-5" />
                                        Confirmar Registro Maestro
                                    </div>
                                )}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
