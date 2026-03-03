import { createClient } from '@/lib/supabase/server';
import { documentService } from '@/features/documents/services/documentService';
import { Button } from '@/shared/components/ui/button';
import { Plus, FileX, ShieldCheck, Banknote, Activity, Link2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { cn } from '@/shared/lib/utils';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    DRAFT: { label: 'Borrador', color: 'bg-slate-100 text-slate-600' },
    SIGNED: { label: 'Firmado', color: 'bg-blue-100 text-blue-700' },
    SENT: { label: 'Enviado', color: 'bg-indigo-100 text-indigo-700' },
    ACCEPTED: { label: 'Aceptado', color: 'bg-emerald-100 text-emerald-700' },
    REJECTED: { label: 'Rechazado', color: 'bg-rose-100 text-rose-700' },
    VOIDED: { label: 'Anulado', color: 'bg-gray-100 text-gray-500' },
};

export default async function CreditNotesPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data } = await documentService.getDocuments(supabase, {
        page: 1,
        per_page: 100,
        type: 'CREDIT_NOTE' as any,
    });

    const creditNotes = data || [];
    const totalValue = creditNotes.reduce((acc: number, cn: any) => acc + (Number(cn.total) || 0), 0);
    const draftCount = creditNotes.filter((cn: any) => cn.status === 'DRAFT').length;

    // Fetch parent invoice numbers for all notes that have a parent_id
    const parentIds = creditNotes
        .map((cn: any) => cn.parent_id)
        .filter(Boolean) as string[];

    let parentMap: Record<string, string> = {};
    if (parentIds.length > 0) {
        const { data: parents } = await supabase
            .from('documents')
            .select('id, number')
            .in('id', parentIds);
        if (parents) {
            parentMap = Object.fromEntries(parents.map((p: any) => [p.id, p.number]));
        }
    }

    return (
        <div className="page-container space-y-12 pb-24 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            {/* PREMIUM HEADER */}
            <div className="relative group overflow-hidden bg-slate-950 rounded-[2.5rem] p-10 text-white shadow-active">
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none group-hover:scale-110 group-hover:rotate-12 transition-all duration-1000">
                    <FileX className="h-24 w-24 text-white" />
                </div>

                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-10">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="h-2 w-10 bg-rose-500 rounded-full" />
                            <span className="text-xs font-black uppercase tracking-[0.5em] text-rose-400">
                                Ajuste de Cartera
                            </span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black tracking-tight uppercase leading-tight">
                            Notas <br /><span className="text-slate-500">Crédito</span>
                        </h1>
                        <p className="text-slate-500 font-black text-[10px] uppercase tracking-[0.4em]">
                            Devoluciones & Descuentos Post-Facturación (v3.0)
                        </p>
                    </div>

                    <div className="flex gap-4 flex-wrap">
                        <Button
                            variant="outline"
                            asChild
                            className="h-12 px-10 rounded-[2rem] border-none bg-white/5 hover:bg-white/10 text-white font-black hover:scale-105 transition-all backdrop-blur-md"
                        >
                            <Link href="/sales/invoices" className="flex items-center gap-4">
                                <ArrowLeft className="h-6 w-6 text-slate-400" />
                                <div className="flex flex-col items-start leading-none">
                                    <span className="text-[10px] uppercase tracking-widest opacity-40">Regresar</span>
                                    <span className="text-xs uppercase tracking-widest">Facturas</span>
                                </div>
                            </Link>
                        </Button>
                        <Button
                            asChild
                            className="h-12 px-12 rounded-[2rem] bg-rose-600 hover:bg-rose-500 text-white font-black shadow-active transition-all hover:scale-105 active:scale-95 border-none"
                        >
                            <Link href="/sales/credit-notes/new" className="flex items-center gap-4">
                                <Plus className="h-7 w-7" />
                                <div className="flex flex-col items-start leading-none">
                                    <span className="text-[10px] uppercase tracking-widest opacity-60">Crear</span>
                                    <span className="text-xs uppercase tracking-widest">Nueva NC</span>
                                </div>
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>

            {/* SUMMARY STRIP */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                    {
                        label: 'Total en Notas Crédito',
                        value: `$${totalValue.toLocaleString('es-CO')}`,
                        icon: Banknote,
                        color: 'text-rose-600',
                        bg: 'bg-rose-50',
                    },
                    {
                        label: 'Documentos Emitidos',
                        value: creditNotes.length,
                        icon: FileX,
                        color: 'text-indigo-600',
                        bg: 'bg-indigo-50',
                    },
                    {
                        label: 'Pendientes Proceso',
                        value: draftCount,
                        icon: Activity,
                        color: 'text-amber-600',
                        bg: 'bg-amber-50',
                    },
                ].map((stat, i) => (
                    <div
                        key={i}
                        className="bg-white p-8 rounded-[2.5rem] shadow-premium flex items-center gap-6 border border-slate-50 hover:border-rose-100 transition-colors group"
                    >
                        <div
                            className={cn(
                                'h-16 w-16 rounded-2xl flex items-center justify-center transition-transform group-hover:rotate-6',
                                stat.bg,
                                stat.color
                            )}
                        >
                            <stat.icon className="h-8 w-8" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
                                {stat.label}
                            </p>
                            <p className="text-2xl font-black text-slate-900 tracking-tight">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* TABLE */}
            <div className="space-y-6">
                <div className="flex items-center gap-4 px-2">
                    <div className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                    <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">
                        Registro de Notas Crédito
                    </h3>
                </div>
                <div className="bg-white rounded-[3.5rem] shadow-premium overflow-hidden border border-slate-100/50">
                    {creditNotes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 gap-6 text-slate-400">
                            <div className="h-20 w-20 rounded-[2rem] bg-rose-50 flex items-center justify-center">
                                <FileX className="h-10 w-10 text-rose-300" />
                            </div>
                            <div className="text-center space-y-2">
                                <p className="text-sm font-black uppercase tracking-widest text-slate-500">
                                    Sin Notas Crédito
                                </p>
                                <p className="text-xs text-slate-400 max-w-xs">
                                    No se han generado notas crédito. Crea una desde una factura existente.
                                </p>
                            </div>
                            <Button
                                asChild
                                className="rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black px-8 h-10"
                            >
                                <Link href="/sales/credit-notes/new">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Nueva NC
                                </Link>
                            </Button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-slate-100">
                                        <th className="text-left px-8 py-6 text-[9px] font-black text-slate-400 uppercase tracking-[0.25em]">
                                            Numero
                                        </th>
                                        <th className="text-left px-6 py-6 text-[9px] font-black text-slate-400 uppercase tracking-[0.25em]">
                                            Cliente
                                        </th>
                                        <th className="text-left px-6 py-6 text-[9px] font-black text-slate-400 uppercase tracking-[0.25em]">
                                            Ref. Factura
                                        </th>
                                        <th className="text-left px-6 py-6 text-[9px] font-black text-slate-400 uppercase tracking-[0.25em]">
                                            Fecha
                                        </th>
                                        <th className="text-right px-6 py-6 text-[9px] font-black text-slate-400 uppercase tracking-[0.25em]">
                                            Total
                                        </th>
                                        <th className="text-center px-6 py-6 text-[9px] font-black text-slate-400 uppercase tracking-[0.25em]">
                                            Estado
                                        </th>
                                        <th className="text-center px-8 py-6 text-[9px] font-black text-slate-400 uppercase tracking-[0.25em]">
                                            Accion
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {creditNotes.map((cn: any, idx: number) => {
                                        const status = STATUS_LABELS[cn.status] ?? {
                                            label: cn.status,
                                            color: 'bg-slate-100 text-slate-600',
                                        };
                                        const parentNumber = cn.parent_id
                                            ? parentMap[cn.parent_id]
                                            : null;

                                        return (
                                            <tr
                                                key={cn.id}
                                                className={cn(
                                                    'group hover:bg-slate-50/60 transition-colors',
                                                    idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/20'
                                                )}
                                            >
                                                <td className="px-8 py-5">
                                                    <span className="font-black text-slate-900 text-sm tracking-tight">
                                                        {cn.number ?? '—'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <span className="text-sm font-bold text-slate-700">
                                                        {cn.party?.legal_name ?? '—'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-5">
                                                    {parentNumber ? (
                                                        <Link
                                                            href={`/documents/${cn.parent_id}`}
                                                            className="flex items-center gap-1.5 text-indigo-600 font-black text-xs hover:underline"
                                                        >
                                                            <Link2 className="h-3 w-3" />
                                                            {parentNumber}
                                                        </Link>
                                                    ) : (
                                                        <span className="text-xs text-slate-400">—</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-5">
                                                    <span className="text-sm text-slate-600 font-bold">
                                                        {cn.issue_date
                                                            ? new Date(cn.issue_date).toLocaleDateString('es-CO')
                                                            : '—'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-5 text-right">
                                                    <span className="font-black text-slate-900 text-sm tabular-nums">
                                                        ${Number(cn.total).toLocaleString('es-CO')}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-5 text-center">
                                                    <span
                                                        className={cn(
                                                            'inline-flex px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest',
                                                            status.color
                                                        )}
                                                    >
                                                        {status.label}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-5 text-center">
                                                    <Link
                                                        href={`/documents/${cn.id}`}
                                                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-rose-100 hover:text-rose-700 text-slate-600 font-black text-[9px] uppercase tracking-widest transition-all"
                                                    >
                                                        Ver
                                                    </Link>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* AUDIT FOOTER */}
            <div className="bg-slate-950 p-10 rounded-[2.5rem] text-white flex flex-col lg:flex-row items-center justify-between gap-12 shadow-active relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform">
                    <ShieldCheck className="h-20 w-20 text-white" />
                </div>
                <div className="flex items-center gap-10 relative z-10 flex-col lg:flex-row text-center lg:text-left">
                    <div className="h-20 w-20 bg-white/10 rounded-[2rem] flex items-center justify-center border border-white/10 shadow-inner rotate-12 group-hover:rotate-0 transition-transform duration-700">
                        <FileX className="h-10 w-10 text-rose-400" />
                    </div>
                    <div className="space-y-3">
                        <h4 className="text-2xl font-black tracking-tight uppercase leading-tight text-white">
                            Ajuste de Cartera Electronica
                        </h4>
                        <p className="text-sm text-white/40 leading-relaxed font-medium max-w-xl">
                            Las notas credito reducen el saldo de la factura original. Cada NC emitida debe
                            referenciar la factura DIAN correspondiente para cumplir con la normativa de la{' '}
                            <span className="text-rose-400 font-black uppercase">Resolucion 000042/2020</span>.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
