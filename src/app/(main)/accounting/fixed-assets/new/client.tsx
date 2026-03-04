'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createFixedAssetAction } from '@/features/accounting/fixedAssetActions';
import {
    CATEGORY_LABELS, DEFAULT_USEFUL_LIFE, AssetCategory,
} from '@/features/accounting/services/fixedAssetService';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/shared/components/ui/select';
import { Loader2, Save, Package, Calculator } from 'lucide-react';

const CATEGORIES = Object.entries(CATEGORY_LABELS) as [AssetCategory, string][];

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

    const fmt = (n: number) => `$${n.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;

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
        <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
            {/* General Info */}
            <Card className="rounded-2xl border border-slate-100 bg-white shadow-sm">
                <CardHeader className="py-4 px-6 border-b border-slate-100 bg-slate-50/30">
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                            <Package className="h-4 w-4" />
                        </div>
                        <CardTitle className="text-sm font-bold text-slate-900">Información del Activo</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2 space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-600">Nombre del Activo *</Label>
                            <Input
                                placeholder="Ej: Camión de reparto 2024"
                                value={form.name}
                                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                                className="h-10 text-sm rounded-xl"
                                required
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-600">Código Interno</Label>
                            <Input
                                placeholder="Ej: AF-001"
                                value={form.code}
                                onChange={e => setForm(p => ({ ...p, code: e.target.value }))}
                                className="h-10 text-sm rounded-xl font-mono"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-600">Categoría *</Label>
                            <Select value={form.category} onValueChange={v => handleCategoryChange(v as AssetCategory)}>
                                <SelectTrigger className="h-10 rounded-xl text-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {CATEGORIES.map(([v, l]) => (
                                        <SelectItem key={v} value={v}>{l}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-600">Fecha de Adquisición *</Label>
                            <Input
                                type="date"
                                value={form.acquisition_date}
                                onChange={e => setForm(p => ({ ...p, acquisition_date: e.target.value }))}
                                className="h-10 text-sm rounded-xl"
                                required
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-600">N/S o Placa</Label>
                            <Input
                                placeholder="Ej: VIN123456"
                                value={form.serial_number}
                                onChange={e => setForm(p => ({ ...p, serial_number: e.target.value }))}
                                className="h-10 text-sm rounded-xl"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-600">Ubicación</Label>
                            <Input
                                placeholder="Ej: Bodega principal"
                                value={form.location}
                                onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
                                className="h-10 text-sm rounded-xl"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-600">Notas</Label>
                            <Input
                                placeholder="Observaciones adicionales"
                                value={form.notes}
                                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                                className="h-10 text-sm rounded-xl"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Depreciation Config */}
            <Card className="rounded-2xl border border-slate-100 bg-white shadow-sm">
                <CardHeader className="py-4 px-6 border-b border-slate-100 bg-slate-50/30">
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                            <Calculator className="h-4 w-4" />
                        </div>
                        <CardTitle className="text-sm font-bold text-slate-900">Parámetros de Depreciación</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-600">Costo Adquisición (COP) *</Label>
                            <Input
                                type="number"
                                min="0"
                                step="1000"
                                value={form.acquisition_cost || ''}
                                onChange={e => setForm(p => ({ ...p, acquisition_cost: Number(e.target.value) }))}
                                className="h-10 text-sm rounded-xl text-right font-mono"
                                required
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-600">Valor Residual (COP)</Label>
                            <Input
                                type="number"
                                min="0"
                                step="1000"
                                value={form.salvage_value || ''}
                                onChange={e => setForm(p => ({ ...p, salvage_value: Number(e.target.value) }))}
                                className="h-10 text-sm rounded-xl text-right font-mono"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-600">Vida Útil (años)</Label>
                            <Input
                                type="number"
                                min="0"
                                max="100"
                                value={form.useful_life_years}
                                onChange={e => setForm(p => ({ ...p, useful_life_years: Number(e.target.value) }))}
                                className="h-10 text-sm rounded-xl text-right font-mono"
                                disabled={form.category === 'LAND'}
                            />
                        </div>
                    </div>

                    {/* Preview */}
                    {form.category !== 'LAND' && form.acquisition_cost > 0 && (
                        <div className="grid grid-cols-3 gap-4 p-4 bg-indigo-50/50 rounded-xl border border-indigo-100/50">
                            <div className="text-center">
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Dep. Mensual</p>
                                <p className="text-base font-bold text-indigo-700 font-mono">{fmt(monthlyDep)}</p>
                            </div>
                            <div className="text-center border-x border-indigo-100">
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Dep. Anual</p>
                                <p className="text-base font-bold text-indigo-700 font-mono">{fmt(annualDep)}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Método</p>
                                <p className="text-base font-bold text-slate-700">Línea Recta</p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {error && (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-sm font-medium">{error}</div>
            )}

            <div className="flex gap-3 justify-end">
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push('/accounting/fixed-assets')}
                    className="h-10 px-6 rounded-xl text-xs"
                >
                    Cancelar
                </Button>
                <Button
                    type="submit"
                    disabled={loading}
                    className="h-10 px-6 rounded-xl gap-2 bg-indigo-600 hover:bg-indigo-700 text-xs"
                >
                    {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Registrar Activo
                </Button>
            </div>
        </form>
    );
}
