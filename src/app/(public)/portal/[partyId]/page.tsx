import { createAdminClient } from '@/lib/supabase/admin';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import {
    Building2, FileText, DollarSign, Clock, CheckCircle2,
    AlertTriangle, ArrowRight, Mail, Phone, Shield
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: typeof Clock }> = {
    DRAFT:    { label: 'Borrador',  color: 'text-slate-500',   bg: 'bg-slate-100',   icon: FileText },
    SENT:     { label: 'Emitida',   color: 'text-indigo-600',  bg: 'bg-indigo-100',  icon: Clock },
    SIGNED:   { label: 'Firmada',   color: 'text-indigo-600',  bg: 'bg-indigo-100',  icon: Clock },
    ACCEPTED: { label: 'Pendiente', color: 'text-amber-600',   bg: 'bg-amber-100',   icon: AlertTriangle },
    REJECTED: { label: 'Rechazada', color: 'text-rose-600',    bg: 'bg-rose-100',    icon: AlertTriangle },
    VOIDED:   { label: 'Anulada',   color: 'text-slate-400',   bg: 'bg-slate-100',   icon: FileText },
    PAID:     { label: 'Pagada',    color: 'text-emerald-600', bg: 'bg-emerald-100', icon: CheckCircle2 },
};

const ACTIVE_STATUSES = ['SENT', 'SIGNED', 'ACCEPTED'];

export default async function ClientPortalPage({ params }: { params: Promise<{ partyId: string }> }) {
    const { partyId } = await params;
    const supabase = createAdminClient();

    // Fetch party info
    const { data: party, error: partyError } = await supabase
        .from('parties')
        .select('id, legal_name, trade_name, email, phone, nit, doc_number')
        .eq('id', partyId)
        .single();

    if (partyError || !party) notFound();

    // Fetch documents (invoices and credit notes)
    const { data: documents } = await supabase
        .from('documents')
        .select('id, number, doc_type, issue_date, due_date, total, balance, status')
        .eq('party_id', partyId)
        .in('doc_type', ['INVOICE', 'CREDIT_NOTE'])
        .order('issue_date', { ascending: false })
        .limit(50);

    const docs = documents || [];

    // Aggregate stats
    const pendingDocs = docs.filter(d => ACTIVE_STATUSES.includes(d.status));
    const pendingTotal = pendingDocs.reduce((s, d) => s + (Number(d.balance) || Number(d.total) || 0), 0);

    const now = new Date();
    const overdueDocs = pendingDocs.filter(d => {
        const due = new Date(d.due_date || d.issue_date);
        return (now.getTime() - due.getTime()) / (1000 * 3600 * 24) > 0;
    });
    const overdueTotal = overdueDocs.reduce((s, d) => s + (Number(d.balance) || Number(d.total) || 0), 0);

    const paidDocs = docs.filter(d => d.status === 'PAID');
    const paidTotal = paidDocs.reduce((s, d) => s + (Number(d.total) || 0), 0);

    const fmt = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`;
    const displayName = party.trade_name || party.legal_name;

    return (
        <div className="min-h-screen bg-slate-50">
            {/* BRANDED HEADER */}
            <div className="bg-slate-950 text-white">
                <div className="max-w-4xl mx-auto px-6 py-10 space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center">
                            <Shield className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-indigo-400">Centro de Cuentas</p>
                            <p className="text-[9px] font-black uppercase tracking-widest text-white/30">Powered by GVM Corp ERP</p>
                        </div>
                    </div>

                    <div>
                        <h1 className="text-4xl font-black italic tracking-tighter uppercase leading-none">{displayName}</h1>
                        {party.nit && <p className="text-white/40 font-bold text-[10px] uppercase tracking-widest mt-2">NIT {party.nit}</p>}
                        <div className="flex flex-wrap items-center gap-4 mt-4">
                            {party.email && (
                                <div className="flex items-center gap-2 text-white/50 text-[10px] font-bold">
                                    <Mail className="h-3.5 w-3.5" />{party.email}
                                </div>
                            )}
                            {party.phone && (
                                <div className="flex items-center gap-2 text-white/50 text-[10px] font-bold">
                                    <Phone className="h-3.5 w-3.5" />{party.phone}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">

                {/* KPI STRIP */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    <div className={cn(
                        "rounded-3xl p-6 space-y-2",
                        overdueTotal > 0 ? "bg-rose-600 text-white" : "bg-white shadow-sm border border-slate-100"
                    )}>
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 opacity-60" />
                            <span className="text-[9px] font-black uppercase tracking-widest opacity-60">Saldo Vencido</span>
                        </div>
                        <p className={cn("text-2xl font-black italic tracking-tighter", overdueTotal > 0 ? "text-white" : "text-rose-600")}>
                            {fmt(overdueTotal)}
                        </p>
                        <p className="text-[9px] font-bold opacity-50">{overdueDocs.length} factura(s)</p>
                    </div>

                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-2">
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-amber-500" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Pendiente Total</span>
                        </div>
                        <p className="text-2xl font-black italic tracking-tighter text-amber-600">{fmt(pendingTotal)}</p>
                        <p className="text-[9px] font-bold text-slate-300">{pendingDocs.length} factura(s) activa(s)</p>
                    </div>

                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-2">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total Pagado</span>
                        </div>
                        <p className="text-2xl font-black italic tracking-tighter text-emerald-600">{fmt(paidTotal)}</p>
                        <p className="text-[9px] font-bold text-slate-300">{paidDocs.length} factura(s)</p>
                    </div>
                </div>

                {/* DOCUMENT LIST */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="px-8 py-6 border-b border-slate-100">
                        <h2 className="text-lg font-black italic uppercase tracking-tight text-slate-900">Estado de Cuenta</h2>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Historial de facturas y documentos</p>
                    </div>

                    {docs.length === 0 ? (
                        <div className="px-8 py-20 text-center space-y-3">
                            <FileText className="h-10 w-10 text-slate-200 mx-auto" />
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No hay documentos registrados</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-50">
                            {docs.map(doc => {
                                const meta = STATUS_META[doc.status] || STATUS_META.SENT;
                                const Icon = meta.icon;
                                const isPayable = ACTIVE_STATUSES.includes(doc.status);
                                return (
                                    <div key={doc.id} className="px-8 py-5 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", meta.bg, meta.color)}>
                                                <Icon className="h-4.5 w-4.5" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-black text-slate-900 text-sm">{doc.number}</span>
                                                    <Badge className={cn("border-none font-black text-[8px] tracking-widest px-2.5 py-0.5 rounded-full", meta.bg, meta.color)}>
                                                        {meta.label}
                                                    </Badge>
                                                </div>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                                    {doc.issue_date}
                                                    {doc.due_date && ` · Vence ${doc.due_date}`}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 shrink-0">
                                            <div className="text-right">
                                                <p className="font-black text-slate-900 italic tabular-nums">{fmt(Number(doc.total) || 0)}</p>
                                                {doc.balance != null && Number(doc.balance) !== Number(doc.total) && (
                                                    <p className="text-[9px] font-bold text-rose-500">Saldo: {fmt(Number(doc.balance))}</p>
                                                )}
                                            </div>

                                            {isPayable && doc.doc_type === 'INVOICE' && (
                                                <Button asChild size="sm" className="h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[9px] uppercase tracking-widest shadow-sm">
                                                    <Link href={`/portal/pago/${doc.id}`} className="flex items-center gap-1.5">
                                                        Pagar <ArrowRight className="h-3 w-3" />
                                                    </Link>
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* FOOTER */}
                <div className="text-center space-y-2 pb-6">
                    <div className="flex items-center justify-center gap-2 text-slate-300">
                        <Building2 className="h-4 w-4" />
                        <span className="text-[9px] font-black uppercase tracking-[0.3em]">GVM Corp ERP — Portal Seguro de Clientes</span>
                    </div>
                    <p className="text-[8px] text-slate-300 font-medium">Los datos mostrados son de carácter informativo. Para disputas, contacte a su proveedor.</p>
                </div>
            </div>
        </div>
    );
}
