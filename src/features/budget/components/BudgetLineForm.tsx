'use client';

import { useTransition, useState } from 'react';
import { upsertBudgetLine } from '../actions';
import { BudgetLine } from '../types';
import { Plus, Loader2, X } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

interface Props {
    budgetId: string;
    tenantId: string;
    editLine?: BudgetLine;
    onClose?: () => void;
}

const INCOME_CATEGORIES  = ['Ventas Productos', 'Servicios', 'Otros Ingresos', 'Intereses', 'Dividendos'];
const EXPENSE_CATEGORIES = ['Costo de Ventas', 'Nómina y Prestaciones', 'Arrendamiento', 'Marketing', 'Servicios Públicos', 'Tecnología', 'Impuestos y Aportes', 'Gastos Generales', 'Depreciación', 'Otros Gastos'];

export function BudgetLineForm({ budgetId, tenantId, editLine, onClose }: Props) {
    const [pending, startTransition] = useTransition();
    const [lineType, setLineType] = useState<'INCOME' | 'EXPENSE'>(editLine?.line_type ?? 'INCOME');
    const [error, setError] = useState<string | null>(null);

    const categories = lineType === 'INCOME' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
            try {
                await upsertBudgetLine(fd);
                onClose?.();
            } catch (err: unknown) {
                setError(err instanceof Error ? err.message : 'Error desconocido');
            }
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <input type="hidden" name="budget_id" value={budgetId} />
            <input type="hidden" name="tenant_id" value={tenantId} />
            {editLine?.id && <input type="hidden" name="id" value={editLine.id} />}

            {/* Tipo */}
            <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Tipo</label>
                <div className="flex gap-2">
                    {(['INCOME', 'EXPENSE'] as const).map(t => (
                        <button key={t} type="button"
                            onClick={() => setLineType(t)}
                            className={cn(
                                "flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all",
                                lineType === t
                                    ? t === 'INCOME'
                                        ? "bg-emerald-600 text-white border-emerald-600"
                                        : "bg-rose-600 text-white border-rose-600"
                                    : "bg-white text-slate-400 border-slate-200"
                            )}>
                            {t === 'INCOME' ? 'Ingreso' : 'Gasto'}
                        </button>
                    ))}
                </div>
                <input type="hidden" name="line_type" value={lineType} />
            </div>

            {/* Categoría */}
            <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Categoría</label>
                <select name="category" defaultValue={editLine?.category ?? ''} required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">Seleccionar...</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>

            {/* Subcategoría */}
            <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Subcategoría (opcional)</label>
                <input type="text" name="subcategory" defaultValue={editLine?.subcategory ?? ''}
                    placeholder="Ej: Salarios, Materiales..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>

            {/* Monto */}
            <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Monto Presupuestado (COP)</label>
                <input type="number" name="amount" defaultValue={editLine?.amount ?? ''} min={0} step="1000" required
                    placeholder="0"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>

            {/* Notas */}
            <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Notas (opcional)</label>
                <textarea name="notes" defaultValue={editLine?.notes ?? ''} rows={2}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
            </div>

            {error && <p className="text-xs text-rose-600 font-bold">{error}</p>}

            <div className="flex gap-3 pt-2">
                <button type="submit" disabled={pending}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all disabled:opacity-50">
                    {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    {editLine ? 'Guardar Cambios' : 'Añadir Línea'}
                </button>
                {onClose && (
                    <button type="button" onClick={onClose}
                        className="px-5 py-3 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-900 transition-colors">
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>
        </form>
    );
}
