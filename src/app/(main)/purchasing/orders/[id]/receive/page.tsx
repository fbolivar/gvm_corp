import { createClient } from '@/lib/supabase/server'
import { purchaseOrderService } from '@/features/purchasing/services/purchaseOrderService'
import { redirect } from 'next/navigation'
import {
    PackageCheck,
    Building2,
    Warehouse,
    Calendar,
    ArrowLeft,
    ClipboardList,
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/shared/components/ui/button'
import ReceiveOrderClient from './client'
import { Metadata } from 'next'

export const metadata: Metadata = { title: 'Recibir Mercancía — GVM Corp' }

function formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '—'
    try {
        return new Date(dateStr).toLocaleDateString('es-CO', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        })
    } catch {
        return dateStr
    }
}

// ─── Info Pill ─────────────────────────────────────────────────────────────────

function InfoPill({
    icon: Icon,
    label,
    value,
}: {
    icon: React.ComponentType<{ className?: string }>
    label: string
    value: string
}) {
    return (
        <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-5 py-3">
            <Icon className="h-4 w-4 text-emerald-400 shrink-0" />
            <div>
                <p className="text-[8px] font-black uppercase tracking-[0.3em] text-emerald-400/70 leading-none mb-0.5">
                    {label}
                </p>
                <p className="text-[11px] font-black text-white/90 leading-none">{value}</p>
            </div>
        </div>
    )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function ReceiveOrderPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    let po
    try {
        po = await purchaseOrderService.getOrderById(supabase, id)
    } catch {
        redirect('/purchasing/orders')
    }

    if (!po || !['APPROVED', 'PARTIALLY_RECEIVED'].includes(po.status)) {
        redirect('/purchasing/orders')
    }

    const supplierName = (po.supplier as { legal_name?: string } | undefined)?.legal_name ?? 'Sin proveedor'
    const warehouseName = (po.warehouse as { name?: string } | undefined)?.name ?? 'No asignada'

    const pendingLines = po.lines.filter(
        (l) => Number(l.qty) - Number(l.qty_received ?? 0) > 0
    )

    return (
        <div className="page-container space-y-8 pb-24 animate-in fade-in slide-in-from-bottom-6 duration-700">

            {/* ── Back nav ──────────────────────────────────────────────────── */}
            <div>
                <Button
                    variant="ghost"
                    asChild
                    className="h-10 px-4 rounded-2xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 font-black text-[10px] uppercase tracking-widest gap-2 transition-all"
                >
                    <Link href="/purchasing/orders">
                        <ArrowLeft className="h-3.5 w-3.5" />
                        Volver a Órdenes
                    </Link>
                </Button>
            </div>

            {/* ── Hero Header ────────────────────────────────────────────────── */}
            <div className="relative group overflow-hidden bg-emerald-950 rounded-[2.5rem] p-10 text-white shadow-active border border-white/5">
                {/* Background watermark */}
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform duration-1000">
                    <PackageCheck className="h-64 w-64" />
                </div>

                <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-8">
                    <div className="space-y-5">
                        {/* Eyebrow */}
                        <div className="flex items-center gap-3">
                            <div className="h-1.5 w-8 bg-emerald-400 rounded-full" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400">
                                Recepción de Mercancía
                            </span>
                        </div>

                        {/* Title */}
                        <div>
                            <h1 className="text-3xl font-black tracking-tight uppercase leading-tight">
                                Recibir{' '}
                                <span className="text-emerald-400">{po.po_number ?? '—'}</span>
                            </h1>
                            <p className="mt-2 text-white/40 text-[10px] font-black uppercase tracking-[0.3em]">
                                Registre las cantidades físicamente recibidas en bodega
                            </p>
                        </div>

                        {/* Info pills row */}
                        <div className="flex flex-wrap gap-3">
                            <InfoPill
                                icon={Building2}
                                label="Proveedor"
                                value={supplierName}
                            />
                            <InfoPill
                                icon={Warehouse}
                                label="Bodega destino"
                                value={warehouseName}
                            />
                            <InfoPill
                                icon={Calendar}
                                label="Fecha OC"
                                value={formatDate(po.order_date)}
                            />
                            {po.expected_delivery && (
                                <InfoPill
                                    icon={Calendar}
                                    label="Entrega esperada"
                                    value={formatDate(po.expected_delivery)}
                                />
                            )}
                        </div>
                    </div>

                    {/* Stats badge */}
                    <div className="flex items-center gap-6 shrink-0">
                        <div className="text-center">
                            <p className="text-3xl font-black text-white leading-none">
                                {po.lines.length}
                            </p>
                            <p className="text-[9px] font-black uppercase tracking-widest text-white/40 mt-1">
                                Líneas totales
                            </p>
                        </div>
                        <div className="h-10 w-px bg-white/10" />
                        <div className="text-center">
                            <p className="text-3xl font-black text-emerald-400 leading-none">
                                {pendingLines.length}
                            </p>
                            <p className="text-[9px] font-black uppercase tracking-widest text-white/40 mt-1">
                                Pendientes
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Status alert for partially received ─────────────────────────── */}
            {po.status === 'PARTIALLY_RECEIVED' && (
                <div className="flex items-start gap-4 bg-indigo-50 border border-indigo-100 rounded-2xl px-6 py-4">
                    <ClipboardList className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-700">
                            Recepcion parcial en curso
                        </p>
                        <p className="text-xs text-indigo-500 font-medium mt-0.5">
                            Esta orden ya tiene artículos recibidos. Solo se muestran las cantidades pendientes.
                            Puede recibir el restante o cantidades adicionales.
                        </p>
                    </div>
                </div>
            )}

            {/* ── Client table + actions ────────────────────────────────────── */}
            <ReceiveOrderClient order={po} />
        </div>
    )
}
