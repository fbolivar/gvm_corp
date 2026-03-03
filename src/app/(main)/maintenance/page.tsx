import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { settingsService } from '@/features/settings/services/settingsService';
import { maintenanceService } from '@/features/maintenance/services/maintenanceService';
import { EquipmentForm } from '@/features/maintenance/components/EquipmentForm';
import { MaintenanceOrderForm } from '@/features/maintenance/components/MaintenanceOrderForm';
import { OrderStatusPanel } from '@/features/maintenance/components/OrderStatusPanel';
import { STATUS_CONFIG, PRIORITY_CONFIG, TYPE_LABELS } from '@/features/maintenance/types';
import type { MaintenanceOrder } from '@/features/maintenance/types';
import {
    Wrench,
    Package,
    Clock,
    AlertTriangle,
    DollarSign,
    MapPin,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export const metadata = { title: 'Mantenimiento — GVM Corp' };

function formatDate(d: string | null | undefined) {
    if (!d) return '—';
    try { return format(new Date(d), 'dd MMM yyyy', { locale: es }); } catch { return d; }
}

function formatCOP(amount: number) {
    return amount.toLocaleString('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0,
    });
}

function HistoryRow({ order }: { order: MaintenanceOrder }) {
    const statusCfg = STATUS_CONFIG[order.status ?? 'PENDING'] ?? { label: order.status ?? '', className: '' };
    const priorityCfg = PRIORITY_CONFIG[order.priority ?? 'MEDIUM'] ?? { label: order.priority ?? '', className: '' };

    return (
        <tr className="hover:bg-slate-50/60 transition-colors">
            <td className="px-4 py-4">
                <div>
                    <p className="text-xs font-bold text-slate-700">{order.equipment?.name ?? '—'}</p>
                    <p className="text-[10px] font-mono text-slate-400">{order.equipment?.code ?? ''}</p>
                </div>
            </td>
            <td className="px-4 py-4 text-xs text-slate-600">
                {TYPE_LABELS[order.order_type ?? ''] ?? order.order_type}
            </td>
            <td className="px-4 py-4">
                <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${priorityCfg.className}`}>
                    {priorityCfg.label}
                </span>
            </td>
            <td className="px-4 py-4">
                <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${statusCfg.className}`}>
                    {statusCfg.label}
                </span>
            </td>
            <td className="px-4 py-4 text-xs text-slate-500">{order.technician_name ?? '—'}</td>
            <td className="px-4 py-4 text-xs text-slate-500">{formatDate(order.scheduled_date)}</td>
            <td className="px-4 py-4 text-xs font-bold text-slate-700">
                {order.actual_cost != null
                    ? formatCOP(Number(order.actual_cost))
                    : order.estimated_cost != null
                        ? <span className="text-slate-400">{formatCOP(Number(order.estimated_cost))} est.</span>
                        : '—'
                }
            </td>
        </tr>
    );
}

export default async function MaintenancePage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const tenant = await settingsService.getTenantInfo(supabase);
    if (!tenant) redirect('/login');

    const [equipment, allOrders, metrics] = await Promise.all([
        maintenanceService.getEquipment(supabase, tenant.id).catch(() => []),
        maintenanceService.getOrders(supabase, tenant.id, 50).catch(() => []),
        maintenanceService.getMetrics(supabase, tenant.id).catch(() => ({
            activeEquipment: 0,
            pendingOrders: 0,
            criticalOrders: 0,
            totalCost: 0,
        })),
    ]);

    const completedOrders = allOrders.filter(o => o.status === 'COMPLETED' || o.status === 'CANCELLED');

    const kpis = [
        {
            label: 'Equipos Activos',
            value: metrics.activeEquipment,
            icon: Package,
            color: 'text-sky-600',
            bg: 'bg-sky-50',
        },
        {
            label: 'Ordenes Pendientes',
            value: metrics.pendingOrders,
            icon: Clock,
            color: 'text-amber-600',
            bg: 'bg-amber-50',
        },
        {
            label: 'Criticas Activas',
            value: metrics.criticalOrders,
            icon: AlertTriangle,
            color: 'text-rose-600',
            bg: 'bg-rose-50',
        },
        {
            label: 'Costo Total Mantenimiento',
            value: formatCOP(metrics.totalCost),
            icon: DollarSign,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
        },
    ];

    return (
        <div className="page-container space-y-12 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-700">

            {/* Hero Header */}
            <div className="relative overflow-hidden bg-slate-950 rounded-[2.5rem] p-10 text-white shadow-active group">
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none group-hover:scale-110 group-hover:rotate-12 transition-all duration-1000">
                    <Wrench className="h-24 w-24 text-white" />
                </div>
                <div className="relative z-10 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="h-2 w-8 bg-sky-500 rounded-full" />
                        <span className="text-[10px] font-black uppercase tracking-[0.5em] text-sky-400">
                            Operaciones · MRO
                        </span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight uppercase leading-tight">
                        Mantenimiento<br /><span className="text-slate-500">de Equipos</span>
                    </h1>
                    <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.4em]">
                        Registro · Ordenes de Trabajo · Historial de Costos
                    </p>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {kpis.map((kpi, i) => (
                    <div key={i} className="bg-white rounded-[2.5rem] p-7 shadow-premium flex items-center gap-5">
                        <div className={`h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 ${kpi.bg} ${kpi.color}`}>
                            <kpi.icon className="h-7 w-7" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{kpi.label}</p>
                            <p className="text-xl font-black text-slate-900 tracking-tight leading-tight mt-0.5 break-words">
                                {kpi.value}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Grid */}
            <div className="grid md:grid-cols-12 gap-10 items-start">

                {/* Columna izquierda — Formularios */}
                <div className="md:col-span-4 space-y-8">

                    {/* Registrar equipo */}
                    <div className="bg-white rounded-[2.5rem] shadow-premium overflow-hidden">
                        <div className="h-2 bg-sky-600 w-full" />
                        <div className="p-8 space-y-6">
                            <div>
                                <h2 className="text-lg font-black text-slate-900 tracking-tight">Registrar Equipo</h2>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                    Nuevo activo al inventario
                                </p>
                            </div>
                            <EquipmentForm />
                        </div>
                    </div>

                    {/* Nueva orden */}
                    <div className="bg-white rounded-[2.5rem] shadow-premium overflow-hidden">
                        <div className="h-2 bg-violet-600 w-full" />
                        <div className="p-8 space-y-6">
                            <div>
                                <h2 className="text-lg font-black text-slate-900 tracking-tight">Nueva Orden de Trabajo</h2>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                    Programar mantenimiento
                                </p>
                            </div>
                            <MaintenanceOrderForm equipment={equipment} />
                        </div>
                    </div>
                </div>

                {/* Columna derecha — Panel de ordenes */}
                <div className="md:col-span-8 space-y-10">

                    {/* Ordenes activas */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="h-2 w-6 bg-violet-500 rounded-full" />
                            <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                                Ordenes Activas
                            </h2>
                            {metrics.pendingOrders > 0 && (
                                <span className="h-6 min-w-6 px-2 rounded-full bg-violet-500 text-white text-[10px] font-black flex items-center justify-center">
                                    {metrics.pendingOrders}
                                </span>
                            )}
                        </div>
                        <OrderStatusPanel orders={allOrders} />
                    </section>

                    {/* Historial completo */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="h-2 w-6 bg-slate-400 rounded-full" />
                            <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                                Historial de Ordenes
                            </h2>
                        </div>

                        <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm">
                            {completedOrders.length === 0 && allOrders.length === 0 ? (
                                <div className="py-14 text-center">
                                    <Wrench className="h-8 w-8 text-slate-200 mx-auto mb-3" />
                                    <p className="text-slate-400 font-black text-sm">Sin ordenes de mantenimiento</p>
                                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1">
                                        Crea una orden para ver el historial
                                    </p>
                                </div>
                            ) : allOrders.length === 0 ? (
                                <div className="py-14 text-center">
                                    <Wrench className="h-8 w-8 text-slate-200 mx-auto mb-3" />
                                    <p className="text-slate-400 font-black text-sm">Sin historial aun</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full" role="table">
                                        <thead>
                                            <tr className="border-b border-slate-50 bg-slate-50/50">
                                                {['Equipo', 'Tipo', 'Prioridad', 'Estado', 'Tecnico', 'Fecha Prog.', 'Costo'].map(h => (
                                                    <th
                                                        key={h}
                                                        scope="col"
                                                        className="px-4 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest"
                                                    >
                                                        {h}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {allOrders.map(order => (
                                                <HistoryRow key={order.id} order={order} />
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Equipos registrados */}
                    {equipment.length > 0 && (
                        <section className="space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="h-2 w-6 bg-sky-500 rounded-full" />
                                <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                                    Equipos Registrados
                                </h2>
                            </div>
                            <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm">
                                <div className="overflow-x-auto">
                                    <table className="w-full" role="table">
                                        <thead>
                                            <tr className="border-b border-slate-50 bg-slate-50/50">
                                                {['Codigo', 'Nombre', 'Marca / Modelo', 'Ubicacion', 'Prox. Mtto.'].map(h => (
                                                    <th
                                                        key={h}
                                                        scope="col"
                                                        className="px-4 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest"
                                                    >
                                                        {h}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {equipment.map(eq => (
                                                <tr key={eq.id} className="hover:bg-slate-50/60 transition-colors">
                                                    <td className="px-4 py-4 text-xs font-mono font-bold text-slate-700">
                                                        {eq.code}
                                                    </td>
                                                    <td className="px-4 py-4 text-xs font-bold text-slate-900">
                                                        {eq.name}
                                                    </td>
                                                    <td className="px-4 py-4 text-xs text-slate-500">
                                                        {[eq.brand, eq.model].filter(Boolean).join(' / ') || '—'}
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        {eq.location ? (
                                                            <span className="flex items-center gap-1 text-xs text-slate-500">
                                                                <MapPin className="h-3 w-3" />
                                                                {eq.location}
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs text-slate-300">—</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-4 text-xs text-slate-500">
                                                        {formatDate(eq.next_maintenance_date)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </div>
    );
}
