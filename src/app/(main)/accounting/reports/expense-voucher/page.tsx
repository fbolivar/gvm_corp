import { createClient } from '@/lib/supabase/server';
import { settingsService } from '@/features/settings/services/settingsService';
import { PrintButton } from '@/features/accounting/components/PrintButton';
import { Card } from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { cn } from "@/shared/lib/utils"
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
    parties: Party | null;
    treasury_accounts: TreasuryAccount | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
    return `$${n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtDate(iso: string): string {
    const [year, month, day] = iso.split('-');
    return `${day}/${month}/${year}`;
}

function amountInWords(amount: number): string {
    return `SON: ${fmt(amount)} PESOS M/CTE`;
}

function voucherNumber(tx: PaymentTransaction): string {
    if (tx.reference_number) return tx.reference_number;
    return tx.id.slice(-6).toUpperCase();
}

// ─── List View ────────────────────────────────────────────────────────────────

function ListView({ transactions }: { transactions: PaymentTransaction[] }) {
    return (
        <div className="space-y-12 pb-24 animate-in fade-in slide-in-from-bottom-8 duration-1000">

            {/* Dark hero header */}
            <div className="bg-slate-900 rounded-[3.5rem] p-12 md:p-16 text-white shadow-active relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-16 opacity-[0.03] pointer-events-none group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-1000">
                    <Wallet className="h-80 w-80" />
                </div>
                <div className="relative z-10 space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="h-2 w-12 bg-rose-500 rounded-full" />
                        <span className="text-[10px] font-black uppercase tracking-[0.5em] text-rose-400">
                            Treasury · Payment Voucher
                        </span>
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black tracking-tighter italic uppercase leading-[0.85]">
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
    tenantCity: string;
}

function PrintView({ tx, tenantName, tenantNit, tenantCity }: PrintViewProps) {
    const num = voucherNumber(tx);
    const party = tx.parties;
    const account = tx.treasury_accounts;
    const amount = Number(tx.amount);

    return (
        <div className="space-y-10 pb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">

            {/* Screen-only action bar */}
            <div className="flex items-center justify-between print:hidden">
                <Link
                    href="/accounting/reports/expense-voucher"
                    className="flex items-center gap-2.5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Volver al listado
                </Link>
                <PrintButton label="Imprimir Comprobante" />
            </div>

            {/* ── A4-style voucher ───────────────────────────────────────────── */}
            <div className={cn(
                "bg-white rounded-[2.5rem] shadow-premium mx-auto overflow-hidden",
                "print:rounded-none print:shadow-none print:max-w-none print:w-full",
                "max-w-2xl"
            )}>

                {/* Top accent stripe */}
                <div className="h-2 bg-slate-900 print:bg-slate-900" />

                <div className="p-10 md:p-14 space-y-10 print:p-10">

                    {/* Company header */}
                    <div className="text-center space-y-1.5 pb-6 border-b-2 border-slate-900">
                        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400">
                            Documento Oficial
                        </p>
                        <h2 className="text-2xl font-black italic uppercase tracking-tighter text-slate-900">
                            {tenantName}
                        </h2>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                            NIT: {tenantNit} &nbsp;·&nbsp; {tenantCity}
                        </p>
                    </div>

                    {/* Voucher title + number */}
                    <div className="text-center space-y-3">
                        <div className="inline-flex flex-col items-center gap-2">
                            <h1 className="text-3xl font-black italic uppercase tracking-tighter text-slate-900">
                                Comprobante de Egreso
                            </h1>
                            <div className="flex items-center gap-4">
                                <div className="h-px w-16 bg-slate-200" />
                                <span className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400">
                                    Payment Voucher
                                </span>
                                <div className="h-px w-16 bg-slate-200" />
                            </div>
                        </div>
                        <div className="inline-flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-2xl">
                            <Wallet className="h-3.5 w-3.5 text-rose-400" />
                            <span className="text-[10px] font-black uppercase tracking-widest">
                                N° {num}
                            </span>
                        </div>
                    </div>

                    {/* Date row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 rounded-2xl p-5 space-y-1.5">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                Fecha
                            </p>
                            <p className="text-base font-black text-slate-900 italic tracking-tight">
                                {fmtDate(tx.date)}
                            </p>
                        </div>
                        <div className="bg-slate-50 rounded-2xl p-5 space-y-1.5">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                Referencia
                            </p>
                            <p className="text-base font-black text-slate-900 italic tracking-tight font-mono">
                                {tx.reference_number ?? '—'}
                            </p>
                        </div>
                    </div>

                    {/* Beneficiary */}
                    <div className="border border-slate-100 rounded-2xl p-6 space-y-4">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            Datos del Beneficiario
                        </p>
                        <div className="grid grid-cols-1 gap-3">
                            <div className="flex items-start justify-between gap-4">
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 shrink-0">
                                    Nombre / Razón Social
                                </span>
                                <span className="text-sm font-black italic uppercase text-slate-900 text-right">
                                    {party?.legal_name ?? 'Sin beneficiario'}
                                </span>
                            </div>
                            <div className="h-px bg-slate-50" />
                            <div className="flex items-start justify-between gap-4">
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 shrink-0">
                                    NIT / C.C.
                                </span>
                                <span className="text-sm font-black text-slate-700 text-right font-mono">
                                    {party?.nit ?? party?.doc_number ?? '—'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Concept */}
                    <div className="border border-slate-100 rounded-2xl p-6 space-y-3">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            Concepto del Pago
                        </p>
                        <p className="text-sm font-bold text-slate-800 leading-relaxed">
                            {tx.description ?? 'Pago realizado'}
                        </p>
                    </div>

                    {/* Amount box */}
                    <div className="bg-slate-900 rounded-2xl p-6 space-y-3">
                        <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">
                            Valor del Egreso
                        </p>
                        <div className="flex items-baseline justify-between gap-4">
                            <p className="text-4xl font-black italic text-white tracking-tighter tabular-nums">
                                {fmt(amount)}
                            </p>
                            <Badge className="bg-rose-500/20 border border-rose-500/30 text-rose-300 text-[8px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-lg">
                                Egreso
                            </Badge>
                        </div>
                        <p className="text-[10px] font-black text-white/60 uppercase tracking-widest pt-1 border-t border-white/10">
                            {amountInWords(amount)}
                        </p>
                    </div>

                    {/* Account info */}
                    {account && (
                        <div className="border border-slate-100 rounded-2xl p-6 space-y-4">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                Cuenta de Egreso
                            </p>
                            <div className="grid grid-cols-1 gap-3">
                                <div className="flex items-start justify-between gap-4">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 shrink-0">
                                        Entidad / Cuenta
                                    </span>
                                    <span className="text-sm font-black italic uppercase text-slate-900 text-right">
                                        {account.bank_name ?? account.name}
                                    </span>
                                </div>
                                {account.account_number && (
                                    <>
                                        <div className="h-px bg-slate-50" />
                                        <div className="flex items-start justify-between gap-4">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 shrink-0">
                                                Número de Cuenta
                                            </span>
                                            <span className="text-sm font-black text-slate-700 text-right font-mono">
                                                {account.account_number}
                                            </span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Reconciliation status */}
                    <div className="flex items-center justify-end gap-3">
                        <div className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest",
                            tx.is_reconciled
                                ? "bg-emerald-50 text-emerald-600"
                                : "bg-amber-50 text-amber-600"
                        )}>
                            <span className={cn(
                                "h-2 w-2 rounded-full",
                                tx.is_reconciled ? "bg-emerald-400" : "bg-amber-400 animate-pulse"
                            )} />
                            {tx.is_reconciled ? 'Conciliado' : 'Pendiente conciliación'}
                        </div>
                    </div>

                    {/* Signature lines */}
                    <div className="pt-8 border-t border-slate-100">
                        <div className="grid grid-cols-3 gap-6">
                            {['Elaboró', 'Revisó', 'Aprobó'].map((label) => (
                                <div key={label} className="flex flex-col items-center gap-3">
                                    <div className="w-full h-12 border-b-2 border-slate-300" />
                                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 text-center">
                                        {label}
                                    </p>
                                    <div className="h-3 w-24 bg-slate-100 rounded-full" />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Footer note */}
                    <div className="text-center pt-2">
                        <p className="text-[8px] font-bold text-slate-300 uppercase tracking-[0.3em]">
                            Documento generado el {new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })} &nbsp;·&nbsp; {tenantName}
                        </p>
                    </div>
                </div>

                {/* Bottom accent stripe */}
                <div className="h-1.5 bg-rose-500 print:bg-rose-500" />
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
            .select('*, parties(legal_name, nit, doc_number), treasury_accounts(name, bank_name, account_number)')
            .eq('id', params.id)
            .eq('transaction_type', 'PAYMENT')
            .single();

        if (!txRaw) {
            redirect('/accounting/reports/expense-voucher');
        }

        const tx = txRaw as unknown as PaymentTransaction;

        return (
            <PrintView
                tx={tx}
                tenantName={tenant?.name ?? 'Mi Empresa'}
                tenantNit={tenant ? `${tenant.nit}-${tenant.dv}` : ''}
                tenantCity={tenant?.city ?? 'Colombia'}
            />
        );
    }

    // ── List view ────────────────────────────────────────────────────────────

    const { data: txsRaw } = await supabase
        .from('treasury_transactions')
        .select('*, parties(legal_name, nit, doc_number), treasury_accounts(name, bank_name, account_number)')
        .eq('transaction_type', 'PAYMENT')
        .order('date', { ascending: false })
        .limit(20);

    const transactions = (txsRaw ?? []) as unknown as PaymentTransaction[];

    return <ListView transactions={transactions} />;
}
