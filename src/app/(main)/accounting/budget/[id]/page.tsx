import { createClient } from '@/lib/supabase/server';
import { budgetService } from '@/features/accounting/services/budgetService';
import { BudgetSpreadsheet } from '@/features/accounting/components/BudgetSpreadsheet';
import { Button } from '@/shared/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';

interface Props { params: Promise<{ id: string }> }

export default async function BudgetDetailPage({ params }: Props) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    let budget, lines, actuals;
    try {
        const result = await budgetService.getWithLines(supabase, id);
        budget = result.budget;
        lines  = result.lines;
        actuals = await budgetService.getActuals(supabase, result.budget.year);
    } catch {
        notFound();
    }

    return (
        <div className="space-y-10 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className="flex items-center justify-between px-1">
                <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Presupuesto Anual</p>
                    <h1 className="text-5xl font-black tracking-tighter text-slate-900 italic">{budget.year}</h1>
                </div>
                <Button variant="outline" className="h-12 border-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-widest" asChild>
                    <Link href="/accounting/budget"><ArrowLeft className="h-4 w-4 mr-2" />Presupuestos</Link>
                </Button>
            </div>

            <BudgetSpreadsheet budget={budget} lines={lines} actuals={actuals} />
        </div>
    );
}
