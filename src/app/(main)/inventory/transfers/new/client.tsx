"use client"

import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
    Warehouse as WarehouseIcon,
    Plus,
    Trash2,
    Package,
    ChevronDown,
    FileText,
    ArrowLeftRight,
    Loader2,
    Send,
    Save,
    AlertCircle,
} from "lucide-react";

import { warehouseTransferSchema, WarehouseTransfer } from "@/features/warehouse-transfers/types";
import {
    createTransferAction,
    sendTransferAction,
} from "@/features/warehouse-transfers/actions/transferActions";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Badge } from "@/shared/components/ui/badge";
import { cn } from "@/shared/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Warehouse {
    id?: string;
    name: string;
}

interface ProductOption {
    id?: string;
    name: string;
    sku: string;
}

interface Props {
    warehouses: Warehouse[];
    products: ProductOption[];
}

// ─── Style constants ───────────────────────────────────────────────────────────

const selectClass =
    "w-full h-14 bg-white border-none rounded-2xl px-12 text-sm font-bold text-slate-900 appearance-none shadow-inner focus:ring-4 focus:ring-primary/5 outline-none hover:bg-slate-50 transition-all cursor-pointer";

const labelClass =
    "text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block";

// ─── Component ────────────────────────────────────────────────────────────────

export default function NewTransferClient({ warehouses, products }: Props) {
    const router = useRouter();
    const [loadingDraft, setLoadingDraft] = useState(false);
    const [loadingSend, setLoadingSend] = useState(false);

    const form = useForm<WarehouseTransfer>({
        resolver: zodResolver(warehouseTransferSchema) as any,
        defaultValues: {
            from_warehouse_id: "",
            to_warehouse_id: "",
            status: "DRAFT",
            notes: "",
            lines: [],
        },
    });

    const fromWarehouseId = useWatch({ control: form.control, name: "from_warehouse_id" });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "lines",
    });

    // ─── Handlers ─────────────────────────────────────────────────────────────

    function addLine() {
        append({
            product_id: "",
            qty: 1,
            qty_received: 0,
            notes: "",
        });
    }

    async function handleSaveDraft() {
        const valid = await form.trigger();
        if (!valid) {
            toast.error("Por favor complete todos los campos requeridos");
            return;
        }
        const vals = form.getValues();
        if (vals.from_warehouse_id === vals.to_warehouse_id) {
            toast.error("La bodega destino debe ser diferente a la bodega origen");
            return;
        }
        setLoadingDraft(true);
        try {
            const data = form.getValues();
            const result = await createTransferAction({ ...data, status: "DRAFT" });
            if (result.error && !result.success) {
                toast.error(result.error);
            } else {
                toast.success(`Traslado ${result.transfer_number ?? ""} guardado como borrador`);
                router.push("/inventory/transfers");
            }
        } finally {
            setLoadingDraft(false);
        }
    }

    async function handleSaveAndSend() {
        const valid = await form.trigger();
        if (!valid) {
            toast.error("Por favor complete todos los campos requeridos");
            return;
        }
        const vals = form.getValues();
        if (vals.from_warehouse_id === vals.to_warehouse_id) {
            toast.error("La bodega destino debe ser diferente a la bodega origen");
            return;
        }
        setLoadingSend(true);
        try {
            const data = form.getValues();

            // 1. Create the draft first
            const createResult = await createTransferAction({ ...data, status: "DRAFT" });
            if (createResult.error && !createResult.success) {
                toast.error(createResult.error);
                return;
            }

            // 2. Immediately send it to IN_TRANSIT
            const sendResult = await sendTransferAction(createResult.id!);
            if (sendResult.error && !sendResult.success) {
                toast.error(sendResult.error);
            } else {
                if (sendResult.error) {
                    // Partial success with warnings
                    toast.warning(sendResult.error);
                } else {
                    toast.success(
                        `Traslado ${createResult.transfer_number ?? ""} enviado en tránsito`
                    );
                }
                router.push("/inventory/transfers");
            }
        } finally {
            setLoadingSend(false);
        }
    }

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

            {/* ── HEADER CARD ─────────────────────────────────────────────── */}
            <Card className="rounded-[3rem] border-none bg-white shadow-premium overflow-hidden">
                <CardHeader className="p-10 pb-4">
                    <CardTitle className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-4 italic uppercase">
                        <div className="h-12 w-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-active">
                            <FileText className="h-6 w-6" />
                        </div>
                        Información General
                    </CardTitle>
                </CardHeader>

                <CardContent className="p-10 pt-4 space-y-8">
                    {/* Row 1: From Warehouse + To Warehouse */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* From Warehouse */}
                        <div className="space-y-2">
                            <Label className={labelClass}>Bodega Origen</Label>
                            <div className="relative">
                                <WarehouseIcon className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 pointer-events-none z-10" />
                                <select
                                    {...form.register("from_warehouse_id")}
                                    className={selectClass}
                                >
                                    <option value="">Seleccionar bodega origen</option>
                                    {warehouses.map((w) => (
                                        <option key={w.id} value={w.id}>
                                            {w.name.toUpperCase()}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 pointer-events-none" />
                            </div>
                            {form.formState.errors.from_warehouse_id && (
                                <p className="text-rose-500 text-[10px] font-black uppercase tracking-widest mt-1 ml-1">
                                    {form.formState.errors.from_warehouse_id.message}
                                </p>
                            )}
                        </div>

                        {/* To Warehouse */}
                        <div className="space-y-2">
                            <Label className={labelClass}>Bodega Destino</Label>
                            <div className="relative">
                                <WarehouseIcon className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-indigo-300 pointer-events-none z-10" />
                                <select
                                    {...form.register("to_warehouse_id")}
                                    className={selectClass}
                                >
                                    <option value="">Seleccionar bodega destino</option>
                                    {warehouses
                                        .filter((w) => w.id !== fromWarehouseId)
                                        .map((w) => (
                                            <option key={w.id} value={w.id}>
                                                {w.name.toUpperCase()}
                                            </option>
                                        ))}
                                </select>
                                <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 pointer-events-none" />
                            </div>
                            {form.formState.errors.to_warehouse_id && (
                                <p className="text-rose-500 text-[10px] font-black uppercase tracking-widest mt-1 ml-1">
                                    {form.formState.errors.to_warehouse_id.message}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Same warehouse warning */}
                    {fromWarehouseId &&
                        form.watch("to_warehouse_id") &&
                        fromWarehouseId === form.watch("to_warehouse_id") && (
                            <div className="flex items-start gap-3 bg-rose-50 border border-rose-100 rounded-2xl px-5 py-3">
                                <AlertCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                                <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest">
                                    La bodega destino debe ser diferente a la bodega origen
                                </p>
                            </div>
                        )}

                    {/* Notes */}
                    <div className="space-y-2">
                        <Label className={labelClass}>Notas u Observaciones (Opcional)</Label>
                        <textarea
                            {...form.register("notes")}
                            rows={3}
                            placeholder="Motivo del traslado, instrucciones especiales, referencias..."
                            className="w-full bg-white border-none rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 shadow-inner focus:ring-4 focus:ring-primary/5 outline-none hover:bg-slate-50 transition-all resize-none placeholder:text-slate-300 placeholder:font-medium"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* ── PRODUCT LINES CARD ──────────────────────────────────────── */}
            <Card className="rounded-[3rem] border-none bg-white shadow-premium overflow-hidden">
                <CardHeader className="p-10 pb-4">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-4 italic uppercase">
                            <div className="h-12 w-12 rounded-2xl bg-indigo-500 flex items-center justify-center text-white shadow-active">
                                <ArrowLeftRight className="h-6 w-6" />
                            </div>
                            Artículos a Trasladar
                        </CardTitle>
                        <Button
                            type="button"
                            onClick={addLine}
                            className="h-12 px-6 rounded-2xl bg-slate-900 hover:bg-slate-700 text-white font-black text-[10px] uppercase tracking-widest shadow-active transition-all active:scale-95"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Agregar Artículo
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="p-10 pt-4">
                    {fields.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-4">
                            <div className="h-20 w-20 rounded-[1.5rem] bg-slate-50 flex items-center justify-center">
                                <Package className="h-10 w-10 text-slate-200" />
                            </div>
                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                                Sin artículos — Agrega al menos uno para trasladar
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Table header */}
                            <div className="hidden md:grid md:grid-cols-[2rem_1fr_10rem_3rem] gap-4 px-2">
                                <span className={cn(labelClass, "mb-0")}>#</span>
                                <span className={cn(labelClass, "mb-0")}>Producto</span>
                                <span className={cn(labelClass, "mb-0 text-right")}>Cantidad</span>
                                <span className={cn(labelClass, "mb-0")}></span>
                            </div>

                            {/* Lines */}
                            {fields.map((field, index) => (
                                <TransferLineRow
                                    key={field.id}
                                    index={index}
                                    form={form}
                                    products={products}
                                    onRemove={() => remove(index)}
                                />
                            ))}
                        </div>
                    )}

                    {form.formState.errors.lines &&
                        !Array.isArray(form.formState.errors.lines) && (
                            <p className="text-rose-500 text-[10px] font-black uppercase tracking-widest mt-4 ml-1">
                                {(form.formState.errors.lines as { message?: string }).message}
                            </p>
                        )}
                </CardContent>
            </Card>

            {/* ── ACTION BUTTONS ───────────────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Save Draft */}
                <Button
                    type="button"
                    disabled={loadingDraft || loadingSend}
                    onClick={handleSaveDraft}
                    className="h-16 rounded-2xl bg-slate-900 hover:bg-slate-700 text-white font-black text-[10px] uppercase tracking-[0.3em] shadow-active transition-all active:scale-95 disabled:opacity-50"
                >
                    {loadingDraft ? (
                        <>
                            <Loader2 className="h-4 w-4 mr-3 animate-spin" />
                            Guardando Borrador...
                        </>
                    ) : (
                        <>
                            <Save className="h-5 w-5 mr-3" />
                            Guardar Borrador
                        </>
                    )}
                </Button>

                {/* Save and Send */}
                <Button
                    type="button"
                    disabled={loadingDraft || loadingSend}
                    onClick={handleSaveAndSend}
                    className="h-16 rounded-2xl bg-indigo-500 hover:bg-indigo-400 text-white font-black text-[10px] uppercase tracking-[0.3em] shadow-lg shadow-indigo-500/25 transition-all active:scale-95 disabled:opacity-50"
                >
                    {loadingSend ? (
                        <>
                            <Loader2 className="h-4 w-4 mr-3 animate-spin" />
                            Enviando Traslado...
                        </>
                    ) : (
                        <>
                            <Send className="h-5 w-5 mr-3" />
                            Guardar y Enviar Traslado
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}

// ─── LineRow sub-component ────────────────────────────────────────────────────

interface LineRowProps {
    index: number;
    form: ReturnType<typeof useForm<WarehouseTransfer>>;
    products: Array<{ id?: string; name: string; sku: string }>;
    onRemove: () => void;
}

function TransferLineRow({ index, form, products, onRemove }: LineRowProps) {
    return (
        <div className="bg-slate-50 rounded-2xl p-4 md:p-0 md:bg-transparent">
            <div className="grid grid-cols-1 md:grid-cols-[2rem_1fr_10rem_3rem] gap-4 items-center">
                {/* Line number */}
                <div className="hidden md:flex items-center justify-center">
                    <Badge className="bg-slate-100 text-slate-400 border-none text-[9px] font-black h-6 w-6 rounded-full p-0 flex items-center justify-center">
                        {index + 1}
                    </Badge>
                </div>

                {/* Product selector */}
                <div className="relative">
                    <Package className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 pointer-events-none z-10" />
                    <select
                        {...form.register(`lines.${index}.product_id`)}
                        className="w-full h-12 bg-white border-none rounded-xl pl-10 pr-8 text-xs font-bold text-slate-900 appearance-none shadow-inner focus:ring-4 focus:ring-primary/5 outline-none hover:bg-slate-50 transition-all cursor-pointer"
                    >
                        <option value="">Seleccionar producto</option>
                        {products.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.name} — {p.sku}
                            </option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-300 pointer-events-none" />
                </div>

                {/* Quantity */}
                <div>
                    <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="Cant."
                        {...form.register(`lines.${index}.qty`, { valueAsNumber: true })}
                        className="h-12 text-right bg-white border-none rounded-xl font-bold text-slate-900 shadow-inner focus:ring-4 focus:ring-primary/5 text-sm tabular-nums"
                    />
                </div>

                {/* Remove */}
                <div className="flex items-center justify-center">
                    <button
                        type="button"
                        onClick={onRemove}
                        aria-label="Eliminar artículo"
                        className="h-9 w-9 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-400 hover:text-rose-600 flex items-center justify-center transition-all active:scale-90"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Field errors */}
            {(form.formState.errors.lines?.[index]?.product_id ||
                form.formState.errors.lines?.[index]?.qty) && (
                <p className="text-rose-500 text-[9px] font-black uppercase tracking-widest mt-2 ml-1">
                    Complete todos los campos de esta línea
                </p>
            )}
        </div>
    );
}
