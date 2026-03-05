import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { lotService } from '@/features/inventory/services/lotService';
import { settingsService } from '@/features/settings/services/settingsService';
import { LotForm } from '@/features/inventory/components/LotForm';
import { VisualReportHeader } from '@/features/accounting/components/VisualReportHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import {
    FlaskConical,
    AlertTriangle,
    Package,
    DollarSign,
    Calendar,
    ShieldCheck,
    Plus,
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
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                Vencido
            </span>
        );
    }
    if (days <= 30) {
        return (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                {days}d
            </span>
        );
    }
    if (days <= 90) {
        return (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                {days}d
            </span>
        );
    }
    return (
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
            {days}d
        </span>
    );
}

const STATUS_BADGES: Record<string, string> = {
    ACTIVE:     'bg-emerald-50 text-emerald-600 border-emerald-100',
    QUARANTINE: 'bg-amber-50 text-amber-600 border-amber-100',
    EXPIRED:    'bg-rose-50 text-rose-600 border-rose-100',
    DEPLETED:   'bg-slate-50 text-slate-400 border-slate-100',
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
            badgeText: 'Activos',
            badgeClass: 'bg-indigo-50 text-indigo-600 border-indigo-100',
        },
        {
            label: 'Por Vencer (30d)',
            value: Number(summary.expiring_30d).toLocaleString('es-CO'),
            icon: AlertTriangle,
            color: 'text-rose-600',
            bg: 'bg-rose-50',
            badgeText: 'Alerta',
            badgeClass: 'bg-rose-50 text-rose-600 border-rose-100',
        },
        {
            label: 'Por Vencer (90d)',
            value: Number(summary.expiring_90d).toLocaleString('es-CO'),
            icon: Calendar,
            color: 'text-amber-600',
            bg: 'bg-amber-50',
            badgeText: 'Aviso',
            badgeClass: 'bg-amber-50 text-amber-600 border-amber-100',
        },
        {
            label: 'Valor Total',
            value: `$${Number(summary.total_value).toLocaleString('es-CO')}`,
            icon: DollarSign,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
            badgeText: 'Costo',
            badgeClass: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        },
    ];

    return (
        <div className="space-y-6 pb-16 animate-in fade-in duration-500">
            <VisualReportHeader
                title="Lotes y Vencimientos"
                subtitle="Inventario — Trazabilidad y Control"
                tenant={tenant}
            />

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {kpis.map((kpi) => (
                    <Card key={kpi.label} className="border border-slate-100 bg-white shadow-sm rounded-2xl">
                        <CardContent className="p-5 space-y-3">
                            <div className="flex justify-between items-start">
                                <div className={`h-10 w-10 rounded-xl ${kpi.bg} flex items-center justify-center ${kpi.color}`}>
                                    <kpi.icon className="h-5 w-5" />
                                </div>
                                <Badge className={`${kpi.badgeClass} border text-[10px] font-semibold px-2 py-0.5 rounded-full`}>{kpi.badgeText}</Badge>
                            </div>
                            <div>
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{kpi.label}</p>
                                <h3 className="text-xl font-bold text-slate-900 tracking-tight leading-none truncate">{kpi.value}</h3>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Main Grid */}
            <div className="grid md:grid-cols-12 gap-6 items-start">

                {/* Form */}
                <Card className="md:col-span-4 rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                    <CardHeader className="p-5 pb-3 border-b border-slate-100">
                        <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                                <Plus className="h-4 w-4" />
                            </div>
                            Nuevo Lote
                        </CardTitle>
                        <p className="text-[10px] text-slate-400 mt-1">Registrar lote con trazabilidad</p>
                    </CardHeader>
                    <CardContent className="p-5">
                        <LotForm
                            products={products}
                            warehouses={warehouses}
                            suppliers={suppliers}
                        />
                    </CardContent>
                </Card>

                {/* Alerts + Table */}
                <div className="md:col-span-8 space-y-6">

                    {/* Expiry Alerts */}
                    <Card className="border border-slate-100 bg-white shadow-sm rounded-2xl overflow-hidden">
                        <CardHeader className="p-5 pb-3 border-b border-slate-100">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4 text-rose-600" />
                                    Alertas de Vencimiento
                                </CardTitle>
                                {expiringLots.length > 0 && (
                                    <Badge className="bg-rose-50 text-rose-600 border border-rose-100 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                                        {expiringLots.length}
                                    </Badge>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="p-5">
                            {expiringLots.length === 0 ? (
                                <div className="py-8 text-center">
                                    <ShieldCheck className="h-8 w-8 text-emerald-300 mx-auto mb-2" />
                                    <p className="text-xs font-semibold text-slate-900">Sin vencimientos próximos</p>
                                    <p className="text-[10px] text-slate-400 mt-1">Todos los lotes en buen estado</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
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
                                                className={`rounded-xl border p-3 flex items-center justify-between gap-3 ${borderColor}`}
                                            >
                                                <div className="min-w-0 space-y-0.5">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-xs font-semibold text-slate-900 font-mono">
                                                            {lot.lot_number}
                                                        </span>
                                                        {lot.batch_code && (
                                                            <span className="text-[10px] text-slate-400 font-mono">
                                                                / {lot.batch_code}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-slate-600 truncate">
                                                        {lot.product_name}
                                                        {lot.product_sku && (
                                                            <span className="text-slate-400 ml-1">[{lot.product_sku}]</span>
                                                        )}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400">
                                                        {lot.warehouse_name} · {Number(lot.qty).toLocaleString('es-CO')} uds
                                                    </p>
                                                </div>
                                                <div className="shrink-0 flex flex-col items-end gap-1">
                                                    <ExpiryBadge days={days} />
                                                    <p className="text-[10px] text-slate-400">
                                                        {formatDate(lot.expiration_date)}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* All Lots Table */}
                    <Card className="border border-slate-100 bg-white shadow-sm rounded-2xl overflow-hidden">
                        <CardHeader className="p-5 pb-3 border-b border-slate-100">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                    <FlaskConical className="h-4 w-4 text-indigo-600" />
                                    Todos los Lotes
                                </CardTitle>
                                <span className="text-[10px] text-slate-400 font-medium">{allLots.length} registros</span>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {allLots.length === 0 ? (
                                <div className="py-12 text-center">
                                    <FlaskConical className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                                    <p className="text-xs font-semibold text-slate-900">Sin lotes registrados</p>
                                    <p className="text-[10px] text-slate-400 mt-1">Crea el primer lote con el formulario</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full" role="table">
                                        <thead>
                                            <tr className="border-b border-slate-100 bg-slate-50/50">
                                                {['Lote', 'Producto', 'Bodega', 'Cant', 'Costo', 'Vence', 'Estado'].map(h => (
                                                    <th
                                                        key={h}
                                                        scope="col"
                                                        className="px-4 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider"
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
                                                    <tr key={lot.id} className="hover:bg-slate-50/50">
                                                        <td className="px-4 py-3">
                                                            <p className="text-xs font-semibold font-mono text-slate-800">
                                                                {lot.lot_number}
                                                            </p>
                                                            {lot.batch_code && (
                                                                <p className="text-[10px] font-mono text-slate-400">
                                                                    {lot.batch_code}
                                                                </p>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <p className="text-xs font-semibold text-slate-800 max-w-[140px] truncate">
                                                                {lot.product?.name ?? '—'}
                                                            </p>
                                                            {lot.product?.sku && (
                                                                <p className="text-[10px] font-mono text-slate-400">
                                                                    {lot.product.sku}
                                                                </p>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-xs text-slate-600">
                                                            {lot.warehouse?.name ?? '—'}
                                                        </td>
                                                        <td className="px-4 py-3 text-xs font-bold text-slate-700 text-right tabular-nums">
                                                            {Number(lot.qty).toLocaleString('es-CO')}
                                                        </td>
                                                        <td className="px-4 py-3 text-xs text-slate-600 text-right tabular-nums">
                                                            ${Number(lot.cost).toLocaleString('es-CO')}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <p className="text-xs text-slate-600">
                                                                {formatDate(lot.expiration_date)}
                                                            </p>
                                                            <div className="mt-0.5">
                                                                <ExpiryBadge days={days} />
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span
                                                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_BADGES[statusKey] ?? 'bg-slate-50 text-slate-400 border-slate-100'}`}
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
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
