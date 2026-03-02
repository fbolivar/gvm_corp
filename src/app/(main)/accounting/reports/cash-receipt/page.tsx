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
    parties: Party | null;
    treasury_accounts: TreasuryAccount | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
    `$${n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

function fmtDate(dateStr: string): string {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
}

function shortId(id: string): string {
    return id.slice(0, 8).toUpperCase();
}

// ── List View ─────────────────────────────────────────────────────────────────

function ListView({ transactions }: { transactions: TreasuryTransaction[] }) {
    return (
        <div className="space-y-12 pb-24 animate-in fade-in slide-in-from-bottom-8 duration-1000">

            {/* Dark header */}
            <div className="bg-slate-900 rounded-[3.5rem] p-12 md:p-20 text-white shadow-active relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-16 opacity-[0.03] pointer-events-none group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-1000">
                    <Receipt className="h-80 w-80" />
                </div>
                <div className="relative z-10 space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="h-2 w-12 bg-emerald-500 rounded-full" />
                        <span className="text-[10px] font-black uppercase tracking-[0.5em] text-emerald-400">
                            Cash Receipt Module v3.0
                        </span>
                    </div>
                    <h1 className="text-5xl md:text-8xl font-black tracking-tighter italic uppercase leading-[0.8]">
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
                        <h2 className="text-6xl font-black text-emerald-600 tracking-tighter italic leading-none">
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
}

function PrintView({
    tx,
    tenantName,
    tenantNit,
    tenantDv,
    tenantAddress,
    tenantPhone,
    tenantEmail,
    tenantCity,
    tenantLogoUrl,
}: PrintViewProps) {
    const amount = Number(tx.amount);
    const refNum = tx.reference_number || shortId(tx.id);
    const payerName = tx.parties?.legal_name ?? 'CONSUMIDOR FINAL';
    const payerNit = tx.parties?.nit ?? '';
    const accountName = tx.treasury_accounts?.name ?? null;
    const bankName = tx.treasury_accounts?.bank_name ?? null;
    const paymentMethod = bankName ? 'Transferencia Bancaria' : 'Efectivo';

    return (
        <div className="min-h-screen bg-slate-100 print:bg-white">
            {/* Controls bar — hidden on print */}
            <div className="print:hidden bg-white border-b border-slate-100 px-8 py-5 flex items-center justify-between shadow-sm">
                <Link
                    href="/accounting/reports/cash-receipt"
                    className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-slate-900 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Volver a la lista
                </Link>
                <div className="flex items-center gap-4">
                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">
                        Recibo #{refNum}
                    </span>
                    <PrintButton label="Imprimir Recibo" />
                </div>
            </div>

            {/* A4 sheet wrapper */}
            <div className="flex items-start justify-center py-12 print:py-0 print:block">
                <div className={cn(
                    "bg-white w-full max-w-[794px] min-h-[1123px]",
                    "print:w-full print:max-w-none print:min-h-0 print:shadow-none",
                    "shadow-[0_8px_80px_rgba(0,0,0,0.15)] print:rounded-none rounded-[2.5rem]",
                    "flex flex-col"
                )}>

                    {/* ── COMPANY HEADER ──────────────────────────────────── */}
                    <div className="px-16 pt-14 pb-10 border-b-4 border-slate-900 flex items-start justify-between gap-8">
                        <div className="flex items-center gap-5">
                            {tenantLogoUrl ? (
                                <img
                                    src={tenantLogoUrl}
                                    alt={tenantName}
                                    className="h-16 w-auto object-contain"
                                />
                            ) : (
                                <div className="h-16 w-16 rounded-2xl bg-slate-900 flex items-center justify-center text-white shrink-0">
                                    <Building2 className="h-8 w-8" />
                                </div>
                            )}
                            <div>
                                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-tight">
                                    {tenantName}
                                </h2>
                                <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest mt-1">
                                    NIT: {tenantNit}-{tenantDv}
                                </p>
                                <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2">
                                    {tenantAddress && (
                                        <span className="flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase">
                                            <MapPin className="h-3 w-3 shrink-0" />
                                            {tenantAddress}{tenantCity ? `, ${tenantCity}` : ''}
                                        </span>
                                    )}
                                    {tenantPhone && (
                                        <span className="flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase">
                                            <Phone className="h-3 w-3 shrink-0" />
                                            {tenantPhone}
                                        </span>
                                    )}
                                    {tenantEmail && (
                                        <span className="flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase">
                                            <Mail className="h-3 w-3 shrink-0" />
                                            {tenantEmail}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Receipt title block */}
                        <div className="text-right shrink-0">
                            <div className="inline-block border-2 border-slate-900 rounded-2xl px-6 py-4">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em] leading-none mb-2">
                                    Documento
                                </p>
                                <h1 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">
                                    Recibo de Caja
                                </h1>
                                <div className="mt-3 flex flex-col gap-1">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                        No.
                                    </span>
                                    <span className="text-xl font-black text-emerald-600 italic tracking-tighter">
                                        {refNum}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── DATE ROW ─────────────────────────────────────────── */}
                    <div className="px-16 py-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em]">
                                Fecha:
                            </span>
                            <span className="text-sm font-black text-slate-900 italic tracking-tight">
                                {fmtDate(tx.date)}
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em]">
                                Cuenta:
                            </span>
                            <span className="text-sm font-black text-slate-700 italic">
                                {accountName ?? 'Caja General'}
                            </span>
                        </div>
                    </div>

                    {/* ── BODY ─────────────────────────────────────────────── */}
                    <div className="px-16 py-10 flex-1 space-y-8">

                        {/* RECIBIMOS DE */}
                        <div className="border border-slate-200 rounded-2xl overflow-hidden">
                            <div className="bg-slate-900 px-6 py-3">
                                <span className="text-[9px] font-black text-white uppercase tracking-[0.5em]">
                                    Recibimos De
                                </span>
                            </div>
                            <div className="px-6 py-5 flex items-center justify-between gap-6">
                                <div className="flex-1">
                                    <p className="text-base font-black text-slate-900 uppercase italic tracking-tight">
                                        {payerName}
                                    </p>
                                    {payerNit && (
                                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                            NIT / CC: {payerNit}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* LA SUMA DE */}
                        <div className="border border-slate-200 rounded-2xl overflow-hidden">
                            <div className="bg-emerald-600 px-6 py-3">
                                <span className="text-[9px] font-black text-white uppercase tracking-[0.5em]">
                                    La Suma De
                                </span>
                            </div>
                            <div className="px-6 py-5">
                                <p className="text-sm font-black text-slate-700 uppercase italic tracking-tight">
                                    SON: {fmt(amount)} PESOS M/CTE
                                </p>
                            </div>
                        </div>

                        {/* POR CONCEPTO DE */}
                        <div className="border border-slate-200 rounded-2xl overflow-hidden">
                            <div className="bg-slate-100 px-6 py-3">
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.5em]">
                                    Por Concepto De
                                </span>
                            </div>
                            <div className="px-6 py-5">
                                <p className="text-sm font-medium text-slate-700 leading-relaxed">
                                    {tx.description ?? 'Pago recibido'}
                                </p>
                            </div>
                        </div>

                        {/* FORMA DE PAGO */}
                        <div className="border border-slate-200 rounded-2xl overflow-hidden">
                            <div className="bg-slate-100 px-6 py-3">
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.5em]">
                                    Forma de Pago
                                </span>
                            </div>
                            <div className="px-6 py-5 flex items-center gap-4">
                                <span className="text-sm font-black text-slate-700 italic uppercase tracking-tight">
                                    {paymentMethod}
                                </span>
                                {bankName && (
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        — {bankName}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* AMOUNT BOX — hero display */}
                        <div className="bg-slate-900 rounded-2xl px-8 py-6 flex items-center justify-between">
                            <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.5em] mb-1">
                                    Valor Total Recibido
                                </p>
                                <p className="text-4xl font-black text-emerald-400 italic tracking-tighter leading-none">
                                    {fmt(amount)}
                                </p>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-2">
                                    PESOS MONEDA CORRIENTE
                                </p>
                            </div>
                            <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                                <Receipt className="h-8 w-8 text-emerald-400" />
                            </div>
                        </div>

                    </div>

                    {/* ── SIGNATURES ───────────────────────────────────────── */}
                    <div className="px-16 pb-14 pt-6 border-t-2 border-slate-100">
                        <div className="grid grid-cols-2 gap-16 mt-8">
                            <div className="flex flex-col gap-2">
                                <div className="h-px bg-slate-900 w-full" />
                                <p className="text-[10px] font-black text-slate-700 uppercase tracking-[0.4em] text-center">
                                    Recibido Por
                                </p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center">
                                    Nombre, Cargo y Sello
                                </p>
                            </div>
                            <div className="flex flex-col gap-2">
                                <div className="h-px bg-slate-400 w-full" />
                                <p className="text-[10px] font-black text-slate-700 uppercase tracking-[0.4em] text-center">
                                    Firma del Pagador
                                </p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center">
                                    Nombre y Documento
                                </p>
                            </div>
                        </div>

                        {/* Footer legal note */}
                        <div className="mt-10 pt-6 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">
                                Este documento es soporte contable válido conforme a la normativa colombiana
                            </span>
                            <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">
                                {tenantName} • NIT {tenantNit}-{tenantDv}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
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
            .select('*, parties(legal_name, nit), treasury_accounts(name, bank_name)')
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
            />
        );
    }

    // ── LIST VIEW ─────────────────────────────────────────────────────────────
    const queryBuilder = supabase
        .from('treasury_transactions')
        .select('*, parties(legal_name, nit), treasury_accounts(name, bank_name)')
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
