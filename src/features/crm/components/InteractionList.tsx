import { Phone, MessageCircle, Mail, StickyNote, History } from 'lucide-react';
import type { Interaction, InteractionChannel } from '../actions/interactionActions';

/** Últimos contactos con el cliente (llamadas, WhatsApp, correos, notas). */

const CHANNEL: Record<InteractionChannel, { label: string; icon: typeof Phone; cls: string }> = {
    CALL: { label: 'Llamada', icon: Phone, cls: 'text-emerald-600 bg-emerald-50' },
    WHATSAPP: { label: 'WhatsApp', icon: MessageCircle, cls: 'text-emerald-700 bg-emerald-50' },
    EMAIL: { label: 'Correo', icon: Mail, cls: 'text-indigo-600 bg-indigo-50' },
    NOTE: { label: 'Nota', icon: StickyNote, cls: 'text-amber-600 bg-amber-50' },
};

function when(iso: string) {
    return new Date(iso).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota' });
}

export function InteractionList({ items }: { items: Interaction[] }) {
    return (
        <section className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-3">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <History className="h-3.5 w-3.5" /> Últimos contactos ({items.length})
            </h3>
            {items.length === 0 ? (
                <p className="text-xs text-slate-400">Sin contactos registrados. Usa los botones de llamar, WhatsApp o correo y quedarán aquí.</p>
            ) : (
                <ul className="space-y-2">
                    {items.map(i => {
                        const c = CHANNEL[i.channel];
                        return (
                            <li key={i.id} className="flex gap-3 rounded-xl border border-slate-100 px-3 py-2">
                                <span className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${c.cls}`}><c.icon className="h-3.5 w-3.5" /></span>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[11px] text-slate-500"><b className="text-slate-800">{c.label}</b> · {when(i.created_at)} · {i.user_name}</p>
                                    {i.note ? <p className="text-xs text-slate-800 whitespace-pre-line">{i.note}</p> : <p className="text-[11px] text-slate-400 italic">Sin nota</p>}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );
}
