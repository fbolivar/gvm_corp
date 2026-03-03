'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBudgetAction } from '@/features/accounting/budgetActions';
import { Button } from '@/shared/components/ui/button';
import { ArrowLeft, Loader2, BarChart3 } from 'lucide-react';
import Link from 'next/link';

const INPUT_CLASS = 'w-full h-12 px-4 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all';
const LABEL_CLASS = 'text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block';

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
        <div className="space-y-12 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-1000 max-w-2xl mx-auto">
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                        <BarChart3 className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black tracking-tighter text-slate-900 italic">Nuevo Presupuesto</h1>
                        <p className="text-slate-400 font-bold text-sm uppercase tracking-widest mt-1">Planificación financiera anual</p>
                    </div>
                </div>
                <Button variant="outline" className="h-12 border-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-widest" asChild>
                    <Link href="/accounting/budget"><ArrowLeft className="h-4 w-4 mr-2" />Volver</Link>
                </Button>
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-[2.5rem] p-10 shadow-premium space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                        <label className={LABEL_CLASS}>Nombre del Presupuesto *</label>
                        <input className={INPUT_CLASS} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
                    </div>
                    <div>
                        <label className={LABEL_CLASS}>Año Fiscal *</label>
                        <input type="number" min="2020" max="2035" className={INPUT_CLASS} value={form.year} onChange={e => setForm(p => ({ ...p, year: Number(e.target.value) }))} required />
                    </div>
                    <div>
                        <label className={LABEL_CLASS}>Notas</label>
                        <input className={INPUT_CLASS} placeholder="Opcional" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
                    </div>
                </div>

                <div className="p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                    <p className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">
                        Se crearán 9 líneas presupuestales predefinidas en 6 categorías. Podrá editar todos los valores mensuales en la siguiente pantalla.
                    </p>
                </div>

                {error && <div className="p-5 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-sm font-semibold">{error}</div>}

                <div className="flex gap-4 justify-end">
                    <Button type="button" variant="outline" onClick={() => router.push('/accounting/budget')} className="h-14 px-10 rounded-2xl border-slate-200 font-black text-[10px] uppercase tracking-widest">Cancelar</Button>
                    <Button type="submit" disabled={loading} className="h-14 px-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest shadow-active">
                        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Crear Presupuesto'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
