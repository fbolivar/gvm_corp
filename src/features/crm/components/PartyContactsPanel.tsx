'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Users, Plus, Star, Phone, Smartphone, Mail, Pencil, Trash2, Loader2, X } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { createContactAction, updateContactAction, deleteContactAction } from '../actions/directoryActions';
import { CONTACT_ROLE_SUGGESTIONS, type PartyContact } from '../types/directory';

interface Props { partyId: string; initial: PartyContact[] }

const input = 'h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-sm outline-none focus:border-indigo-300';

type FormState = {
    name: string; role: string; phone: string; mobile: string; email: string; is_primary: boolean; notes: string;
};
const empty: FormState = { name: '', role: '', phone: '', mobile: '', email: '', is_primary: false, notes: '' };

export function PartyContactsPanel({ partyId, initial }: Props) {
    const router = useRouter();
    const [pending, start] = useTransition();
    const [editingId, setEditingId] = useState<string | null>(null); // id en edición, 'new' para alta, null cerrado
    const [form, setForm] = useState<FormState>(empty);

    const openNew = () => { setForm(empty); setEditingId('new'); };
    const openEdit = (c: PartyContact) => {
        setForm({ name: c.name, role: c.role ?? '', phone: c.phone ?? '', mobile: c.mobile ?? '', email: c.email ?? '', is_primary: c.is_primary, notes: c.notes ?? '' });
        setEditingId(c.id);
    };
    const close = () => { setEditingId(null); setForm(empty); };

    const save = () => {
        if (form.name.trim().length < 2) { toast.error('Escribe el nombre del contacto'); return; }
        start(async () => {
            const payload = { party_id: partyId, ...form };
            const res = editingId === 'new'
                ? await createContactAction(payload)
                : await updateContactAction(editingId!, payload);
            if (res.error) { toast.error(res.error); return; }
            toast.success(editingId === 'new' ? 'Contacto agregado' : 'Contacto actualizado');
            close();
            router.refresh();
        });
    };

    const remove = (c: PartyContact) => {
        if (!confirm(`¿Eliminar a ${c.name} del directorio?`)) return;
        start(async () => {
            const res = await deleteContactAction(c.id, partyId);
            if (res.error) { toast.error(res.error); return; }
            toast.success('Contacto eliminado');
            router.refresh();
        });
    };

    return (
        <section className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 md:p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                    <Users className="h-4 w-4 text-indigo-600" /> Contactos ({initial.length})
                </h3>
                {editingId === null && (
                    <button type="button" onClick={openNew}
                        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold">
                        <Plus className="h-4 w-4" /> Agregar
                    </button>
                )}
            </div>

            {initial.length === 0 && editingId === null && (
                <p className="text-sm text-slate-400">Aún no hay contactos registrados. Agrega quién es responsable de compras, pagos, etc.</p>
            )}

            <div className="space-y-2">
                {initial.map(c => (
                    editingId === c.id ? (
                        <ContactForm key={c.id} form={form} setForm={setForm} onSave={save} onCancel={close} pending={pending} />
                    ) : (
                        <div key={c.id} className="rounded-2xl border border-slate-100 p-3 flex items-start justify-between gap-3 hover:border-indigo-100 transition">
                            <div className="min-w-0 space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-bold text-slate-900">{c.name}</span>
                                    {c.is_primary && <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600"><Star className="h-3 w-3 fill-amber-400 text-amber-400" /> Principal</span>}
                                    {c.role && <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 rounded-full px-2 py-0.5">{c.role}</span>}
                                </div>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                                    {c.phone && <a href={`tel:${c.phone}`} className="inline-flex items-center gap-1 hover:text-indigo-600"><Phone className="h-3 w-3" />{c.phone}</a>}
                                    {c.mobile && <a href={`tel:${c.mobile}`} className="inline-flex items-center gap-1 hover:text-indigo-600"><Smartphone className="h-3 w-3" />{c.mobile}</a>}
                                    {c.email && <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1 hover:text-indigo-600"><Mail className="h-3 w-3" />{c.email}</a>}
                                </div>
                                {c.notes && <p className="text-[11px] text-slate-400 whitespace-pre-line">{c.notes}</p>}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                                <button type="button" onClick={() => openEdit(c)} className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50 hover:text-indigo-600"><Pencil className="h-3.5 w-3.5" /></button>
                                <button type="button" onClick={() => remove(c)} className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button>
                            </div>
                        </div>
                    )
                ))}

                {editingId === 'new' && <ContactForm form={form} setForm={setForm} onSave={save} onCancel={close} pending={pending} />}
            </div>
        </section>
    );
}

function ContactForm({ form, setForm, onSave, onCancel, pending }: {
    form: FormState; setForm: (f: FormState) => void; onSave: () => void; onCancel: () => void; pending: boolean;
}) {
    const set = (k: keyof FormState, v: string | boolean) => setForm({ ...form, [k]: v });
    return (
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/30 p-3 space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <input className={input} placeholder="Nombre *" value={form.name} onChange={e => set('name', e.target.value)} autoFocus />
                <input className={input} placeholder="Cargo (Responsable de compras, Pagos…)" list="crm-roles" value={form.role} onChange={e => set('role', e.target.value)} />
                <datalist id="crm-roles">{CONTACT_ROLE_SUGGESTIONS.map(r => <option key={r} value={r} />)}</datalist>
                <input className={input} placeholder="Teléfono fijo" value={form.phone} onChange={e => set('phone', e.target.value)} />
                <input className={input} placeholder="Celular" value={form.mobile} onChange={e => set('mobile', e.target.value)} />
                <input className={cn(input, 'sm:col-span-2')} placeholder="Email" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
            <textarea className={cn(input, 'h-16 py-2 resize-none')} placeholder="Notas (opcional)" value={form.notes} onChange={e => set('notes', e.target.value)} />
            <div className="flex items-center justify-between gap-2">
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 select-none cursor-pointer">
                    <input type="checkbox" checked={form.is_primary} onChange={e => set('is_primary', e.target.checked)} className="h-4 w-4 rounded accent-indigo-600" />
                    Contacto principal
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
