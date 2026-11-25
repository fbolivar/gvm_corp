'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { MapPin, Plus, Star, Phone, Pencil, Trash2, Loader2, X } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { createAddressAction, updateAddressAction, deleteAddressAction } from '../actions/directoryActions';
import { ADDRESS_KINDS, type AddressKind, type PartyAddress } from '../types/directory';

interface Props { partyId: string; initial: PartyAddress[] }

const input = 'h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-sm outline-none focus:border-indigo-300';

type FormState = { label: string; kind: string; address: string; city: string; phone: string; notes: string; is_primary: boolean };
const empty: FormState = { label: '', kind: '', address: '', city: '', phone: '', notes: '', is_primary: false };

export function PartyAddressesPanel({ partyId, initial }: Props) {
    const router = useRouter();
    const [pending, start] = useTransition();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<FormState>(empty);

    const openNew = () => { setForm(empty); setEditingId('new'); };
    const openEdit = (a: PartyAddress) => {
        setForm({ label: a.label ?? '', kind: a.kind ?? '', address: a.address, city: a.city ?? '', phone: a.phone ?? '', notes: a.notes ?? '', is_primary: a.is_primary });
        setEditingId(a.id);
    };
    const close = () => { setEditingId(null); setForm(empty); };

    const save = () => {
        if (form.address.trim().length < 3) { toast.error('Escribe la dirección'); return; }
        start(async () => {
            const payload = { party_id: partyId, ...form, kind: (form.kind || null) as AddressKind | null };
            const res = editingId === 'new' ? await createAddressAction(payload) : await updateAddressAction(editingId!, payload);
            if (res.error) { toast.error(res.error); return; }
            toast.success(editingId === 'new' ? 'Dirección agregada' : 'Dirección actualizada');
            close();
            router.refresh();
        });
    };

    const remove = (a: PartyAddress) => {
        if (!confirm('¿Eliminar esta dirección?')) return;
        start(async () => {
            const res = await deleteAddressAction(a.id, partyId);
            if (res.error) { toast.error(res.error); return; }
            toast.success('Dirección eliminada');
            router.refresh();
        });
    };

    return (
        <section className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 md:p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-indigo-600" /> Direcciones ({initial.length})
                </h3>
                {editingId === null && (
                    <button type="button" onClick={openNew} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold">
                        <Plus className="h-4 w-4" /> Agregar
                    </button>
                )}
            </div>

            {initial.length === 0 && editingId === null && (
                <p className="text-sm text-slate-400">Sin direcciones registradas. Agrega la sede, bodegas o puntos de entrega.</p>
            )}

            <div className="space-y-2">
                {initial.map(a => (
                    editingId === a.id ? (
                        <AddressForm key={a.id} form={form} setForm={setForm} onSave={save} onCancel={close} pending={pending} />
                    ) : (
                        <div key={a.id} className="rounded-2xl border border-slate-100 p-3 flex items-start justify-between gap-3 hover:border-indigo-100 transition">
                            <div className="min-w-0 space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-bold text-slate-900">{a.label || (a.kind ? ADDRESS_KINDS[a.kind] : 'Dirección')}</span>
                                    {a.is_primary && <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600"><Star className="h-3 w-3 fill-amber-400 text-amber-400" /> Principal</span>}
                                    {a.kind && <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 rounded-full px-2 py-0.5">{ADDRESS_KINDS[a.kind]}</span>}
                                </div>
                                <p className="text-xs text-slate-700">{a.address}{a.city ? `, ${a.city}` : ''}</p>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                                    {a.phone && <a href={`tel:${a.phone}`} className="inline-flex items-center gap-1 hover:text-indigo-600"><Phone className="h-3 w-3" />{a.phone}</a>}
                                </div>
                                {a.notes && <p className="text-[11px] text-slate-400 whitespace-pre-line">{a.notes}</p>}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                                <button type="button" onClick={() => openEdit(a)} className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50 hover:text-indigo-600"><Pencil className="h-3.5 w-3.5" /></button>
                                <button type="button" onClick={() => remove(a)} className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button>
                            </div>
                        </div>
                    )
                ))}

                {editingId === 'new' && <AddressForm form={form} setForm={setForm} onSave={save} onCancel={close} pending={pending} />}
            </div>
        </section>
    );
}

function AddressForm({ form, setForm, onSave, onCancel, pending }: {
    form: FormState; setForm: (f: FormState) => void; onSave: () => void; onCancel: () => void; pending: boolean;
}) {
    const set = (k: keyof FormState, v: string | boolean) => setForm({ ...form, [k]: v });
    return (
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/30 p-3 space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <input className={input} placeholder="Etiqueta (Sede principal, Bodega norte…)" value={form.label} onChange={e => set('label', e.target.value)} autoFocus />
                <select className={input} value={form.kind} onChange={e => set('kind', e.target.value)}>
                    <option value="">Tipo…</option>
                    {(Object.keys(ADDRESS_KINDS) as AddressKind[]).map(k => <option key={k} value={k}>{ADDRESS_KINDS[k]}</option>)}
                </select>
                <input className={cn(input, 'sm:col-span-2')} placeholder="Dirección *" value={form.address} onChange={e => set('address', e.target.value)} />
                <input className={input} placeholder="Ciudad" value={form.city} onChange={e => set('city', e.target.value)} />
                <input className={input} placeholder="Teléfono del sitio" value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>
            <textarea className={cn(input, 'h-16 py-2 resize-none')} placeholder="Notas (horario, contacto en sitio…)" value={form.notes} onChange={e => set('notes', e.target.value)} />
            <div className="flex items-center justify-between gap-2">
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 select-none cursor-pointer">
                    <input type="checkbox" checked={form.is_primary} onChange={e => set('is_primary', e.target.checked)} className="h-4 w-4 rounded accent-indigo-600" />
                    Dirección principal
                </label>
                <div className="flex items-center gap-2">
                    <button type="button" onClick={onCancel} disabled={pending} className="inline-flex items-center gap-1 h-9 px-3 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50"><X className="h-3.5 w-3.5" /> Cancelar</button>
                    <button type="button" onClick={onSave} disabled={pending} className="inline-flex items-center gap-1 h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold disabled:opacity-50">
                        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Guardar
                    </button>
                </div>
            </div>
        </div>
    );
}
