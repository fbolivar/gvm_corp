'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createFixedAssetAction } from '@/features/accounting/fixedAssetActions';
import {
    CATEGORY_LABELS, DEFAULT_USEFUL_LIFE, AssetCategory,
} from '@/features/accounting/services/fixedAssetService';
import { Button } from '@/shared/components/ui/button';
import { Loader2, Package } from 'lucide-react';

const CATEGORIES = Object.entries(CATEGORY_LABELS) as [AssetCategory, string][];

const INPUT_CLASS = 'w-full h-12 px-4 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all';
const LABEL_CLASS = 'text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block';

export default function NewFixedAssetClient() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const today = new Date().toISOString().split('T')[0];

    const [form, setForm] = useState({
        name: '',
        code: '',
        category: 'EQUIPMENT' as AssetCategory,
        acquisition_date: today,
        acquisition_cost: 0,
        salvage_value: 0,
        useful_life_years: DEFAULT_USEFUL_LIFE['EQUIPMENT'],
        location: '',
        serial_number: '',
        notes: '',
        status: 'ACTIVE' as const,
        chart_account_id: null as string | null,
    });

    const handleCategoryChange = (cat: AssetCategory) =>
        setForm(p => ({ ...p, category: cat, useful_life_years: DEFAULT_USEFUL_LIFE[cat] }));

    const annualDep = form.useful_life_years > 0
        ? (form.acquisition_cost - form.salvage_value) / form.useful_life_years
        : 0;
    const monthlyDep = annualDep / 12;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim()) { setError('El nombre es obligatorio'); return; }
        if (form.acquisition_cost <= 0) { setError('El costo de adquisición debe ser mayor a 0'); return; }

        setLoading(true);
        setError('');
        const result = await createFixedAssetAction({
            ...form,
            code: form.code || '',
            location: form.location || null,
            serial_number: form.serial_number || null,
            notes: form.notes || null,
        });
        setLoading(false);

        if (result.error) {
            setError(result.error);
        } else {
            router.push('/accounting/fixed-assets');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-10 max-w-3xl mx-auto">
            {/* General Info */}
            <div className="bg-white rounded-[2.5rem] p-10 shadow-premium space-y-8">
                <div className="flex items-center gap-4 mb-2">
                    <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                        <Package className="h-6 w-6" />
                    </div>
                    <h2 className="text-lg font-black text-slate-900 italic uppercase tracking-tight">Información del Activo</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                        <label className={LABEL_CLASS}>Nombre del Activo *</label>
                        <input className={INPUT_CLASS} placeholder="Ej: Camión de reparto 2024" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
                    </div>
                    <div>
                        <label className={LABEL_CLASS}>Código Interno</label>
                        <input className={INPUT_CLASS} placeholder="Ej: AF-001" value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} />
                    </div>
                    <div>
                        <label className={LABEL_CLASS}>Categoría *</label>
                        <select className={INPUT_CLASS} value={form.category} onChange={e => handleCategoryChange(e.target.value as AssetCategory)}>
                            {CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className={LABEL_CLASS}>Fecha de Adquisición *</label>
                        <input type="date" className={INPUT_CLASS} value={form.acquisition_date} onChange={e => setForm(p => ({ ...p, acquisition_date: e.target.value }))} required />
                    </div>
                    <div>
                        <label className={LABEL_CLASS}>Número de Serie / Placa</label>
                        <input className={INPUT_CLASS} placeholder="Ej: VIN123456" value={form.serial_number} onChange={e => setForm(p => ({ ...p, serial_number: e.target.value }))} />
                    </div>
                    <div>
                        <label className={LABEL_CLASS}>Ubicación</label>
                        <input className={INPUT_CLASS} placeholder="Ej: Bodega principal, Sede Norte" value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} />
                    </div>
                    <div>
                        <label className={LABEL_CLASS}>Notas</label>
                        <input className={INPUT_CLASS} placeholder="Observaciones adicionales" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
                    </div>
                </div>
            </div>

            {/* Depreciation Config */}
            <div className="bg-white rounded-[2.5rem] p-10 shadow-premium space-y-8">
                <h2 className="text-lg font-black text-slate-900 italic uppercase tracking-tight">Parámetros de Depreciación</h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className={LABEL_CLASS}>Costo de Adquisición (COP) *</label>
                        <input type="number" min="0" step="1000" className={`${INPUT_CLASS} text-right`} value={form.acquisition_cost || ''} onChange={e => setForm(p => ({ ...p, acquisition_cost: Number(e.target.value) }))} required />
                    </div>
                    <div>
                        <label className={LABEL_CLASS}>Valor Residual (COP)</label>
                        <input type="number" min="0" step="1000" className={`${INPUT_CLASS} text-right`} value={form.salvage_value || ''} onChange={e => setForm(p => ({ ...p, salvage_value: Number(e.target.value) }))} />
                    </div>
                    <div>
                        <label className={LABEL_CLASS}>Vida Útil (años)</label>
                        <input type="number" min="0" max="100" className={`${INPUT_CLASS} text-right`} value={form.useful_life_years} onChange={e => setForm(p => ({ ...p, useful_life_years: Number(e.target.value) }))} disabled={form.category === 'LAND'} />
                    </div>
                </div>

                {/* Preview */}
                {form.category !== 'LAND' && form.acquisition_cost > 0 && (
                    <div className="grid grid-cols-3 gap-4 p-6 bg-indigo-50/50 rounded-2xl border border-indigo-100/50">
                        <div className="text-center">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Dep. Mensual</p>
                            <p className="text-xl font-black text-indigo-700 italic">${monthlyDep.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</p>
                        </div>
                        <div className="text-center border-x border-indigo-100">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Dep. Anual</p>
                            <p className="text-xl font-black text-indigo-700 italic">${annualDep.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Método</p>
                            <p className="text-xl font-black text-slate-700 italic">Línea Recta</p>
                        </div>
                    </div>
                )}
            </div>

            {error && (
                <div className="p-5 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-sm font-semibold">{error}</div>
            )}

            <div className="flex gap-4 justify-end">
                <Button type="button" variant="outline" onClick={() => router.push('/accounting/fixed-assets')} className="h-14 px-10 rounded-2xl border-slate-200 font-black text-[10px] uppercase tracking-widest">
                    Cancelar
                </Button>
                <Button type="submit" disabled={loading} className="h-14 px-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest shadow-active">
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Registrar Activo'}
                </Button>
            </div>
        </form>
    );
}
