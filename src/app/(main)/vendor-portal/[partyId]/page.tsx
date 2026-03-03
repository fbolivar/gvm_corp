import { createClient } from '@/lib/supabase/server';
import { vendorPortalService } from '@/features/vendor-portal/services/vendorPortalService';
import { redirect } from 'next/navigation';
import { ArrowLeft, Users, ShoppingBag, Receipt, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';

const DOC_STATUS_LABELS: Record<string, string> = {
    DRAFT: 'Borrador', SENT: 'Enviada', ACCEPTED: 'Recibida',
    REJECTED: 'Rechazada', CANCELLED: 'Anulada', PAID: 'Pagada', VOID: 'Nula',
};
const DOC_STATUS_COLORS: Record<string, string> = {
    DRAFT: 'bg-slate-100 text-slate-500',
    SENT: 'bg-blue-100 text-blue-700',
    ACCEPTED: 'bg-emerald-100 text-emerald-700',
    REJECTED: 'bg-rose-100 text-rose-700',
    CANCELLED: 'bg-slate-100 text-slate-400',
    PAID: 'bg-emerald-100 text-emerald-700',
    VOID: 'bg-slate-100 text-slate-400',
};

export default async function VendorStatementPage({ params }: { params: Promise<{ partyId: string }> }) {
    const { partyId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const statement = await vendorPortalService.getVendorStatement(supabase, partyId);
    const { vendor, orders, bills, totalPending, totalPaid, totalOrders, overdueAmount } = statement;

    const today = new Date().toISOString().split('T')[0];

    return (
        <div className="page-container space-y-12 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-1000">

            {/* Header */}
            <div className="flex items-start justify-between gap-6">
                <div className="flex items-start gap-5">
                    <div className="h-16 w-16 rounded-[1.5rem] bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                        <Users className="h-8 w-8" />
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-3xl font-black tracking-tight text-slate-900">{vendor.legal_name}</h1>
                        <div className="flex flex-wrap items-center gap-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            <span>NIT {vendor.nit}</span>
                            {vendor.city && <span>· {vendor.city}</span>}
                            {vendor.email && <span>· {vendor.email}</span>}
                            {vendor.phone && <span>· {vendor.phone}</span>}
                        </div>
                    </div>
                </div>
                <Button variant="outline" className="h-12 border-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-widest shrink-0" asChild>
                    <Link href="/vendor-portal"><ArrowLeft className="h-4 w-4 mr-2" />Proveedores</Link>
                </Button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[
                    { label: 'Total Órdenes',   value: totalOrders,         icon: ShoppingBag,    color: 'text-amber-600',  bg: 'bg-amber-50' },
                    { label: 'Por Pagar',        value: `$${(totalPending / 1e6).toFixed(2)}M`, icon: Receipt, color: 'text-rose-600', bg: 'bg-rose-50' },
                    { label: 'Total Pagado',     value: `$${(totalPaid / 1e6).toFixed(2)}M`,    icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Vencido',          value: overdueAmount > 0 ? `$${(overdueAmount / 1e6).toFixed(2)}M` : '$0', icon: AlertTriangle, color: overdueAmount > 0 ? 'text-rose-600' : 'text-slate-400', bg: overdueAmount > 0 ? 'bg-rose-50' : 'bg-slate-50' },
                ].map((kpi, i) => (
                    <div key={i} className="bg-white rounded-[2.5rem] p-7 shadow-premium flex items-center gap-5">
                        <div className={`h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 ${kpi.bg} ${kpi.color}`}>
                            <kpi.icon className="h-7 w-7" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{kpi.label}</p>
                            <p className="text-xl font-black text-slate-900 tracking-tight">{kpi.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
                <Button className="h-12 px-6 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-[10px] uppercase tracking-widest" asChild>
                    <Link href={`/purchasing/orders/new?party_id=${partyId}`}><ShoppingBag className="h-4 w-4 mr-2" />Nueva OC</Link>
                </Button>
                <Button variant="outline" className="h-12 px-6 rounded-2xl border-slate-200 font-black text-[10px] uppercase tracking-widest" asChild>
                    <Link href={`/purchasing/bills/new?party_id=${partyId}`}><Receipt className="h-4 w-4 mr-2" />Registrar Factura</Link>
                </Button>
                <Button variant="outline" className="h-12 px-6 rounded-2xl border-slate-200 font-black text-[10px] uppercase tracking-widest" asChild>
                    <Link href={`/parties/${partyId}`}><Users className="h-4 w-4 mr-2" />Ver Ficha</Link>
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Purchase Orders */}
                <div className="bg-white rounded-[2.5rem] p-10 shadow-premium space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                            <ShoppingBag className="h-5 w-5 text-amber-500" />
                            Órdenes de Compra
                        </h3>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{orders.length} registros</span>
                    </div>

                    {orders.length === 0 ? (
                        <div className="py-10 text-center">
                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Sin órdenes de compra</p>
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                            {orders.map(order => (
                                <div key={order.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/60 border border-slate-100 hover:bg-slate-50 transition-colors">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-black text-slate-900 italic">#{order.number}</span>
                                            <Badge className={`border-none text-[7px] font-black uppercase tracking-widest rounded-full px-2 ${DOC_STATUS_COLORS[order.status] ?? 'bg-slate-100 text-slate-500'}`}>
                                                {DOC_STATUS_LABELS[order.status] ?? order.status}
                                            </Badge>
                                        </div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                            {order.issue_date}
                                            {order.due_date && ` · Vence: ${order.due_date}`}
                                        </p>
                                    </div>
                                    <p className="text-base font-black text-slate-900 italic tracking-tighter">
                                        ${Number(order.total).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Vendor Bills */}
                <div className="bg-white rounded-[2.5rem] p-10 shadow-premium space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                            <Receipt className="h-5 w-5 text-rose-500" />
                            Facturas de Proveedor
                        </h3>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{bills.length} registros</span>
                    </div>

                    {bills.length === 0 ? (
                        <div className="py-10 text-center">
                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Sin facturas registradas</p>
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                            {bills.map(bill => {
                                const isOverdue = bill.due_date && bill.due_date < today && ['DRAFT', 'SENT', 'ACCEPTED'].includes(bill.status);
                                return (
                                    <div key={bill.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-colors ${isOverdue ? 'bg-rose-50/60 border-rose-100' : 'bg-slate-50/60 border-slate-100 hover:bg-slate-50'}`}>
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-black text-slate-900 italic">#{bill.number}</span>
                                                <Badge className={`border-none text-[7px] font-black uppercase tracking-widest rounded-full px-2 ${DOC_STATUS_COLORS[bill.status] ?? 'bg-slate-100 text-slate-500'}`}>
                                                    {DOC_STATUS_LABELS[bill.status] ?? bill.status}
                                                </Badge>
                                                {isOverdue && (
                                                    <Badge className="border-none text-[7px] font-black uppercase tracking-widest rounded-full px-2 bg-rose-100 text-rose-700">
                                                        Vencida
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                                {bill.issue_date}
                                                {bill.due_date && (
                                                    <><Clock className="h-2.5 w-2.5" />Vence: {bill.due_date}</>
                                                )}
                                            </p>
                                        </div>
                                        <p className={`text-base font-black italic tracking-tighter ${isOverdue ? 'text-rose-600' : 'text-slate-900'}`}>
                                            ${Number(bill.total).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Running balance */}
                    {bills.length > 0 && (
                        <div className="pt-4 border-t border-slate-100 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="font-bold text-slate-400">Saldo Pendiente</span>
                                <span className="font-black text-rose-600">${totalPending.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</span>
                            </div>
                            {overdueAmount > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="font-bold text-rose-400 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Vencido</span>
                                    <span className="font-black text-rose-500">${overdueAmount.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-sm">
                                <span className="font-bold text-slate-400">Total Pagado</span>
                                <span className="font-black text-emerald-600">${totalPaid.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
