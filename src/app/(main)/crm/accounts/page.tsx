import { Building2 } from 'lucide-react';
import { PageHeader } from '@/shared/components/ui/page-header';
import { loadVisitPageContext } from '@/features/crm/services/visitPageContext';
import { visitService } from '@/features/crm/services/visitService';
import { accountService } from '@/features/crm/services/accountService';
import { AccountList } from '@/features/crm/components/AccountList';
import type { AccountStatus } from '@/features/crm/types/visits';

export const metadata = { title: 'Cartera de clientes — GVM Corp' };

interface PageProps { searchParams: Promise<Record<string, string | undefined>> }

export default async function AccountsPage({ searchParams }: PageProps) {
    const sp = await searchParams;
    const { supabase, userId, userName, isManager, today } = await loadVisitPageContext();

    const [accounts, salespeople] = await Promise.all([
        accountService.listAccounts(supabase, today, isManager ? undefined : userId),
        visitService.getSalespeople(supabase, userId),
    ]);

    const unassigned = accounts.filter(a => !a.salesperson_id && a.orders_count > 0).length;

    return (
        <div className="page-container space-y-6 pb-16 animate-in fade-in duration-500">
            <PageHeader
                title={isManager ? 'Cartera de clientes' : 'Mis clientes'}
                description={isManager
                    ? `Reparte la cartera y sigue el estado de cada cuenta.${unassigned > 0 ? ` ${unassigned} clientes con compras aún no tienen comercial.` : ''}`
                    : 'Tus clientes con su estado: quién crece, quién cae y quién dejó de comprar.'}
                icon={Building2}
                breadcrumbs={[{ label: 'Inicio', href: '/dashboard' }, { label: 'CRM', href: '/crm' }, { label: isManager ? 'Cartera' : 'Mis clientes' }]}
            />
            <AccountList
                accounts={accounts}
                salespeople={salespeople}
                isManager={isManager}
                initialSalesperson={sp.salesperson}
                initialStatus={(sp.status as AccountStatus | undefined) ?? ''}
                currentUserName={userName}
            />
        </div>
    );
}
