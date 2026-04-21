import { createClient } from '@/lib/supabase/server';
import { settingsService } from '@/features/settings/services/settingsService';
import { PrintButton } from '@/features/accounting/components/PrintButton';
import { Card } from "@/shared/components/ui/card"
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { cn } from "@/shared/lib/utils"
import { Receipt, ChevronRight, ArrowLeft, Building2, MapPin, Phone, Mail } from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────────

interface Party {
    legal_name: string | null;
    nit: string | null;
}

interface TreasuryAccount {
    name: string | null;
    bank_name: string | null;
}

interface TreasuryTransaction {
    id: string;
    tenant_id: string;
    account_id: string | null;
    party_id: string | null;
    amount: number;
    date: string;
    description: string | null;
    reference_number: string | null;
    transaction_type: string;
    accounting_entry_id: string | null;
    parties: PartyFull | null;
    treasury_accounts: TreasuryAccount | null;
}

interface PartyFull {
    legal_name: string | null;
    nit: string | null;
    doc_number?: string | null;
    dv?: string | null;
    address?: string | null;
    city?: string | null;
    phone?: string | null;
}

interface JournalLineDetail {
    id: string;
    debit: number;
    credit: number;
    description: string | null;
    chart_account_code: string | null;
    party_name: string | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
    `$${n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

function fmtNumber(n: number): string {
    return n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtDate(dateStr: string): string {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
}

function fmtDateLong(iso: string | null | undefined): string {
    if (!iso) return '—';
    const d = new Date(iso + (iso.includes('T') ? '' : 'T00:00:00'));
    const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    return `${days[d.getDay()]}, ${d.getDate()} de ${months[d.getMonth()]} de ${d.getFullYear()}`;
}

function shortId(id: string): string {
    return id.slice(0, 8).toUpperCase();
}

// ─── Number to words (Colombian pesos) ────────────────────────────────────────

const UNITS = ['', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE', 'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISEIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE', 'VEINTE'];
const TENS = ['', '', 'VEINTI', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
const HUNDREDS = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

function hundredsToWords(n: number): string {
    if (n === 0) return '';
    if (n === 100) return 'CIEN';
    if (n <= 20) return UNITS[n];
    if (n < 100) {
        const t = Math.floor(n / 10);
        const u = n % 10;
        if (t === 2) return u === 0 ? 'VEINTE' : `VEINTI${UNITS[u]}`;
        return u === 0 ? TENS[t] : `${TENS[t]} Y ${UNITS[u]}`;
    }
    const h = Math.floor(n / 100);
    const rest = n % 100;
    return rest === 0 ? HUNDREDS[h] : `${HUNDREDS[h]} ${hundredsToWords(rest)}`;
}

function numberToWords(n: number): string {
    n = Math.floor(Math.abs(n));
    if (n === 0) return 'CERO';
    const millones = Math.floor(n / 1_000_000);
    const miles = Math.floor((n % 1_000_000) / 1000);
    const resto = n % 1000;
    const parts: string[] = [];
    if (millones > 0) parts.push(millones === 1 ? 'UN MILLON' : `${hundredsToWords(millones)} MILLONES`);
    if (miles > 0) parts.push(miles === 1 ? 'MIL' : `${hundredsToWords(miles)} MIL`);
    if (resto > 0) parts.push(hundredsToWords(resto));
    return parts.join(' ');
}

function amountInWords(amount: number): string {
    return `${numberToWords(amount)} PESOS M/CTE`;
}

// Extract year + consecutive from reference_number like "RC-2026-556" or plain text
function parseReceiptNumber(raw: string | null | undefined, fallbackId: string): { year: string; number: string } {
    const s = (raw || '').trim();
    const m = s.match(/(\d{4}).*?(\d+)$/);
    if (m) return { year: m[1], number: m[2] };
    const lastDigits = s.match(/(\d+)$/);
    if (lastDigits) return { year: new Date().getFullYear().toString(), number: lastDigits[1] };
    return { year: new Date().getFullYear().toString(), number: shortId(fallbackId) };
}

// ── List View ─────────────────────────────────────────────────────────────────

function ListView({ transactions }: { transactions: TreasuryTransaction[] }) {
    return (
        <div className="space-y-12 pb-24 animate-in fade-in slide-in-from-bottom-8 duration-1000">

            {/* Dark header */}
            <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-active relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-16 opacity-[0.03] pointer-events-none group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-1000">
                    <Receipt className="h-24 w-24" />
                </div>
                <div className="relative z-10 space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="h-2 w-12 bg-emerald-500 rounded-full" />
                        <span className="text-[10px] font-black uppercase tracking-[0.5em] text-emerald-400">
                            Cash Receipt Module v3.0
                        </span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight uppercase leading-tight">
                        Recibo de <br /><span className="text-slate-500">Caja</span>
                    </h1>
                    <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">
                        CASH RECEIPT — Ingresos Recibidos
                    </p>
                </div>
            </div>

            {/* KPI Strip */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 px-1">
                <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.5em] leading-none mb-4">
                        Total Recibos Recientes
                    </span>
                    <div className="flex items-baseline gap-4">
                        <h2 className="text-4xl font-black text-emerald-600 tracking-tight leading-none">
                            {fmt(transactions.reduce((s, t) => s + Number(t.amount), 0))}
                        </h2>
                        <span className="text-xl font-black text-slate-300 uppercase italic tracking-widest">
                            {transactions.length} recibos
                        </span>
                    </div>
                </div>
            </div>

            {/* Transaction grid */}
            {transactions.length === 0 ? (
                <Card className="border-none shadow-premium bg-white rounded-[2.5rem] p-20 flex flex-col items-center justify-center gap-6">
                    <div className="h-20 w-20 rounded-[2rem] bg-slate-50 flex items-center justify-center">
                        <Receipt className="h-10 w-10 text-slate-200" />
                    </div>
                    <p className="text-sm font-black text-slate-400 uppercase tracking-widest">
                        No hay recibos de caja registrados
                    </p>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {transactions.map((tx) => {
                        const payerName = tx.parties?.legal_name ?? null;
                        const refNum = tx.reference_number || shortId(tx.id);
                        const amount = Number(tx.amount);

                        return (
                            <Link key={tx.id} href={`?id=${tx.id}`} className="group">
                                <Card className="border-none shadow-premium bg-white rounded-[2.5rem] p-7 h-full transition-all group-hover:translate-y-[-4px] group-hover:shadow-active relative overflow-hidden">
                                    {/* Accent stripe */}
                                    <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-t-[2.5rem]" />

                                    <div className="space-y-5 pt-2">
                                        {/* Header row */}
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="h-11 w-11 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0 transition-transform duration-500 group-hover:rotate-6">
                                                <Receipt className="h-5 w-5" />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">
                                                    # {refNum}
                                                </span>
                                                <ChevronRight className="h-4 w-4 text-slate-200 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                                            </div>
                                        </div>

                                        {/* Amount — emerald */}
                                        <div>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                                Valor Recibido
                                            </p>
                                            <p className="text-2xl font-black text-emerald-600 italic tracking-tighter">
                                                {fmt(amount)}
                                            </p>
                                        </div>

                                        {/* Date */}
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                {fmtDate(tx.date)}
                                            </span>
                                        </div>

                                        {/* Payer */}
                                        {payerName && (
                                            <div>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                                                    Pagador
                                                </p>
                                                <p className="text-xs font-black text-slate-700 italic uppercase tracking-tight line-clamp-1">
                                                    {payerName}
                                                </p>
                                            </div>
                                        )}

                                        {/* Description */}
                                        {tx.description && (
                                            <p className="text-[11px] text-slate-400 leading-relaxed font-medium line-clamp-2">
                                                {tx.description}
                                            </p>
                                        )}
                                    </div>
                                </Card>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ── Print View ────────────────────────────────────────────────────────────────

interface PrintViewProps {
    tx: TreasuryTransaction;
    tenantName: string;
    tenantNit: string;
    tenantDv: string;
    tenantAddress?: string | null;
    tenantPhone?: string | null;
    tenantEmail?: string | null;
    tenantCity?: string | null;
    tenantLogoUrl?: string | null;
    journalLines: JournalLineDetail[];
    elaboratedBy: string;
}

function PrintView({
    tx,
    tenantName,
    tenantNit,
    tenantDv,
    tenantAddress,
    tenantPhone,
    tenantEmail: _tenantEmail,
    tenantCity,
    tenantLogoUrl,
    journalLines,
    elaboratedBy,
}: PrintViewProps) {
    const amount = Number(tx.amount);
    const party = tx.parties;
    const payerName = (party?.legal_name || 'SIN BENEFICIARIO').toUpperCase();
    const payerNit = party?.nit ? `${party.nit}${party.dv ? ` ${party.dv}` : ''}` : (party?.doc_number || '—');
    const { year, number } = parseReceiptNumber(tx.reference_number, tx.id);
    const concept = (tx.description || '—').toUpperCase();

    // If no journal lines, synthesize two standard lines for display
    const lines: JournalLineDetail[] = journalLines.length > 0 ? journalLines : [
        {
            id: 'synth-debit',
            debit: amount,
            credit: 0,
            description: concept,
            chart_account_code: '—',
            party_name: payerName,
        },
        {
            id: 'synth-credit',
            debit: 0,
            credit: amount,
            description: concept,
            chart_account_code: '—',
            party_name: payerName,
        },
    ];

    const totalDebit = lines.reduce((s, l) => s + Number(l.debit || 0), 0);
    const totalCredit = lines.reduce((s, l) => s + Number(l.credit || 0), 0);

    return (
        <>
            <style>{`
                @media screen { .rc-doc { padding: 24px 32px; } }
                @media print {
                    @page { size: 210mm 297mm; margin: 10mm; }
                    html, body {
                        margin: 0 !important; padding: 0 !important;
                        background: white !important;
                        -webkit-print-color-adjust: exact; print-color-adjust: exact;
                    }
                    .no-print { display: none !important; }
                    .rc-doc { width: 100% !important; max-width: 100% !important; padding: 0 !important; margin: 0 !important; font-size: 10px !important; }
                }
                .rc-outer { border: 1px solid #111; border-collapse: collapse; width: 100%; }
                .rc-outer td { border: 1px solid #111; vertical-align: top; padding: 4px 8px; }
                .rc-head-gray { background: #d9d9d9; font-weight: 700; text-transform: uppercase; font-size: 9px; letter-spacing: 0.02em; }
                .rc-head-dark { background: #7a7a7a; color: #fff; font-weight: 700; text-transform: uppercase; font-size: 10px; text-align: center; letter-spacing: 0.03em; }
                .rc-table { width: 100%; border-collapse: collapse; }
                .rc-table th, .rc-table td { border: 1px solid #111; padding: 4px 6px; font-size: 10px; vertical-align: top; }
                .rc-table th { background: #d9d9d9; text-transform: uppercase; font-size: 9px; letter-spacing: 0.02em; text-align: left; }
                .rc-num { text-align: right; font-variant-numeric: tabular-nums; }
            `}</style>

            <div className="no-print sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-3">
                <div className="max-w-[820px] mx-auto flex items-center justify-between gap-4">
                    <Link
                        href="/accounting/reports/cash-receipt"
                        className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 shrink-0"
                    >
                        <ArrowLeft className="h-4 w-4" /> Volver al listado
                    </Link>
                    <PrintButton label="Imprimir Recibo" />
                </div>
            </div>

            {/* ═══════════════════════ RECIBO DE CAJA ═══════════════════════ */}
            <div className="rc-doc max-w-[820px] mx-auto bg-white text-slate-900" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px' }}>

                {/* ── HEADER: logo + empresa + caja recibo ──────────────────── */}
                <table className="rc-outer">
                    <tbody>
                        <tr>
                            <td rowSpan={3} style={{ width: '130px', padding: '8px', textAlign: 'center', verticalAlign: 'middle' }}>
                                {tenantLogoUrl ? (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img src={tenantLogoUrl} alt={tenantName} style={{ maxHeight: '70px', maxWidth: '110px', objectFit: 'contain' }} />
                                ) : (
                                    <div style={{ fontSize: '22px', fontWeight: 900, color: '#1f6b35' }}>{tenantName.split(' ')[0]}</div>
                                )}
                            </td>
                            <td colSpan={2} style={{ padding: '6px 12px', textAlign: 'center', verticalAlign: 'middle' }}>
                                <div style={{ fontSize: '15px', fontWeight: 900, letterSpacing: '0.01em' }}>{tenantName}</div>
                            </td>
                            <td rowSpan={3} style={{ width: '180px', padding: 0, verticalAlign: 'top' }}>
                                <div style={{ background: '#e8efe5', padding: '10px 6px', textAlign: 'center', fontSize: '13px', fontWeight: 900, textTransform: 'uppercase', borderBottom: '1px solid #111' }}>
                                    RECIBO DE CAJA
                                </div>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <tbody>
                                        <tr>
                                            <td style={{ padding: '10px 4px', textAlign: 'center', fontSize: '16px', fontWeight: 900, color: '#2d8a4e', borderRight: '1px solid #111', width: '50%' }}>{year}</td>
                                            <td style={{ padding: '10px 4px', textAlign: 'center', fontSize: '16px', fontWeight: 900, width: '50%' }}>{number}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </td>
                        </tr>
                        <tr>
                            <td colSpan={2} style={{ padding: '3px 12px', textAlign: 'center', fontSize: '11px' }}>
                                <span style={{ fontWeight: 700 }}>Nit</span>
                                <span style={{ marginLeft: '24px' }}>{tenantNit}{tenantDv ? ` ${tenantDv}` : ''}</span>
                            </td>
                        </tr>
                        <tr>
                            <td colSpan={2} style={{ padding: '3px 12px', textAlign: 'center', fontSize: '10.5px' }}>
                                {tenantAddress || '—'}
                                {tenantPhone ? ` TEL ${tenantPhone}` : ''}
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* ── BENEFICIARIO ── */}
                <table className="rc-outer" style={{ borderTop: 'none' }}>
                    <tbody>
                        <tr>
                            <td className="rc-head-dark" style={{ padding: '4px 8px', textAlign: 'left' }}>BENEFICIARIO</td>
                        </tr>
                        <tr>
                            <td style={{ padding: '6px 8px', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase' }}>{payerName}</td>
                        </tr>
                    </tbody>
                </table>

                {/* ── NIT / POR CONCEPTO DE ── */}
                <table className="rc-outer" style={{ borderTop: 'none' }}>
                    <tbody>
                        <tr>
                            <td style={{ width: '40%', padding: '3px 8px', background: '#7a7a7a', color: '#fff', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', borderRight: '1px solid #111' }}>NIT</td>
                            <td style={{ padding: '3px 8px', background: '#7a7a7a', color: '#fff', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase' }}>POR CONCEPTO DE</td>
                        </tr>
                        <tr>
                            <td style={{ padding: '6px 8px', fontWeight: 700, fontSize: '11px', borderRight: '1px solid #111' }}>{payerNit}</td>
                            <td style={{ padding: '6px 8px', fontWeight: 600, fontSize: '10.5px', textTransform: 'uppercase' }}>{concept}</td>
                        </tr>
                    </tbody>
                </table>

                {/* ── DIRECCION / CIUDAD / TELEFONO ── */}
                <table className="rc-outer" style={{ borderTop: 'none' }}>
                    <tbody>
                        <tr>
                            <td style={{ padding: '3px 8px', background: '#7a7a7a', color: '#fff', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', borderRight: '1px solid #111', width: '40%' }}>DIRECCION</td>
                            <td style={{ padding: '3px 8px', background: '#7a7a7a', color: '#fff', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', borderRight: '1px solid #111', width: '30%' }}>CIUDAD</td>
                            <td style={{ padding: '3px 8px', background: '#7a7a7a', color: '#fff', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase' }}>TELEFONO</td>
                        </tr>
                        <tr>
                            <td style={{ padding: '6px 8px', fontSize: '11px', borderRight: '1px solid #111' }}>{party?.address || '—'}</td>
                            <td style={{ padding: '6px 8px', fontSize: '11px', borderRight: '1px solid #111' }}>{party?.city || '—'}</td>
                            <td style={{ padding: '6px 8px', fontSize: '11px' }}>{party?.phone || '—'}</td>
                        </tr>
                    </tbody>
                </table>

                {/* ── FECHA DOCUMENTO / ELABORADO POR / CHEQUE No. ── */}
                <table className="rc-outer" style={{ borderTop: 'none' }}>
                    <tbody>
                        <tr>
                            <td className="rc-head-dark" style={{ padding: '3px 8px', width: '40%' }}>FECHA DOCUMENTO</td>
                            <td className="rc-head-dark" style={{ padding: '3px 8px', width: '40%' }}>ELABORADO POR</td>
                            <td className="rc-head-dark" style={{ padding: '3px 8px', width: '20%' }}>CHEQUE No.</td>
                        </tr>
                        <tr>
                            <td style={{ padding: '6px 8px', fontSize: '11px', textAlign: 'center' }}>{fmtDateLong(tx.date)}</td>
                            <td style={{ padding: '6px 8px', fontSize: '11px', textAlign: 'center', textTransform: 'uppercase', fontWeight: 700 }}>{elaboratedBy}</td>
                            <td style={{ padding: '6px 8px', fontSize: '11px', textAlign: 'center', fontWeight: 700 }}>
                                {tx.reference_number && /^\d+$/.test(tx.reference_number) ? tx.reference_number : ''}
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* ── Accounting table ── */}
                <table className="rc-table" style={{ borderTop: 'none' }}>
                    <thead>
                        <tr>
                            <th style={{ width: '15%' }}>Codigo Cuenta</th>
                            <th style={{ width: '32%' }}>Concepto</th>
                            <th style={{ width: '28%' }}>Tercero</th>
                            <th className="rc-num" style={{ width: '12.5%' }}>Debito</th>
                            <th className="rc-num" style={{ width: '12.5%' }}>Credito</th>
                        </tr>
                    </thead>
                    <tbody>
                        {lines.map((l) => (
                            <tr key={l.id}>
                                <td style={{ fontWeight: 700 }}>{l.chart_account_code ?? '—'}</td>
                                <td style={{ textTransform: 'uppercase' }}>{l.description ?? '—'}</td>
                                <td style={{ textTransform: 'uppercase' }}>{l.party_name ?? '—'}</td>
                                <td className="rc-num">{Number(l.debit) > 0 ? fmtNumber(Number(l.debit)) : '0'}</td>
                                <td className="rc-num">{Number(l.credit) > 0 ? fmtNumber(Number(l.credit)) : '0'}</td>
                            </tr>
                        ))}
                        {Array.from({ length: Math.max(0, 3 - lines.length) }).map((_, i) => (
                            <tr key={`filler-${i}`} style={{ height: '22px' }}>
                                <td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* ── Footer totals + valor en letras + firmas ── */}
                <table className="rc-outer" style={{ borderTop: 'none' }}>
                    <tbody>
                        <tr>
                            <td style={{ width: '50%', padding: '4px 8px', verticalAlign: 'top' }}>
                                <div className="rc-head-gray" style={{ padding: '3px 6px', display: 'inline-block', marginBottom: '4px' }}>Valor en Letras</div>
                                <div style={{ fontSize: '10.5px', textTransform: 'uppercase', fontWeight: 600, lineHeight: 1.4 }}>{amountInWords(amount)}</div>
                                <div style={{ fontSize: '10.5px', textTransform: 'uppercase', fontWeight: 600, marginTop: '2px' }}>PESOS M/CTE</div>
                            </td>
                            <td className="rc-head-gray" style={{ width: '25%', padding: '4px 8px', textAlign: 'center' }}>TOTAL DEL DOCUMENTO</td>
                            <td className="rc-num" style={{ width: '12.5%', padding: '4px 8px', fontWeight: 700 }}>{fmtNumber(totalDebit)}</td>
                            <td className="rc-num" style={{ width: '12.5%', padding: '4px 8px', fontWeight: 700 }}>{fmtNumber(totalCredit)}</td>
                        </tr>
                        <tr>
                            <td className="rc-head-gray" style={{ padding: '4px 8px' }}>REVISADO POR</td>
                            <td colSpan={3} rowSpan={2} className="rc-head-dark" style={{ padding: '4px 8px', verticalAlign: 'top', height: '70px' }}>
                                FIRMA Y SELLO DEL BENEFICIARIO
                            </td>
                        </tr>
                        <tr>
                            <td className="rc-head-gray" style={{ padding: '4px 8px' }}>APROBADO POR</td>
                        </tr>
                    </tbody>
                </table>

                <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '9px', color: '#6b7280' }}>
                    <p>{tenantName} · NIT {tenantNit}{tenantDv ? `-${tenantDv}` : ''}{tenantCity ? ` · ${tenantCity}` : ''}</p>
                </div>
            </div>
        </>
    );
}


// ── Page (Server Component) ───────────────────────────────────────────────────

export default async function CashReceiptPage({
    searchParams,
}: {
    searchParams: Promise<{ id?: string }>;
}) {
    const supabase = await createClient();
    const params = await searchParams;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    // Resolve tenant_id via user_tenants
    const { data: userTenant } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

    const tenant = await settingsService.getTenantInfo(supabase);

    // ── PRINT VIEW ───────────────────────────────────────────────────────────
    if (params.id) {
        const { data: tx, error } = await supabase
            .from('treasury_transactions')
            .select('*, parties(legal_name, nit, doc_number, dv, address, city, phone), treasury_accounts(name, bank_name)')
            .eq('id', params.id)
            .eq('transaction_type', 'RECEIPT')
            .single();

        if (error || !tx) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 animate-in fade-in duration-700">
                    <div className="h-20 w-20 rounded-[2rem] bg-rose-50 flex items-center justify-center">
                        <Receipt className="h-10 w-10 text-rose-300" />
                    </div>
                    <p className="text-sm font-black text-slate-400 uppercase tracking-widest">
                        Recibo no encontrado
                    </p>
                    <Link
                        href="/accounting/reports/cash-receipt"
                        className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-slate-900 transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Volver a la lista
                    </Link>
                </div>
            );
        }

        const typedTx = tx as unknown as TreasuryTransaction;

        // Fetch journal lines for this entry
        let journalLines: JournalLineDetail[] = [];
        if (typedTx.accounting_entry_id) {
            const { data: jlRaw } = await supabase
                .from('journal_lines')
                .select('id, debit, credit, description, chart_accounts(code), parties(legal_name)')
                .eq('entry_id', typedTx.accounting_entry_id)
                .order('debit', { ascending: false });
            if (jlRaw) {
                journalLines = (jlRaw as unknown as Array<{
                    id: string;
                    debit: number;
                    credit: number;
                    description: string | null;
                    chart_accounts: { code: string } | null;
                    parties: { legal_name: string } | null;
                }>).map(jl => ({
                    id: jl.id,
                    debit: Number(jl.debit ?? 0),
                    credit: Number(jl.credit ?? 0),
                    description: jl.description,
                    chart_account_code: jl.chart_accounts?.code ?? null,
                    party_name: jl.parties?.legal_name ?? null,
                }));
            }
        }

        // Elaborated by (current user)
        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', user.id)
            .maybeSingle();
        const elaboratedBy = (profile?.full_name || profile?.email?.split('@')[0] || '—').toUpperCase();

        return (
            <PrintView
                tx={typedTx}
                tenantName={tenant?.name ?? 'Empresa'}
                tenantNit={tenant?.nit ?? ''}
                tenantDv={tenant?.dv ?? ''}
                tenantAddress={tenant?.address}
                tenantPhone={tenant?.phone}
                tenantEmail={tenant?.email}
                tenantCity={tenant?.city}
                tenantLogoUrl={tenant?.logo_url}
                journalLines={journalLines}
                elaboratedBy={elaboratedBy}
            />
        );
    }

    // ── LIST VIEW ─────────────────────────────────────────────────────────────
    const queryBuilder = supabase
        .from('treasury_transactions')
        .select('*, parties(legal_name, nit, doc_number, dv, address, city, phone), treasury_accounts(name, bank_name)')
        .eq('transaction_type', 'RECEIPT')
        .order('date', { ascending: false })
        .limit(20);

    // Narrow to tenant if available
    const finalQuery = userTenant?.tenant_id
        ? queryBuilder.eq('tenant_id', userTenant.tenant_id)
        : queryBuilder;

    const { data: transactions } = await finalQuery;
    const typedTransactions = (transactions ?? []) as unknown as TreasuryTransaction[];

    return <ListView transactions={typedTransactions} />;
}
