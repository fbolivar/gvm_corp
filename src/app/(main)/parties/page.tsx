import { createClient } from '@/lib/supabase/server';
import { partyService } from '@/features/parties/services/partyService';
import { PartyList } from '@/features/parties/components/PartyList';
import { PartyFilters } from '@/features/parties/types';
import { Users, UserPlus } from 'lucide-react';
import { Button } from "@/shared/components/ui/button";
import Link from "next/link";
import { redirect } from 'next/navigation';
import { PageHeader } from '@/shared/components/ui/page-header';

interface PageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function PartiesPage({ searchParams }: PageProps) {
    const supabase = await createClient();

    // Auth Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const params = await searchParams;

    const page = Number(params?.page) || 1;
    const per_page = Number(params?.per_page) || 10;
    const search = params?.search as string || undefined;

    const typeParam = params?.type as string;
    const type = typeParam && (typeParam === 'PERSON' || typeParam === 'COMPANY') ? typeParam : undefined;

    const roleParam = params?.role as string;
    const role = roleParam && (roleParam === 'customer' || roleParam === 'vendor') ? roleParam : 'all';

    const filters: PartyFilters = {
        search,
        type: type as any,
        role: role as any,
        page,
        per_page
    };

    const { data, count } = await partyService.getParties(supabase, filters);

    return (
        <div className="page-container space-y-8 pb-16 animate-in fade-in duration-500">
            <PageHeader
                title="Terceros"
                description="Clientes, proveedores y prospectos."
                icon={Users}
                breadcrumbs={[
                    { label: 'Inicio', href: '/dashboard' },
                    { label: 'Terceros' },
                ]}
                actions={
                    <Button asChild size="sm" className="h-9 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs gap-2">
                        <Link href="/parties/new">
                            <UserPlus className="h-3.5 w-3.5" />
                            Nuevo tercero
                        </Link>
                    </Button>
                }
            />

            {/* LIST */}
            <PartyList
                initialData={data}
                totalCount={count || 0}
                currentPage={page}
                perPage={per_page}
            />
        </div>
    );
}
