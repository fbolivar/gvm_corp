'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Party } from '@/features/parties/types';
import { createRecurringInvoiceAction } from '@/features/sales/recurringInvoiceActions';
import { RecurringInvoiceLine } from '@/features/sales/services/recurringInvoiceService';
import { Button } from '@/shared/components/ui/button';
import { Plus, Trash2, Loader2, RefreshCw } from 'lucide-react';

interface Props {
    parties: Party[];
}

const FREQ_OPTIONS = [
    { value: 'WEEKLY',    label: 'Semanal' },
    { value: 'BIWEEKLY',  label: 'Quincenal' },
    { value: 'MONTHLY',   label: 'Mensual' },
    { value: 'QUARTERLY', label: 'Trimestral' },
    { value: 'ANNUALLY',  label: 'Anual' },
];

const INPUT_CLASS = 'w-full h-12 px-4 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all';
const SELECT_CLASS = INPUT_CLASS;
const LABEL_CLASS = 'text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block';

export default function NewRecurringInvoiceClient({ parties }: Props) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [form, setForm] = useState({
        name: '',
        party_id: '',
        frequency: 'MONTHLY' as const,
        next_run_date: tomorrow.toISOString().split('T')[0],
        currency: 'COP',
        notes_public: '',
        status: 'ACTIVE' as const,
    });

    const [lines, setLines] = useState<RecurringInvoiceLine[]>([
        { description: '', qty: 1, unit_price: 0 },
    ]);

    const addLine = () => setLines(prev => [...prev, { description: '', qty: 1, unit_price: 0 }]);

    const removeLine = (i: number) => setLines(prev => prev.filter((_, idx) => idx !== i));

    const updateLine = (i: number, field: keyof RecurringInvoiceLine, value: string | number) =>
        setLines(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l));

    const subtotal = lines.reduce((s, l) => s + l.qty * l.unit_price, 0);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim()) { setError('El nombre es obligatorio'); return; }
        if (lines.some(l => !l.description.trim())) { setError('Todas las líneas deben tener descripción'); return; }
        if (lines.some(l => l.qty <= 0 || l.unit_price < 0)) { setError('Cantidades y precios deben ser válidos'); return; }

        setLoading(true);
        setError('');
        const result = await createRecurringInvoiceAction({
            ...form,
            party_id: form.party_id || null,
            lines,
        });
        setLoading(false);

        if (result.error) {
            setError(result.error);
        } else {
            router.push('/sales/recurring');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-10 max-w-3xl mx-auto">

            {/* Header info */}
            <div className="bg-white rounded-[3rem] p-10 shadow-premium space-y-8">
                <div className="flex items-center gap-4 mb-2">
                    <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                        <RefreshCw className="h-6 w-6" />
                    </div>
                    <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Información General</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                        <label className={LABEL_CLASS}>Nombre de la Recurrencia *</label>
                        <input className={INPUT_CLASS} placeholder="Ej: Servicio de mantenimiento mensual" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
                    </div>
                    <div>
                        <label className={LABEL_CLASS}>Cliente</label>
                        <select className={SELECT_CLASS} value={form.party_id} onChange={e => setForm(p => ({ ...p, party_id: e.target.value }))}>
                            <option value="">Sin cliente específico</option>
                            {parties.map(p => (
                                <option key={p.id} value={p.id}>{p.legal_name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className={LABEL_CLASS}>Frecuencia *</label>
                        <select className={SELECT_CLASS} value={form.frequency} onChange={e => setForm(p => ({ ...p, frequency: e.target.value as typeof form.frequency }))}>
                            {FREQ_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className={LABEL_CLASS}>Primera Ejecución *</label>
                        <input type="date" className={INPUT_CLASS} value={form.next_run_date} onChange={e => setForm(p => ({ ...p, next_run_date: e.target.value }))} required />
                    </div>
                    <div>
                        <label className={LABEL_CLASS}>Moneda</label>
                        <select className={SELECT_CLASS} value={form.currency} onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}>
                            <option value="COP">COP — Peso Colombiano</option>
                            <option value="USD">USD — Dólar Americano</option>
                        </select>
                    </div>
                    <div className="md:col-span-2">
                        <label className={LABEL_CLASS}>Notas para el Cliente</label>
                        <textarea className={`${INPUT_CLASS} h-20 resize-none py-3`} placeholder="Ej: Servicio prestado durante el mes correspondiente" value={form.notes_public} onChange={e => setForm(p => ({ ...p, notes_public: e.target.value }))} />
                    </div>
                </div>
            </div>

            {/* Lines */}
            <div className="bg-white rounded-[3rem] p-10 shadow-premium space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Líneas de Servicio / Producto</h2>
                    <Button type="button" onClick={addLine} variant="outline" className="h-10 px-5 rounded-xl border-slate-200 text-indigo-600 font-black text-[10px] uppercase tracking-widest">
                        <Plus className="h-4 w-4 mr-1.5" /> Agregar
                    </Button>
                </div>

                <div className="space-y-4">
                    {/* Header */}
                    <div className="hidden md:grid grid-cols-12 gap-4 px-2">
                        <span className="col-span-6 text-[9px] font-black text-slate-400 uppercase tracking-widest">Descripción</span>
                        <span className="col-span-2 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Cantidad</span>
                        <span className="col-span-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Precio Unit.</span>
                        <span className="col-span-1" />
                    </div>

                    {lines.map((line, i) => (
                        <div key={i} className="grid grid-cols-12 gap-4 items-center bg-slate-50/50 rounded-2xl p-4 border border-slate-100">
                            <div className="col-span-12 md:col-span-6">
                                <input className={INPUT_CLASS} placeholder="Descripción del servicio o producto" value={line.description} onChange={e => updateLine(i, 'description', e.target.value)} />
                            </div>
                            <div className="col-span-5 md:col-span-2">
                                <input type="number" min="0.001" step="0.01" className={`${INPUT_CLASS} text-right`} value={line.qty} onChange={e => updateLine(i, 'qty', Number(e.target.value))} />
                            </div>
                            <div className="col-span-6 md:col-span-3">
                                <input type="number" min="0" step="100" className={`${INPUT_CLASS} text-right`} placeholder="0" value={line.unit_price || ''} onChange={e => updateLine(i, 'unit_price', Number(e.target.value))} />
                            </div>
                            <div className="col-span-1 flex justify-center">
                                <Button type="button" variant="ghost" onClick={() => removeLine(i)} disabled={lines.length === 1} className="h-10 w-10 rounded-xl text-slate-300 hover:text-rose-500 hover:bg-rose-50">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Subtotal */}
                <div className="flex justify-end pt-4 border-t border-slate-100">
                    <div className="text-right space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Subtotal estimado</p>
                        <p className="text-3xl font-black text-slate-900 italic tracking-tighter">
                            ${subtotal.toLocaleString('es-CO')}
                            <span className="text-sm text-slate-400 ml-1 normal-case not-italic">{form.currency}</span>
                        </p>
                    </div>
                </div>
            </div>

            {/* Error + Submit */}
            {error && (
                <div className="p-5 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-sm font-semibold">
                    {error}
                </div>
            )}

            <div className="flex gap-4 justify-end">
                <Button type="button" variant="outline" onClick={() => router.push('/sales/recurring')} className="h-14 px-10 rounded-2xl border-slate-200 font-black text-[10px] uppercase tracking-widest">
                    Cancelar
                </Button>
                <Button type="submit" disabled={loading} className="h-14 px-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest shadow-active">
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Crear Recurrencia'}
                </Button>
            </div>
        </form>
    );
}
