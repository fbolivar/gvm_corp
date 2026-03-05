import { createClient } from '@/lib/supabase/server';
import { documentService } from '@/features/documents/services/documentService';
import { Button } from '@/shared/components/ui/button';
import { Plus, FilePlus2, Banknote, Activity, Link2 } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { cn } from '@/shared/lib/utils';
import { settingsService } from '@/features/settings/services/settingsService';
import { VisualReportHeader } from '@/features/accounting/components/VisualReportHeader';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';

export const metadata = { title: 'Notas Débito — GVM Corp' };

const STATUS_LABELS: Record<string, { label: string; style: string }> = {
    DRAFT: { label: 'Borrador', style: 'bg-slate-50 text-slate-600 border-slate-200' },
    SIGNED: { label: 'Firmado', style: 'bg-blue-50 text-blue-600 border-blue-200' },
    SENT: { label: 'Enviado', style: 'bg-indigo-50 text-indigo-600 border-indigo-200' },
    ACCEPTED: { label: 'Aceptado', style: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
    REJECTED: { label: 'Rechazado', style: 'bg-rose-50 text-rose-600 border-rose-200' },
    VOIDED: { label: 'Anulado', style: 'bg-slate-50 text-slate-400 border-slate-200' },
};

export default async function DebitNotesPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const [{ data }, tenant] = await Promise.all([
        documentService.getDocuments(supabase, {
            page: 1,
            per_page: 100,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            type: 'DEBIT_NOTE' as any,
        }),
        settingsService.getTenantInfo(supabase),
    ]);

    const debitNotes = data || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const totalValue = debitNotes.reduce((acc: number, note: any) => acc + (Number(note.total) || 0), 0);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const draftCount = debitNotes.filter((note: any) => note.status === 'DRAFT').length;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parentIds = debitNotes.map((note: any) => note.parent_id).filter(Boolean) as string[];
    let parentMap: Record<string, string> = {};
    if (parentIds.length > 0) {
        const { data: parents } = await supabase
            .from('documents')
            .select('id, number')
            .in('id', parentIds);
        if (parents) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            parentMap = Object.fromEntries(parents.map((p: any) => [p.id, p.number]));
        }
    }

    const kpis = [
        { label: 'Total Notas Débito', value: `$${totalValue.toLocaleString('es-CO')}`, icon: Banknote, color: 'text-amber-600', bg: 'bg-amber-50' },
        { label: 'Documentos Emitidos', value: debitNotes.length, icon: FilePlus2, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { label: 'Pendientes', value: draftCount, icon: Activity, color: 'text-rose-600', bg: 'bg-rose-50' },
    ];

    return (
        <div className="space-y-6 pb-16 animate-in fade-in duration-500">
            <VisualReportHeader
                title="Notas Débito"
                subtitle="Ventas — Cargos Adicionales Post-Facturación"
                tenant={tenant}
            />

            <div className="flex flex-wrap gap-2">
                <Button asChild className="h-9 rounded-xl bg-amber-600 hover:bg-amber-700 text-xs font-semibold gap-2">
                    <Link href="/sales/debit-notes/new">
                        <Plus className="h-3.5 w-3.5" /> Nueva ND
                    </Link>
                </Button>
                <Button variant="outline" asChild className="h-9 rounded-xl text-xs font-semibold gap-2">
                    <Link href="/sales/invoices">Facturas</Link>
                </Button>
                <Button variant="outline" asChild className="h-9 rounded-xl text-xs font-semibold gap-2">
                    <Link href="/sales">Dashboard Ventas</Link>
                </Button>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {kpis.map((stat) => (
                    <Card key={stat.label} className="rounded-2xl border border-slate-100 bg-white shadow-sm">
                        <CardContent className="p-5 flex items-center gap-4">
                            <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", stat.bg)}>
                                <stat.icon className={cn("h-5 w-5", stat.color)} />
                            </div>
                            <div>
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{stat.label}</p>
                                <p className="text-xl font-bold text-slate-900">{stat.value}</p>
                            </div>
                            <Badge variant="secondary" className="ml-auto text-[10px] font-semibold">
                                {String(stat.value)}
                            </Badge>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Table */}
            <Card className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                <CardContent className="p-0">
                    {debitNotes.length === 0 ? (
                        <div className="py-16 flex flex-col items-center gap-4">
                            <FilePlus2 className="h-8 w-8 text-slate-200" />
                            <div className="text-center">
                                <p className="text-sm font-semibold text-slate-900">Sin Notas Débito</p>
                                <p className="text-[10px] text-slate-400 mt-1">Crea una desde una factura existente</p>
                            </div>
                            <Button asChild className="h-9 rounded-xl bg-amber-600 hover:bg-amber-700 text-xs font-semibold gap-2">
                                <Link href="/sales/debit-notes/new">
                                    <Plus className="h-3.5 w-3.5" /> Nueva ND
                                </Link>
                            </Button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-slate-100">
                                        <th className="text-left pl-4 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Número</th>
                                        <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Cliente</th>
                                        <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Ref. Factura</th>
                                        <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Fecha</th>
                                        <th className="text-right px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total</th>
                                        <th className="text-center px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Estado</th>
                                        <th className="text-center pr-4 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Acción</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                    {debitNotes.map((note: any) => {
                                        const status = STATUS_LABELS[note.status] ?? {
                                            label: note.status,
                                            style: 'bg-slate-50 text-slate-600 border-slate-200',
                                        };
                                        const parentNumber = note.parent_id ? parentMap[note.parent_id] : null;

                                        return (
                                            <tr key={note.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="pl-4 py-3">
                                                    <span className="text-sm font-semibold text-slate-900">{note.number ?? '—'}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="text-sm text-slate-700">{note.party?.legal_name ?? '—'}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {parentNumber ? (
                                                        <Link
                                                            href={`/documents/${note.parent_id}`}
                                                            className="flex items-center gap-1 text-indigo-600 text-xs font-semibold hover:underline"
                                                        >
                                                            <Link2 className="h-3 w-3" />
                                                            {parentNumber}
                                                        </Link>
                                                    ) : (
                                                        <span className="text-xs text-slate-400">—</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="text-xs text-slate-600">
                                                        {note.issue_date ? new Date(note.issue_date).toLocaleDateString('es-CO') : '—'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <span className="text-sm font-bold text-slate-900 tabular-nums">
                                                        ${Number(note.total).toLocaleString('es-CO')}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <Badge variant="outline" className={cn(
                                                        "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                                                        status.style
                                                    )}>
                                                        {status.label}
                                                    </Badge>
                                                </td>
                                                <td className="pr-4 py-3 text-center">
                                                    <Button variant="ghost" size="sm" asChild className="h-7 rounded-lg text-[10px] font-semibold text-slate-600 hover:text-indigo-600">
                                                        <Link href={`/documents/${note.id}`}>Ver</Link>
                                                    </Button>
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
    );
}
