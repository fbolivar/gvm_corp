import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { lotService } from '@/features/inventory/services/lotService';
import { settingsService } from '@/features/settings/services/settingsService';
import { LotForm } from '@/features/inventory/components/LotForm';
import {
    FlaskConical,
    AlertTriangle,
    Package,
    DollarSign,
    Calendar,
    ShieldCheck,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export const metadata = { title: 'Lotes y Vencimientos — GVM Corp' };

function formatDate(d: string | null | undefined) {
    if (!d) return '—';
    try { return format(new Date(d), 'dd MMM yyyy', { locale: es }); } catch { return d; }
}

function getDaysUntilExpiry(expirationDate: string): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exp = new Date(expirationDate);
    exp.setHours(0, 0, 0, 0);
    return Math.floor((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function ExpiryBadge({ days }: { days: number }) {
    if (days < 0) {
        return (
            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-rose-100 text-rose-700">
                Vencido
            </span>
        );
    }
    if (days <= 30) {
        return (
            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-rose-100 text-rose-700">
                {days}d
            </span>
        );
    }
    if (days <= 90) {
        return (
            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
                {days}d
            </span>
        );
    }
    return (
        <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
            {days}d
        </span>
    );
}

const STATUS_BADGES: Record<string, string> = {
    ACTIVE:     'bg-emerald-100 text-emerald-700',
    QUARANTINE: 'bg-amber-100 text-amber-700',
    EXPIRED:    'bg-rose-100 text-rose-700',
    DEPLETED:   'bg-slate-100 text-slate-500',
};

const STATUS_LABELS: Record<string, string> = {
    ACTIVE:     'Activo',
    QUARANTINE: 'Cuarentena',
    EXPIRED:    'Expirado',
    DEPLETED:   'Agotado',
};

export default async function LotsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const tenant = await settingsService.getTenantInfo(supabase);
    if (!tenant) redirect('/login');

    const [summary, expiringLots, allLots] = await Promise.all([
        lotService.getSummary(supabase).catch(() => ({
            total_lots: 0,
            active_lots: 0,
            expired_lots: 0,
            expiring_30d: 0,
            expiring_90d: 0,
            quarantine_lots: 0,
            total_value: 0,
        })),
        lotService.getExpiringLots(supabase, 180).catch(() => []),
        lotService.getLots(supabase).catch(() => []),
    ]);

    // Fetch products, warehouses, suppliers for the form
    const [productsResult, warehousesResult, suppliersResult] = await Promise.all([
        supabase
            .from('products')
            .select('id, name, sku')
            .eq('is_active', true)
            .order('name')
            .limit(500),
        supabase
            .from('warehouses')
            .select('id, name')
            .order('name'),
        supabase
            .from('parties')
            .select('id, legal_name')
            .eq('is_vendor', true)
            .order('legal_name')
            .limit(200),
    ]);

    const products   = (productsResult.data   ?? []) as { id: string; name: string; sku: string }[];
    const warehouses = (warehousesResult.data  ?? []) as { id: string; name: string }[];
    const suppliers  = (suppliersResult.data   ?? []) as { id: string; legal_name: string }[];

    const kpis = [
        {
            label: 'Lotes Activos',
            value: Number(summary.active_lots).toLocaleString('es-CO'),
            icon: Package,
            color: 'text-indigo-600',
            bg: 'bg-indigo-50',
        },
        {
            label: 'Por Vencer (30d)',
            value: Number(summary.expiring_30d).toLocaleString('es-CO'),
            icon: AlertTriangle,
            color: 'text-rose-600',
            bg: 'bg-rose-50',
        },
        {
            label: 'Por Vencer (90d)',
            value: Number(summary.expiring_90d).toLocaleString('es-CO'),
            icon: Calendar,
            color: 'text-amber-600',
            bg: 'bg-amber-50',
        },
        {
            label: 'Valor Total',
            value: `$${Number(summary.total_value).toLocaleString('es-CO')}`,
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
                    <FlaskConical className="h-24 w-24 text-white" />
                </div>
                <div className="relative z-10 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="h-2 w-8 bg-indigo-500 rounded-full" />
                        <span className="text-[10px] font-black uppercase tracking-[0.5em] text-indigo-400">
                            Inventario · Trazabilidad
                        </span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight uppercase leading-tight">
                        Lotes y<br /><span className="text-slate-500">Vencimientos</span>
                    </h1>
                    <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.4em]">
                        Trazabilidad · Vencimientos · Control de Lotes
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

                {/* Columna izquierda — Formulario */}
                <div className="md:col-span-4">
                    <div className="bg-white rounded-[2.5rem] shadow-premium overflow-hidden">
                        <div className="h-2 bg-indigo-600 w-full" />
                        <div className="p-8 space-y-6">
                            <div>
                                <h2 className="text-lg font-black text-slate-900 tracking-tight">Nuevo Lote</h2>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                    Registrar lote con trazabilidad
                                </p>
                            </div>
                            <LotForm
                                products={products}
                                warehouses={warehouses}
                                suppliers={suppliers}
                            />
                        </div>
                    </div>
                </div>

                {/* Columna derecha — Alertas y tabla */}
                <div className="md:col-span-8 space-y-10">

                    {/* Alertas de Vencimiento */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="h-2 w-6 bg-rose-500 rounded-full" />
                            <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                                Alertas de Vencimiento
                            </h2>
                            {expiringLots.length > 0 && (
                                <span className="h-6 min-w-6 px-2 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center">
                                    {expiringLots.length}
                                </span>
                            )}
                        </div>

                        {expiringLots.length === 0 ? (
                            <div className="bg-white rounded-[2rem] border border-dashed border-slate-200 py-14 text-center">
                                <ShieldCheck className="h-8 w-8 text-emerald-300 mx-auto mb-3" />
                                <p className="text-slate-400 font-black text-sm">Sin vencimientos próximos</p>
                                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1">
                                    Todos los lotes en buen estado
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {expiringLots.map(lot => {
                                    const days = typeof lot.days_until_expiry === 'number'
                                        ? lot.days_until_expiry
                                        : getDaysUntilExpiry(lot.expiration_date);

                                    const borderColor = days < 0
                                        ? 'border-rose-200 bg-rose-50/50'
                                        : days <= 30
                                            ? 'border-rose-100 bg-rose-50/30'
                                            : days <= 90
                                                ? 'border-amber-100 bg-amber-50/30'
                                                : 'border-slate-100 bg-white';

                                    return (
                                        <div
                                            key={lot.id}
                                            className={`rounded-[1.5rem] border p-5 flex items-center justify-between gap-4 ${borderColor}`}
                                        >
                                            <div className="min-w-0 space-y-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-xs font-black text-slate-900 font-mono">
                                                        {lot.lot_number}
                                                    </span>
                                                    {lot.batch_code && (
                                                        <span className="text-[10px] text-slate-400 font-mono">
                                                            / {lot.batch_code}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs font-semibold text-slate-700 truncate">
                                                    {lot.product_name}
                                                    {lot.product_sku && (
                                                        <span className="text-slate-400 font-normal ml-1">[{lot.product_sku}]</span>
                                                    )}
                                                </p>
                                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                                                    {lot.warehouse_name} · {Number(lot.qty).toLocaleString('es-CO')} uds
                                                </p>
                                            </div>
                                            <div className="shrink-0 flex flex-col items-end gap-2">
                                                <ExpiryBadge days={days} />
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                    {formatDate(lot.expiration_date)}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>

                    {/* Tabla de todos los lotes */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="h-2 w-6 bg-indigo-500 rounded-full" />
                            <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                                Todos los Lotes
                            </h2>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                ({allLots.length})
                            </span>
                        </div>

                        <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm">
                            {allLots.length === 0 ? (
                                <div className="py-14 text-center">
                                    <FlaskConical className="h-8 w-8 text-slate-200 mx-auto mb-3" />
                                    <p className="text-slate-400 font-black text-sm">Sin lotes registrados</p>
                                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1">
                                        Crea el primer lote con el formulario
                                    </p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full" role="table">
                                        <thead>
                                            <tr className="border-b border-slate-50 bg-slate-50/50">
                                                {['Lote', 'Producto', 'Bodega', 'Cant', 'Costo', 'Vence', 'Estado'].map(h => (
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
                                            {allLots.map(lot => {
                                                const days = getDaysUntilExpiry(lot.expiration_date);
                                                const statusKey = lot.status as string;
                                                return (
                                                    <tr key={lot.id} className="hover:bg-slate-50/60 transition-colors">
                                                        <td className="px-4 py-4">
                                                            <p className="text-xs font-black font-mono text-slate-800">
                                                                {lot.lot_number}
                                                            </p>
                                                            {lot.batch_code && (
                                                                <p className="text-[10px] font-mono text-slate-400">
                                                                    {lot.batch_code}
                                                                </p>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-4">
                                                            <p className="text-xs font-semibold text-slate-800 max-w-[140px] truncate">
                                                                {lot.product?.name ?? '—'}
                                                            </p>
                                                            {lot.product?.sku && (
                                                                <p className="text-[10px] font-mono text-slate-400">
                                                                    {lot.product.sku}
                                                                </p>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-4 text-xs text-slate-600">
                                                            {lot.warehouse?.name ?? '—'}
                                                        </td>
                                                        <td className="px-4 py-4 text-xs font-bold text-slate-700 text-right">
                                                            {Number(lot.qty).toLocaleString('es-CO')}
                                                        </td>
                                                        <td className="px-4 py-4 text-xs font-bold text-slate-700 text-right">
                                                            ${Number(lot.cost).toLocaleString('es-CO')}
                                                        </td>
                                                        <td className="px-4 py-4">
                                                            <p className="text-xs text-slate-600">
                                                                {formatDate(lot.expiration_date)}
                                                            </p>
                                                            <div className="mt-1">
                                                                <ExpiryBadge days={days} />
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-4">
                                                            <span
                                                                className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${STATUS_BADGES[statusKey] ?? 'bg-slate-100 text-slate-500'}`}
                                                            >
                                                                {STATUS_LABELS[statusKey] ?? statusKey}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
