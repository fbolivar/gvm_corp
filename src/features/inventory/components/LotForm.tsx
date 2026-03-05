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
    ACTIVE:     'bg-emerald-50 text-emerald-600 border-emerald-100',
    QUARANTINE: 'bg-amber-50 text-amber-600 border-amber-100',
    EXPIRED:    'bg-rose-50 text-rose-600 border-rose-100',
    DEPLETED:   'bg-slate-50 text-slate-400 border-slate-100',
};

const STATUS_LABELS: Record<string, string> = {
    ACTIVE:     'Activo',
    QUARANTINE: 'Cuarentena',
    EXPIRED:    'Expirado',
    DEPLETED:   'Agotado',
};

const labelClass = "text-[10px] font-semibold text-slate-400 uppercase tracking-wider";
const inputClass = "w-full h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-200";
const selectClass = "w-full h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-200";

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
        <form onSubmit={handleSubmit} className="space-y-3">

            {/* Producto */}
            <div className="space-y-1">
                <label htmlFor="lot-product" className={labelClass}>
                    Producto <span className="text-rose-500">*</span>
                </label>
                <select id="lot-product" name="product_id" required className={selectClass}>
                    <option value="">Selecciona producto...</option>
                    {products.map(p => (
                        <option key={p.id} value={p.id}>
                            {p.sku ? `[${p.sku}] ` : ''}{p.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Bodega */}
            <div className="space-y-1">
                <label htmlFor="lot-warehouse" className={labelClass}>
                    Bodega <span className="text-rose-500">*</span>
                </label>
                <select id="lot-warehouse" name="warehouse_id" required className={selectClass}>
                    <option value="">Selecciona bodega...</option>
                    {warehouses.map(w => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                </select>
            </div>

            {/* Lote + Batch */}
            <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                    <label htmlFor="lot-number" className={labelClass}>
                        No. Lote <span className="text-rose-500">*</span>
                    </label>
                    <input id="lot-number" name="lot_number" required placeholder="LOT-2026-001"
                        className={`${inputClass} font-mono`} />
                </div>
                <div className="space-y-1">
                    <label htmlFor="lot-batch" className={labelClass}>Batch Code</label>
                    <input id="lot-batch" name="batch_code" placeholder="BC-2026-A"
                        className={`${inputClass} font-mono`} />
                </div>
            </div>

            {/* Cantidad + Costo */}
            <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                    <label htmlFor="lot-qty" className={labelClass}>
                        Cantidad <span className="text-rose-500">*</span>
                    </label>
                    <input id="lot-qty" type="number" name="qty" required min="0.001" step="0.001" placeholder="100"
                        className={`${inputClass} text-center font-medium`} />
                </div>
                <div className="space-y-1">
                    <label htmlFor="lot-cost" className={labelClass}>
                        Costo Unit. <span className="text-rose-500">*</span>
                    </label>
                    <input id="lot-cost" type="number" name="cost" required min="0" step="1" placeholder="15000"
                        className={`${inputClass} text-center font-medium`} />
                </div>
            </div>

            {/* Fecha vencimiento */}
            <div className="space-y-1">
                <label htmlFor="lot-exp" className={labelClass}>
                    Fecha de Vencimiento <span className="text-rose-500">*</span>
                </label>
                <input id="lot-exp" type="date" name="expiration_date" required className={inputClass} />
            </div>

            {/* Proveedor */}
            <div className="space-y-1">
                <label htmlFor="lot-supplier" className={labelClass}>Proveedor</label>
                <select id="lot-supplier" name="supplier_id" className={selectClass}>
                    <option value="">Sin proveedor</option>
                    {suppliers.map(s => (
                        <option key={s.id} value={s.id}>{s.legal_name}</option>
                    ))}
                </select>
            </div>

            {/* Notas */}
            <div className="space-y-1">
                <label htmlFor="lot-notes" className={labelClass}>Notas</label>
                <textarea id="lot-notes" name="notes" rows={2} placeholder="Observaciones del lote..."
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-200" />
            </div>

            {/* Status reference */}
            <div className="space-y-1">
                <p className={labelClass}>Estados de Lote</p>
                <div className="flex flex-wrap gap-1.5">
                    {Object.entries(STATUS_LABELS).map(([key, label]) => (
                        <span
                            key={key}
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_BADGES[key]}`}
                        >
                            {label}
                        </span>
                    ))}
                </div>
            </div>

            {error && (
                <p role="alert" className="text-xs font-medium text-rose-600 bg-rose-50 rounded-lg px-3 py-2">
                    {error}
                </p>
            )}
            {success && (
                <p role="status" className="text-xs font-medium text-emerald-600 bg-emerald-50 rounded-lg px-3 py-2">
                    Lote registrado exitosamente
                </p>
            )}

            <button
                type="submit"
                disabled={pending}
                className="w-full h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-60"
            >
                {pending
                    ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Registrando...</>
                    : <><FlaskConical className="h-3.5 w-3.5" /> Registrar Lote</>
                }
            </button>
        </form>
    );
}
