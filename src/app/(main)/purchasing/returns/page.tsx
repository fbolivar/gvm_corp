import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Plus, RotateCcw, FileX } from 'lucide-react';

const fmt = (n: number) =>
    new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0,
    }).format(n)

const statusStyles: Record<string, string> = {
    PAID:    'bg-emerald-50 text-emerald-600',
    POSTED:  'bg-blue-50 text-blue-600',
    PARTIAL: 'bg-amber-50 text-amber-600',
    DRAFT:   'bg-slate-100 text-slate-500',
}

interface ReturnDocument {
    id: string
    number: string | null
    status: string
    total: number | null
    issue_date: string | null
    created_at: string
    parent: { number: string; doc_type: string } | null
    party: { legal_name: string; trade_name?: string | null } | null
}

export default async function PurchaseReturnsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    // Fetch all credit notes that have a parent document
    const { data: returns } = await supabase
        .from('documents')
        .select(`
            id,
            number,
            status,
            total,
            issue_date,
            created_at,
            parent:documents!parent_id(number, doc_type),
            party:parties(legal_name, trade_name)
        `)
        .eq('doc_type', 'CREDIT_NOTE')
        .not('parent_id', 'is', null)
        .order('created_at', { ascending: false });

    // Keep only those whose parent is a VENDOR_BILL
    const purchaseReturns = ((returns ?? []) as unknown as ReturnDocument[]).filter(
        r => r.parent?.doc_type === 'VENDOR_BILL'
    );

    return (
        <div className="page-container space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-rose-900 to-rose-800 p-10 text-white shadow-active">
                <div className="absolute top-0 right-0 p-8 opacity-[0.04] pointer-events-none">
                    <RotateCcw className="h-48 w-48" />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-2">
                        <span className="text-[9px] font-black uppercase tracking-[0.4em] text-white/30">Compras</span>
                        <h1 className="text-3xl font-black tracking-tight uppercase">Devoluciones</h1>
                        <p className="text-white/40 text-xs font-bold">
                            {purchaseReturns.length} nota{purchaseReturns.length !== 1 ? 's' : ''} crédito sobre facturas de proveedor
                        </p>
                    </div>
                    <Button
                        asChild
                        className="h-10 px-5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white text-rose-900 hover:bg-white/90 shadow-premium"
                    >
                        <Link href="/purchasing/returns/new">
                            <Plus className="h-3.5 w-3.5 mr-2" />
                            Nueva Devolución
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Empty State */}
            {purchaseReturns.length === 0 ? (
                <div className="bg-white rounded-[2.5rem] p-16 text-center shadow-premium border border-slate-50">
                    <FileX className="h-12 w-12 mx-auto text-slate-200 mb-4" />
                    <p className="text-sm font-bold text-slate-400 mb-1">No hay devoluciones registradas</p>
                    <p className="text-xs text-slate-300 mb-6">Crea una devolución contra una factura de proveedor</p>
                    <Button
                        asChild
                        className="h-10 px-5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-rose-600 hover:bg-rose-700 text-white"
                    >
                        <Link href="/purchasing/returns/new">
                            <Plus className="h-3.5 w-3.5 mr-2" />
                            Nueva Devolución
                        </Link>
                    </Button>
                </div>
            ) : (
                <div className="bg-white rounded-[2.5rem] shadow-premium border border-slate-50 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-100">
                                    <th className="text-left px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                        NC #
                                    </th>
                                    <th className="text-left px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                        Factura Origen
                                    </th>
                                    <th className="text-left px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                        Proveedor
                                    </th>
                                    <th className="text-right px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                        Total
                                    </th>
                                    <th className="text-left px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                        Estado
                                    </th>
                                    <th className="text-left px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                        Fecha
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {purchaseReturns.map(ret => (
                                    <tr
                                        key={ret.id}
                                        className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
                                    >
                                        <td className="px-6 py-4">
                                            <Link
                                                href={`/documents/${ret.id}`}
                                                className="text-sm font-bold text-indigo-600 hover:underline"
                                            >
                                                {ret.number || '—'}
                                            </Link>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500">
                                            {ret.parent?.number || '—'}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-slate-700">
                                            {ret.party?.trade_name || ret.party?.legal_name || '—'}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-bold text-right text-rose-600">
                                            {fmt(ret.total ?? 0)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge className={`text-[9px] font-bold rounded-full px-2 py-0.5 border-none ${statusStyles[ret.status] ?? 'bg-slate-100 text-slate-500'}`}>
                                                {ret.status}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-slate-400">
                                            {new Date(ret.issue_date ?? ret.created_at).toLocaleDateString('es-CO')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
