import { createClient } from '@/lib/supabase/server';
import { partyService } from '@/features/parties/services/partyService';
import { PartyList } from '@/features/parties/components/PartyList';
import { PartyFilters } from '@/features/parties/types';
import { UserPlus, ShieldCheck } from 'lucide-react';
import { Button } from "@/shared/components/ui/button";
import Link from "next/link";
import { redirect } from 'next/navigation';

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
        <div className="space-y-8 pb-16 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-1">
                <div className="space-y-1.5">
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Clientes & Proveedores</h1>
                    <div className="flex items-center gap-3">
                        <p className="text-slate-400 font-semibold text-xs uppercase tracking-wide">Directorio & CRM Inteligente</p>
                        <div className="flex items-center gap-1.5 bg-indigo-50 px-2.5 py-0.5 rounded-full">
                            <ShieldCheck className="h-3 w-3 text-indigo-600" />
                            <span className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wide">DIAN</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{count || 0} registros</span>
                    <Button asChild size="sm" className="h-9 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs gap-2">
                        <Link href="/parties/new">
                            <UserPlus className="h-3.5 w-3.5" />
                            Nuevo Tercero
                        </Link>
                    </Button>
                </div>
            </div>

            {/* 📋 LIST */}
            <PartyList
                initialData={data}
                totalCount={count || 0}
                currentPage={page}
                perPage={per_page}
            />
        </div>
    );
}
