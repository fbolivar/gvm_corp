'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBudgetAction } from '@/features/accounting/budgetActions';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import Link from 'next/link';

export default function NewBudgetPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const currentYear = new Date().getFullYear();
    const [form, setForm] = useState({ name: `Presupuesto ${currentYear}`, year: currentYear, notes: '' });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim()) { setError('El nombre es obligatorio'); return; }
        setLoading(true);
        setError('');
        const result = await createBudgetAction(form.name, form.year, form.notes || undefined);
        setLoading(false);
        if (result.error) { setError(result.error); }
        else { router.push(`/accounting/budget/${result.id}`); }
    };

    return (
        <div className="page-container max-w-2xl mx-auto space-y-6 pb-20 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild className="h-10 w-10 rounded-xl">
                    <Link href="/accounting/budget"><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                <div>
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight">Nuevo Presupuesto</h1>
                    <p className="text-xs text-slate-400">Planificación financiera anual</p>
                </div>
            </div>

            {/* Form */}
            <Card className="rounded-2xl border border-slate-100 bg-white shadow-sm">
                <CardHeader className="py-4 px-6 border-b border-slate-100 bg-slate-50/30">
                    <CardTitle className="text-sm font-bold text-slate-900">Datos del Presupuesto</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2 space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-600">Nombre del Presupuesto *</Label>
                                <Input
                                    value={form.name}
                                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                                    className="h-10 text-sm rounded-xl"
                                    required
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-600">Año Fiscal *</Label>
                                <Input
                                    type="number"
                                    min="2020"
                                    max="2035"
                                    value={form.year}
                                    onChange={e => setForm(p => ({ ...p, year: Number(e.target.value) }))}
                                    className="h-10 text-sm rounded-xl font-mono"
                                    required
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-600">Notas</Label>
                                <Input
                                    placeholder="Opcional"
                                    value={form.notes}
                                    onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                                    className="h-10 text-sm rounded-xl"
                                />
                            </div>
                        </div>

                        <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100">
                            <p className="text-xs text-indigo-700">
                                Se crearán 9 líneas presupuestales predefinidas en 6 categorías. Podrá editar todos los valores mensuales en la siguiente pantalla.
                            </p>
                        </div>

                        {error && (
                            <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-xs font-medium">{error}</div>
                        )}

                        <div className="flex justify-end gap-3 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.push('/accounting/budget')}
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
                                Crear Presupuesto
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
