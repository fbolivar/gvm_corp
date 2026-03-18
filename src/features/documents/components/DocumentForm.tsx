"use client"

import { useForm, useFieldArray, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { documentSchema, Document, DocumentLine } from "../types"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Badge } from "@/shared/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import { Party } from "@/features/parties/types"
import { Product } from "@/features/products/types"
import {
    Plus,
    Trash2,
    FileText,
    Calendar,
    ChevronDown,
    Package,
    Calculator,
    AlertCircle,
    CheckCircle2,
    Box,
    Sparkles,
    ShieldCheck,
    Coins,
    LayoutDashboard,
    ArrowRight,
    Loader
} from "lucide-react"
import { useEffect } from "react"
import { format } from "date-fns"
import { cn } from "@/shared/lib/utils"

interface DocumentFormProps {
    parties: Party[]
    products: Product[]
    initialData?: Document
    onSubmit: (data: Document) => Promise<void>
    isLoading?: boolean
}

const LineTotal = ({ control, index }: { control: any; index: number }) => {
    const qty = useWatch({ control, name: `lines.${index}.qty` }) || 0;
    const price = useWatch({ control, name: `lines.${index}.unit_price` }) || 0;
    const total = qty * price;
    return (
        <span className="text-2xl font-black text-slate-900 tracking-tighter italic">
            <span className="text-sm font-black text-slate-300 mr-1">$</span>
            {total.toLocaleString('es-CO', { minimumFractionDigits: 0 })}
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
        <Card className="rounded-[2.5rem] md:rounded-[4rem] border-none bg-slate-900 shadow-active p-8 md:p-12 relative overflow-hidden group">
            <Calculator className="absolute -bottom-10 -right-10 h-48 w-48 text-white/[0.03] group-hover:rotate-[20deg] transition-transform duration-1000 group-hover:scale-110 pointer-events-none" />
            <div className="space-y-8 relative z-10">
                <div className="flex justify-between items-center text-white/30 uppercase tracking-[0.3em] font-black text-[9px]">
                    <span>Subtotal Gravable</span>
                    <span className="text-white/80 text-xl font-mono italic tracking-tighter underline decoration-white/10 underline-offset-8">
                        ${subtotal.toLocaleString('es-CO', { minimumFractionDigits: 0 })}
                    </span>
                </div>
                <div className="flex justify-between items-center text-white/30 uppercase tracking-[0.3em] font-black text-[9px]">
                    <span>Impacto Tributario (IVA)</span>
                    <span className="text-indigo-400 text-xl font-mono italic tracking-tighter">
                        ${taxes.toLocaleString('es-CO', { minimumFractionDigits: 0 })}
                    </span>
                </div>
                <div className="h-px bg-white/5 my-4" />
                <div className="flex justify-between items-end">
                    <div className="space-y-2">
                        <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em]">Liquidación Final</p>
                        <p className="text-4xl sm:text-6xl font-black text-white tracking-tighter italic leading-none group-hover:scale-105 origin-left transition-transform duration-500">
                            ${total.toLocaleString('es-CO', { minimumFractionDigits: 0 })}
                        </p>
                    </div>
                    <span className="text-[10px] text-white/40 font-black tracking-[0.3em] uppercase mb-1">COP / NACIONAL</span>
                </div>
            </div>
        </Card>
    );
};

export function DocumentForm({ parties, products, initialData, onSubmit, isLoading }: DocumentFormProps) {
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
        let subtotal = 0; let taxes = 0;
        data.lines?.forEach((line: any) => {
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
        data.subtotal = subtotal;
        data.taxes = taxes;
        data.total = subtotal + taxes;
        await onSubmit(data);
    };

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-1000 pb-24">
            {/* 🛠️ PREMIUM HEADER POD */}
            <div className="bg-slate-900 rounded-[3.5rem] p-10 shadow-premium flex flex-col md:flex-row justify-between items-center gap-8 relative overflow-hidden group">
                <div className="absolute right-0 top-0 p-8 opacity-5 group-hover:rotate-12 transition-transform duration-700 pointer-events-none">
                    <ShieldCheck className="h-32 w-32 text-white" />
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8 z-10 text-center sm:text-left">
                    <div className={cn(
                        "h-16 w-16 sm:h-20 sm:w-20 rounded-[1.5rem] sm:rounded-[2rem] flex items-center justify-center shadow-active rotate-3 group-hover:rotate-0 transition-all shrink-0",
                        isSale ? "bg-amber-600 shadow-amber-600/20" : "bg-emerald-600 shadow-emerald-600/20"
                    )}>
                        <FileText className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                    </div>
                    <div className="space-y-1">
                        <h1 className="text-2xl sm:text-4xl font-black text-white italic tracking-tighter uppercase leading-none">
                            {initialData?.id ? 'Edición Maestro' : 'Nueva Operación'}
                        </h1>
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.5em] flex items-center gap-2 justify-center sm:justify-start">
                            <Sparkles className="h-3 w-3" /> Ecosistema de Transacciones V3
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4 z-10">
                    <Badge variant="outline" className="h-10 border-white/10 text-white/60 px-6 rounded-2xl font-black text-[9px] uppercase tracking-widest bg-white/5 backdrop-blur-md">
                        {isSale ? 'Ventas / Ingreso' : 'Compras / Gasto'}
                    </Badge>
                </div>
            </div>

            {/* 📋 PROTOCOLO DE IDENTIFICACIÓN (DOC INFO) */}
            <Card className="rounded-[4rem] border-none bg-white shadow-premium overflow-hidden p-2 group/card">
                <CardHeader className="px-10 py-8 border-b border-slate-50 flex flex-row items-center gap-4">
                    <div className="h-10 w-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover/card:bg-slate-900 group-hover/card:text-white transition-all duration-500">
                        <LayoutDashboard className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-sm font-black text-slate-900 uppercase italic tracking-tighter">Protocolo de Operación</CardTitle>
                </CardHeader>
                <CardContent className="p-10 grid grid-cols-1 md:grid-cols-12 gap-10">
                    <div className="md:col-span-3 space-y-3">
                        <Label className="text-slate-400 font-black uppercase text-[9px] tracking-[0.3em] pl-2 flex items-center gap-2">
                            Tipo de Proceso
                        </Label>
                        <div className="relative group/select">
                            <select
                                {...form.register('doc_type')}
                                className="w-full h-16 bg-slate-50 border-2 border-transparent focus:border-indigo-500/10 rounded-[1.5rem] px-8 text-slate-900 text-[11px] font-black appearance-none transition-all shadow-inner uppercase tracking-widest focus:bg-white"
                            >
                                <option value="INVOICE">Factura de Venta</option>
                                <option value="QUOTATION">Cotización</option>
                                <option value="SALES_ORDER">Pedido de Venta</option>
                                <option value="PURCHASE_ORDER">Orden de Compra</option>
                                <option value="VENDOR_BILL">Factura de Compra</option>
                                <option value="CREDIT_NOTE">Nota Crédito</option>
                                <option value="DOC_SUPPORT">Documento Soporte</option>
                            </select>
                            <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 pointer-events-none group-focus-within/select:rotate-180 transition-transform" />
                        </div>
                        {initialData?.parent_id && (
                            <div className="flex items-center gap-2 mt-2 px-2 py-1.5 bg-indigo-50/50 rounded-xl border border-indigo-100/50">
                                <Sparkles className="h-3 w-3 text-indigo-500" />
                                <span className="text-[8px] font-black text-indigo-600 uppercase tracking-widest leading-none">Vínculo con Origen Activo</span>
                            </div>
                        )}
                    </div>

                    <div className="md:col-span-6 space-y-3">
                        <Label className="text-slate-400 font-black uppercase text-[9px] tracking-[0.3em] pl-2">Entidad Vinculada (Socio Comercial)</Label>
                        <div className="relative group/select">
                            <select
                                {...form.register('party_id')}
                                className={cn(
                                    "w-full h-16 bg-slate-50 border-2 border-transparent focus:border-indigo-500/10 rounded-[1.5rem] px-8 text-slate-900 text-[11px] font-black appearance-none transition-all shadow-inner focus:bg-white",
                                    !!form.formState.errors.party_id && "border-rose-500/20"
                                )}
                            >
                                <option value="">IDENTIFICAR TERCERO EN BASE DE DATOS...</option>
                                {parties.map(p => <option key={p.id} value={p.id}>{p.legal_name.toUpperCase()} — {p.doc_number}</option>)}
                            </select>
                            <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 pointer-events-none group-focus-within/select:rotate-180 transition-transform" />
                        </div>
                        {form.formState.errors.party_id && (
                            <div className="flex items-center gap-2 pl-2 text-rose-500 animate-in fade-in slide-in-from-left-2 transition-all">
                                <AlertCircle className="h-3 w-3" />
                                <p className="text-[9px] font-black uppercase tracking-tighter italic">{form.formState.errors.party_id.message}</p>
                            </div>
                        )}
                    </div>

                    <div className="md:col-span-3 space-y-3">
                        <Label className="text-slate-400 font-black uppercase text-[9px] tracking-[0.3em] pl-2">Fecha Logística</Label>
                        <div className="relative">
                            <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 pointer-events-none" />
                            <Input
                                type="date"
                                {...form.register('issue_date')}
                                className="h-16 bg-slate-50 border-2 border-transparent focus:border-indigo-500/10 rounded-[1.5rem] pl-14 text-slate-900 text-[11px] font-black transition-all shadow-inner uppercase tracking-widest focus:bg-white"
                            />
                        </div>
                    </div>

                    <div className="md:col-span-12 h-px bg-slate-50 my-2" />

                    <div className="md:col-span-8 space-y-3">
                        <Label className="text-slate-400 font-black uppercase text-[9px] tracking-[0.3em] pl-2">Términos Comerciales (Público)</Label>
                        <div className="relative">
                            <FileText className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-200" />
                            <Input
                                {...form.register('notes_public')}
                                placeholder="VALIDEZ, GARANTÍA, OBSERVACIONES..."
                                className="h-16 bg-slate-50 border-2 border-transparent focus:border-indigo-500/10 rounded-[1.5rem] pl-14 pr-8 text-slate-900 text-[11px] font-black focus:bg-white transition-all shadow-inner placeholder:text-slate-200 tracking-wider uppercase"
                            />
                        </div>
                    </div>

                    <div className="md:col-span-4 space-y-3">
                        <Label className="text-slate-400 font-black uppercase text-[9px] tracking-[0.3em] pl-2">Descriptor Interno (Auditoría)</Label>
                        <Input
                            {...form.register('notes_internal')}
                            placeholder="NOTAS DE AUDITORÍA..."
                            className="h-16 bg-slate-50 border-2 border-transparent focus:border-indigo-500/10 rounded-[1.5rem] px-8 text-slate-500 italic text-[11px] font-bold focus:bg-white transition-all shadow-inner placeholder:text-slate-200"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* 📦 ITEMS & SERVICES TABLE */}
            <Card className="rounded-[4rem] border-none bg-white shadow-premium overflow-hidden p-2">
                <CardHeader className="p-10 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className="h-14 w-14 bg-slate-900 rounded-2xl flex items-center justify-center shadow-active">
                            <Package className="h-7 w-7 text-white" />
                        </div>
                        <div className="space-y-0.5">
                            <CardTitle className="text-slate-900 text-2xl font-black italic tracking-tighter uppercase underline decoration-slate-200/50 underline-offset-8">Desglose Técnico</CardTitle>
                            <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.4em]">Matriz de Suministros & Servicios</p>
                        </div>
                    </div>
                    <Button type="button" onClick={() => append({ description: '', qty: 1, unit_price: 0, line_total: 0 })} className="h-14 px-10 rounded-2xl bg-slate-900 hover:bg-slate-800 text-xs text-white font-black uppercase tracking-[0.2em] shadow-active transition-all hover:scale-105 active:scale-95">
                        <Plus className="mr-3 h-5 w-5" /> Agregar Item
                    </Button>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-slate-50/50">
                                <TableRow className="border-slate-50 hover:bg-transparent">
                                    <TableHead className="min-w-[400px] text-slate-400 font-black uppercase text-[9px] tracking-[0.3em] py-10 pl-14">Producto / Especificación Técnica</TableHead>
                                    <TableHead className="min-w-[120px] text-center text-slate-400 font-black uppercase text-[9px] tracking-[0.3em] py-10">Unidades</TableHead>
                                    <TableHead className="min-w-[180px] text-right text-slate-400 font-black uppercase text-[9px] tracking-[0.3em] py-10">P. Unitario</TableHead>
                                    <TableHead className="min-w-[200px] text-right text-slate-400 font-black uppercase text-[9px] tracking-[0.3em] py-10 pr-14">Liquidación</TableHead>
                                    <TableHead className="w-[80px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {fields.map((field, index) => {
                                    const pid = form.watch(`lines.${index}.product_id`);
                                    const prod = products.find(p => p.id === pid);
                                    // Validating stock requires useWatch per line if we wanted exact performance, but watch here is minimal.
                                    // Even better: isolate the row component! For now we'll keep it inline as requested.
                                    return (
                                        <TableRow key={field.id} className="border-slate-50 hover:bg-slate-50/30 transition-all group/row">
                                            <TableCell className="py-10 pl-14">
                                                <div className="space-y-4">
                                                    <div className="relative group/select">
                                                        <select
                                                            {...form.register(`lines.${index}.product_id`)}
                                                            onChange={(e) => { form.register(`lines.${index}.product_id`).onChange(e); handleProductChange(index, e.target.value); }}
                                                            className="w-full h-14 bg-slate-50 border-none rounded-2xl px-6 text-slate-900 text-[10px] font-black appearance-none focus:ring-2 focus:ring-slate-100 outline-none transition-all shadow-inner uppercase tracking-wider"
                                                        >
                                                            <option value="">(BÚSQUEDA EN CATÁLOGO MAESTRO)</option>
                                                            {products.map(p => (
                                                                <option key={p.id} value={p.id}>
                                                                    {p.sku ? `[${p.sku}] ` : ''}{p.name.toUpperCase()}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-300" />
                                                    </div>
                                                    <div className="relative">
                                                        <Input
                                                            {...form.register(`lines.${index}.description`)}
                                                            placeholder="IDENTIFICADOR O ATRIBUTO ADICIONAL DE LÍNEA..."
                                                            className="h-10 bg-transparent border-slate-100 rounded-xl text-[9px] text-slate-500 placeholder:text-slate-200 uppercase tracking-widest font-black focus:ring-0 shadow-none pl-4"
                                                        />
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-10 align-top">
                                                <div className="relative pt-1">
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        {...form.register(`lines.${index}.qty`, { valueAsNumber: true })}
                                                        className="h-14 bg-slate-50 border-none rounded-2xl text-center font-black text-xs text-slate-900 transition-all shadow-inner focus:bg-white"
                                                    />
                                                    {isSale && prod && (
                                                        <div className="absolute -bottom-6 left-0 right-0 text-center">
                                                            <span className="text-[7px] font-black text-slate-300 uppercase tracking-tighter">DISPONIBLE: {prod.stock_qty || 0}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-10 align-top">
                                                <div className="relative pt-1">
                                                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 text-[10px] font-black">$</div>
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        {...form.register(`lines.${index}.unit_price`, { valueAsNumber: true })}
                                                        className="h-14 bg-slate-50 border-none rounded-2xl pl-12 pr-6 text-right font-black text-xs text-slate-900 transition-all shadow-inner"
                                                    />
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-10 text-right align-top pr-14">
                                                <div className="flex flex-col h-14 justify-center">
                                                    <span className="text-[9px] text-slate-300 font-black uppercase tracking-widest leading-none mb-2">Base de Renglón</span>
                                                    <LineTotal control={form.control} index={index} />
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-10 text-center align-top pr-6">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => remove(index)}
                                                    className="h-12 w-12 hover:bg-rose-50 hover:text-rose-600 rounded-2xl transition-all text-slate-200 group-hover/row:text-slate-300 shadow-none border-none active:scale-90"
                                                >
                                                    <Trash2 className="h-5 w-5" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                                {!fields.length && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="py-32 text-center">
                                            <div className="flex flex-col items-center gap-6 opacity-40 group/empty">
                                                <div className="h-24 w-24 bg-slate-50 rounded-[3rem] flex items-center justify-center shadow-inner group-hover/empty:scale-110 transition-transform">
                                                    <Box className="h-12 w-12 text-slate-200" />
                                                </div>
                                                <p className="font-black uppercase text-[10px] tracking-[0.5em] text-slate-900 underline decoration-slate-200 underline-offset-8">Sin unidades proyectadas en el protocolo</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Stock Alert */}
            {(() => {
                const lines = form.watch('lines');
                const hasStockIssues = isSale && lines?.some((line: any) => {
                    const prod = products.find(p => p.id === line.product_id);
                    return prod && (Number(line.qty) || 0) > (prod.stock_qty || 0);
                });
                if (!hasStockIssues) return null;
                return (
                    <div className="flex items-center gap-6 p-6 bg-rose-900 border border-rose-800 rounded-[2rem] shadow-premium animate-pulse relative overflow-hidden">
                        <AlertCircle className="h-8 w-8 text-rose-500 shrink-0" />
                        <div className="space-y-1">
                            <p className="text-[9px] font-black text-rose-500/50 uppercase tracking-[0.3em]">Protocolo de Seguridad Inventario</p>
                            <p className="text-[10px] text-rose-100 font-black uppercase tracking-widest leading-none">Bloqueo Activo: Cantidades exceden disponibilidad física.</p>
                        </div>
                    </div>
                );
            })()}

            {/* Totals + Actions */}
            <div className="max-w-xl ml-auto space-y-6">
                <DocumentTotals control={form.control} products={products} />
                <div className="flex gap-4">
                    <Button type="button" variant="outline" onClick={() => window.history.back()} className="flex-1 h-16 rounded-2xl border-slate-200 text-slate-500 font-bold text-xs uppercase tracking-wider hover:bg-slate-50 transition-all">
                        Descartar
                    </Button>
                    <Button type="button" onClick={form.handleSubmit(handleFormSubmit)} disabled={isLoading || fields.length === 0} className={cn(
                        "flex-[2] h-16 rounded-2xl font-bold shadow-active transition-all hover:scale-[1.02] active:scale-95 text-xs uppercase tracking-wider border-none gap-3",
                        isSale ? "bg-amber-600 text-white shadow-amber-600/20 hover:bg-amber-700" : "bg-emerald-600 text-white shadow-emerald-600/20 hover:bg-emerald-700"
                    )}>
                        {isLoading ? <><Loader className="h-5 w-5 animate-spin" /> Procesando...</> :
                            <><CheckCircle2 className="h-5 w-5" /> Registrar {isSale ? 'Pedido' : 'Compra'}</>}
                    </Button>
                </div>
            </div>
        </div>
    )
}
