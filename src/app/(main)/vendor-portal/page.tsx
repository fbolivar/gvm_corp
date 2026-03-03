import { createClient } from '@/lib/supabase/server';
import { vendorPortalService } from '@/features/vendor-portal/services/vendorPortalService';
import { redirect } from 'next/navigation';
import { Users, TrendingDown, ShoppingBag, AlertTriangle, DollarSign, Search } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';

export default async function VendorPortalPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const vendors = await vendorPortalService.getVendors(supabase);

    const totalAP       = vendors.reduce((s, v) => s + v.pending_payment, 0);
    const activeVendors = vendors.filter(v => v.open_orders > 0).length;
    const topVendor     = vendors.sort((a, b) => b.pending_payment - a.pending_payment)[0];

    return (
        <div className="page-container space-y-12 pb-32 animate-in fade-in slide-in-from-bottom-8 duration-1000">

            {/* HEADER */}
            <div className="relative overflow-hidden bg-slate-950 rounded-[2.5rem] p-10 text-white shadow-active group">
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none group-hover:scale-110 group-hover:rotate-12 transition-all duration-1000">
                    <Users className="h-24 w-24 text-white" />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-10">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="h-2 w-8 bg-amber-500 rounded-full" />
                            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-amber-400">Gestión de Proveedores</span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black tracking-tighter uppercase leading-tight">
                            Portal de<br /><span className="text-slate-500">Proveedores</span>
                        </h1>
                        <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.4em]">
                            Estado de cuenta, OCs y facturas pendientes por proveedor
                        </p>
                    </div>
                    <Button className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-black text-[10px] uppercase tracking-widest h-14 px-10 rounded-2xl shadow-active" asChild>
                        <Link href="/purchasing/orders/new"><ShoppingBag className="h-4 w-4 mr-2" />Nueva Orden</Link>
                    </Button>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[
                    { label: 'Proveedores Activos', value: activeVendors,  icon: Users,         color: 'text-amber-600',  bg: 'bg-amber-50' },
                    { label: 'Total Proveedores',   value: vendors.length, icon: Search,        color: 'text-slate-600',  bg: 'bg-slate-50' },
                    { label: 'CxP Pendientes',      value: `$${(totalAP / 1e6).toFixed(1)}M`, icon: TrendingDown, color: 'text-rose-600', bg: 'bg-rose-50' },
                    { label: 'Mayor Acreedor',      value: topVendor ? `$${(topVendor.pending_payment / 1e6).toFixed(1)}M` : '$0', icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50' },
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

            {/* Vendor List */}
            {vendors.length === 0 ? (
                <div className="py-32 text-center bg-slate-50/50 rounded-[2.5rem] border-2 border-dashed border-slate-100 flex flex-col items-center gap-6">
                    <Users className="h-16 w-16 text-slate-200" />
                    <div className="space-y-2">
                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Sin Proveedores con Actividad</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Crea órdenes de compra o facturas de proveedor para ver sus estados de cuenta aquí</p>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    {vendors.map(vendor => (
                        <Link key={vendor.id} href={`/vendor-portal/${vendor.id}`} className="group block">
                            <div className="bg-white rounded-[2.5rem] p-8 shadow-premium border border-transparent hover:border-amber-100 hover:shadow-active transition-all duration-500">
                                <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                                    {/* Icon + Info */}
                                    <div className="flex items-start gap-6 flex-1 min-w-0">
                                        <div className="h-16 w-16 rounded-[1.5rem] bg-slate-50 flex items-center justify-center text-slate-400 shrink-0 group-hover:bg-amber-500 group-hover:text-white transition-all duration-500">
                                            <Users className="h-7 w-7" />
                                        </div>
                                        <div className="space-y-2 min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-3">
                                                <h3 className="text-lg font-black text-slate-900 italic tracking-tighter">{vendor.legal_name}</h3>
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">NIT {vendor.nit}</span>
                                                {vendor.open_orders > 0 && (
                                                    <Badge className="border-none text-[8px] font-black uppercase tracking-widest rounded-full px-3 bg-amber-100 text-amber-700">
                                                        {vendor.open_orders} OC abiertas
                                                    </Badge>
                                                )}
                                                {vendor.pending_payment > 0 && (
                                                    <Badge className="border-none text-[8px] font-black uppercase tracking-widest rounded-full px-3 bg-rose-100 text-rose-700">
                                                        CxP pendiente
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                {vendor.city && `${vendor.city} · `}
                                                {vendor.email && `${vendor.email} · `}
                                                {vendor.total_orders} órdenes totales
                                                {vendor.last_order_date && ` · Última: ${vendor.last_order_date}`}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Financials */}
                                    <div className="flex flex-wrap items-center gap-8 shrink-0">
                                        <div className="text-right space-y-1">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Facturado</p>
                                            <p className="text-base font-black text-slate-400 italic tracking-tighter">
                                                ${Number(vendor.total_billed).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                                            </p>
                                        </div>
                                        <div className="text-right space-y-1">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Por Pagar</p>
                                            <p className={`text-xl font-black tracking-tight ${vendor.pending_payment > 0 ? 'text-rose-600' : 'text-slate-300'}`}>
                                                ${Number(vendor.pending_payment).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                                            </p>
                                        </div>
                                        <div className="h-12 w-12 rounded-2xl border border-slate-100 flex items-center justify-center text-slate-300 group-hover:bg-amber-500 group-hover:text-white group-hover:border-amber-500 transition-all">
                                            <DollarSign className="h-5 w-5" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
