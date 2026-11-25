'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserPlus, Target } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

/**
 * Conmutador Prospectos / Oportunidades. Ambos viven bajo un solo item del menú
 * ("Prospectos y oportunidades"); este toggle, en la cabecera de las dos páginas,
 * permite pasar de uno a otro sin salir del embudo comercial.
 */
export function LeadPipelineSwitch() {
    const pathname = usePathname();
    const isLeads = pathname.startsWith('/crm/leads');

    const items = [
        { key: 'leads', label: 'Prospectos', icon: UserPlus, href: '/crm/leads', active: isLeads },
        { key: 'pipeline', label: 'Oportunidades', icon: Target, href: '/crm/pipeline', active: !isLeads },
    ];

    return (
        <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-0.5">
            {items.map(({ key, label, icon: Icon, href, active }) => (
                <Link
                    key={key}
                    href={href}
                    className={cn(
                        'inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-xs font-bold transition-all',
                        active ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700',
                    )}
                >
                    <Icon className="h-3.5 w-3.5" /> {label}
                </Link>
            ))}
        </div>
    );
}
