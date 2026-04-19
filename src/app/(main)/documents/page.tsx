import { createClient } from '@/lib/supabase/server';
import { documentService } from '@/features/documents/services/documentService';
import { DocumentList } from '@/features/documents/components/DocumentList';
import { redirect } from 'next/navigation';
import { Button } from '@/shared/components/ui/button';
import { PageHeader } from '@/shared/components/ui/page-header';
import Link from 'next/link';
import {
    Plus,
    FileText,
    Receipt,
    Clock,
    Send,
} from 'lucide-react';

export default async function DocumentsPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data } = await documentService.getDocuments(supabase, { page: 1, per_page: 50 });

    const drafts = data.filter(d => d.status === 'DRAFT').length;
    const emitted = data.filter(d => d.status === 'SENT' || d.status === 'ACCEPTED').length;
    const totalAmount = data.reduce((sum, d) => sum + (d.total || 0), 0);

    const kpis = [
        { label: 'Total', value: data.length, icon: FileText, tint: 'bg-slate-50 text-slate-700' },
        { label: 'Borradores', value: drafts, icon: Clock, tint: 'bg-amber-50 text-amber-700' },
        { label: 'Emitidos DIAN', value: emitted, icon: Send, tint: 'bg-emerald-50 text-emerald-700' },
        { label: 'Facturación', value: `$${totalAmount.toLocaleString('es-CO')}`, icon: Receipt, tint: 'bg-sky-50 text-sky-700' },
    ];

    return (
        <div className="page-container">
            <PageHeader
                title="Centro documental"
                description="Facturas, cotizaciones, órdenes y notas. Trazabilidad completa y emisión DIAN."
                icon={FileText}
                breadcrumbs={[
                    { label: 'Inicio', href: '/dashboard' },
                    { label: 'Documentos' },
                ]}
                actions={
                    <>
                        <Button asChild variant="outline">
                            <Link href="/sales">Ver ventas</Link>
                        </Button>
                        <Button asChild>
                            <Link href="/documents/new">
                                <Plus className="h-4 w-4 mr-1.5" />
                                Nuevo documento
                            </Link>
                        </Button>
                    </>
                }
            />

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {kpis.map((kpi) => (
                    <div key={kpi.label} className="surface-card p-5">
                        <div className="flex items-start justify-between mb-3">
                            <span className="kpi-label">{kpi.label}</span>
                            <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${kpi.tint}`}>
                                <kpi.icon className="h-4 w-4" />
                            </div>
                        </div>
                        <p className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums truncate">
                            {kpi.value}
                        </p>
                    </div>
                ))}
            </div>

            <div className="surface-card overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                    <div>
                        <h2 className="text-h3">Registro documental</h2>
                        <p className="text-caption mt-0.5">{data.length} registros mostrados</p>
                    </div>
                </div>
                <div className="p-2">
                    <DocumentList documents={data} />
                </div>
            </div>
        </div>
    );
}
