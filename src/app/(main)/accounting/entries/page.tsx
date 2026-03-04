import { createClient } from '@/lib/supabase/server';
import { accountingService } from '@/features/accounting/services/accountingService';
import { settingsService } from '@/features/settings/services/settingsService';
import { EntryList } from '@/features/accounting/components/EntryList';
import { VisualReportHeader } from '@/features/accounting/components/VisualReportHeader';
import { Calculator, Layers, Plus } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function EntriesPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const [entries, tenant] = await Promise.all([
        accountingService.getEntries(supabase, { limit: 100 }),
        settingsService.getTenantInfo(supabase)
    ]);

    const totalEntries = entries.length;
    const totalVolume = entries.reduce((acc, entry) => {
        const debit = (entry.lines as Array<Record<string, unknown>>)?.reduce(
            (sum: number, l: Record<string, unknown>) => sum + Number(l.debit), 0
        ) || 0;
        return acc + debit;
    }, 0);

    const fmt = (n: number) => n.toLocaleString('es-CO', { maximumFractionDigits: 0 });
    const currentPeriod = new Date().toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });

    return (
        <div className="page-container space-y-8 pb-20 animate-in fade-in duration-500">

            <VisualReportHeader
                title="Asientos Contables"
                subtitle={`Libro Diario — ${currentPeriod}`}
                tenant={tenant}
            />

            {/* Actions + KPIs */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                <div className="flex items-center gap-6">
                    <div>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Movimientos</p>
                        <div className="flex items-baseline gap-3">
                            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">{totalEntries}</h2>
                            <span className="text-sm font-medium text-slate-400">asientos</span>
                        </div>
                    </div>
                    <div className="h-10 border-l border-slate-100" />
                    <div>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Volumen Débitos</p>
                        <p className="text-lg font-bold text-slate-900 tracking-tight font-mono tabular-nums">${fmt(totalVolume)}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" asChild className="h-9 px-4 rounded-xl gap-2">
                        <Link href="/accounting/reports">
                            <Calculator className="h-3.5 w-3.5" />
                            <span className="text-xs">Reportes</span>
                        </Link>
                    </Button>
                    <Button size="sm" asChild className="h-9 px-4 rounded-xl gap-2 bg-indigo-600 hover:bg-indigo-700">
                        <Link href="/accounting/entries/new">
                            <Plus className="h-3.5 w-3.5" />
                            <span className="text-xs">Nuevo Asiento</span>
                        </Link>
                    </Button>
                </div>
            </div>

            {/* List */}
            <EntryList entries={entries} />
        </div>
    );
}
