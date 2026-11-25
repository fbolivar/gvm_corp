import Link from 'next/link';
import { Contact, Phone, Smartphone, Mail, Star, Building2, ArrowUpRight } from 'lucide-react';
import { PageHeader } from '@/shared/components/ui/page-header';
import { createClient } from '@/lib/supabase/server';
import { directoryService } from '@/features/crm/services/directoryService';
import { DirectorySearch } from '@/features/crm/components/DirectorySearch';
import { ExportDirectoryButton } from '@/features/crm/components/ExportDirectoryButton';

export const metadata = { title: 'Directorio de contactos — GVM Corp' };

interface PageProps { searchParams: Promise<{ q?: string }> }

export default async function DirectoryPage({ searchParams }: PageProps) {
    const sp = await searchParams;
    const q = (sp.q ?? '').trim();
    const supabase = await createClient();
    const rows = await directoryService.searchDirectory(supabase, q);

    return (
        <div className="page-container space-y-6 pb-20 animate-in fade-in duration-500">
            <PageHeader
                title="Directorio de contactos"
                description="Personas clave de cada cliente: con quién hablar, su cargo y cómo contactarlo. La información queda en la empresa aunque cambie el comercial."
                icon={Contact}
                breadcrumbs={[{ label: 'Inicio', href: '/dashboard' }, { label: 'CRM', href: '/crm' }, { label: 'Directorio' }]}
                actions={<ExportDirectoryButton rows={rows} />}
            />

            <DirectorySearch initialQ={q} />

            <p className="text-xs text-slate-400">
                {rows.length === 0
                    ? (q ? `Sin resultados para «${q}».` : 'Aún no hay contactos. Agrégalos desde la ficha de cada cliente.')
                    : `${rows.length} contacto(s)${q ? ` para «${q}»` : ''}${rows.length >= 300 ? ' (mostrando los primeros 300 — afina la búsqueda)' : ''}`}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {rows.map(c => (
                    <div key={c.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-2 hover:border-indigo-200 transition">
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-bold text-slate-900">{c.name}</span>
                                    {c.is_primary && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
                                    {c.role && <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 rounded-full px-2 py-0.5">{c.role}</span>}
                                </div>
                                <Link href={`/parties/${c.party_id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-indigo-600 mt-0.5">
                                    <Building2 className="h-3 w-3" /> {c.party_name}{c.party_city ? ` · ${c.party_city}` : ''}
                                    <ArrowUpRight className="h-3 w-3" />
                                </Link>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                            {c.phone && <a href={`tel:${c.phone}`} className="inline-flex items-center gap-1 hover:text-indigo-600"><Phone className="h-3 w-3" />{c.phone}</a>}
                            {c.mobile && <a href={`tel:${c.mobile}`} className="inline-flex items-center gap-1 hover:text-indigo-600"><Smartphone className="h-3 w-3" />{c.mobile}</a>}
                            {c.email && <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1 hover:text-indigo-600 truncate"><Mail className="h-3 w-3" />{c.email}</a>}
                        </div>
                        {c.notes && <p className="text-[11px] text-slate-400 whitespace-pre-line line-clamp-2">{c.notes}</p>}
                    </div>
                ))}
            </div>
        </div>
    );
}
