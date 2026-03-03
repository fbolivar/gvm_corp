import { createClient } from '@/lib/supabase/server';
import { contractService, daysUntilExpiry, CONTRACT_TYPE_LABELS, ContractType } from '@/features/contracts/services/contractService';
import { ContractList } from '@/features/contracts/components/ContractList';
import { Button } from '@/shared/components/ui/button';
import { Plus, FileText, AlertTriangle, CheckCircle2, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function ContractsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const contracts = await contractService.getAll(supabase);

    const activeCount    = contracts.filter(c => c.status === 'ACTIVE').length;
    const expiringSoon   = contracts.filter(c => { const d = daysUntilExpiry(c); return d !== null && d >= 0 && d <= 30; }).length;
    const totalValue     = contracts.filter(c => c.status === 'ACTIVE').reduce((s, c) => s + Number(c.value), 0);
    const draftCount     = contracts.filter(c => c.status === 'DRAFT').length;

    // Type breakdown
    const byType = (Object.keys(CONTRACT_TYPE_LABELS) as ContractType[]).map(t => ({
        type: t,
        label: CONTRACT_TYPE_LABELS[t],
        count: contracts.filter(c => c.contract_type === t).length,
        value: contracts.filter(c => c.contract_type === t && c.status === 'ACTIVE').reduce((s, c) => s + Number(c.value), 0),
    })).filter(t => t.count > 0);

    return (
        <div className="page-container space-y-12 pb-32 animate-in fade-in slide-in-from-bottom-8 duration-1000">

            {/* HEADER */}
            <div className="relative overflow-hidden bg-slate-950 rounded-[2.5rem] p-10 text-white shadow-active group">
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none group-hover:scale-110 group-hover:rotate-12 transition-all duration-1000">
                    <FileText className="h-24 w-24 text-white" />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-10">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="h-2 w-8 bg-violet-500 rounded-full" />
                            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-violet-400">Gestión Legal</span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black tracking-tighter uppercase leading-tight">
                            Contratos<br /><span className="text-slate-500">& Acuerdos</span>
                        </h1>
                        <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.4em]">
                            Registro, seguimiento y alertas de vencimiento — Gestión centralizada
                        </p>
                    </div>
                    <Button className="bg-violet-600 hover:bg-violet-500 text-white font-black text-[10px] uppercase tracking-widest h-14 px-10 rounded-2xl shadow-active" asChild>
                        <Link href="/contracts/new"><Plus className="h-4 w-4 mr-2" />Nuevo Contrato</Link>
                    </Button>
                </div>
            </div>

            {/* KPI STRIP */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[
                    { label: 'Contratos Activos',    value: activeCount,   icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Por Vencer (30d)',      value: expiringSoon,  icon: AlertTriangle, color: 'text-amber-600',  bg: 'bg-amber-50' },
                    { label: 'Valor Activo (COP)',    value: `$${(totalValue / 1e6).toFixed(1)}M`, icon: DollarSign, color: 'text-violet-600', bg: 'bg-violet-50' },
                    { label: 'En Borrador',          value: draftCount,    icon: FileText,     color: 'text-blue-600',   bg: 'bg-blue-50' },
                ].map((kpi, i) => (
                    <div key={i} className="bg-white rounded-[2.5rem] p-7 shadow-premium flex items-center gap-5">
                        <div className={`h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 ${kpi.bg} ${kpi.color}`}>
                            <kpi.icon className="h-7 w-7" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{kpi.label}</p>
                            <p className="text-xl font-black text-slate-900 tracking-tight">{kpi.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Type breakdown */}
            {byType.length > 0 && (
                <div className="bg-white rounded-[2.5rem] p-10 shadow-premium">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-6">Distribución por Tipo</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        {byType.map(t => (
                            <div key={t.type} className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100 text-center">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t.label}</p>
                                <p className="text-xl font-black text-slate-900 tracking-tight">{t.count}</p>
                                {t.value > 0 && (
                                    <p className="text-[9px] font-black text-violet-500 uppercase tracking-widest">${(t.value / 1e6).toFixed(1)}M</p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Contract list */}
            <ContractList initialContracts={contracts} />
        </div>
    );
}
