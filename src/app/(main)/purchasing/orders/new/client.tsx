"use client"

import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
    Building2,
    Warehouse,
    Calendar,
    CalendarClock,
    Plus,
    Trash2,
    Package,
    ChevronDown,
    FileText,
    ShoppingCart,
    Loader2,
    Send,
    Save,
    Hash,
    Banknote,
} from "lucide-react";

import { purchaseOrderSchema, type PurchaseOrder, type POCurrency } from "@/features/purchasing/types";
import {
    createPurchaseOrderAction,
    submitForApprovalAction,
    getNextPONumberAction,
} from "@/features/purchasing/actions/purchaseOrderActions";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Badge } from "@/shared/components/ui/badge";
import { cn } from "@/shared/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Props {
    parties: Array<{ id?: string; legal_name: string; doc_number?: string }>;
    products: Array<{ id?: string; name: string; sku: string; cost?: number; tax_category?: string }>;
    warehouses: Array<{ id?: string; name: string }>;
}

/** Map product tax_category to numeric tax_rate */
function taxCategoryToRate(cat?: string): number {
    if (cat === 'IVA_5') return 0.05;
    if (cat === 'IVA_19') return 0.19;
    return 0; // IVA_0 or default
}

function taxRateLabel(rate: number): string {
    if (rate === 0.05) return '5% IVA';
    if (rate === 0.19) return '19% IVA';
    return '0% Excluido';
}

// ---------------------------------------------------------------------------
// Style constants (aligned with InventoryMovementForm premium design)
// ---------------------------------------------------------------------------

const selectClass =
    "w-full h-14 bg-white border-none rounded-2xl px-12 text-sm font-bold text-slate-900 appearance-none shadow-inner focus:ring-4 focus:ring-primary/5 outline-none hover:bg-slate-50 transition-all cursor-pointer";

const labelClass =
    "text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block";

const inputClass =
    "h-14 pl-14 bg-white border-none rounded-2xl font-bold text-slate-900 shadow-inner focus:ring-4 focus:ring-primary/5 text-sm tracking-tight";

// ---------------------------------------------------------------------------
// Totals hook — reads all lines and computes subtotal / iva / total
// ---------------------------------------------------------------------------

function useTotals(control: ReturnType<typeof useForm<PurchaseOrder>>["control"]) {
    const lines = useWatch({ control, name: "lines" }) ?? [];

    let subtotal = 0;
    let iva = 0;

    for (const line of lines) {
        const qty = Number(line?.qty) || 0;
        const cost = Number(line?.unit_cost) || 0;
        const taxRate = Number(line?.tax_rate) ?? 0.19;
        const lineBase = qty * cost;
        subtotal += lineBase;
        iva += lineBase * taxRate;
    }

    return { subtotal, iva, total: subtotal + iva };
}

// ---------------------------------------------------------------------------
// Format helper
// ---------------------------------------------------------------------------

function fmt(value: number, currency: POCurrency = "COP") {
    if (currency === "USD") {
        return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return value.toLocaleString("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function currencySymbol(currency: POCurrency) {
    return currency === "USD" ? "US$" : "$";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NewOrderClient({ parties, products, warehouses }: Props) {
    const router = useRouter();
    const [loadingDraft, setLoadingDraft] = useState(false);
    const [loadingApproval, setLoadingApproval] = useState(false);
    const [nextPONumber, setNextPONumber] = useState<string>("—");

    const today = new Date().toISOString().split("T")[0];

    const form = useForm<PurchaseOrder>({
        resolver: zodResolver(purchaseOrderSchema) as any,
        defaultValues: {
            supplier_id: "",
            warehouse_id: undefined,
            currency: "COP",
            status: "DRAFT",
            order_date: today,
            expected_delivery: undefined,
            notes: "",
            lines: [],
        },
    });

    const selectedCurrency = useWatch({ control: form.control, name: "currency" }) as POCurrency ?? "COP";

    // Fetch next PO number on mount
    useEffect(() => {
        getNextPONumberAction().then((res) => {
            if (res.poNumber) setNextPONumber(res.poNumber);
        });
    }, []);

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "lines",
    });

    const { subtotal, iva, total } = useTotals(form.control);

    // -----------------------------------------------------------------------
    // Handlers
    // -----------------------------------------------------------------------

    function addLine() {
        append({
            product_id: "",
            qty: 1,
            unit_cost: 0,
            tax_rate: 0,
            qty_received: 0,
            notes: "",
        });
    }

    function handleProductSelect(index: number, productId: string) {
        const product = products.find((p) => p.id === productId);
        form.setValue(`lines.${index}.unit_cost`, product?.cost ?? 0);
        form.setValue(`lines.${index}.tax_rate`, taxCategoryToRate(product?.tax_category));
    }

    async function handleSaveDraft() {
        const valid = await form.trigger();
        if (!valid) {
            const errors = form.formState.errors;
            const missing: string[] = [];
            if (errors.supplier_id) missing.push('Proveedor');
            if (errors.lines && !Array.isArray(errors.lines)) missing.push('Líneas de producto (mínimo 1)');
            if (Array.isArray(errors.lines)) missing.push('Campos en líneas de producto');
            toast.error(missing.length > 0
                ? `Falta: ${missing.join(', ')}`
                : "Por favor complete todos los campos requeridos");
            return;
        }
        setLoadingDraft(true);
        try {
            const data = form.getValues();
            const result = await createPurchaseOrderAction({ ...data, status: "DRAFT" });
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("Orden de compra guardada como borrador");
                router.push("/purchasing/orders");
            }
        } finally {
            setLoadingDraft(false);
        }
    }

    async function handleSaveAndSubmit() {
        const valid = await form.trigger();
        if (!valid) {
            const errors = form.formState.errors;
            const missing: string[] = [];
            if (errors.supplier_id) missing.push('Proveedor');
            if (errors.lines && !Array.isArray(errors.lines)) missing.push('Líneas de producto (mínimo 1)');
            if (Array.isArray(errors.lines)) missing.push('Campos en líneas de producto');
            toast.error(missing.length > 0
                ? `Falta: ${missing.join(', ')}`
                : "Por favor complete todos los campos requeridos");
            return;
        }
        setLoadingApproval(true);
        try {
            const data = form.getValues();
            const createResult = await createPurchaseOrderAction({ ...data, status: "DRAFT" });
            if (createResult.error) {
                toast.error(createResult.error);
                return;
            }
            const approvalResult = await submitForApprovalAction(createResult.id!);
            if (approvalResult.error) {
                toast.error(approvalResult.error);
            } else {
                toast.success("Orden enviada a aprobación exitosamente");
                router.push("/purchasing/orders");
            }
        } finally {
            setLoadingApproval(false);
        }
    }

    // -----------------------------------------------------------------------
    // Render
    // -----------------------------------------------------------------------

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

            {/* ── HEADER FIELDS CARD ─────────────────────────────────────── */}
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
                    {/* Row 0: PO Number + Currency */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Next PO Number (read-only) */}
                        <div className="space-y-2">
                            <Label className={labelClass}>Consecutivo OC</Label>
                            <div className="relative">
                                <Hash className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-amber-400 pointer-events-none z-10" />
                                <div className="w-full h-14 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl px-12 flex items-center">
                                    <span className="text-lg font-black text-slate-900 tracking-tight font-mono">
                                        {nextPONumber}
                                    </span>
                                </div>
                            </div>
                            <p className="text-[9px] font-medium text-slate-400 ml-1">
                                Se asignará automáticamente al guardar
                            </p>
                        </div>

                        {/* Currency selector */}
                        <div className="space-y-2">
                            <Label className={labelClass}>Moneda</Label>
                            <div className="relative">
                                <Banknote className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 pointer-events-none z-10" />
                                <select
                                    {...form.register("currency")}
                                    className={selectClass}
                                >
                                    <option value="COP">COP — Pesos Colombianos</option>
                                    <option value="USD">USD — Dólares Americanos</option>
                                </select>
                                <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    {/* Row 1: Supplier + Warehouse */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Supplier */}
                        <div className="space-y-2">
                            <Label className={labelClass}>Proveedor</Label>
                            <div className="relative">
                                <Building2 className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 pointer-events-none z-10" />
                                <select
                                    {...form.register("supplier_id")}
                                    className={selectClass}
                                >
                                    <option value="">Seleccionar proveedor</option>
                                    {parties.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.legal_name}{p.doc_number ? ` (${p.doc_number})` : ""}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 pointer-events-none" />
                            </div>
                            {form.formState.errors.supplier_id && (
                                <p className="text-rose-500 text-[10px] font-black uppercase tracking-widest mt-1 ml-1">
                                    {form.formState.errors.supplier_id.message}
                                </p>
                            )}
                        </div>

                        {/* Warehouse */}
                        <div className="space-y-2">
                            <Label className={labelClass}>Bodega de Destino</Label>
                            <div className="relative">
                                <Warehouse className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 pointer-events-none z-10" />
                                <select
                                    {...form.register("warehouse_id")}
                                    className={selectClass}
                                >
                                    <option value="">Seleccionar bodega (opcional)</option>
                                    {warehouses.map((w) => (
                                        <option key={w.id} value={w.id}>
                                            {w.name.toUpperCase()}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    {/* Row 2: Order Date + Expected Delivery */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Order Date */}
                        <div className="space-y-2">
                            <Label className={labelClass}>Fecha de Orden</Label>
                            <div className="relative">
                                <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 pointer-events-none z-10" />
                                <Input
                                    type="date"
                                    {...form.register("order_date")}
                                    className={inputClass}
                                />
                            </div>
                            {form.formState.errors.order_date && (
                                <p className="text-rose-500 text-[10px] font-black uppercase tracking-widest mt-1 ml-1">
                                    {form.formState.errors.order_date.message}
                                </p>
                            )}
                        </div>

                        {/* Expected Delivery */}
                        <div className="space-y-2">
                            <Label className={labelClass}>Entrega Esperada (Opcional)</Label>
                            <div className="relative">
                                <CalendarClock className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 pointer-events-none z-10" />
                                <Input
                                    type="date"
                                    {...form.register("expected_delivery")}
                                    className={inputClass}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <Label className={labelClass}>Notas u Observaciones</Label>
                        <textarea
                            {...form.register("notes")}
                            rows={3}
                            placeholder="Instrucciones especiales, condiciones de entrega, referencias..."
                            className="w-full bg-white border-none rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 shadow-inner focus:ring-4 focus:ring-primary/5 outline-none hover:bg-slate-50 transition-all resize-none placeholder:text-slate-300 placeholder:font-medium"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* ── PRODUCT LINES CARD ─────────────────────────────────────── */}
            <Card className="rounded-[3rem] border-none bg-white shadow-premium overflow-hidden">
                <CardHeader className="p-10 pb-4">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-4 italic uppercase">
                            <div className="h-12 w-12 rounded-2xl bg-amber-500 flex items-center justify-center text-slate-950 shadow-active">
                                <ShoppingCart className="h-6 w-6" />
                            </div>
                            Líneas de Producto
                        </CardTitle>
                        <Button
                            type="button"
                            onClick={addLine}
                            className="h-12 px-6 rounded-2xl bg-slate-900 hover:bg-slate-700 text-white font-black text-[10px] uppercase tracking-widest shadow-active transition-all active:scale-95"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Agregar Línea
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
                                Sin productos — Agrega al menos una línea
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Table header */}
                            <div className="hidden md:grid md:grid-cols-[2rem_1fr_8rem_10rem_8rem_10rem_3rem] gap-4 px-2">
                                <span className={cn(labelClass, "mb-0")}>#</span>
                                <span className={cn(labelClass, "mb-0")}>Producto</span>
                                <span className={cn(labelClass, "mb-0 text-right")}>Cantidad</span>
                                <span className={cn(labelClass, "mb-0 text-right")}>Costo Unit.</span>
                                <span className={cn(labelClass, "mb-0 text-right")}>IVA %</span>
                                <span className={cn(labelClass, "mb-0 text-right")}>Subtotal</span>
                                <span className={cn(labelClass, "mb-0")}></span>
                            </div>

                            {/* Lines */}
                            {fields.map((field, index) => (
                                <LineRow
                                    key={field.id}
                                    index={index}
                                    form={form}
                                    products={products}
                                    currency={selectedCurrency}
                                    onProductSelect={handleProductSelect}
                                    onRemove={() => remove(index)}
                                />
                            ))}
                        </div>
                    )}

                    {form.formState.errors.lines && !Array.isArray(form.formState.errors.lines) && (
                        <p className="text-rose-500 text-[10px] font-black uppercase tracking-widest mt-4 ml-1">
                            {(form.formState.errors.lines as { message?: string }).message}
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* ── TOTALS SUMMARY CARD ────────────────────────────────────── */}
            {fields.length > 0 && (
                <Card className="rounded-[3rem] border-none bg-slate-950 shadow-active overflow-hidden">
                    <CardContent className="p-10">
                        <div className="flex flex-col items-end gap-4">
                            <div className="flex items-center justify-between w-full">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                    Resumen Financiero
                                </p>
                                <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest bg-amber-500/10 px-3 py-1 rounded-full">
                                    {selectedCurrency}
                                </span>
                            </div>

                            <div className="w-full max-w-sm space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                        Subtotal
                                    </span>
                                    <span className="text-sm font-bold text-slate-300 tabular-nums">
                                        {currencySymbol(selectedCurrency)} {fmt(subtotal, selectedCurrency)}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                        IVA
                                    </span>
                                    <span className="text-sm font-bold text-amber-400 tabular-nums">
                                        {currencySymbol(selectedCurrency)} {fmt(iva, selectedCurrency)}
                                    </span>
                                </div>

                                <div className="h-px bg-white/5" />

                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black text-white uppercase tracking-widest">
                                        Total {selectedCurrency}
                                    </span>
                                    <span className="text-2xl font-black text-white tabular-nums tracking-tighter">
                                        {currencySymbol(selectedCurrency)} {fmt(total, selectedCurrency)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* ── ACTION BUTTONS ─────────────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Save Draft */}
                <Button
                    type="button"
                    disabled={loadingDraft || loadingApproval}
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

                {/* Save and Submit for Approval */}
                <Button
                    type="button"
                    disabled={loadingDraft || loadingApproval}
                    onClick={handleSaveAndSubmit}
                    className="h-16 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[10px] uppercase tracking-[0.3em] shadow-lg shadow-amber-500/25 transition-all active:scale-95 disabled:opacity-50"
                >
                    {loadingApproval ? (
                        <>
                            <Loader2 className="h-4 w-4 mr-3 animate-spin" />
                            Enviando a Aprobación...
                        </>
                    ) : (
                        <>
                            <Send className="h-5 w-5 mr-3" />
                            Guardar y Enviar a Aprobación
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// LineRow sub-component — isolated to avoid full form re-renders on each line
// ---------------------------------------------------------------------------

interface LineRowProps {
    index: number;
    form: ReturnType<typeof useForm<PurchaseOrder>>;
    products: Array<{ id?: string; name: string; sku: string; cost?: number }>;
    currency: POCurrency;
    onProductSelect: (index: number, productId: string) => void;
    onRemove: () => void;
}

function LineRow({ index, form, products, currency, onProductSelect, onRemove }: LineRowProps) {
    const qty = useWatch({ control: form.control, name: `lines.${index}.qty` }) ?? 0;
    const unitCost = useWatch({ control: form.control, name: `lines.${index}.unit_cost` }) ?? 0;
    const taxRate = useWatch({ control: form.control, name: `lines.${index}.tax_rate` }) ?? 0.19;

    const lineBase = Number(qty) * Number(unitCost);
    const lineTotal = lineBase + lineBase * Number(taxRate);

    return (
        <div className="bg-slate-50 rounded-2xl p-4 md:p-0 md:bg-transparent">
            <div className="grid grid-cols-1 md:grid-cols-[2rem_1fr_8rem_10rem_8rem_10rem_3rem] gap-4 items-center">
                {/* Line number */}
                <div className="hidden md:flex items-center justify-center">
                    <Badge className="bg-slate-100 text-slate-400 border-none text-[9px] font-black h-6 w-6 rounded-full p-0 flex items-center justify-center">
                        {index + 1}
                    </Badge>
                </div>

                {/* Product select */}
                <div className="relative">
                    <Package className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 pointer-events-none z-10" />
                    <select
                        {...form.register(`lines.${index}.product_id`)}
                        onChange={(e) => {
                            form.setValue(`lines.${index}.product_id`, e.target.value);
                            onProductSelect(index, e.target.value);
                        }}
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

                {/* Qty */}
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

                {/* Unit cost */}
                <div>
                    <Input
                        type="number"
                        step="1"
                        min="0"
                        placeholder="Costo"
                        {...form.register(`lines.${index}.unit_cost`, { valueAsNumber: true })}
                        className="h-12 text-right bg-white border-none rounded-xl font-bold text-slate-900 shadow-inner focus:ring-4 focus:ring-primary/5 text-sm tabular-nums"
                    />
                </div>

                {/* Tax rate (read-only — comes from product) */}
                <div className="relative">
                    <input type="hidden" {...form.register(`lines.${index}.tax_rate`, { valueAsNumber: true })} />
                    <div className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 flex items-center justify-center text-xs font-bold text-slate-500 cursor-not-allowed select-none">
                        {taxRateLabel(Number(taxRate))}
                    </div>
                </div>

                {/* Line total (read-only) */}
                <div className="flex items-center justify-end">
                    <span className="text-sm font-black text-slate-900 tabular-nums tracking-tighter">
                        {currencySymbol(currency)} {fmt(lineTotal, currency)}
                    </span>
                </div>

                {/* Remove button */}
                <div className="flex items-center justify-center">
                    <button
                        type="button"
                        onClick={onRemove}
                        aria-label="Eliminar línea"
                        className="h-9 w-9 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-400 hover:text-rose-600 flex items-center justify-center transition-all active:scale-90"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Field errors for this line */}
            {(form.formState.errors.lines?.[index]?.product_id ||
                form.formState.errors.lines?.[index]?.qty ||
                form.formState.errors.lines?.[index]?.unit_cost) && (
                <p className="text-rose-500 text-[9px] font-black uppercase tracking-widest mt-2 ml-1 md:col-start-2">
                    Complete todos los campos de esta línea
                </p>
            )}
        </div>
    );
}
