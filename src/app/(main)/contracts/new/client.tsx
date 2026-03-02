'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createContractAction } from '@/features/contracts/contractActions';
import {
    CONTRACT_TYPE_LABELS, ContractType,
} from '@/features/contracts/services/contractService';
import { Button } from '@/shared/components/ui/button';
import { Loader2, FileText } from 'lucide-react';

const INPUT_CLASS = 'w-full h-12 px-4 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all';
const LABEL_CLASS = 'text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block';
const TYPES = Object.entries(CONTRACT_TYPE_LABELS) as [ContractType, string][];

interface Party { id: string; legal_name: string; nit: string }
interface Props { parties: Party[] }

export default function NewContractClient({ parties }: Props) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const today = new Date().toISOString().split('T')[0];

    const [form, setForm] = useState({
        title: '',
        contract_number: '',
        contract_type: 'SERVICE' as ContractType,
        party_id: '',
        start_date: today,
        end_date: '',
        auto_renew: false,
        value: 0,
        currency: 'COP',
        signed_by: '',
        signed_at: '',
        description: '',
        notes: '',
    });

    const set = (key: string, val: unknown) => setForm(p => ({ ...p, [key]: val }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title.trim()) { setError('El título es obligatorio'); return; }
        if (!form.start_date) { setError('La fecha de inicio es obligatoria'); return; }

        setLoading(true);
        setError('');
        const result = await createContractAction({
            title: form.title,
            contract_number: form.contract_number || null,
            contract_type: form.contract_type,
            party_id: form.party_id || null,
            start_date: form.start_date,
            end_date: form.end_date || null,
            auto_renew: form.auto_renew,
            value: form.value,
            currency: form.currency,
            signed_by: form.signed_by || null,
            signed_at: form.signed_at || null,
            description: form.description || null,
            notes: form.notes || null,
        });
        setLoading(false);

        if (result.error) {
            setError(result.error);
        } else {
            router.push(result.id ? `/contracts/${result.id}` : '/contracts');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-10 max-w-3xl mx-auto">
            {/* General Info */}
            <div className="bg-white rounded-[3rem] p-10 shadow-premium space-y-8">
                <div className="flex items-center gap-4 mb-2">
                    <div className="h-12 w-12 rounded-2xl bg-violet-50 flex items-center justify-center text-violet-600">
                        <FileText className="h-6 w-6" />
                    </div>
                    <h2 className="text-lg font-black text-slate-900 italic uppercase tracking-tight">Información del Contrato</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                        <label className={LABEL_CLASS}>Título del Contrato *</label>
                        <input className={INPUT_CLASS} placeholder="Ej: Contrato de servicios de mantenimiento 2026" value={form.title} onChange={e => set('title', e.target.value)} required />
                    </div>
                    <div>
                        <label className={LABEL_CLASS}>Número / Referencia</label>
                        <input className={INPUT_CLASS} placeholder="Ej: CT-001-2026" value={form.contract_number} onChange={e => set('contract_number', e.target.value)} />
                    </div>
                    <div>
                        <label className={LABEL_CLASS}>Tipo de Contrato *</label>
                        <select className={INPUT_CLASS} value={form.contract_type} onChange={e => set('contract_type', e.target.value as ContractType)}>
                            {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                    </div>
                    <div className="md:col-span-2">
                        <label className={LABEL_CLASS}>Tercero (Contraparte)</label>
                        <select className={INPUT_CLASS} value={form.party_id} onChange={e => set('party_id', e.target.value)}>
                            <option value="">— Sin tercero —</option>
                            {parties.map(p => (
                                <option key={p.id} value={p.id}>{p.legal_name} · {p.nit}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Dates & Value */}
            <div className="bg-white rounded-[3rem] p-10 shadow-premium space-y-8">
                <h2 className="text-lg font-black text-slate-900 italic uppercase tracking-tight">Vigencia y Valor</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className={LABEL_CLASS}>Fecha de Inicio *</label>
                        <input type="date" className={INPUT_CLASS} value={form.start_date} onChange={e => set('start_date', e.target.value)} required />
                    </div>
                    <div>
                        <label className={LABEL_CLASS}>Fecha de Vencimiento</label>
                        <input type="date" className={INPUT_CLASS} value={form.end_date} onChange={e => set('end_date', e.target.value)} />
                    </div>
                    <div className="flex items-end pb-1">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={form.auto_renew}
                                onChange={e => set('auto_renew', e.target.checked)}
                                className="h-5 w-5 rounded-lg border-slate-300 accent-violet-600"
                            />
                            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Auto-renovable</span>
                        </label>
                    </div>
                    <div>
                        <label className={LABEL_CLASS}>Valor (COP) *</label>
                        <input type="number" min="0" step="1000" className={`${INPUT_CLASS} text-right`} value={form.value || ''} onChange={e => set('value', Number(e.target.value))} />
                    </div>
                    <div>
                        <label className={LABEL_CLASS}>Moneda</label>
                        <select className={INPUT_CLASS} value={form.currency} onChange={e => set('currency', e.target.value)}>
                            <option value="COP">COP</option>
                            <option value="USD">USD</option>
                            <option value="EUR">EUR</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Signatories & Notes */}
            <div className="bg-white rounded-[3rem] p-10 shadow-premium space-y-8">
                <h2 className="text-lg font-black text-slate-900 italic uppercase tracking-tight">Firma y Notas</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className={LABEL_CLASS}>Firmado por</label>
                        <input className={INPUT_CLASS} placeholder="Nombre del representante firmante" value={form.signed_by} onChange={e => set('signed_by', e.target.value)} />
                    </div>
                    <div>
                        <label className={LABEL_CLASS}>Fecha de Firma</label>
                        <input type="date" className={INPUT_CLASS} value={form.signed_at} onChange={e => set('signed_at', e.target.value)} />
                    </div>
                    <div className="md:col-span-2">
                        <label className={LABEL_CLASS}>Descripción</label>
                        <textarea
                            className={`${INPUT_CLASS} h-24 py-3 resize-none`}
                            placeholder="Objeto del contrato..."
                            value={form.description}
                            onChange={e => set('description', e.target.value)}
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className={LABEL_CLASS}>Notas Internas</label>
                        <textarea
                            className={`${INPUT_CLASS} h-20 py-3 resize-none`}
                            placeholder="Observaciones de gestión..."
                            value={form.notes}
                            onChange={e => set('notes', e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {error && (
                <div className="p-5 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-sm font-semibold">{error}</div>
            )}

            <div className="flex gap-4 justify-end">
                <Button type="button" variant="outline" onClick={() => router.push('/contracts')} className="h-14 px-10 rounded-2xl border-slate-200 font-black text-[10px] uppercase tracking-widest">
                    Cancelar
                </Button>
                <Button type="submit" disabled={loading} className="h-14 px-12 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white font-black text-[10px] uppercase tracking-widest shadow-active">
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Crear Contrato'}
                </Button>
            </div>
        </form>
    );
}
