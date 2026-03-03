import { createClient } from '@/lib/supabase/server';
import { partyService } from '@/features/parties/services/partyService';
import { PartyList } from '@/features/parties/components/PartyList';
import { PartyFilters } from '@/features/parties/types';
import { Users, UserPlus, ShieldCheck } from 'lucide-react';
import { Badge } from "@/shared/components/ui/badge";
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
        <div className="space-y-12 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {/* 💎 PREMIUM HEADER */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 px-1">
                <div className="space-y-2">
                    <h1 className="text-3xl font-black tracking-tight text-slate-900">Centro de Identidades</h1>
                    <div className="flex items-center gap-4">
                        <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">Directorio & CRM Inteligente</p>
                        <div className="flex items-center gap-2 bg-indigo-50 px-3 py-1 rounded-full">
                            <ShieldCheck className="h-3 w-3 text-indigo-600" />
                            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Registro DIAN</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <Badge variant="outline" className="h-14 px-6 rounded-[1.5rem] border-none bg-white shadow-premium text-slate-400 font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
                        <Users className="h-4 w-4 text-indigo-500" />
                        {count || 0} Registros
                    </Badge>
                    <Button asChild className="h-14 px-8 rounded-[1.5rem] bg-slate-900 hover:bg-primary text-white font-black shadow-active transition-all hover:scale-105 active:scale-95 border-none">
                        <Link href="/parties/new" className="flex items-center gap-3">
                            <UserPlus className="h-5 w-5" />
                            <span className="text-xs uppercase tracking-widest">Nuevo Tercero</span>
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
