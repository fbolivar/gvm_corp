'use client';

import { useState, useTransition } from 'react';
import { createLotAction } from '../actions/lotActions';
import { FlaskConical, Loader2 } from 'lucide-react';

interface Product {
    id: string;
    name: string;
    sku: string;
}

interface Warehouse {
    id: string;
    name: string;
}

interface Supplier {
    id: string;
    legal_name: string;
}

interface LotFormProps {
    products: Product[];
    warehouses: Warehouse[];
    suppliers: Supplier[];
}

const STATUS_BADGES: Record<string, string> = {
    ACTIVE:     'bg-emerald-100 text-emerald-700',
    QUARANTINE: 'bg-amber-100 text-amber-700',
    EXPIRED:    'bg-rose-100 text-rose-700',
    DEPLETED:   'bg-slate-100 text-slate-500',
};

const STATUS_LABELS: Record<string, string> = {
    ACTIVE:     'Activo',
    QUARANTINE: 'Cuarentena',
    EXPIRED:    'Expirado',
    DEPLETED:   'Agotado',
};

export function LotForm({ products, warehouses, suppliers }: LotFormProps) {
    const [pending, startTransition] = useTransition();
    const [error, setError]   = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        setSuccess(false);
        const fd = new FormData(e.currentTarget);
        const form = e.currentTarget;
        startTransition(async () => {
            try {
                await createLotAction(fd);
                setSuccess(true);
                form.reset();
                setTimeout(() => setSuccess(false), 4000);
            } catch (err: unknown) {
                setError(err instanceof Error ? err.message : 'Error al crear lote');
            }
        });
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">

            {/* Producto */}
            <div className="space-y-1.5">
                <label htmlFor="lot-product" className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Producto <span className="text-rose-500">*</span>
                </label>
                <select
                    id="lot-product"
                    name="product_id"
                    required
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 h-10 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                    <option value="">Selecciona producto…</option>
                    {products.map(p => (
                        <option key={p.id} value={p.id}>
                            {p.sku ? `[${p.sku}] ` : ''}{p.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Bodega */}
            <div className="space-y-1.5">
                <label htmlFor="lot-warehouse" className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Bodega <span className="text-rose-500">*</span>
                </label>
                <select
                    id="lot-warehouse"
                    name="warehouse_id"
                    required
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 h-10 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                    <option value="">Selecciona bodega…</option>
                    {warehouses.map(w => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                </select>
            </div>

            {/* Numero de lote y codigo batch */}
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                    <label htmlFor="lot-number" className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        No. Lote <span className="text-rose-500">*</span>
                    </label>
                    <input
                        id="lot-number"
                        name="lot_number"
                        required
                        placeholder="LOT-2026-001"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 h-10 text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                </div>
                <div className="space-y-1.5">
                    <label htmlFor="lot-batch" className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Batch Code
                    </label>
                    <input
                        id="lot-batch"
                        name="batch_code"
                        placeholder="BC-2026-A"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 h-10 text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                </div>
            </div>

            {/* Cantidad y costo */}
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                    <label htmlFor="lot-qty" className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Cantidad <span className="text-rose-500">*</span>
                    </label>
                    <input
                        id="lot-qty"
                        type="number"
                        name="qty"
                        required
                        min="0.001"
                        step="0.001"
                        placeholder="100"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 h-10 text-sm text-center font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                </div>
                <div className="space-y-1.5">
                    <label htmlFor="lot-cost" className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Costo Unit. <span className="text-rose-500">*</span>
                    </label>
                    <input
                        id="lot-cost"
                        type="number"
                        name="cost"
                        required
                        min="0"
                        step="1"
                        placeholder="15000"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 h-10 text-sm text-center font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                </div>
            </div>

            {/* Fecha vencimiento */}
            <div className="space-y-1.5">
                <label htmlFor="lot-exp" className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Fecha de Vencimiento <span className="text-rose-500">*</span>
                </label>
                <input
                    id="lot-exp"
                    type="date"
                    name="expiration_date"
                    required
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 h-10 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
            </div>

            {/* Proveedor */}
            <div className="space-y-1.5">
                <label htmlFor="lot-supplier" className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Proveedor
                </label>
                <select
                    id="lot-supplier"
                    name="supplier_id"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 h-10 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                    <option value="">Sin proveedor</option>
                    {suppliers.map(s => (
                        <option key={s.id} value={s.id}>{s.legal_name}</option>
                    ))}
                </select>
            </div>

            {/* Notas */}
            <div className="space-y-1.5">
                <label htmlFor="lot-notes" className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Notas</label>
                <textarea
                    id="lot-notes"
                    name="notes"
                    rows={2}
                    placeholder="Observaciones del lote…"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
            </div>

            {/* Estado visual — referencia */}
            <div className="space-y-1.5">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estados de Lote</p>
                <div className="flex flex-wrap gap-2">
                    {Object.entries(STATUS_LABELS).map(([key, label]) => (
                        <span
                            key={key}
                            className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${STATUS_BADGES[key]}`}
                        >
                            {label}
                        </span>
                    ))}
                </div>
            </div>

            {error && (
                <p role="alert" className="text-xs font-bold text-rose-600 bg-rose-50 rounded-xl px-4 py-2">
                    {error}
                </p>
            )}
            {success && (
                <p role="status" className="text-xs font-bold text-emerald-600 bg-emerald-50 rounded-xl px-4 py-2">
                    Lote registrado exitosamente
                </p>
            )}

            <button
                type="submit"
                disabled={pending}
                className="w-full h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
            >
                {pending
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Registrando…</>
                    : <><FlaskConical className="h-4 w-4" /> Registrar Lote</>
                }
            </button>
        </form>
    );
}
