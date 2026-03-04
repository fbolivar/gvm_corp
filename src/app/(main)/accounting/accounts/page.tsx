import { createClient } from '@/lib/supabase/server';
import { accountingService } from '@/features/accounting/services/accountingService';
import { settingsService } from '@/features/settings/services/settingsService';
import { VisualReportHeader } from '@/features/accounting/components/VisualReportHeader';
import { AccountList } from '@/features/accounting/components/AccountList';
import { Button } from '@/shared/components/ui/button';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Layers, Hash, BookOpen, Plus } from 'lucide-react';

export default async function AccountsPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const [accounts, tenant] = await Promise.all([
        accountingService.getAccounts(supabase),
        settingsService.getTenantInfo(supabase)
    ]);

    const totalAccounts = accounts.length;
    const auxiliaryCount = accounts.filter(a => a.is_auxiliary).length;
    const majorCount = totalAccounts - auxiliaryCount;

    return (
        <div className="page-container space-y-8 pb-20 animate-in fade-in duration-500">

            <VisualReportHeader
                title="Plan Único de Cuentas"
                subtitle="PUC — Catálogo de cuentas contables"
                tenant={tenant}
            />

            {/* KPIs + Actions */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                        <Layers className="h-4 w-4" />
                    </div>
                    <div>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Cuentas</p>
                        <p className="text-xl font-bold text-slate-900 tracking-tight">{totalAccounts}</p>
                    </div>
                </div>
                <div className="h-10 border-l border-slate-100" />
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                        <BookOpen className="h-4 w-4" />
                    </div>
                    <div>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Mayor</p>
                        <p className="text-xl font-bold text-slate-900 tracking-tight">{majorCount}</p>
                    </div>
                </div>
                <div className="h-10 border-l border-slate-100" />
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                        <Hash className="h-4 w-4" />
                    </div>
                    <div>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Auxiliar</p>
                        <p className="text-xl font-bold text-slate-900 tracking-tight">{auxiliaryCount}</p>
                    </div>
                </div>
            </div>
            <Button size="sm" asChild className="h-9 px-4 rounded-xl gap-2 bg-indigo-600 hover:bg-indigo-700">
                <Link href="/accounting/accounts/new">
                    <Plus className="h-3.5 w-3.5" />
                    <span className="text-xs">Nueva Cuenta</span>
                </Link>
            </Button>
            </div>

            {/* Table */}
            <AccountList accounts={accounts} />
        </div>
    );
}
