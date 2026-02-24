import { createClient } from '@/lib/supabase/server';
import { settingsService } from '@/features/settings/services/settingsService';
import { VisualReportHeader } from "@/features/accounting/components/VisualReportHeader";
import { CertificateGenerator } from "@/features/accounting/components/CertificateGenerator";
import { redirect } from 'next/navigation';

export default async function CertificatesPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const tenant = await settingsService.getTenantInfo(supabase);

    return (
        <div className="page-container space-y-10 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {/* 💎 PREMIUM HEADER */}
            <VisualReportHeader
                title="Certificados de Retención"
                subtitle="Gestión Legal y Tributaria"
                tenant={tenant}
            />

            <div className="max-w-7xl mx-auto px-4">
                <CertificateGenerator />
            </div>
        </div>
    );
}
