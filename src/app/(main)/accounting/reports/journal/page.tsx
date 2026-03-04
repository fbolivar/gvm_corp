import { createClient } from '@/lib/supabase/server';
import { settingsService } from '@/features/settings/services/settingsService';
import { ReportingFilters } from '@/features/accounting/components/ReportingFilters';
import { VisualReportHeader } from '@/features/accounting/components/VisualReportHeader';
import { Card } from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import {
    ClipboardList,
    Info,
    ArrowRight,
    ShieldCheck,
    Activity,
    Calendar,
    Hash,
    BookOpen,
    ChevronDown
} from "lucide-react"
import { redirect } from 'next/navigation';
import { cn } from "@/shared/lib/utils"
import { Button } from "@/shared/components/ui/button"

interface JournalLine {
    account: { code: string; name: string } | null;
    party: { legal_name: string } | null;
    debit: number;
    credit: number;
    description: string | null;
}

interface JournalEntry {
    id: string;
    number: string | null;
    entry_date: string;
    description: string;
    document_id: string | null;
    lines: JournalLine[];
}

export default async function JournalBookPage({
    searchParams
}: {
    searchParams: Promise<{ startDate?: string, endDate?: string }>
}) {
    const supabase = await createClient();
    const params = await searchParams;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const startDate = params.startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const endDate = params.endDate || new Date().toISOString().split('T')[0];

    const { data: entries, error } = await supabase
        .from('journal_entries')
        .select(`
            id,
            number,
            entry_date,
            description,
            document_id,
            lines:journal_lines(
                debit,
                credit,
                description,
                account:chart_accounts(code, name),
                party:parties(legal_name)
            )
        `)
        .gte('entry_date', startDate)
        .lte('entry_date', endDate)
        .order('entry_date', { ascending: true })
        .order('created_at', { ascending: true });

    if (error) console.error('[journal]', error.message);

    const journalEntries = (entries || []) as unknown as JournalEntry[];

    // Totals
    let totalDebit = 0;
    let totalCredit = 0;
    journalEntries.forEach(entry => {
        entry.lines?.forEach(line => {
            totalDebit += Number(line.debit) || 0;
            totalCredit += Number(line.credit) || 0;
        });
    });

    const totalLines = journalEntries.reduce((sum, e) => sum + (e.lines?.length || 0), 0);
    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;
    const [tenant] = await Promise.all([settingsService.getTenantInfo(supabase)]);

    const fmt = (n: number) => `$${n.toLocaleString('es-CO', { minimumFractionDigits: 0 })}`;

    const sourceLabel = (docId: string | null): string => {
        return docId ? 'Automático' : 'Manual';
    };

    return (
        <div className="space-y-12 pb-24 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            {/* Header */}
            <VisualReportHeader
                title="Libro Diario"
                subtitle={`${startDate} » ${endDate}`}
                tenant={tenant}
            />

            {/* Summary Strip */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 px-1">
                <div className="flex items-center gap-12">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.5em] leading-none mb-4">Registro Cronológico de Transacciones</span>
                        <div className="flex items-baseline gap-4">
                            <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none">
                                {journalEntries.length}
                            </h2>
                            <span className="text-xl font-black text-slate-300 uppercase italic tracking-widest">Asientos Contables</span>
                        </div>
                    </div>
                </div>
                <ReportingFilters />
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="border-none shadow-premium bg-white rounded-[2.5rem] p-8 group hover:translate-y-[-4px] transition-all">
                    <div className="space-y-4">
                        <div className="h-12 w-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                            <Hash className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Asientos</p>
                            <p className="text-2xl font-black text-slate-900 italic tracking-tighter">{journalEntries.length}</p>
                        </div>
                    </div>
                </Card>

                <Card className="border-none shadow-premium bg-white rounded-[2.5rem] p-8 group hover:translate-y-[-4px] transition-all">
                    <div className="space-y-4">
                        <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                            <BookOpen className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Débitos</p>
                            <p className="text-2xl font-black text-emerald-600 italic tracking-tighter">{fmt(totalDebit)}</p>
                        </div>
                    </div>
                </Card>

                <Card className="border-none shadow-premium bg-white rounded-[2.5rem] p-8 group hover:translate-y-[-4px] transition-all">
                    <div className="space-y-4">
                        <div className="h-12 w-12 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
                            <BookOpen className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Créditos</p>
                            <p className="text-2xl font-black text-rose-600 italic tracking-tighter">{fmt(totalCredit)}</p>
                        </div>
                    </div>
                </Card>

                <Card className={cn(
                    "border-none shadow-active rounded-[2.5rem] p-8 group hover:translate-y-[-4px] transition-all text-white relative overflow-hidden",
                    isBalanced ? "bg-slate-900" : "bg-rose-900"
                )}>
                    <div className="absolute -bottom-6 -right-6 opacity-10 pointer-events-none">
                        <ShieldCheck className="h-32 w-32" />
                    </div>
                    <div className="space-y-4 relative z-10">
                        <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center text-white">
                            <Activity className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">Estado</p>
                            <p className="text-lg font-black text-white italic tracking-tighter">
                                {isBalanced ? 'CUADRADO' : 'DESCUADRE'}
                            </p>
                            <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mt-1">{totalLines} líneas analizadas</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Journal Entries */}
            <div className="space-y-6">
                {journalEntries.map((entry, idx) => {
                    const entryDebit = entry.lines?.reduce((s, l) => s + (Number(l.debit) || 0), 0) || 0;
                    const entryCredit = entry.lines?.reduce((s, l) => s + (Number(l.credit) || 0), 0) || 0;

                    return (
                        <Card key={entry.id} className="border-none shadow-premium bg-white rounded-[2.5rem] overflow-hidden group">
                            {/* Entry Header */}
                            <div className="px-8 py-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50 border-b border-slate-100">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center text-white">
                                        <span className="text-xs font-black italic">{String(idx + 1).padStart(2, '0')}</span>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <h4 className="text-sm font-black text-slate-900 tracking-tight">
                                                {entry.number ? `Asiento #${entry.number}` : `Registro ${entry.id.slice(0, 8)}`}
                                            </h4>
                                            <Badge className="bg-indigo-50 text-indigo-600 border-none text-[8px] font-black uppercase tracking-[0.2em] px-2.5 py-0.5 rounded-md">
                                                {sourceLabel(entry.document_id)}
                                            </Badge>
                                        </div>
                                        <p className="text-[10px] text-slate-400 font-bold mt-0.5">{entry.description}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                        <Calendar className="h-3 w-3" />
                                        {entry.entry_date}
                                    </div>
                                </div>
                            </div>

                            {/* Lines Table Header */}
                            <div className="grid grid-cols-12 px-8 py-3 bg-slate-50/50 border-b border-slate-50">
                                <div className="col-span-2">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em]">Código</p>
                                </div>
                                <div className="col-span-4">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em]">Cuenta</p>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em]">Tercero</p>
                                </div>
                                <div className="col-span-2 text-right">
                                    <p className="text-[8px] font-black text-emerald-500 uppercase tracking-[0.3em]">Débito</p>
                                </div>
                                <div className="col-span-2 text-right">
                                    <p className="text-[8px] font-black text-rose-500 uppercase tracking-[0.3em]">Crédito</p>
                                </div>
                            </div>

                            {/* Lines */}
                            <div className="divide-y divide-slate-50">
                                {entry.lines?.map((line, li) => (
                                    <div key={li} className="grid grid-cols-12 px-8 py-3.5 items-center hover:bg-slate-50/30 transition-colors">
                                        <div className="col-span-2">
                                            <span className="text-xs font-black text-indigo-600 tabular-nums">{line.account?.code || '—'}</span>
                                        </div>
                                        <div className="col-span-4">
                                            <span className="text-xs font-bold text-slate-700 truncate block">{line.account?.name || '—'}</span>
                                        </div>
                                        <div className="col-span-2">
                                            <span className="text-[10px] font-bold text-slate-400 truncate block">{line.party?.legal_name || '—'}</span>
                                        </div>
                                        <div className="col-span-2 text-right">
                                            <span className={cn(
                                                "text-xs font-black italic tabular-nums",
                                                Number(line.debit) > 0 ? "text-emerald-600" : "text-slate-200"
                                            )}>
                                                {Number(line.debit) > 0 ? fmt(Number(line.debit)) : '—'}
                                            </span>
                                        </div>
                                        <div className="col-span-2 text-right">
                                            <span className={cn(
                                                "text-xs font-black italic tabular-nums",
                                                Number(line.credit) > 0 ? "text-rose-600" : "text-slate-200"
                                            )}>
                                                {Number(line.credit) > 0 ? fmt(Number(line.credit)) : '—'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Entry Totals */}
                            <div className="grid grid-cols-12 px-8 py-4 bg-slate-50 border-t border-slate-100">
                                <div className="col-span-8">
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic">Total Asiento</span>
                                </div>
                                <div className="col-span-2 text-right">
                                    <span className="text-sm font-black text-emerald-600 italic tabular-nums">{fmt(entryDebit)}</span>
                                </div>
                                <div className="col-span-2 text-right">
                                    <span className="text-sm font-black text-rose-600 italic tabular-nums">{fmt(entryCredit)}</span>
                                </div>
                            </div>
                        </Card>
                    );
                })}

                {journalEntries.length === 0 && (
                    <Card className="border-none shadow-premium bg-white rounded-[2.5rem] p-20 text-center">
                        <ClipboardList className="h-16 w-16 text-slate-200 mx-auto mb-6" />
                        <p className="text-xl font-black text-slate-900 italic tracking-tight mb-2">Sin asientos contables</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No se encontraron registros en el periodo seleccionado</p>
                    </Card>
                )}
            </div>

            {/* Grand Total */}
            <div className="bg-slate-900 rounded-[2.5rem] p-10 shadow-active text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-[0.05] pointer-events-none">
                    <ClipboardList className="h-20 w-20" />
                </div>
                <div className="relative z-10 grid grid-cols-12 items-center">
                    <div className="col-span-6">
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.5em] mb-2">Gran Total — Libro Diario</p>
                        <p className="text-sm font-black text-white/60 italic">{journalEntries.length} asientos • {totalLines} líneas • {startDate} a {endDate}</p>
                    </div>
                    <div className="col-span-3 text-right">
                        <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1">Total Débitos</p>
                        <p className="text-2xl font-black italic tabular-nums text-white">{fmt(totalDebit)}</p>
                    </div>
                    <div className="col-span-3 text-right">
                        <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-1">Total Créditos</p>
                        <p className="text-2xl font-black italic tabular-nums text-white">{fmt(totalCredit)}</p>
                    </div>
                </div>
            </div>

            {/* Footnote */}
            <div className="bg-slate-50 p-10 rounded-[2.5rem] border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-10">
                <div className="flex items-center gap-8">
                    <div className="h-14 w-14 bg-white rounded-3xl flex items-center justify-center text-slate-300 shadow-premium border border-slate-50">
                        <Info className="h-8 w-8" />
                    </div>
                    <div className="space-y-1">
                        <h5 className="text-slate-900 font-black text-sm uppercase tracking-tight">Libro Oficial de Contabilidad</h5>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">
                            Registro cronológico de todas las transacciones conforme al Art. 125 del Decreto 2649 y NIIF.
                        </p>
                    </div>
                </div>
                <Button variant="outline" className="h-14 rounded-2xl border-slate-200 text-[10px] font-black uppercase tracking-widest px-8 hover:bg-white hover:shadow-premium transition-all">
                    Exportar PDF <ArrowRight className="ml-3 h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
