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

const selectClass = "w-full h-9 bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-8 text-sm font-medium text-slate-900 appearance-none focus:ring-1 focus:ring-indigo-200 outline-none cursor-pointer";
const labelClass = "text-[10px] font-semibold text-slate-400 uppercase tracking-wider ml-1 mb-1.5 block";

export function InventoryMovementForm({ products, warehouses, onSubmit, isLoading }: InventoryMovementFormProps) {
    const [currentStock, setCurrentStock] = useState<number | null>(null);
    const [loadingStock, setLoadingStock] = useState(false);
    const [availableLots, setAvailableLots] = useState<Array<{ id: string; lot_number: string; batch_code: string | null; qty: number; expiration_date: string | null; status: string }>>([]);
    const supabase = createClient();

    const form = useForm<InventoryMovement>({
        resolver: zodResolver(movementSchema) as any, // eslint-disable-line @typescript-eslint/no-explicit-any
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
    }, [watchProductId, watchWarehouseId]); // eslint-disable-line react-hooks/exhaustive-deps

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
        <div className="space-y-6">
            {/* Stock Preview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className={cn(
                    "rounded-2xl border-none shadow-sm overflow-hidden",
                    isEntry ? "bg-emerald-500" : "bg-rose-500"
                )}>
                    <CardContent className="p-5 text-white relative">
                        <div className="absolute top-3 right-3 opacity-20">
                            {isEntry ? <ArrowDownLeft className="h-12 w-12" /> : <ArrowUpRight className="h-12 w-12" />}
                        </div>
                        <p className="text-[10px] font-semibold text-white/60 uppercase tracking-wider mb-1">Tipo de Operación</p>
                        <h3 className="text-xl font-bold tracking-tight">
                            {isEntry ? "Entrada" : "Salida"}
                        </h3>
                        <p className="text-[10px] text-white/50 mt-2">
                            {isEntry ? "+ Incremento de stock" : "- Disminución de stock"}
                        </p>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                    <CardContent className="p-5 relative">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Stock Actual en Bodega</p>
                        <div className="flex items-end gap-2">
                            <h3 className={cn(
                                "text-xl font-bold tracking-tight",
                                loadingStock ? "text-slate-200" : "text-slate-900"
                            )}>
                                {currentStock !== null ? currentStock.toLocaleString() : '--'}
                            </h3>
                            <span className="text-slate-400 text-xs font-medium mb-0.5">UND</span>
                        </div>
                        {currentStock !== null && currentStock <= 5 && (
                            <Badge className="mt-3 bg-amber-50 text-amber-600 border border-amber-100 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                                <AlertCircle className="h-3 w-3 mr-1" /> Stock Crítico
                            </Badge>
                        )}
                        {!watchProductId && <p className="text-[10px] text-slate-300 mt-3">Seleccione producto y bodega</p>}
                    </CardContent>
                </Card>
            </div>

            {/* Form Card */}
            <Card className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                <CardHeader className="p-5 pb-3 border-b border-slate-100">
                    <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                            <Box className="h-4 w-4" />
                        </div>
                        Detalles del Movimiento
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-5">
                    <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-5">{/* eslint-disable-line @typescript-eslint/no-explicit-any */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-1.5">
                                <Label className={labelClass}>Tipo de Movimiento</Label>
                                <div className="relative">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
                                        {isEntry ? <ArrowDownLeft className="h-4 w-4 text-emerald-500" /> : <ArrowUpRight className="h-4 w-4 text-rose-500" />}
                                    </div>
                                    <select {...form.register('type')} className={selectClass}>
                                        <option value="IN">Entrada (Compra/Saldo Inicial)</option>
                                        <option value="OUT">Salida (Venta/Baja/Ajuste)</option>
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-300 pointer-events-none" />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label className={labelClass}>Fecha</Label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                                    <Input
                                        type="datetime-local"
                                        {...form.register('occurred_at')}
                                        className="h-9 pl-9 bg-slate-50 border border-slate-200 rounded-lg text-sm focus-visible:ring-1 focus-visible:ring-indigo-200"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-1.5">
                                <Label className={labelClass}>Bodega</Label>
                                <div className="relative">
                                    <WarehouseIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 pointer-events-none z-10" />
                                    <select {...form.register('warehouse_id')} className={selectClass}>
                                        <option value="">Seleccionar Bodega</option>
                                        {warehouses.map(w => (
                                            <option key={w.id} value={w.id}>{w.name}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-300 pointer-events-none" />
                                </div>
                                {form.formState.errors.warehouse_id && <p className="text-rose-500 text-[10px] font-medium mt-1">{form.formState.errors.warehouse_id.message}</p>}
                            </div>

                            <div className="space-y-1.5">
                                <Label className={labelClass}>Producto</Label>
                                <div className="relative">
                                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 pointer-events-none z-10" />
                                    <select {...form.register('product_id')} className={selectClass}>
                                        <option value="">Seleccionar Producto</option>
                                        {products.map(p => (
                                            <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-300 pointer-events-none" />
                                </div>
                                {form.formState.errors.product_id && <p className="text-rose-500 text-[10px] font-medium mt-1">{form.formState.errors.product_id.message}</p>}
                            </div>
                        </div>

                        {/* Lot Selector */}
                        {availableLots.length > 0 && (
                            <div className="space-y-1.5">
                                <Label className={labelClass}>
                                    <span className="flex items-center gap-1.5">
                                        <FlaskConical className="h-3 w-3" />
                                        Lote {watchType === 'OUT' ? '(FEFO — Primero en Vencer)' : '(Opcional)'}
                                    </span>
                                </Label>
                                <div className="relative">
                                    <FlaskConical className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-400 pointer-events-none z-10" />
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
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-300 pointer-events-none" />
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-1.5">
                                <Label className={labelClass}>Cantidad</Label>
                                <div className="relative">
                                    <Layers className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                                    <Input
                                        type="number"
                                        step="0.01"
                                        {...form.register('qty', { valueAsNumber: true })}
                                        placeholder="0.00"
                                        className="h-9 pl-9 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus-visible:ring-1 focus-visible:ring-indigo-200"
                                    />
                                </div>
                                {form.formState.errors.qty && <p className="text-rose-500 text-[10px] font-medium mt-1">{form.formState.errors.qty.message}</p>}
                            </div>

                            <div className="space-y-1.5">
                                <Label className={labelClass}>Costo Unitario</Label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                                    <Input
                                        type="number"
                                        step="0.01"
                                        {...form.register('cost', { valueAsNumber: true })}
                                        placeholder="0.00"
                                        className="h-9 pl-9 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus-visible:ring-1 focus-visible:ring-indigo-200"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-2">
                            <Button
                                type="submit"
                                disabled={isLoading}
                                className={cn(
                                    "w-full h-9 rounded-xl text-xs font-semibold",
                                    isEntry ? "bg-emerald-600 hover:bg-emerald-500" : "bg-rose-600 hover:bg-rose-500"
                                )}
                            >
                                {isLoading ? (
                                    <div className="flex items-center gap-2">
                                        <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Procesando...
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4" />
                                        Confirmar Movimiento
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
