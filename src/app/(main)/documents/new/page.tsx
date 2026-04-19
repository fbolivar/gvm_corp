import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '@/shared/components/ui/page-header';
import {
    FileText,
    ClipboardList,
    FileBarChart,
    FileDigit,
    FileX,
    FilePlus2,
    ShoppingBag,
    Receipt,
    ArrowRight,
} from 'lucide-react';

const OPTIONS = [
    {
        group: 'Ventas',
        items: [
            { label: 'Cotización', desc: 'Propuesta comercial sin compromiso', href: '/sales/quotations/new', icon: ClipboardList },
            { label: 'Pedido de venta', desc: 'Compromiso de entrega al cliente', href: '/sales/orders/new', icon: FileBarChart },
            { label: 'Factura de venta', desc: 'Documento fiscal emitido a DIAN', href: '/sales/invoices/new', icon: FileDigit },
            { label: 'Nota crédito', desc: 'Reduce balance de una factura', href: '/sales/credit-notes/new', icon: FileX },
            { label: 'Nota débito', desc: 'Aumenta balance de una factura', href: '/sales/debit-notes/new', icon: FilePlus2 },
        ],
    },
    {
        group: 'Compras',
        items: [
            { label: 'Orden de compra', desc: 'Pedido formal al proveedor', href: '/purchasing/orders/new', icon: ShoppingBag },
            { label: 'Factura de compra', desc: 'Cuenta por pagar a proveedor', href: '/purchasing/bills/new', icon: Receipt },
        ],
    },
];

export default async function NewDocumentPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    return (
        <div className="page-container max-w-5xl">
            <PageHeader
                title="Nuevo documento"
                description="Selecciona el tipo de documento que quieres crear."
                icon={FileText}
                breadcrumbs={[
                    { label: 'Inicio', href: '/dashboard' },
                    { label: 'Documentos', href: '/documents' },
                    { label: 'Nuevo' },
                ]}
            />

            <div className="space-y-8">
                {OPTIONS.map((group) => (
                    <section key={group.group}>
                        <h2 className="text-h3 mb-3">{group.group}</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {group.items.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className="surface-card p-4 group hover:shadow-md hover:border-slate-300 transition-all flex items-start gap-3"
                                >
                                    <div className="h-10 w-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-700 shrink-0 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                                        <item.icon className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                                            <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-slate-900 group-hover:translate-x-0.5 transition-all shrink-0" />
                                        </div>
                                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{item.desc}</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </section>
                ))}
            </div>
        </div>
    );
}
