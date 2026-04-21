"use client"

import { useForm, useFieldArray, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { documentSchema, Document } from "../types"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { SearchableSelect } from "@/shared/components/ui/searchable-select"
import { FormLayout, FormSection, FormField } from "@/shared/components/ui/form-layout"
import { Party } from "@/features/parties/types"
import { Product } from "@/features/products/types"
import { Warehouse } from "@/features/inventory/types"
import {
    Plus,
    Trash2,
    ChevronDown,
    Package,
    AlertCircle,
    CheckCircle2,
    Link2,
    Loader
} from "lucide-react"
import { useMemo } from "react"
import { format } from "date-fns"
import { cn } from "@/shared/lib/utils"
import { toast } from "sonner"
import { IcaPrescriptionSection } from "./IcaPrescriptionSection"

export interface CommercialOption {
    user_id: string
    full_name: string
    signature_url: string | null
    commercial_code: string | null
}

interface DocumentFormProps {
    parties: Party[]
    products: Product[]
    warehouses?: Warehouse[]
    initialData?: Document
    onSubmit: (data: Document) => Promise<void>
    isLoading?: boolean
    tenantId?: string
    commercials?: CommercialOption[]
}

const LineTotal = ({ control, index }: { control: any; index: number }) => {
    const qty = useWatch({ control, name: `lines.${index}.qty` }) || 0;
    const price = useWatch({ control, name: `lines.${index}.unit_price` }) || 0;
    const total = qty * price;
    return (
        <span className="text-sm font-semibold text-slate-900 tabular-nums">
            ${total.toLocaleString('es-CO', { minimumFractionDigits: 0 })}
        </span>
    );
};

const DocumentTotals = ({ control, products }: { control: any; products: Product[] }) => {
    const lines = useWatch({ control, name: "lines" }) || [];
    let subtotal = 0;
    let taxes = 0;
    lines.forEach((line: any) => {
        const qty = Number(line.qty) || 0;
        const price = Number(line.unit_price) || 0;
        const lineTotal = qty * price;
        subtotal += lineTotal;
        if (line.product_id) {
            const prod = products.find(p => p.id === line.product_id);
            const taxRate = { IVA_0: 0, IVA_5: 5, IVA_19: 19 }[(prod?.tax_category ?? 'IVA_0')] ?? 0;
            if (taxRate) taxes += lineTotal * (taxRate / 100);
        }
    });
    const total = subtotal + taxes;

    return (
        <div className="surface-card p-5 space-y-3">
            <h3 className="text-h3">Resumen</h3>
            <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Subtotal</span>
                <span className="text-sm font-semibold text-slate-900 tabular-nums">
                    ${subtotal.toLocaleString('es-CO', { minimumFractionDigits: 0 })}
                </span>
            </div>
            <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">IVA</span>
                <span className="text-sm font-semibold text-slate-900 tabular-nums">
                    ${taxes.toLocaleString('es-CO', { minimumFractionDigits: 0 })}
                </span>
            </div>
            <div className="h-px bg-slate-100" />
            <div className="flex justify-between items-baseline pt-1">
                <span className="text-sm font-semibold text-slate-900">Total</span>
                <span className="text-2xl font-bold text-slate-900 tabular-nums">
                    ${total.toLocaleString('es-CO', { minimumFractionDigits: 0 })}
                    <span className="text-xs font-medium text-slate-400 ml-2">COP</span>
                </span>
            </div>
        </div>
    );
};

export function DocumentForm({ parties, products, warehouses = [], initialData, onSubmit, isLoading, tenantId, commercials = [] }: DocumentFormProps) {
    const defaults = {
        doc_type: 'INVOICE' as const,
        status: 'DRAFT' as const,
        currency: 'COP',
        issue_date: format(new Date(), 'yyyy-MM-dd'),
        party_id: '',
        lines: [],
        subtotal: 0,
        taxes: 0,
        total: 0,
        ...initialData,
    };
    const form = useForm<Document>({
        resolver: zodResolver(documentSchema) as any,
        mode: 'onSubmit',
        reValidateMode: 'onChange',
        defaultValues: defaults,
    });

    const { fields, append, remove } = useFieldArray({ control: form.control, name: "lines" });
    const docType = form.watch('doc_type');
    const isSale = ['INVOICE', 'QUOTATION', 'SALES_ORDER', 'RECEIPT'].includes(docType);

    const handleProductChange = (index: number, productId: string) => {
        const product = products.find(p => p.id === productId);
        if (product) {
            form.setValue(`lines.${index}.description`, product.name);
            form.setValue(`lines.${index}.unit_price`, product.selling_price || 0);
            const taxRate = { IVA_0: 0, IVA_5: 5, IVA_19: 19 }[(product.tax_category ?? 'IVA_0')] ?? 0;
            form.setValue(`lines.${index}.tax_config`, [{ rate: taxRate, type: 'IVA', name: 'IVA' }]);
        }
    };

    const handleFormSubmit = async (data: Document) => {
        // Validación temprana: en ventas, toda línea con producto requiere bodega.
        if (isSale && warehouseItems.length > 0) {
            const missing = (data.lines || []).some(
                (l: any) => l.product_id && !l.warehouse_id
            );
            if (missing) {
                toast.error('Cada línea con producto requiere bodega de despacho.');
                return;
            }
        }

        let subtotal = 0; let taxes = 0;
        data.lines?.forEach((line: any) => {
            const qty = Number(line.qty) || 0;
            const price = Number(line.unit_price) || 0;
            const lineTotal = qty * price;
            line.line_total = lineTotal;
            subtotal += lineTotal;
            if (line.product_id) {
                const prod = products.find(p => p.id === line.product_id);
                const taxRate = { IVA_0: 0, IVA_5: 5, IVA_19: 19 }[(prod?.tax_category ?? 'IVA_0')] ?? 0;
                if (taxRate) taxes += lineTotal * (taxRate / 100);
            }
        });
        data.subtotal = subtotal;
        data.taxes = taxes;
        data.total = subtotal + taxes;
        try {
            await onSubmit(data);
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Error al guardar el documento');
        }
    };

    const handleValidationError = () => {
        const errors = form.formState.errors;
        const messages: string[] = [];
        if (errors.party_id) messages.push('Selecciona un cliente/tercero');
        if (errors.issue_date) messages.push('Fecha inválida');
        if (errors.lines) messages.push('Revisa los items: descripción y cantidad son obligatorios');
        if (fields.length === 0) messages.push('Agrega al menos un item');
        toast.error(messages.length > 0 ? messages.join('. ') : 'Revisa los campos del formulario');
    };

    const docTypeOptions = [
        { value: 'INVOICE', label: 'Factura de Venta' },
        { value: 'QUOTATION', label: 'Cotización' },
        { value: 'SALES_ORDER', label: 'Pedido de Venta' },
        { value: 'DELIVERY_NOTE', label: 'Remisión' },
        { value: 'PURCHASE_ORDER', label: 'Orden de Compra' },
        { value: 'VENDOR_BILL', label: 'Factura de Compra' },
        { value: 'CREDIT_NOTE', label: 'Nota Crédito' },
        { value: 'DOC_SUPPORT', label: 'Documento Soporte' },
    ];

    const partyItems = useMemo(() => parties
        .filter(p => !!p.id)
        .map(p => ({
            value: p.id!,
            label: p.legal_name ?? '',
            subLabel: p.doc_number ? `${p.doc_type ?? 'ID'} · ${p.doc_number}` : undefined,
            keywords: `${p.doc_number ?? ''} ${p.legal_name ?? ''}`,
        })), [parties]);

    const productItems = useMemo(() => products
        .filter(p => !!p.id)
        .map(p => ({
            value: p.id!,
            label: p.name,
            subLabel: p.sku ? `SKU · ${p.sku}` : undefined,
            keywords: `${p.sku ?? ''} ${p.name}`,
        })), [products]);

    const warehouseItems = useMemo(() => warehouses
        .filter(w => !!w.id && !!w.name)
        .map(w => ({
            value: w.id!,
            label: w.name,
            subLabel: w.code ?? undefined,
            keywords: `${w.code ?? ''} ${w.name}`,
        })), [warehouses]);

    const lines = form.watch('lines');
    const hasStockIssues = isSale && lines?.some((line: any) => {
        const prod = products.find(p => p.id === line.product_id);
        return prod && (Number(line.qty) || 0) > (prod.stock_qty || 0);
    });

    const submitButton = (
        <Button
            type="button"
            onClick={form.handleSubmit(handleFormSubmit, handleValidationError)}
            disabled={isLoading}
            className={cn(isSale ? "" : "bg-emerald-600 hover:bg-emerald-700")}
        >
            {isLoading ? (
                <><Loader className="h-4 w-4 animate-spin mr-2" /> Guardando...</>
            ) : (
                <><CheckCircle2 className="h-4 w-4 mr-2" /> Guardar borrador</>
            )}
        </Button>
    );

    const cancelButton = (
        <Button
            type="button"
            variant="outline"
            onClick={() => window.history.back()}
        >
            Cancelar
        </Button>
    );

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-24 animate-in fade-in duration-300">
            {/* Header compacto con contexto */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-h1">
                        {initialData?.id ? 'Editar documento' : 'Nuevo documento'}
                    </h1>
                    <p className="text-caption mt-1">
                        {isSale ? 'Venta · ingreso' : 'Compra · gasto'}
                    </p>
                </div>
                {initialData?.parent_id && (
                    <span className="badge-info">
                        <Link2 className="h-3 w-3" />
                        Vinculado a documento origen
                    </span>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: form content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Encabezado unificado con FormLayout */}
                    <FormLayout>
                        <FormSection
                            title="Encabezado"
                            description="Tipo, fecha, contraparte y notas visibles en el PDF"
                            columns={2}
                        >
                            <FormField label="Tipo de documento" htmlFor="df-doc-type" required>
                                <div className="relative">
                                    <select
                                        id="df-doc-type"
                                        {...form.register('doc_type')}
                                        className="w-full h-10 bg-white border border-slate-200 rounded-lg px-3 pr-9 text-sm text-slate-900 appearance-none focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition"
                                    >
                                        {docTypeOptions.map(o => (
                                            <option key={o.value} value={o.value}>{o.label}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                </div>
                            </FormField>

                            <FormField label="Fecha de emisión" htmlFor="df-issue-date" required>
                                <Input
                                    id="df-issue-date"
                                    type="date"
                                    {...form.register('issue_date')}
                                    className="h-10"
                                />
                            </FormField>

                            <FormField
                                label={isSale ? 'Cliente' : 'Proveedor'}
                                htmlFor="df-party"
                                required
                                colSpan={2}
                                error={form.formState.errors.party_id?.message}
                            >
                                <SearchableSelect
                                    items={partyItems}
                                    value={form.watch('party_id') || ''}
                                    onChange={(v) => form.setValue('party_id', v, { shouldValidate: true, shouldDirty: true })}
                                    placeholder={`Buscar ${isSale ? 'cliente' : 'proveedor'} por nombre o NIT...`}
                                    emptyMessage="Sin coincidencias"
                                    className="h-10 bg-white border border-slate-200 rounded-lg px-3 text-sm text-slate-900 hover:border-slate-300 transition"
                                    error={!!form.formState.errors.party_id}
                                />
                            </FormField>

                            {isSale && warehouseItems.length > 0 && (
                                <FormField
                                    label="Bodega de origen"
                                    htmlFor="df-warehouse"
                                    colSpan={2}
                                    error={form.formState.errors.warehouse_id?.message}
                                >
                                    <SearchableSelect
                                        items={warehouseItems}
                                        value={form.watch('warehouse_id') || ''}
                                        onChange={(v) => {
                                            form.setValue('warehouse_id', v || null, { shouldValidate: true, shouldDirty: true });
                                            // Propaga a todas las líneas existentes
                                            const currentLines = form.getValues('lines') ?? [];
                                            currentLines.forEach((_, i) => {
                                                form.setValue(`lines.${i}.warehouse_id`, v || null, { shouldDirty: true });
                                            });
                                        }}
                                        placeholder="Selecciona la bodega desde donde sale la mercancía"
                                        emptyMessage="Sin bodegas"
                                        className="h-10 bg-white border border-slate-200 rounded-lg px-3 text-sm text-slate-900 hover:border-slate-300 transition"
                                    />
                                </FormField>
                            )}

                            <FormField label="Observaciones (aparecen en PDF)" htmlFor="df-notes-public">
                                <Input
                                    id="df-notes-public"
                                    {...form.register('notes_public')}
                                    placeholder="Validez, garantía, observaciones..."
                                    className="h-10"
                                />
                            </FormField>

                            <FormField label="Nota interna (no se imprime)" htmlFor="df-notes-internal">
                                <Input
                                    id="df-notes-internal"
                                    {...form.register('notes_internal')}
                                    placeholder="Solo uso interno..."
                                    className="h-10"
                                />
                            </FormField>
                        </FormSection>
                    </FormLayout>

                    {/* ICA Compliance — solo para Pedidos de Venta */}
                    {docType === 'SALES_ORDER' && tenantId && (
                        <FormLayout>
                            <IcaPrescriptionSection
                                form={form}
                                tenantId={tenantId}
                                commercials={commercials}
                            />
                        </FormLayout>
                    )}

                    {/* Items — tabla dinámica con useFieldArray, estructura propia */}
                    <div className="surface-card">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                            <div>
                                <h2 className="text-h3">Productos / servicios</h2>
                                <p className="text-caption mt-0.5">
                                    {fields.length} {fields.length === 1 ? 'ítem' : 'ítems'}
                                </p>
                            </div>
                            <Button
                                type="button"
                                onClick={() => append({ description: '', qty: 1, unit_price: 0, line_total: 0, warehouse_id: null })}
                                size="sm"
                            >
                                <Plus className="mr-1.5 h-3.5 w-3.5" /> Agregar línea
                            </Button>
                        </div>

                        {fields.length === 0 ? (
                            <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
                                <Package className="h-8 w-8" />
                                <p className="text-sm">Aún no hay productos en este documento</p>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => append({ description: '', qty: 1, unit_price: 0, line_total: 0, warehouse_id: null })}
                                >
                                    <Plus className="mr-1.5 h-3.5 w-3.5" /> Agregar primera línea
                                </Button>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {fields.map((field, index) => {
                                    const pid = form.watch(`lines.${index}.product_id`);
                                    const prod = products.find(p => p.id === pid);
                                    const qty = Number(form.watch(`lines.${index}.qty`)) || 0;
                                    const stockExceeded = isSale && prod && qty > (prod.stock_qty || 0);

                                    return (
                                        <div key={field.id} className="p-4 hover:bg-slate-50/50 transition">
                                            <div className="grid grid-cols-12 gap-3 items-start">
                                                {/* Producto + descripción */}
                                                <div className="col-span-12 md:col-span-6 space-y-2">
                                                    <SearchableSelect
                                                        items={productItems}
                                                        value={form.watch(`lines.${index}.product_id`) || ''}
                                                        onChange={(v) => {
                                                            form.setValue(`lines.${index}.product_id`, v, { shouldValidate: true, shouldDirty: true })
                                                            handleProductChange(index, v)
                                                        }}
                                                        placeholder="Buscar producto por SKU o nombre..."
                                                        emptyMessage="Sin coincidencias"
                                                        className="h-10 bg-white border border-slate-200 rounded-lg px-3 text-sm text-slate-900 hover:border-slate-300 transition"
                                                    />
                                                    <Input
                                                        {...form.register(`lines.${index}.description`)}
                                                        placeholder="Descripción adicional (opcional)"
                                                        className="h-8 bg-transparent border-slate-100 rounded-md text-xs text-slate-600 placeholder:text-slate-300"
                                                    />
                                                    {isSale && warehouseItems.length > 0 && (() => {
                                                        const whValue = form.watch(`lines.${index}.warehouse_id`) || '';
                                                        const pidSel = form.watch(`lines.${index}.product_id`);
                                                        const showError = !!pidSel && !whValue;
                                                        return (
                                                            <div className="space-y-1">
                                                                <SearchableSelect
                                                                    items={warehouseItems}
                                                                    value={whValue}
                                                                    onChange={(v) =>
                                                                        form.setValue(`lines.${index}.warehouse_id`, v || null, { shouldDirty: true })
                                                                    }
                                                                    placeholder="Bodega de despacho (requerido)"
                                                                    emptyMessage="Sin bodegas"
                                                                    className={cn(
                                                                        "h-9 bg-white border rounded-lg px-3 text-xs text-slate-700 hover:border-slate-300 transition",
                                                                        showError ? "border-rose-300 bg-rose-50/30" : "border-slate-200"
                                                                    )}
                                                                />
                                                                {showError && (
                                                                    <p className="text-[10px] text-rose-600 font-medium">
                                                                        Requerido para guardar
                                                                    </p>
                                                                )}
                                                            </div>
                                                        );
                                                    })()}
                                                </div>

                                                {/* Cantidad */}
                                                <div className="col-span-4 md:col-span-2 space-y-1">
                                                    <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Cantidad</label>
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        {...form.register(`lines.${index}.qty`, { valueAsNumber: true })}
                                                        className={cn(
                                                            "h-10 text-right text-sm font-medium tabular-nums",
                                                            stockExceeded && "border-amber-300 bg-amber-50"
                                                        )}
                                                    />
                                                    {isSale && prod && (
                                                        <p className={cn(
                                                            "text-[11px] font-medium",
                                                            stockExceeded ? "text-amber-600" : "text-slate-400"
                                                        )}>
                                                            Disponible: {prod.stock_qty || 0}
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Precio */}
                                                <div className="col-span-4 md:col-span-2 space-y-1">
                                                    <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Precio</label>
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">$</span>
                                                        <Input
                                                            type="number"
                                                            step="0.01"
                                                            {...form.register(`lines.${index}.unit_price`, { valueAsNumber: true })}
                                                            className="h-10 pl-6 text-right text-sm font-medium tabular-nums"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Total + Delete */}
                                                <div className="col-span-4 md:col-span-2 space-y-1">
                                                    <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Total</label>
                                                    <div className="flex items-center justify-end gap-2 h-10">
                                                        <LineTotal control={form.control} index={index} />
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => remove(index)}
                                                            className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {hasStockIssues && (
                        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                            <div className="text-sm">
                                <p className="font-medium text-amber-900">Alguna cantidad excede el stock disponible</p>
                                <p className="text-amber-700 text-xs mt-0.5">
                                    Puedes continuar, pero el inventario quedará en negativo tras facturar.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: sticky totals + actions */}
                <aside className="lg:col-span-1">
                    <div className="lg:sticky lg:top-6 space-y-4">
                        <DocumentTotals control={form.control} products={products} />

                        <div className="space-y-2">
                            <div className="w-full [&>button]:w-full [&>button]:h-11">
                                {submitButton}
                            </div>
                            <div className="w-full [&>button]:w-full [&>button]:h-10">
                                {cancelButton}
                            </div>
                        </div>

                        <p className="text-caption leading-relaxed">
                            El documento se guarda como borrador. Podrás emitirlo a la DIAN desde la vista de detalle.
                        </p>
                    </div>
                </aside>
            </div>
        </div>
    );
}
