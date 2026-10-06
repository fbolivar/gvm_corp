'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Phone, MessageCircle, Mail, StickyNote, Loader2, X, ExternalLink } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { logInteractionAction, noteInteractionAction, type InteractionChannel } from '../actions/interactionActions';
import { parseColombianPhone, isValidEmail, WHATSAPP_TEMPLATES, suggestedTemplate, whatsappLink, type TemplateContext } from '../utils/contact';
import type { AlertKind } from '../utils/accountSummary';

/**
 * Botones Llamar / WhatsApp / Correo / Nota para un cliente.
 *
 * Al tocar un botón se abre la app del celular (tel:, wa.me, mailto:) y se
 * registra la interacción a nombre del usuario. Después aparece una línea
 * "¿Qué pasó?" para dejar la nota. WhatsApp ofrece plantillas con los datos
 * del cliente (se pueden editar antes de enviar). Sin API de Meta: wa.me.
 */

interface Props {
    party: { id: string; legal_name: string; phone?: string | null; email?: string | null };
    context: Omit<TemplateContext, 'client_name'>;
    /** Sugerir plantilla según la alerta / contexto. */
    suggest?: AlertKind | 'VISITA' | null;
    visitId?: string | null;
    /** 'icons' para filas de tabla, 'full' con texto. */
    size?: 'icons' | 'full';
    className?: string;
}

const btnBase = 'inline-flex items-center justify-center gap-1.5 rounded-lg border text-[11px] font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed';

export function ContactActions({ party, context, suggest = null, visitId = null, size = 'icons', className }: Props) {
    const router = useRouter();
    const phone = useMemo(() => parseColombianPhone(party.phone), [party.phone]);
    const email = isValidEmail(party.email) ? party.email!.trim() : null;
    const ctx: TemplateContext = { client_name: party.legal_name, ...context };

    const [panel, setPanel] = useState<'none' | 'whatsapp' | 'note'>('none');
    const [templateKey, setTemplateKey] = useState(() => suggestedTemplate(suggest).key);
    const [text, setText] = useState(() => suggestedTemplate(suggest).body(ctx));
    const [pending, setPending] = useState<string | null>(null);   // id del contacto recién creado para la nota
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);
    const wrapRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);

    // El panel se pinta en un portal con posición fija: dentro de una tabla con
    // scroll horizontal (overflow-x-auto) un absolute quedaba recortado.
    useLayoutEffect(() => {
        if (panel === 'none') { setPos(null); return; }
        const HEADER = 88; // barra superior fija de la app
        const place = () => {
            const r = wrapRef.current?.getBoundingClientRect();
            if (!r) return;
            const width = Math.min(window.innerWidth - 24, panel === 'whatsapp' ? 380 : 340);
            // Alineado al borde derecho de los botones; nunca fuera de la pantalla.
            const left = Math.max(12, Math.min(r.right - width, window.innerWidth - width - 12));
            const height = panelRef.current?.getBoundingClientRect().height ?? (panel === 'whatsapp' ? 300 : 200);
            const below = r.bottom + 8;
            let top = below;
            if (below + height > window.innerHeight - 12) top = r.top - 8 - height;   // arriba si abajo no cabe
            top = Math.max(HEADER, Math.min(top, window.innerHeight - height - 12));  // y siempre dentro de la vista
            setPos({ top, left, width });
        };
        place();
        // Segunda pasada con la altura real ya pintada.
        const raf = requestAnimationFrame(place);
        window.addEventListener('resize', place);
        window.addEventListener('scroll', place, true);
        return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); };
    }, [panel]);

    useEffect(() => {
        if (panel === 'none') return;
        const onDoc = (e: MouseEvent) => {
            const t = e.target as Node;
            if (wrapRef.current?.contains(t) || panelRef.current?.contains(t)) return;
            setPanel('none');
        };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, [panel]);

    const pickTemplate = (key: string) => {
        setTemplateKey(key);
        const t = WHATSAPP_TEMPLATES.find(x => x.key === key);
        if (t) setText(t.body(ctx));
    };

    async function log(channel: InteractionChannel, extra: { template?: string; note?: string } = {}) {
        setBusy(true);
        const res = await logInteractionAction({ party_id: party.id, channel, template: extra.template ?? null, note: extra.note ?? null, visit_id: visitId });
        setBusy(false);
        if ('error' in res) { toast.error(res.error); return null; }
        return res.id;
    }

    async function onCall() {
        if (!phone) return;
        window.location.href = `tel:${phone.tel}`;
        const id = await log('CALL');
        if (id) { setPending(id); setNote(''); setPanel('note'); }
    }

    async function onEmail() {
        if (!email) return;
        window.location.href = `mailto:${email}?subject=${encodeURIComponent('GVM — ' + party.legal_name)}`;
        const id = await log('EMAIL');
        if (id) { setPending(id); setNote(''); setPanel('note'); }
    }

    async function onSendWhatsApp() {
        if (!phone?.whatsapp) return;
        window.open(whatsappLink(phone.whatsapp, text), '_blank', 'noopener');
        const id = await log('WHATSAPP', { template: templateKey });
        if (id) { setPending(id); setNote(''); setPanel('note'); }
    }

    async function onSaveNote() {
        if (busy) return;
        setBusy(true);
        const res = pending
            ? await noteInteractionAction(pending, note)
            : (note.trim().length >= 2 ? await logInteractionAction({ party_id: party.id, channel: 'NOTE', note, visit_id: visitId }) : { error: 'Escribe la nota' });
        setBusy(false);
        if ('error' in res) { toast.error(res.error); return; }
        toast.success('Contacto registrado');
        setPanel('none'); setPending(null); setNote('');
        router.refresh();
    }

    const full = size === 'full';
    const b = (extra: string) => cn(btnBase, full ? 'h-10 px-3' : 'h-8 w-8', extra);

    return (
        <div ref={wrapRef} className={cn('relative inline-flex flex-nowrap items-center gap-1.5 whitespace-nowrap', className)}>
            <button type="button" onClick={onCall} disabled={!phone || busy} title={phone ? `Llamar ${phone.display}` : 'Sin teléfono válido'}
                className={b('border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:text-emerald-700')}>
                <Phone className="h-3.5 w-3.5" />{full && 'Llamar'}
            </button>
            <button type="button" onClick={() => setPanel(p => p === 'whatsapp' ? 'none' : 'whatsapp')} disabled={!phone?.whatsapp || busy}
                title={phone?.whatsapp ? `WhatsApp ${phone.display}` : 'Sin celular para WhatsApp'}
                className={b(panel === 'whatsapp' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:text-emerald-700')}>
                <MessageCircle className="h-3.5 w-3.5" />{full && 'WhatsApp'}
            </button>
            <button type="button" onClick={onEmail} disabled={!email || busy} title={email ?? 'Sin correo'}
                className={b('border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-700')}>
                <Mail className="h-3.5 w-3.5" />{full && 'Correo'}
            </button>
            <button type="button" onClick={() => { setPending(null); setNote(''); setPanel(p => p === 'note' ? 'none' : 'note'); }} disabled={busy} title="Registrar una nota"
                className={b(panel === 'note' ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-slate-200 bg-white text-slate-600 hover:border-amber-300 hover:text-amber-700')}>
                <StickyNote className="h-3.5 w-3.5" />{full && 'Nota'}
            </button>

            {panel === 'whatsapp' && pos && createPortal(
                <div ref={panelRef} style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width }}
                    className="z-[9000] rounded-2xl border border-slate-200 bg-white shadow-2xl p-3 space-y-2 text-left">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">WhatsApp a {context.contact_name ? `${context.contact_name} · ` : ''}{phone?.display}</p>
                        <button type="button" onClick={() => setPanel('none')} aria-label="Cerrar" className="text-slate-400 hover:text-slate-700"><X className="h-3.5 w-3.5" /></button>
                    </div>
                    <select value={templateKey} onChange={e => pickTemplate(e.target.value)}
                        className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-2 text-xs outline-none focus:border-emerald-300">
                        {WHATSAPP_TEMPLATES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                    </select>
                    <textarea value={text} onChange={e => setText(e.target.value)} rows={5}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs outline-none focus:border-emerald-300" />
                    <button type="button" onClick={onSendWhatsApp} disabled={busy || !text.trim()}
                        className="w-full h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50">
                        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />} Abrir WhatsApp y registrar
                    </button>
                </div>,
                document.body,
            )}

            {panel === 'note' && pos && createPortal(
                <div ref={panelRef} style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width }}
                    className="z-[9000] rounded-2xl border border-slate-200 bg-white shadow-2xl p-3 space-y-2 text-left">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{pending ? '¿Qué pasó?' : 'Nota sobre el cliente'}</p>
                        <button type="button" onClick={() => setPanel('none')} aria-label="Cerrar" className="text-slate-400 hover:text-slate-700"><X className="h-3.5 w-3.5" /></button>
                    </div>
                    <textarea autoFocus value={note} onChange={e => setNote(e.target.value)} rows={3} maxLength={600}
                        placeholder={pending ? 'No contestó / pide cotización / visita el jueves…' : 'Ej: cambió de administrador, ahora es Julián.'}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs outline-none focus:border-amber-300" />
                    <div className="flex gap-2">
                        {pending && (
                            <button type="button" onClick={() => { setPanel('none'); setPending(null); router.refresh(); }}
                                className="h-9 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-500">Sin nota</button>
                        )}
                        <button type="button" onClick={onSaveNote} disabled={busy}
                            className="flex-1 h-9 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50">
                            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Guardar
                        </button>
                    </div>
                </div>,
                document.body,
            )}
        </div>
    );
}
