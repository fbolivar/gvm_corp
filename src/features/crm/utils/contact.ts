import { formatLocalDate } from '@/shared/lib/dateFmt';

/**
 * Contacto rápido con el cliente: teléfonos colombianos y plantillas de WhatsApp.
 * Lógica pura (sin Supabase) para poder probarla: los teléfonos del maestro
 * vienen de WorldOffice con espacios, sin indicativo, fijos de 7 dígitos y
 * algunos incompletos.
 */

export interface PhoneInfo {
    /** Número para `tel:` (dígitos, con indicativo si se pudo inferir). */
    tel: string;
    /** Número internacional sin '+' para wa.me; null si no es celular. */
    whatsapp: string | null;
    /** Cómo mostrarlo. */
    display: string;
}

/**
 * Normaliza un teléfono del maestro. Reglas Colombia:
 *  - 10 dígitos que empiezan por 3 → celular (+57).
 *  - 12 dígitos que empiezan por 573 → celular ya con indicativo.
 *  - 10 dígitos que empiezan por 60 → fijo nacional (60 + indicativo + 7).
 *  - 7 dígitos → fijo sin indicativo: solo llamada, sin WhatsApp.
 *  - Cualquier otra cosa → null (no se ofrece botón que no va a funcionar).
 */
export function parseColombianPhone(raw: string | null | undefined): PhoneInfo | null {
    const digits = String(raw ?? '').replace(/\D/g, '');
    if (!digits) return null;
    if (/^3\d{9}$/.test(digits)) return { tel: `+57${digits}`, whatsapp: `57${digits}`, display: fmtCel(digits) };
    if (/^573\d{9}$/.test(digits)) return { tel: `+${digits}`, whatsapp: digits, display: fmtCel(digits.slice(2)) };
    if (/^60\d{8}$/.test(digits)) return { tel: `+57${digits}`, whatsapp: null, display: `(${digits.slice(0, 3)}) ${digits.slice(3)}` };
    if (/^\d{7}$/.test(digits)) return { tel: digits, whatsapp: null, display: digits };
    return null;
}

function fmtCel(d: string) {
    return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
}

export function isValidEmail(email: string | null | undefined): email is string {
    return !!email && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

/* ─── Plantillas de WhatsApp ──────────────────────────────────────────────── */

export interface TemplateContext {
    client_name: string;
    contact_name?: string | null;
    salesperson_name: string;
    last_purchase_date?: string | null;
    days_since_purchase?: number | null;
    top_product?: string | null;
    planned_date?: string | null;
}

export interface WhatsAppTemplate {
    key: string;
    label: string;
    /** Cuándo sugerirla primero. */
    suggestFor?: Array<'SIN_COMPRA' | 'EN_CAIDA' | 'INACTIVO' | 'VISITA'>;
    body: (c: TemplateContext) => string;
}

/** Razón social de empresa (no una persona): no se saluda por el "primer nombre". */
export function looksLikeCompany(name: string): boolean {
    // Se comparan "palabras" sin puntos: "S.A.S", "S A S", "SAS", "LTDA", "& CIA"...
    const words = name.toUpperCase().replace(/[.,&]/g, ' ').split(/\s+/).filter(Boolean);
    const joined = ` ${words.join(' ')} `;
    if (/ (S A S|S A|E U|S EN C S?|S C A) /.test(joined)) return true;
    const KEYWORDS = new Set(['SAS', 'SA', 'LTDA', 'LIMITADA', 'EU', 'CIA', 'COMPAÑIA', 'COMPAÑÍA', 'INVERSIONES', 'AGROPECUARIA',
        'AVICOLA', 'AVÍCOLA', 'PORCICOLA', 'PORCÍCOLA', 'GRANJA', 'GRANJAS', 'SOCIEDAD', 'COOPERATIVA', 'FUNDACION', 'FUNDACIÓN',
        'ASOCIACION', 'ASOCIACIÓN', 'DISTRIBUIDORA', 'COMERCIALIZADORA', 'AGROINDUSTRIAL', 'ALIMENTOS', 'INCUBADORA', 'POLLOS', 'HUEVOS']);
    return words.some(w => KEYWORDS.has(w));
}

const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
const firstName = (c: TemplateContext) => {
    if (c.contact_name) return cap(c.contact_name.trim().split(/\s+/)[0]);
    return looksLikeCompany(c.client_name) ? null : cap(c.client_name.trim().split(/\s+/)[0]);
};
/** "Hola Julián" o, para una empresa sin contacto, "Hola, buen día". */
const greeting = (c: TemplateContext) => { const n = firstName(c); return n ? `Hola ${n}` : 'Hola, buen día'; };
const seller = (c: TemplateContext) => cap(c.salesperson_name.trim().split(/\s+/)[0]);

export const WHATSAPP_TEMPLATES: WhatsAppTemplate[] = [
    {
        key: 'SEGUIMIENTO',
        label: 'Seguimiento — hace rato no piden',
        suggestFor: ['SIN_COMPRA'],
        body: c => `${greeting(c)}, soy ${seller(c)} de GVM. ` +
            (c.last_purchase_date ? `Vi que el último pedido fue el ${formatLocalDate(c.last_purchase_date)}` : 'Hace un tiempo no recibimos pedido') +
            `. ¿Cómo van con inventario${c.top_product ? ` de ${c.top_product}` : ''}? Con gusto les cotizo lo que necesiten. 🙂`,
    },
    {
        key: 'RECUPERACION',
        label: 'Recuperación — bajó el consumo',
        suggestFor: ['EN_CAIDA'],
        body: c => `${greeting(c)}, soy ${seller(c)} de GVM. Quería saber cómo les ha ido este mes y si hay algo en lo que podamos apoyarlos: disponibilidad, precios o asesoría técnica. ¿Le parece si le llamo o paso a visitarlos esta semana?`,
    },
    {
        key: 'REACTIVACION',
        label: 'Reactivación — cliente inactivo',
        suggestFor: ['INACTIVO'],
        body: c => `${greeting(c)}, le saluda ${seller(c)} de GVM (Global Veterinary Medicine). Hace tiempo no trabajamos juntos y me gustaría retomar el contacto: tenemos novedades en la línea y buenas condiciones. ¿Tendría un espacio esta semana para una llamada corta?`,
    },
    {
        key: 'VISITA',
        label: 'Confirmar visita',
        suggestFor: ['VISITA'],
        body: c => `${greeting(c)}, soy ${seller(c)} de GVM. Le escribo para confirmar la visita${c.planned_date ? ` del ${formatLocalDate(c.planned_date, { weekday: 'long', day: '2-digit', month: 'long' })}` : ''}. ¿Le queda bien la hora? Cualquier ajuste me avisa por aquí.`,
    },
    {
        key: 'PEDIDO',
        label: 'Ofrecer pedido / disponibilidad',
        body: c => `${greeting(c)}, soy ${seller(c)} de GVM. Tenemos disponibilidad${c.top_product ? ` de ${c.top_product}` : ''} y despacho esta semana. Si me confirma cantidades le envío la cotización de una vez.`,
    },
    {
        key: 'LIBRE',
        label: 'Mensaje libre',
        body: c => `${greeting(c)}, soy ${seller(c)} de GVM. `,
    },
];

/** Enlace wa.me con el texto ya codificado. */
export function whatsappLink(whatsapp: string, text: string): string {
    return `https://wa.me/${whatsapp}?text=${encodeURIComponent(text)}`;
}

/** Sugiere la plantilla según la alerta o el contexto (fallback: seguimiento). */
export function suggestedTemplate(kind?: 'SIN_COMPRA' | 'EN_CAIDA' | 'INACTIVO' | 'VISITA' | null): WhatsAppTemplate {
    return WHATSAPP_TEMPLATES.find(t => kind && t.suggestFor?.includes(kind)) ?? WHATSAPP_TEMPLATES[0];
}
