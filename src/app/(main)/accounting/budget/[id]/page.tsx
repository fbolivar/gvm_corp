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
        <div className="page-container space-y-6 pb-20 animate-in fade-in duration-500">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild className="h-10 w-10 rounded-xl">
                    <Link href="/accounting/budget"><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                <div>
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight">Presupuesto {budget.year}</h1>
                    <p className="text-xs text-slate-400">{budget.name}</p>
                </div>
            </div>

            <BudgetSpreadsheet budget={budget} lines={lines} actuals={actuals} />
        </div>
    );
}
