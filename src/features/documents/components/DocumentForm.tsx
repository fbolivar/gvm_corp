"use client"

import { useForm, useFieldArray, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { documentSchema, Document, missingCatalogProductLines } from "../types"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { MoneyInput } from "@/shared/components/ui/money-input"
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
    Loader,
    PackageX,
} from "lucide-react"
import { useMemo, useState, useEffect, useCallback, useRef } from "react"
import { format } from "date-fns"
import { cn } from "@/shared/lib/utils"
import { toast } from "sonner"
import { IcaPrescriptionSection } from "./IcaPrescriptionSection"
import { createClient } from "@/lib/supabase/client"
import { Hint } from "@/shared/components/ui/hint"

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

// Devuelve la tasa de IVA efectiva de una línea.
// Prioridad: tax_config manual de la línea → tax_category del producto → 0%.
function getLineTaxRate(line: any, products: Product[]): number {
    if (Array.isArray(line?.tax_config) && line.tax_config.length > 0) {
        const r = Number(line.tax_config[0]?.rate);
        if (!Number.isNaN(r)) return r;
    }
    const prod = products.find(p => p.id === line?.product_id);
    return { IVA_0: 0, IVA_5: 5, IVA_19: 19 }[(prod?.tax_category ?? 'IVA_0')] ?? 0;
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
        const taxRate = getLineTaxRate(line, products);
        if (taxRate) taxes += lineTotal * (taxRate / 100);
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

/**
 * Genera la clave de idempotencia de un intento de guardado. `crypto.randomUUID`
 * existe en todo navegador moderno bajo HTTPS; el fallback cubre contextos no
 * seguros (p. ej. pruebas por IP en LAN).
 */
function newIdempotencyKey(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

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

    // Guarda anti doble-envío INTERNA del formulario. La prop `isLoading` es
    // opcional y varias páginas no la pasaban, dejando el botón activo mientras
    // corría la Server Action: cada clic extra creaba un documento nuevo con su
    // propio consecutivo (ej. SO-01609..SO-01613 idénticos, luego anulados).
    // Este estado bloquea el envío aunque el llamador olvide `isLoading`.
    const [submitting, setSubmitting] = useState(false);
    const submittingRef = useRef(false);
    const busy = isLoading || submitting;

    // Clave de idempotencia del intento de guardado en curso. Viaja con el
    // documento y el servidor la usa para reconocer un reenvío del MISMO intento
    // (reintento tras error de red, otra pestaña) en vez de crear otro documento.
    // Se renueva tras cada guardado exitoso, para que un segundo documento
    // legítimo desde el mismo formulario sí pueda crearse.
    const idempotencyKeyRef = useRef<string>(newIdempotencyKey());

    const { fields, append, remove } = useFieldArray({ control: form.control, name: "lines" });
    const docType = form.watch('doc_type');
    const isSale = ['INVOICE', 'QUOTATION', 'SALES_ORDER', 'RECEIPT'].includes(docType);
    // Las cotizaciones NO despachan mercancía: no requieren bodega ni control de stock.
    const needsWarehouse = ['INVOICE', 'SALES_ORDER', 'DELIVERY_NOTE', 'RECEIPT'].includes(docType);
    const isDeliveryNote = docType === 'DELIVERY_NOTE';
    // Reunión con Andrés (contador), 2026-09-29: Factura y Nota Crédito — los
    // únicos doc_type que hoy contabiliza el motor de ventas — exigen producto
    // real del catálogo, nunca texto libre. Pedidos/cotizaciones/remisiones
    // siguen permitiendo texto libre (así capturan los comerciales), pero con
    // el IVA elegido a propósito (ver validación en documentSchema).
    //
    // Solo aplica a documentos NUEVOS (!initialData?.id): 3 facturas reales ya
    // tienen 14 líneas de texto libre de antes de esta regla — exigirla también
    // al editar las habría dejado imposibles de guardar.
    const requiresCatalogProduct = !initialData?.id && (docType === 'INVOICE' || docType === 'CREDIT_NOTE');
    const [ignoreStock, setIgnoreStock] = useState(false);
    const supabase = createClient();

    // lots[index] = array de lotes disponibles para esa línea
    const [lineLots, setLineLots] = useState<Record<number, { id: string; lot_number: string; batch_code?: string; qty: number; expiration_date: string }[]>>({});

    const loadLotsForLine = useCallback(async (index: number, productId: string, warehouseId: string) => {
        if (!productId || !warehouseId) { setLineLots(prev => ({ ...prev, [index]: [] })); return; }
        const { data } = await supabase
            .from('product_lots')
            .select('id, lot_number, batch_code, qty, expiration_date')
            .eq('product_id', productId)
            .eq('warehouse_id', warehouseId)
            .eq('status', 'ACTIVE')
            .gt('qty', 0)
            .order('expiration_date', { ascending: true });
        setLineLots(prev => ({ ...prev, [index]: data ?? [] }));
    }, []);

    const handleProductChange = (index: number, productId: string) => {
        const product = products.find(p => p.id === productId);
        if (product) {
            form.setValue(`lines.${index}.description`, product.name);
            // Precio de la lista del cliente (ventas); si no está, precio general.
            const listPrice = isSale ? priceMap[productId] : undefined;
            form.setValue(`lines.${index}.unit_price`, listPrice != null ? listPrice : (product.selling_price || 0));
            const taxRate = { IVA_0: 0, IVA_5: 5, IVA_19: 19 }[(product.tax_category ?? 'IVA_0')] ?? 0;
            form.setValue(`lines.${index}.tax_config`, [{ rate: taxRate, type: 'IVA', name: 'IVA' }]);
        }
    };

    // Precios anclados al cliente: al elegir/cambiar el cliente, carga los precios
    // de SU lista y re-precia las líneas con producto (solo en documentos de venta).
    const [priceMap, setPriceMap] = useState<Record<string, number>>({});
    const repriceRef = useRef(false);
    const watchedPartyId = form.watch('party_id');
    useEffect(() => {
        if (!isSale || !watchedPartyId) { setPriceMap({}); return; }
        let active = true;
        (async () => {
            const { data: party } = await supabase.from('parties').select('price_list_id').eq('id', watchedPartyId).maybeSingle();
            let listId = (party?.price_list_id as string | null | undefined) ?? undefined;
            if (!listId) {
                const { data: def } = await supabase.from('price_lists').select('id').eq('is_default', true).maybeSingle();
                listId = def?.id as string | undefined;
            }
            const map: Record<string, number> = {};
            if (listId) {
                let offset = 0;
                for (;;) {
                    const { data } = await supabase.from('price_list_items').select('product_id, unit_price').eq('price_list_id', listId).range(offset, offset + 999);
                    if (!data || !data.length) break;
                    for (const it of data) map[it.product_id as string] = Number(it.unit_price);
                    if (data.length < 1000) break;
                    offset += 1000;
                }
            }
            if (!active) return;
            setPriceMap(map);
            // No re-preciar en el montaje (para no pisar precios de un documento existente);
            // solo cuando el usuario cambia el cliente.
            if (repriceRef.current) {
                const lines = (form.getValues('lines') || []) as Array<{ product_id?: string | null }>;
                lines.forEach((l, i) => {
                    if (l.product_id && map[l.product_id] != null) {
                        form.setValue(`lines.${i}.unit_price`, map[l.product_id], { shouldDirty: true });
                    }
                });
            }
            repriceRef.current = true;
        })();
        return () => { active = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [watchedPartyId, isSale]);

    const handleFormSubmit = async (data: Document) => {
        // El ref corta el segundo clic aunque llegue en el mismo tick, antes de
        // que el re-render con `submitting=true` deshabilite el botón.
        if (submittingRef.current) return;
        submittingRef.current = true;
        setSubmitting(true);
        try {
            const ok = await runFormSubmit({ ...data, idempotency_key: idempotencyKeyRef.current });
            // Guardado exitoso: el siguiente documento de este formulario es otro
            // intento distinto y necesita su propia clave.
            if (ok) idempotencyKeyRef.current = newIdempotencyKey();
        } finally {
            submittingRef.current = false;
            setSubmitting(false);
        }
    };

    // Devuelve true solo si el documento se guardó (el llamador renueva la clave
    // de idempotencia). Las validaciones que abortan y los errores devuelven false.
    const runFormSubmit = async (data: Document): Promise<boolean> => {
        // Solo al CREAR (ver requiresCatalogProduct): Factura y Nota Crédito
        // exigen producto real del catálogo en cada línea.
        if (!initialData?.id) {
            const missing = missingCatalogProductLines(data);
            if (missing.length > 0) {
                toast.error(`Este tipo de documento exige producto del catálogo en cada línea (falta en el ítem ${missing.map(i => i + 1).join(', ')}).`);
                return false;
            }
        }

        // Validación temprana: en ventas que despachan, toda línea con producto requiere bodega.
        if (needsWarehouse && warehouseItems.length > 0) {
            const missing = (data.lines || []).some(
                (l: any) => l.product_id && !l.warehouse_id
            );
            if (missing) {
                toast.error('Cada línea con producto requiere bodega de despacho.');
                return false;
            }
        }

        // Control de margen: no permitir vender por debajo del mínimo (costo × (1+utilidad%))
        if (isSale) {
            const viol: string[] = [];
            for (const l of (data.lines || []) as any[]) {
                if (!l.product_id) continue;
                const p = products.find(pr => pr.id === l.product_id) as any;
                if (!p || !p.enforce_margin) continue;
                const cost = Number(p.cost) || 0;
                const margin = Number(p.min_margin) || 0;
                if (cost <= 0 || margin <= 0) continue;
                const minPrice = cost * (1 + margin / 100);
                if ((Number(l.unit_price) || 0) < minPrice - 0.5) {
                    viol.push(`${p.name}: mínimo $${Math.ceil(minPrice).toLocaleString('es-CO')} (utilidad ${margin}%)`);
                }
            }
            if (viol.length) {
                toast.error('Precio por debajo del margen mínimo:\n' + viol.join('\n'));
                return false;
            }
        }

        let subtotal = 0; let taxes = 0;
        data.lines?.forEach((line: any) => {
            const qty = Number(line.qty) || 0;
            const price = Number(line.unit_price) || 0;
            const lineTotal = qty * price;
            line.line_total = lineTotal;
            subtotal += lineTotal;
            const taxRate = getLineTaxRate(line, products);
            if (taxRate) taxes += lineTotal * (taxRate / 100);
        });
        data.subtotal = subtotal;
        data.taxes = taxes;
        data.total = subtotal + taxes;
        // Normalizar fecha vacía a null (columna date no acepta cadena vacía)
        data.expected_delivery_date = data.expected_delivery_date?.trim() ? data.expected_delivery_date : null;
        try {
            await onSubmit(data);
            return true;
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Error al guardar el documento');
            return false;
        }
    };

    const handleValidationError = () => {
        const errors = form.formState.errors;
        const messages: string[] = [];
        if (errors.party_id) messages.push('Selecciona un cliente/tercero');
        if (errors.issue_date) messages.push('Fecha inválida');
        // Mensaje por línea y campo: antes se decía siempre "descripción y cantidad
        // son obligatorios" aunque el problema fuera otro campo (ej. producto), lo que
        // dejaba al usuario sin pistas para corregir.
        if (errors.lines) {
            const FIELD_LABELS: Record<string, string> = {
                description: 'nombre del producto',
                qty: 'cantidad',
                unit_price: 'precio',
                product_id: 'producto del catálogo',
                warehouse_id: 'bodega',
                lot_id: 'lote',
                line_total: 'total',
                tax_config: 'IVA',
            };
            const lineErrors = errors.lines as unknown as Array<Record<string, unknown> | undefined>;
            const detail: string[] = [];
            if (Array.isArray(lineErrors)) {
                lineErrors.forEach((lineErr, i) => {
                    if (!lineErr) return;
                    const campos = Object.keys(lineErr)
                        .map((k) => FIELD_LABELS[k] ?? k)
                        .join(', ');
                    detail.push(`ítem ${i + 1} (${campos})`);
                });
            }
            messages.push(
                detail.length > 0
                    ? `Revisa los ítems: ${detail.join('; ')}`
                    : 'Revisa los ítems del documento'
            );
        }
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
        .map(p => {
            // El NIT se muestra con dígito de verificación (901955241-5) en el resto
            // de la app, así que debe ser buscable con y sin DV, igual que el nombre
            // comercial. Sin esto, buscar el NIT tal como se ve no encontraba nada.
            const nitConDv = p.doc_number && p.dv ? `${p.doc_number}-${p.dv}` : '';
            return {
                value: p.id!,
                label: p.legal_name ?? '',
                subLabel: p.doc_number
                    ? `${p.doc_type ?? 'ID'} · ${nitConDv || p.doc_number}`
                    : undefined,
                keywords: `${p.doc_number ?? ''} ${nitConDv} ${p.legal_name ?? ''} ${p.trade_name ?? ''}`,
            };
        }), [parties]);

    const productItems = useMemo(() => products
        // En documentos de venta solo se ofrecen PRODUCTOS (no servicios).
        .filter(p => !!p.id && (!isSale || p.type !== 'SERVICE'))
        .map(p => ({
            value: p.id!,
            label: p.name,
            // Muestra SKU y código de barras si existen; ambos son buscables.
            subLabel: [p.sku ? `SKU · ${p.sku}` : null, p.barcode ? `Cód · ${p.barcode}` : null].filter(Boolean).join('  ·  ') || undefined,
            keywords: `${p.sku ?? ''} ${p.barcode ?? ''} ${p.name}`,
        })), [products, isSale]);

    const warehouseItems = useMemo(() => warehouses
        .filter(w => !!w.id && !!w.name)
        .map(w => ({
            value: w.id!,
            label: w.name,
            subLabel: w.code ?? undefined,
            keywords: `${w.code ?? ''} ${w.name}`,
        })), [warehouses]);

    const lines = form.watch('lines');
    const hasStockIssues = !ignoreStock && needsWarehouse && lines?.some((line: any) => {
        const prod = products.find(p => p.id === line.product_id);
        return prod && (Number(line.qty) || 0) > (prod.stock_qty || 0);
    });

    const submitButton = (
        <Button
            type="button"
            onClick={form.handleSubmit(handleFormSubmit, handleValidationError)}
            disabled={busy}
            className={cn(isSale ? "" : "bg-emerald-600 hover:bg-emerald-700")}
        >
            {busy ? (
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

                            {(docType === 'INVOICE' || docType === 'CREDIT_NOTE') && (
                                <FormField
                                    label="Forma de pago"
                                    htmlFor="df-payment-form"
                                    hint="Define el asiento contable. Si se deja automático, se toma el plazo del cliente."
                                >
                                    <div className="relative">
                                        <select
                                            id="df-payment-form"
                                            {...form.register('payment_form')}
                                            className="w-full h-10 bg-white border border-slate-200 rounded-lg px-3 pr-9 text-sm text-slate-900 appearance-none focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition"
                                        >
                                            <option value="">Automático (según el cliente)</option>
                                            <option value="CONTADO">Contado</option>
                                            <option value="CREDITO">Crédito</option>
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                    </div>
                                </FormField>
                            )}

                            {(docType === 'SALES_ORDER' || docType === 'QUOTATION') && (
                                <FormField
                                    label="Fecha de entrega estimada"
                                    htmlFor="df-delivery-date"
                                    colSpan={2}
                                >
                                    <Input
                                        id="df-delivery-date"
                                        type="date"
                                        {...form.register('expected_delivery_date')}
                                        className="h-10"
                                    />
                                </FormField>
                            )}

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

                            {needsWarehouse && warehouseItems.length > 0 && (
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

                            {needsWarehouse && (
                                <div className="col-span-full">
                                    <label
                                        htmlFor="df-ignore-stock"
                                        className={cn(
                                            "flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-colors select-none",
                                            ignoreStock
                                                ? "border-amber-300 bg-amber-50"
                                                : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                                        )}
                                    >
                                        <input
                                            id="df-ignore-stock"
                                            type="checkbox"
                                            checked={ignoreStock}
                                            onChange={(e) => setIgnoreStock(e.target.checked)}
                                            className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                                        />
                                        <PackageX className={cn("h-4 w-4 shrink-0", ignoreStock ? "text-amber-600" : "text-slate-400")} />
                                        <div>
                                            <p className={cn("text-xs font-semibold", ignoreStock ? "text-amber-800" : "text-slate-600")}>
                                                Omitir verificación de inventario
                                            </p>
                                            <p className="text-[11px] text-slate-400 mt-0.5">
                                                Permite crear el documento aunque no haya stock disponible en la bodega seleccionada.
                                            </p>
                                        </div>
                                    </label>
                                </div>
                            )}

                            <FormField label="Observaciones (aparecen en PDF)" htmlFor="df-notes-public" colSpan={2}>
                                <textarea
                                    id="df-notes-public"
                                    {...form.register('notes_public')}
                                    placeholder="Validez, garantía, condiciones de entrega, observaciones..."
                                    rows={4}
                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20 transition resize-y min-h-[96px]"
                                />
                            </FormField>

                            <FormField label="Nota interna (no se imprime)" htmlFor="df-notes-internal" colSpan={2}>
                                <textarea
                                    id="df-notes-internal"
                                    {...form.register('notes_internal')}
                                    placeholder="Solo uso interno..."
                                    rows={2}
                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20 transition resize-y min-h-[56px]"
                                />
                            </FormField>
                        </FormSection>
                    </FormLayout>

                    {/* ICA Compliance — temporalmente deshabilitado */}
                    {false && docType === 'SALES_ORDER' && tenantId && (
                        <FormLayout>
                            <IcaPrescriptionSection
                                form={form}
                                tenantId={tenantId as string}
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
                                onClick={() => append({ description: '', qty: 1, unit_price: 0, line_total: 0, warehouse_id: null, tax_config: [] })}
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
                                    onClick={() => append({ description: '', qty: 1, unit_price: 0, line_total: 0, warehouse_id: null, tax_config: [] })}
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
                                    const stockExceeded = !ignoreStock && needsWarehouse && prod && qty > (prod.stock_qty || 0);

                                    return (
                                        <div key={field.id} className="p-4 hover:bg-slate-50/50 transition space-y-2.5">
                                            <div className="grid grid-cols-12 gap-3 items-end">
                                                {/* Producto: nombre libre (primario) */}
                                                <div className="col-span-12 md:col-span-4">
                                                    <Input
                                                        {...form.register(`lines.${index}.description`)}
                                                        placeholder="Producto o servicio"
                                                        className="h-10 bg-white border border-slate-200 rounded-lg px-3 text-sm text-slate-900 font-medium placeholder:text-slate-400 hover:border-slate-300 transition"
                                                    />
                                                </div>

                                                {/* Cantidad */}
                                                <div className="col-span-6 md:col-span-2 space-y-1">
                                                    <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Cantidad</label>
                                                    <Input
                                                        type="number"
                                                        step="any"
                                                        min="0"
                                                        // setValueAs (no valueAsNumber): un campo vacío daba NaN y
                                                        // bloqueaba el guardado sin decir por qué.
                                                        {...form.register(`lines.${index}.qty`, {
                                                            setValueAs: (v) => {
                                                                const n = Number(v);
                                                                return Number.isFinite(n) ? n : 0;
                                                            },
                                                        })}
                                                        className={cn(
                                                            "h-10 text-right text-sm font-medium tabular-nums",
                                                            stockExceeded && "border-amber-300 bg-amber-50"
                                                        )}
                                                    />
                                                    {needsWarehouse && prod && (
                                                        <p className={cn(
                                                            "text-[11px] font-medium",
                                                            stockExceeded ? "text-amber-600" : "text-slate-400"
                                                        )}>
                                                            Disp: {prod.stock_qty || 0}
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Precio */}
                                                <div className="col-span-6 md:col-span-2 space-y-1">
                                                    <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Precio</label>
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">$</span>
                                                        <MoneyInput
                                                            value={form.watch(`lines.${index}.unit_price`)}
                                                            onChange={(n) => form.setValue(`lines.${index}.unit_price`, n, { shouldDirty: true, shouldValidate: true })}
                                                            placeholder="0"
                                                            className="h-10 pl-6 text-right text-sm font-medium tabular-nums"
                                                        />
                                                    </div>
                                                    {(() => {
                                                        const price = Number(form.watch(`lines.${index}.unit_price`)) || 0;
                                                        const cost = Number((prod as any)?.cost) || 0;
                                                        const margin = Number((prod as any)?.min_margin) || 0;
                                                        if (isSale && (prod as any)?.enforce_margin && cost > 0 && margin > 0) {
                                                            const minPrice = cost * (1 + margin / 100);
                                                            if (price < minPrice - 0.5) {
                                                                return <p className="text-[10px] font-semibold text-rose-500 text-right">Mín ${Math.ceil(minPrice).toLocaleString('es-CO')} (util. {margin}%)</p>;
                                                            }
                                                        }
                                                        return null;
                                                    })()}
                                                </div>

                                                {/* IVA por línea — FIJO según el producto (no editable).
                                                    Para ítems de texto libre (sin producto del catálogo) hay que
                                                    elegirlo a propósito: antes quedaba en 0% sin que nadie lo
                                                    notara (Andrés, 2026-09-29) — ahora arranca vacío. */}
                                                {(() => {
                                                    const lineRate = getLineTaxRate(form.watch(`lines.${index}`) ?? {}, products);
                                                    const hasProduct = !!form.watch(`lines.${index}.product_id`);
                                                    const rawTaxConfig = form.watch(`lines.${index}.tax_config`);
                                                    const chosenRate = Array.isArray(rawTaxConfig) && rawTaxConfig.length > 0
                                                        ? rawTaxConfig[0]?.rate
                                                        : undefined;
                                                    const ivaMissing = !hasProduct && (chosenRate === undefined || chosenRate === null || chosenRate === '');
                                                    return (
                                                        <div className="col-span-6 md:col-span-2 space-y-1">
                                                            <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">IVA</label>
                                                            {hasProduct ? (
                                                                <div
                                                                    title="El IVA se toma del producto y no se puede modificar"
                                                                    className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 flex items-center text-sm font-semibold text-slate-700 cursor-not-allowed select-none"
                                                                >
                                                                    {lineRate}% IVA
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    <select
                                                                        value={chosenRate ?? ''}
                                                                        onChange={(e) => form.setValue(`lines.${index}.tax_config`, [{ rate: Number(e.target.value), type: 'IVA', name: 'IVA' }], { shouldValidate: true })}
                                                                        className={cn(
                                                                            "h-10 w-full rounded-lg border bg-white px-3 text-sm font-semibold text-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20",
                                                                            ivaMissing ? "border-rose-300 bg-rose-50/30" : "border-slate-200"
                                                                        )}
                                                                    >
                                                                        <option value="" disabled>Elegir…</option>
                                                                        <option value={0}>0% IVA</option>
                                                                        <option value={5}>5% IVA</option>
                                                                        <option value={19}>19% IVA</option>
                                                                    </select>
                                                                    {ivaMissing && (
                                                                        <p className="text-[10px] text-rose-600 font-medium">Requerido</p>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    );
                                                })()}

                                                {/* Total + Delete */}
                                                <div className="col-span-6 md:col-span-2 space-y-1">
                                                    <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Total</label>
                                                    <div className="flex items-center justify-end gap-2 h-10">
                                                        <LineTotal control={form.control} index={index} />
                                                        <Hint label="Eliminar línea" side="top">
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => remove(index)}
                                                                className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </Hint>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Catálogo · Bodega · Lote — fila secundaria horizontal (ocupa el ancho) */}
                                            <div className="flex flex-wrap items-start gap-2">
                                                <div className="flex-1 min-w-[200px] space-y-1">
                                                    <SearchableSelect
                                                        items={productItems}
                                                        value={form.watch(`lines.${index}.product_id`) || ''}
                                                        onChange={(v) => {
                                                            // Al limpiar el selector (×) llega '' — debe guardarse como null:
                                                            // una cadena vacía NO es un uuid y rompía la validación de la
                                                            // línea con un mensaje engañoso ("descripción y cantidad").
                                                            form.setValue(`lines.${index}.product_id`, v || null, { shouldValidate: true, shouldDirty: true })
                                                            handleProductChange(index, v)
                                                        }}
                                                        placeholder={requiresCatalogProduct ? 'Del catálogo (requerido)' : 'Del catálogo (opcional)'}
                                                        emptyMessage="Sin coincidencias en el catálogo"
                                                        className={cn(
                                                            "h-9 border rounded-lg px-3 text-xs text-slate-600 hover:border-slate-300 transition",
                                                            requiresCatalogProduct && !form.watch(`lines.${index}.product_id`)
                                                                ? "border-rose-300 bg-rose-50/30"
                                                                : "bg-slate-50 border-slate-200"
                                                        )}
                                                    />
                                                    {requiresCatalogProduct && !form.watch(`lines.${index}.product_id`) && (
                                                        <p className="text-[10px] text-rose-600 font-medium">
                                                            Este documento exige producto del catálogo, no texto libre
                                                        </p>
                                                    )}
                                                </div>
                                                {needsWarehouse && warehouseItems.length > 0 && (() => {
                                                    const whValue = form.watch(`lines.${index}.warehouse_id`) || '';
                                                    const pidSel = form.watch(`lines.${index}.product_id`);
                                                    const showError = !!pidSel && !whValue;
                                                    return (
                                                        <div className="flex-1 min-w-[200px] space-y-1">
                                                            <SearchableSelect
                                                                items={warehouseItems}
                                                                value={whValue}
                                                                onChange={(v) => {
                                                                    form.setValue(`lines.${index}.warehouse_id`, v || null, { shouldDirty: true });
                                                                    form.setValue(`lines.${index}.lot_id`, null, { shouldDirty: true });
                                                                    if (v && pidSel) loadLotsForLine(index, pidSel, v);
                                                                }}
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
                                                {isDeliveryNote && (() => {
                                                    const pidSel = form.watch(`lines.${index}.product_id`);
                                                    const whSel = form.watch(`lines.${index}.warehouse_id`);
                                                    const lots = lineLots[index] ?? [];
                                                    if (!pidSel || !whSel) return null;
                                                    return (
                                                        <div className="flex-1 min-w-[200px] space-y-1">
                                                            <select
                                                                title="Lote del producto"
                                                                className="w-full h-9 bg-indigo-50 border border-indigo-200 rounded-lg px-3 text-xs text-slate-700 font-medium appearance-none cursor-pointer focus:ring-2 focus:ring-indigo-200 transition"
                                                                value={form.watch(`lines.${index}.lot_id`) ?? ''}
                                                                onChange={(e) => form.setValue(`lines.${index}.lot_id`, e.target.value || null, { shouldDirty: true })}
                                                                onFocus={() => { if (lots.length === 0) loadLotsForLine(index, pidSel, whSel); }}
                                                            >
                                                                <option value="">— Lote (opcional) —</option>
                                                                {lots.map(l => (
                                                                    <option key={l.id} value={l.id}>
                                                                        {l.lot_number}{l.batch_code ? ` · ${l.batch_code}` : ''} — {l.qty} uds · Vence {new Date(l.expiration_date).toLocaleDateString('es-CO')}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                            {lots.length === 0 && (
                                                                <p className="text-[10px] text-slate-400 font-medium">Sin lotes activos en esta bodega</p>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    );
                                })}
                                <div className="pt-4">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => append({ description: '', qty: 1, unit_price: 0, line_total: 0, warehouse_id: null, tax_config: [] })}
                                        className="w-full h-11"
                                    >
                                        <Plus className="mr-1.5 h-3.5 w-3.5" /> Agregar línea
                                    </Button>
                                </div>
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
