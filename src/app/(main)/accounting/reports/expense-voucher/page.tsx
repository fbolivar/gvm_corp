import { createClient } from '@/lib/supabase/server';
import { settingsService } from '@/features/settings/services/settingsService';
import { PrintButton } from '@/features/accounting/components/PrintButton';
import { Card } from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Wallet, ArrowLeft, CreditCard, ChevronRight } from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

interface TreasuryAccount {
    name: string;
    bank_name: string | null;
    account_number: string | null;
}

interface Party {
    legal_name: string;
    nit: string | null;
    doc_number: string | null;
}

interface PaymentTransaction {
    id: string;
    tenant_id: string;
    account_id: string | null;
    party_id: string | null;
    amount: number;
    date: string;
    description: string | null;
    reference_number: string | null;
    is_reconciled: boolean | null;
    transaction_type: string;
    accounting_entry_id: string | null;
    parties: Party | null;
    treasury_accounts: TreasuryAccountWithCode | null;
}

interface TreasuryAccountWithCode {
    name: string;
    bank_name: string | null;
    account_number: string | null;
    chart_account_id: string | null;
}

interface JournalLineDetail {
    id: string;
    debit: number;
    credit: number;
    description: string | null;
    chart_account_code: string | null;
    party_name: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
    return `$${n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtNumber(n: number): string {
    return n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtDate(iso: string): string {
    const [year, month, day] = iso.split('-');
    return `${day}/${month}/${year}`;
}

function fmtDateParts(iso: string): { day: string; month: string; year: string } {
    const [year, month, day] = iso.split('-');
    return { day, month, year };
}

function fmtDateLong(iso: string): string {
    const d = new Date(iso + 'T00:00:00');
    const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    return `${days[d.getDay()]}, ${d.getDate()} de ${months[d.getMonth()]} de ${d.getFullYear()}`;
}

function voucherNumber(tx: PaymentTransaction): string {
    if (tx.reference_number) return tx.reference_number;
    return tx.id.slice(-6).toUpperCase();
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
    if (millones > 0) {
        parts.push(millones === 1 ? 'UN MILLON' : `${hundredsToWords(millones)} MILLONES`);
    }
    if (miles > 0) {
        parts.push(miles === 1 ? 'MIL' : `${hundredsToWords(miles)} MIL`);
    }
    if (resto > 0) parts.push(hundredsToWords(resto));
    return parts.join(' ');
}

function amountInWords(amount: number): string {
    return `${numberToWords(amount)} PESOS M/CTE`;
}

// ─── List View ────────────────────────────────────────────────────────────────

function ListView({ transactions }: { transactions: PaymentTransaction[] }) {
    return (
        <div className="space-y-12 pb-24 animate-in fade-in slide-in-from-bottom-8 duration-1000">

            {/* Dark hero header */}
            <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-active relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-16 opacity-[0.03] pointer-events-none group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-1000">
                    <Wallet className="h-24 w-24" />
                </div>
                <div className="relative z-10 space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="h-2 w-12 bg-rose-500 rounded-full" />
                        <span className="text-[10px] font-black uppercase tracking-[0.5em] text-rose-400">
                            Treasury · Payment Voucher
                        </span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight uppercase leading-tight">
                        Comprobante<br />
                        <span className="text-slate-500">de Egreso</span>
                    </h1>
                    <p className="text-sm font-medium text-slate-400 max-w-lg leading-relaxed">
                        Registro de pagos realizados. Selecciona un comprobante para ver e imprimir el documento oficial.
                    </p>
                    <div className="flex flex-wrap gap-3 pt-2">
                        <Badge className="bg-white/5 border border-white/10 text-white text-[9px] font-black uppercase tracking-[0.3em] px-5 py-2.5 rounded-full">
                            <Wallet className="h-3 w-3 mr-2 text-rose-400" />
                            {transactions.length} Egresos Recientes
                        </Badge>
                        <Badge className="bg-rose-500/20 border border-rose-500/30 text-rose-300 text-[9px] font-black uppercase tracking-[0.3em] px-5 py-2.5 rounded-full">
                            <CreditCard className="h-3 w-3 mr-2" />
                            Tipo: PAYMENT
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Cards grid */}
            {transactions.length === 0 ? (
                <Card className="border-none shadow-premium bg-white rounded-[2.5rem] p-16 text-center">
                    <Wallet className="h-14 w-14 text-slate-200 mx-auto mb-5" />
                    <p className="text-sm font-black text-slate-400 uppercase tracking-widest">
                        Sin egresos registrados
                    </p>
                    <p className="text-xs text-slate-300 font-medium mt-2">
                        Los comprobantes de egreso aparecerán aquí una vez registres pagos en tesorería.
                    </p>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {transactions.map((tx) => {
                        const num = voucherNumber(tx);
                        const beneficiary = tx.parties?.legal_name ?? 'Sin beneficiario';
                        return (
                            <Link key={tx.id} href={`?id=${tx.id}`} className="group">
                                <Card className="border-none shadow-premium bg-white rounded-[2.5rem] p-7 h-full transition-all group-hover:translate-y-[-4px] group-hover:shadow-active relative overflow-hidden">

                                    {/* Top accent line */}
                                    <div className="absolute top-0 left-7 right-7 h-0.5 bg-gradient-to-r from-rose-500/40 to-transparent rounded-full" />

                                    <div className="space-y-5">
                                        {/* Header row */}
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="h-11 w-11 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500 shrink-0 transition-transform duration-500 group-hover:rotate-6">
                                                <Wallet className="h-5 w-5" />
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <Badge className="bg-slate-50 text-slate-400 border-none text-[7px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-lg">
                                                    #{num}
                                                </Badge>
                                                <ChevronRight className="h-4 w-4 text-slate-200 group-hover:text-slate-900 group-hover:translate-x-1 transition-all" />
                                            </div>
                                        </div>

                                        {/* Amount — hero figure */}
                                        <div>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                                Valor Egreso
                                            </p>
                                            <p className="text-2xl font-black text-rose-500 italic tracking-tighter tabular-nums">
                                                {fmt(Number(tx.amount))}
                                            </p>
                                        </div>

                                        {/* Meta */}
                                        <div className="space-y-2 pt-1 border-t border-slate-50">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                    Fecha
                                                </span>
                                                <span className="text-[10px] font-bold text-slate-600 tracking-widest uppercase">
                                                    {fmtDate(tx.date)}
                                                </span>
                                            </div>
                                            <div className="flex items-start justify-between gap-2">
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest shrink-0">
                                                    Beneficiario
                                                </span>
                                                <span className="text-[10px] font-black text-slate-800 italic text-right truncate max-w-[140px]">
                                                    {beneficiary}
                                                </span>
                                            </div>
                                            {tx.description && (
                                                <div>
                                                    <p className="text-[9px] text-slate-400 font-medium leading-snug line-clamp-2 mt-1">
                                                        {tx.description}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
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

// ─── Print View ───────────────────────────────────────────────────────────────

interface PrintViewProps {
    tx: PaymentTransaction;
    tenantName: string;
    tenantNit: string;
    tenantDv: string;
    tenantCity: string;
    tenantAddress: string;
    tenantPhone: string;
    tenantLogoUrl: string | null;
    journalLines: JournalLineDetail[];
    elaboratedBy: string;
}

function PrintView({
    tx, tenantName, tenantNit, tenantDv, tenantCity,
    tenantAddress, tenantPhone, tenantLogoUrl,
    journalLines, elaboratedBy,
}: PrintViewProps) {
    const num = voucherNumber(tx);
    const party = tx.parties;
    const account = tx.treasury_accounts;
    const amount = Number(tx.amount);
    const dateParts = fmtDateParts(tx.date);
    const year = dateParts.year;

    // If no journal lines, synthesize the two standard lines for display
    const lines: JournalLineDetail[] = journalLines.length > 0 ? journalLines : [
        {
            id: 'synth-debit',
            debit: amount,
            credit: 0,
            description: tx.description ?? 'PAGO',
            chart_account_code: '—',
            party_name: party?.legal_name ?? null,
        },
        {
            id: 'synth-credit',
            debit: 0,
            credit: amount,
            description: tx.description ?? 'PAGO',
            chart_account_code: '—',
            party_name: tenantName,
        },
    ];

    const totalDebit = lines.reduce((s, l) => s + Number(l.debit || 0), 0);
    const totalCredit = lines.reduce((s, l) => s + Number(l.credit || 0), 0);

    return (
        <div className="pb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">

            {/* Screen-only action bar */}
            <div className="flex items-center justify-between mb-8 print:hidden">
                <Link
                    href="/accounting/reports/expense-voucher"
                    className="flex items-center gap-2.5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Volver al listado
                </Link>
                <PrintButton label="Imprimir Comprobante" />
            </div>

            {/* ── A4 landscape-style voucher matching WO format ─────────────── */}
            <div
                className="bg-white mx-auto text-slate-900 print:shadow-none shadow-xl"
                style={{ maxWidth: '820px', fontSize: '11px', fontFamily: 'Arial, sans-serif' }}
            >
                <style>{`
                    @media print {
                        @page { size: A4; margin: 12mm; }
                        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    }
                    .eg-cell { border: 1px solid #111; padding: 4px 8px; vertical-align: top; }
                    .eg-label { font-size: 9px; color: #555; text-transform: uppercase; letter-spacing: 0.02em; }
                    .eg-head { background: #d9d9d9; font-weight: 700; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em; }
                    .eg-dark { background: #7a7a7a; color: #fff; font-weight: 700; text-transform: uppercase; font-size: 10px; text-align: center; letter-spacing: 0.05em; }
                    .eg-value { font-weight: 700; font-size: 11px; }
                    .eg-table th, .eg-table td { border: 1px solid #111; padding: 4px 6px; font-size: 10px; }
                    .eg-table th { background: #d9d9d9; text-align: left; text-transform: uppercase; font-size: 9px; letter-spacing: 0.03em; }
                    .eg-numeric { text-align: right; font-variant-numeric: tabular-nums; }
                `}</style>

                {/* ── Top header grid: logo | company info | voucher badge ── */}
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #111' }}>
                    <tbody>
                        <tr>
                            <td rowSpan={3} style={{ width: '130px', padding: '8px', border: '1px solid #111', textAlign: 'center', verticalAlign: 'middle' }}>
                                {tenantLogoUrl ? (
                                    <Image
                                        src={tenantLogoUrl}
                                        alt={tenantName}
                                        width={110}
                                        height={70}
                                        style={{ objectFit: 'contain', width: '110px', height: 'auto', maxHeight: '70px' }}
                                        unoptimized
                                    />
                                ) : (
                                    <div style={{ fontSize: '22px', fontWeight: 900, color: '#1f6b35' }}>{tenantName.split(' ')[0]}</div>
                                )}
                            </td>
                            <td colSpan={3} style={{ border: '1px solid #111', padding: '6px 12px', textAlign: 'center', verticalAlign: 'middle' }}>
                                <div style={{ fontSize: '15px', fontWeight: 900, letterSpacing: '0.01em' }}>{tenantName}</div>
                                <div style={{ fontSize: '11px', marginTop: '2px' }}>
                                    <span style={{ fontWeight: 700 }}>Nit</span>
                                    <span style={{ marginLeft: '24px' }}>{tenantNit}</span>
                                </div>
                            </td>
                            <td rowSpan={3} style={{ width: '180px', border: '1px solid #111', padding: 0, verticalAlign: 'top' }}>
                                <div style={{ background: '#d9d9d9', padding: '10px 6px', textAlign: 'center', fontSize: '13px', fontWeight: 900, lineHeight: 1.15, textTransform: 'uppercase' }}>
                                    COMPROBANTE<br />DE EGRESO
                                </div>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <tbody>
                                        <tr>
                                            <td style={{ border: '1px solid #111', borderLeft: 'none', borderBottom: 'none', borderRight: '1px solid #111', padding: '12px 4px', textAlign: 'center', fontSize: '18px', fontWeight: 900, color: '#2d8a4e', width: '50%' }}>
                                                {year}
                                            </td>
                                            <td style={{ border: '1px solid #111', borderRight: 'none', borderBottom: 'none', padding: '12px 4px', textAlign: 'center', fontSize: '18px', fontWeight: 900, width: '50%' }}>
                                                {num}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </td>
                        </tr>
                        <tr>
                            {/* Date cells and amount */}
                            <td style={{ border: '1px solid #111', padding: '6px 10px', textAlign: 'center', fontWeight: 700, fontSize: '12px', width: '60px' }}>
                                {dateParts.day}
                            </td>
                            <td style={{ border: '1px solid #111', padding: '6px 10px', textAlign: 'center', fontWeight: 700, fontSize: '12px', width: '60px' }}>
                                {dateParts.month}
                            </td>
                            <td style={{ border: '1px solid #111', padding: '6px 10px', textAlign: 'center', fontWeight: 700, fontSize: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span>{dateParts.year}</span>
                                    <span style={{ fontSize: '14px', fontWeight: 900 }}>{fmtNumber(amount)}</span>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td colSpan={3} style={{ border: '1px solid #111', padding: '6px 12px', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>
                                {amountInWords(amount)}
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* ── Beneficiario row ── */}
                <table style={{ width: '100%', borderCollapse: 'collapse', borderLeft: '1px solid #111', borderRight: '1px solid #111', borderBottom: '1px solid #111' }}>
                    <tbody>
                        <tr>
                            <td className="eg-dark" style={{ padding: '4px 8px', textAlign: 'left' }}>
                                BENEFICIARIO
                            </td>
                        </tr>
                        <tr>
                            <td style={{ padding: '6px 8px', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase' }}>
                                {party?.legal_name ?? '—'}
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* ── NIT / POR CONCEPTO DE ── */}
                <table style={{ width: '100%', borderCollapse: 'collapse', borderLeft: '1px solid #111', borderRight: '1px solid #111', borderBottom: '1px solid #111' }}>
                    <tbody>
                        <tr>
                            <td style={{ width: '40%', padding: '3px 8px', background: '#7a7a7a', color: '#fff', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', borderRight: '1px solid #111' }}>NIT</td>
                            <td style={{ padding: '3px 8px', background: '#7a7a7a', color: '#fff', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase' }}>POR CONCEPTO DE</td>
                        </tr>
                        <tr>
                            <td style={{ padding: '6px 8px', fontWeight: 700, fontSize: '11px', borderRight: '1px solid #111' }}>
                                {party?.nit ? `${party.nit}${party?.doc_number ? '' : ''}` : party?.doc_number ?? '—'}
                            </td>
                            <td style={{ padding: '6px 8px', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase' }}>
                                {tx.description ?? '—'}
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* ── DIRECCION / CIUDAD / TELEFONO ── */}
                <table style={{ width: '100%', borderCollapse: 'collapse', borderLeft: '1px solid #111', borderRight: '1px solid #111', borderBottom: '1px solid #111' }}>
                    <tbody>
                        <tr>
                            <td style={{ padding: '3px 8px', background: '#7a7a7a', color: '#fff', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', borderRight: '1px solid #111', width: '40%' }}>DIRECCION</td>
                            <td style={{ padding: '3px 8px', background: '#7a7a7a', color: '#fff', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', borderRight: '1px solid #111', width: '30%' }}>CIUDAD</td>
                            <td style={{ padding: '3px 8px', background: '#7a7a7a', color: '#fff', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase' }}>TELEFONO</td>
                        </tr>
                        <tr>
                            <td style={{ padding: '6px 8px', fontSize: '11px', borderRight: '1px solid #111' }}>
                                {tenantAddress || '—'}
                            </td>
                            <td style={{ padding: '6px 8px', fontSize: '11px', borderRight: '1px solid #111' }}>
                                {tenantCity || '—'}
                            </td>
                            <td style={{ padding: '6px 8px', fontSize: '11px' }}>
                                {tenantPhone || '—'}
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* ── FECHA / ELABORADO POR / CHEQUE No. ── */}
                <table style={{ width: '100%', borderCollapse: 'collapse', borderLeft: '1px solid #111', borderRight: '1px solid #111', borderBottom: '1px solid #111' }}>
                    <tbody>
                        <tr>
                            <td style={{ padding: '3px 8px', background: '#7a7a7a', color: '#fff', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', borderRight: '1px solid #111', width: '40%', textAlign: 'center' }}>FECHA DOCUMENTO</td>
                            <td style={{ padding: '3px 8px', background: '#7a7a7a', color: '#fff', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', borderRight: '1px solid #111', width: '40%', textAlign: 'center' }}>ELABORADO POR</td>
                            <td style={{ padding: '3px 8px', background: '#7a7a7a', color: '#fff', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', textAlign: 'center' }}>CHEQUE No.</td>
                        </tr>
                        <tr>
                            <td style={{ padding: '6px 8px', fontSize: '11px', borderRight: '1px solid #111', textAlign: 'center' }}>
                                {fmtDateLong(tx.date)}
                            </td>
                            <td style={{ padding: '6px 8px', fontSize: '11px', borderRight: '1px solid #111', textAlign: 'center', textTransform: 'uppercase', fontWeight: 700 }}>
                                {elaboratedBy}
                            </td>
                            <td style={{ padding: '6px 8px', fontSize: '11px', textAlign: 'center', fontWeight: 700 }}>
                                {tx.reference_number && /^\d+$/.test(tx.reference_number) ? tx.reference_number : ''}
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* ── Accounting table: DEBITO/CREDITO ── */}
                <table className="eg-table" style={{ width: '100%', borderCollapse: 'collapse', borderLeft: '1px solid #111', borderRight: '1px solid #111', borderBottom: '1px solid #111' }}>
                    <thead>
                        <tr>
                            <th style={{ width: '18%' }}>Codigo Cuenta</th>
                            <th style={{ width: '32%' }}>Concepto</th>
                            <th style={{ width: '25%' }}>Tercero</th>
                            <th className="eg-numeric" style={{ width: '12.5%' }}>Debito</th>
                            <th className="eg-numeric" style={{ width: '12.5%' }}>Credito</th>
                        </tr>
                    </thead>
                    <tbody>
                        {lines.map((l) => (
                            <tr key={l.id}>
                                <td style={{ fontWeight: 700 }}>{l.chart_account_code ?? '—'}</td>
                                <td style={{ textTransform: 'uppercase' }}>{l.description ?? '—'}</td>
                                <td style={{ textTransform: 'uppercase' }}>{l.party_name ?? '—'}</td>
                                <td className="eg-numeric">{Number(l.debit) > 0 ? fmtNumber(Number(l.debit)) : '0'}</td>
                                <td className="eg-numeric">{Number(l.credit) > 0 ? fmtNumber(Number(l.credit)) : '0'}</td>
                            </tr>
                        ))}
                        {/* Filler rows to match reference visual */}
                        {Array.from({ length: Math.max(0, 3 - lines.length) }).map((_, i) => (
                            <tr key={`filler-${i}`} style={{ height: '22px' }}>
                                <td>&nbsp;</td>
                                <td>&nbsp;</td>
                                <td>&nbsp;</td>
                                <td>&nbsp;</td>
                                <td>&nbsp;</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* ── Footer totals row ── */}
                <table style={{ width: '100%', borderCollapse: 'collapse', borderLeft: '1px solid #111', borderRight: '1px solid #111', borderBottom: '1px solid #111' }}>
                    <tbody>
                        <tr>
                            <td style={{ padding: '4px 8px', background: '#d9d9d9', fontWeight: 700, fontSize: '9px', textTransform: 'uppercase', borderRight: '1px solid #111', width: '50%' }}>
                                Valor en Letras
                            </td>
                            <td style={{ padding: '4px 8px', background: '#d9d9d9', fontWeight: 700, fontSize: '9px', textTransform: 'uppercase', borderRight: '1px solid #111', textAlign: 'center', width: '25%' }}>
                                Total del Documento
                            </td>
                            <td className="eg-numeric" style={{ padding: '4px 8px', background: '#d9d9d9', fontWeight: 700, fontSize: '10px', borderRight: '1px solid #111', width: '12.5%' }}>
                                {fmtNumber(totalDebit)}
                            </td>
                            <td className="eg-numeric" style={{ padding: '4px 8px', background: '#d9d9d9', fontWeight: 700, fontSize: '10px', width: '12.5%' }}>
                                {fmtNumber(totalCredit)}
                            </td>
                        </tr>
                        <tr>
                            <td rowSpan={2} style={{ padding: '10px 8px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', borderRight: '1px solid #111', verticalAlign: 'top', minHeight: '60px' }}>
                                {amountInWords(amount)}
                            </td>
                            <td colSpan={3} style={{ padding: '4px 8px', background: '#7a7a7a', color: '#fff', fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', textAlign: 'center' }}>
                                Firma y Sello del Beneficiario
                            </td>
                        </tr>
                        <tr>
                            <td colSpan={3} style={{ padding: '24px 8px', verticalAlign: 'bottom', borderRight: 'none' }}>
                                &nbsp;
                            </td>
                        </tr>
                        <tr>
                            <td colSpan={4} style={{ padding: '4px 8px', background: '#7a7a7a', color: '#fff', fontWeight: 700, fontSize: '10px', textTransform: 'uppercase' }}>
                                ELABORADO POR
                            </td>
                        </tr>
                        <tr>
                            <td colSpan={4} style={{ padding: '24px 8px', verticalAlign: 'bottom' }}>
                                &nbsp;
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ─── Page (Server Component) ──────────────────────────────────────────────────

export default async function ExpenseVoucherPage({
    searchParams
}: {
    searchParams: Promise<{ id?: string }>
}) {
    const supabase = await createClient();
    const params = await searchParams;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    // Get tenant info
    const tenant = await settingsService.getTenantInfo(supabase);

    // ── Detail view ──────────────────────────────────────────────────────────

    if (params.id) {
        const { data: txRaw } = await supabase
            .from('treasury_transactions')
            .select('*, parties(legal_name, nit, doc_number), treasury_accounts(name, bank_name, account_number, chart_account_id)')
            .eq('id', params.id)
            .eq('transaction_type', 'PAYMENT')
            .single();

        if (!txRaw) {
            redirect('/accounting/reports/expense-voucher');
        }

        const tx = txRaw as unknown as PaymentTransaction;

        // ── Fetch journal lines for this entry ─────────────────────────────
        let journalLines: JournalLineDetail[] = [];
        if (tx.accounting_entry_id) {
            const { data: jlRaw } = await supabase
                .from('journal_lines')
                .select('id, debit, credit, description, chart_accounts(code), parties(legal_name)')
                .eq('entry_id', tx.accounting_entry_id)
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

        // ── Resolve "elaborated by" from current user profile ──────────────
        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', user.id)
            .maybeSingle();
        const elaboratedBy = profile?.full_name || profile?.email?.split('@')[0] || 'Sistema';

        return (
            <PrintView
                tx={tx}
                tenantName={tenant?.name ?? 'Mi Empresa'}
                tenantNit={tenant?.nit ?? ''}
                tenantDv={tenant?.dv ?? ''}
                tenantCity={tenant?.city ?? 'Bogotá D.C.'}
                tenantAddress={tenant?.address ?? ''}
                tenantPhone={tenant?.phone ?? ''}
                tenantLogoUrl={tenant?.logo_url ?? null}
                journalLines={journalLines}
                elaboratedBy={elaboratedBy}
            />
        );
    }

    // ── List view ────────────────────────────────────────────────────────────

    const { data: txsRaw } = await supabase
        .from('treasury_transactions')
        .select('*, parties(legal_name, nit, doc_number), treasury_accounts(name, bank_name, account_number, chart_account_id)')
        .eq('transaction_type', 'PAYMENT')
        .order('date', { ascending: false })
        .limit(20);

    const transactions = (txsRaw ?? []) as unknown as PaymentTransaction[];

    return <ListView transactions={transactions} />;
}
