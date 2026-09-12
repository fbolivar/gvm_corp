import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { settingsService } from '@/features/settings/services/settingsService';
import { VisualReportHeader } from '@/features/accounting/components/VisualReportHeader';
import { AccountingSimulation } from '@/features/accounting/components/AccountingSimulation';
import { Button } from '@/shared/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata = { title: 'Simulación de contabilización — GVM Corp' };

export default async function AccountingSimulationPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const tenant = await settingsService.getTenantInfo(supabase);

    // Rango por defecto: el mes en curso.
    const now = new Date();
    const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    return (
        <div className="page-container space-y-6 pb-20 animate-in fade-in duration-500">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild className="h-10 w-10 rounded-xl">
                    <Link href="/accounting/reports"><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                <div className="flex-1">
                    <VisualReportHeader
                        title="Simulación de contabilización"
                        subtitle="Qué asiento generaría cada factura con la parametrización actual — no guarda nada"
                        tenant={tenant}
                    />
                </div>
            </div>

            <AccountingSimulation defaultFrom={from} defaultTo={to} />
        </div>
    );
}
