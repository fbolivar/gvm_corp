"use client"

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/shared/components/ui/button';
import {
    FileX,
    FilePlus2,
    Plus,
    Trash2,
    Copy,
    ChevronDown,
    Loader2,
    AlertCircle,
    CheckCircle2,
    Receipt,
    User2,
    DollarSign,
    FileText,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import {
    createCreditNoteAction,
    createDebitNoteAction,
    NoteLineInput,
} from '@/features/documents/actions/creditNoteActions';

interface InvoiceOption {
    id: string;
    number: string | null;
    party_id: string;
    party?: { legal_name: string; doc_number?: string } | null;
    total: number;
    balance?: number | null;
    subtotal: number;
    taxes: number;
    currency?: string;
    issue_date?: string;
    status: string;
    lines?: Array<{
        id?: string;
        description: string;
        qty: number;
        unit_price: number;
        line_total: number;
        product_id?: string | null;
        tax_config?: { rate?: number } | null;
    }>;
}

interface ProductOption {
    id: string;
    name: string;
    price?: number | null;
    sale_price?: number | null;
}

interface Props {
    invoices: InvoiceOption[];
    products: ProductOption[];
    noteType: 'CREDIT_NOTE' | 'DEBIT_NOTE';
}

interface LineItem {
    id: string;
    product_id: string;
    description: string;
    qty: number;
    unit_price: number;
    tax_rate: number;
}

const TAX_OPTIONS = [
    { label: 'Sin IVA (0%)', value: 0 },
    { label: 'IVA 5%', value: 0.05 },
    { label: 'IVA 19%', value: 0.19 },
];

function uid() {
    return Math.random().toString(36).slice(2);
}

function emptyLine(): LineItem {
    return {
        id: uid(),
        product_id: '',
        description: '',
        qty: 1,
        unit_price: 0,
        tax_rate: 0,
    };
}

export default function CreditNoteFormClient({ invoices, products, noteType }: Props) {
    const router = useRouter();
    const isCredit = noteType === 'CREDIT_NOTE';

    const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('');
    const [reason, setReason] = useState('');
    const [lines, setLines] = useState<LineItem[]>([emptyLine()]);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const selectedInvoice = invoices.find(inv => inv.id === selectedInvoiceId) ?? null;

    // ---- Line handlers ----
    const addLine = () => setLines(prev => [...prev, emptyLine()]);

    const removeLine = (id: string) =>
        setLines(prev => prev.length > 1 ? prev.filter(l => l.id !== id) : prev);

    const updateLine = useCallback(
        (id: string, field: keyof Omit<LineItem, 'id'>, value: string | number) => {
            setLines(prev =>
                prev.map(l => l.id === id ? { ...l, [field]: value } : l)
            );
        },
        []
    );

    const copyLinesFromInvoice = () => {
        if (!selectedInvoice?.lines?.length) return;
        const copied: LineItem[] = selectedInvoice.lines.map(l => ({
            id: uid(),
            product_id: l.product_id ?? '',
            description: l.description,
            qty: l.qty,
            unit_price: l.unit_price,
            tax_rate: l.tax_config?.rate
                ? l.tax_config.rate / 100
                : 0,
        }));
        setLines(copied);
    };

    const handleProductSelect = (lineId: string, productId: string) => {
        const product = products.find(p => p.id === productId);
        setLines(prev =>
            prev.map(l =>
                l.id === lineId
                    ? {
                        ...l,
                        product_id: productId,
                        description: product?.name ?? l.description,
                        unit_price: Number(product?.sale_price ?? product?.price ?? l.unit_price),
                    }
                    : l
            )
        );
    };

    // ---- Totals ----
    const subtotal = lines.reduce((s, l) => s + l.qty * l.unit_price, 0);
    const taxes = lines.reduce((s, l) => s + l.qty * l.unit_price * l.tax_rate, 0);
    const total = subtotal + taxes;

    // ---- Submit ----
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!selectedInvoiceId) {
            setError('Debes seleccionar una factura de referencia.');
            return;
        }
        if (!reason.trim()) {
            setError('El motivo es obligatorio.');
            return;
        }
        const validLines = lines.filter(l => l.description.trim() && l.qty > 0);
        if (validLines.length === 0) {
            setError('Agrega al menos una linea valida.');
            return;
        }

        const payload: NoteLineInput[] = validLines.map(l => ({
            product_id: l.product_id,
            description: l.description,
            qty: l.qty,
            unit_price: l.unit_price,
            tax_rate: l.tax_rate,
        }));

        setSubmitting(true);
        try {
            const action = isCredit ? createCreditNoteAction : createDebitNoteAction;
            const result = await action(selectedInvoiceId, reason.trim(), payload);

            if (result.error) {
                setError(result.error);
                return;
            }
            setSuccess(true);
            setTimeout(() => {
                router.push(isCredit ? '/sales/credit-notes' : '/sales/debit-notes');
            }, 1200);
        } catch (err: unknown) {
            setError((err as Error).message ?? 'Error desconocido');
        } finally {
            setSubmitting(false);
        }
    };

    const accentColor = isCredit ? 'rose' : 'amber';
    const AccentIcon = isCredit ? FileX : FilePlus2;

    return (
        <form onSubmit={handleSubmit} className="space-y-10">
            {/* SUCCESS BANNER */}
            {success && (
                <div className="flex items-center gap-4 bg-emerald-50 border border-emerald-200 rounded-2xl px-6 py-4">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                    <p className="font-black text-emerald-700 text-sm uppercase tracking-widest">
                        {isCredit ? 'Nota Credito creada exitosamente.' : 'Nota Debito creada exitosamente.'}
                        Redirigiendo...
                    </p>
                </div>
            )}

            {/* ERROR BANNER */}
            {error && (
                <div className="flex items-center gap-4 bg-rose-50 border border-rose-200 rounded-2xl px-6 py-4">
                    <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
                    <p className="font-bold text-rose-700 text-sm">{error}</p>
                </div>
            )}

            {/* CARD: INVOICE SELECTOR */}
            <div className="bg-white rounded-[2.5rem] shadow-premium p-8 md:p-10 space-y-8 border border-slate-100/60">
                <div className="flex items-center gap-4">
                    <div className={cn(
                        'h-10 w-10 rounded-xl flex items-center justify-center',
                        isCredit ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
                    )}>
                        <Receipt className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="text-sm font-black uppercase tracking-widest text-slate-900">
                            Factura de Referencia
                        </h2>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                            Selecciona la factura origen
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-2">
                        <label className="block text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">
                            Factura *
                        </label>
                        <div className="relative">
                            <select
                                value={selectedInvoiceId}
                                onChange={e => setSelectedInvoiceId(e.target.value)}
                                className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pr-10 text-sm font-bold text-slate-900 shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            >
                                <option value="">— Selecciona una factura —</option>
                                {invoices.map(inv => (
                                    <option key={inv.id} value={inv.id}>
                                        {inv.number ?? 'BORRADOR'} — {inv.party?.legal_name ?? 'Sin cliente'} —{' '}
                                        ${Number(inv.total).toLocaleString('es-CO')}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                </div>

                {/* INVOICE DETAILS PANEL */}
                {selectedInvoice && (
                    <div className={cn(
                        'rounded-2xl p-6 border grid grid-cols-2 md:grid-cols-4 gap-6',
                        isCredit ? 'bg-rose-50/60 border-rose-100' : 'bg-amber-50/60 border-amber-100'
                    )}>
                        <div className="space-y-1">
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                                Numero
                            </p>
                            <p className="font-black text-slate-900 text-sm">
                                {selectedInvoice.number ?? '—'}
                            </p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-1">
                                <User2 className="h-3 w-3" /> Cliente
                            </p>
                            <p className="font-bold text-slate-700 text-sm">
                                {selectedInvoice.party?.legal_name ?? '—'}
                            </p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-1">
                                <DollarSign className="h-3 w-3" /> Total Factura
                            </p>
                            <p className="font-black text-slate-900 text-sm tabular-nums">
                                ${Number(selectedInvoice.total).toLocaleString('es-CO')}
                            </p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                                Saldo Pendiente
                            </p>
                            <p className={cn(
                                'font-black text-sm tabular-nums',
                                isCredit ? 'text-rose-600' : 'text-amber-600'
                            )}>
                                ${Number(selectedInvoice.balance ?? selectedInvoice.total).toLocaleString('es-CO')}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* CARD: REASON */}
            <div className="bg-white rounded-[2.5rem] shadow-premium p-8 md:p-10 space-y-6 border border-slate-100/60">
                <div className="flex items-center gap-4">
                    <div className={cn(
                        'h-10 w-10 rounded-xl flex items-center justify-center',
                        isCredit ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
                    )}>
                        <FileText className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="text-sm font-black uppercase tracking-widest text-slate-900">
                            Motivo del Ajuste
                        </h2>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                            Justificacion legal obligatoria
                        </p>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="block text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">
                        Motivo *
                    </label>
                    <textarea
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        rows={3}
                        placeholder={
                            isCredit
                                ? 'Ej: Devolucion de mercancia defectuosa, descuento comercial aplicado...'
                                : 'Ej: Intereses de mora, gastos adicionales de flete no incluidos...'
                        }
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 shadow-inner placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none font-medium"
                    />
                </div>
            </div>

            {/* CARD: LINE ITEMS */}
            <div className="bg-white rounded-[2.5rem] shadow-premium p-8 md:p-10 space-y-6 border border-slate-100/60">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                        <div className={cn(
                            'h-10 w-10 rounded-xl flex items-center justify-center',
                            isCredit ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
                        )}>
                            <AccentIcon className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-sm font-black uppercase tracking-widest text-slate-900">
                                Lineas del Documento
                            </h2>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                                Conceptos ajustados
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        {selectedInvoice?.lines && selectedInvoice.lines.length > 0 && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={copyLinesFromInvoice}
                                className="h-9 px-5 rounded-xl border-indigo-200 text-indigo-600 hover:bg-indigo-50 font-black text-[10px] uppercase tracking-widest"
                            >
                                <Copy className="h-3.5 w-3.5 mr-2" />
                                Copiar de Factura
                            </Button>
                        )}
                        <Button
                            type="button"
                            onClick={addLine}
                            className={cn(
                                'h-9 px-5 rounded-xl font-black text-[10px] uppercase tracking-widest border-none text-white',
                                isCredit ? 'bg-rose-600 hover:bg-rose-500' : 'bg-amber-600 hover:bg-amber-500'
                            )}
                        >
                            <Plus className="h-3.5 w-3.5 mr-2" />
                            Agregar Linea
                        </Button>
                    </div>
                </div>

                {/* LINES TABLE HEADER */}
                <div className="hidden md:grid grid-cols-[2fr_3fr_1fr_1fr_1fr_auto] gap-3 px-2">
                    {['Producto', 'Descripcion', 'Cant.', 'Precio Unit.', 'IVA', ''].map((h, i) => (
                        <div key={i} className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                            {h}
                        </div>
                    ))}
                </div>

                {/* LINES */}
                <div className="space-y-3">
                    {lines.map((line, idx) => (
                        <div
                            key={line.id}
                            className="grid grid-cols-1 md:grid-cols-[2fr_3fr_1fr_1fr_1fr_auto] gap-3 items-start bg-slate-50/60 rounded-2xl p-4 border border-slate-100"
                        >
                            {/* Product select */}
                            <div className="relative">
                                <select
                                    value={line.product_id}
                                    onChange={e => handleProductSelect(line.id, e.target.value)}
                                    className="w-full appearance-none bg-white border border-slate-200 rounded-xl px-3 py-2.5 pr-8 text-xs font-bold text-slate-700 shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                >
                                    <option value="">Sin producto</option>
                                    {products.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                            </div>

                            {/* Description */}
                            <input
                                type="text"
                                value={line.description}
                                onChange={e => updateLine(line.id, 'description', e.target.value)}
                                placeholder="Descripcion del concepto..."
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-900 shadow-inner placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            />

                            {/* Qty */}
                            <input
                                type="number"
                                min="0.001"
                                step="any"
                                value={line.qty}
                                onChange={e => updateLine(line.id, 'qty', parseFloat(e.target.value) || 0)}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-900 shadow-inner text-right focus:outline-none focus:ring-2 focus:ring-indigo-400 tabular-nums"
                            />

                            {/* Unit price */}
                            <input
                                type="number"
                                min="0"
                                step="any"
                                value={line.unit_price}
                                onChange={e => updateLine(line.id, 'unit_price', parseFloat(e.target.value) || 0)}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-900 shadow-inner text-right focus:outline-none focus:ring-2 focus:ring-indigo-400 tabular-nums"
                            />

                            {/* Tax rate */}
                            <div className="relative">
                                <select
                                    value={line.tax_rate}
                                    onChange={e => updateLine(line.id, 'tax_rate', parseFloat(e.target.value))}
                                    className="w-full appearance-none bg-white border border-slate-200 rounded-xl px-3 py-2.5 pr-8 text-xs font-bold text-slate-700 shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                >
                                    {TAX_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                            </div>

                            {/* Remove */}
                            <button
                                type="button"
                                onClick={() => removeLine(line.id)}
                                disabled={lines.length === 1}
                                className="h-9 w-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </button>

                            {/* Line total (mobile-friendly display) */}
                            <div className="md:hidden col-span-full flex justify-end">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    Subtotal:&nbsp;
                                    <span className="text-slate-900">
                                        ${(line.qty * line.unit_price).toLocaleString('es-CO', { minimumFractionDigits: 0 })}
                                    </span>
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* TOTALS SUMMARY */}
            <div className="bg-white rounded-[2.5rem] shadow-premium p-8 md:p-10 border border-slate-100/60">
                <div className="max-w-sm ml-auto space-y-4">
                    <div className="flex justify-between items-center py-3 border-b border-slate-100">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Subtotal
                        </span>
                        <span className="font-black text-slate-900 tabular-nums">
                            ${subtotal.toLocaleString('es-CO', { minimumFractionDigits: 0 })}
                        </span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-slate-100">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            IVA
                        </span>
                        <span className="font-black text-slate-700 tabular-nums">
                            ${taxes.toLocaleString('es-CO', { minimumFractionDigits: 0 })}
                        </span>
                    </div>
                    <div className={cn(
                        'flex justify-between items-center py-4 px-6 rounded-2xl',
                        isCredit ? 'bg-rose-50' : 'bg-amber-50'
                    )}>
                        <span className={cn(
                            'text-sm font-black uppercase tracking-widest',
                            isCredit ? 'text-rose-700' : 'text-amber-700'
                        )}>
                            Total {isCredit ? 'NC' : 'ND'}
                        </span>
                        <span className={cn(
                            'text-2xl font-black tabular-nums',
                            isCredit ? 'text-rose-700' : 'text-amber-700'
                        )}>
                            ${total.toLocaleString('es-CO', { minimumFractionDigits: 0 })}
                        </span>
                    </div>
                </div>
            </div>

            {/* SUBMIT */}
            <div className="flex items-center justify-end gap-4 pb-8">
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                    className="h-12 px-8 rounded-2xl border-slate-200 text-slate-600 font-black uppercase tracking-widest text-[10px]"
                >
                    Cancelar
                </Button>
                <Button
                    type="submit"
                    disabled={submitting || success}
                    className={cn(
                        'h-12 px-12 rounded-2xl font-black uppercase tracking-widest text-[11px] text-white border-none shadow-active hover:scale-105 active:scale-95 transition-all',
                        isCredit
                            ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-100'
                            : 'bg-amber-600 hover:bg-amber-500 shadow-amber-100',
                        (submitting || success) && 'opacity-60 cursor-not-allowed hover:scale-100'
                    )}
                >
                    {submitting ? (
                        <span className="flex items-center gap-3">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Creando...
                        </span>
                    ) : success ? (
                        <span className="flex items-center gap-3">
                            <CheckCircle2 className="h-4 w-4" />
                            Creado
                        </span>
                    ) : (
                        <span className="flex items-center gap-3">
                            <AccentIcon className="h-4 w-4" />
                            {isCredit ? 'Crear Nota Credito' : 'Crear Nota Debito'}
                        </span>
                    )}
                </Button>
            </div>
        </form>
    );
}
