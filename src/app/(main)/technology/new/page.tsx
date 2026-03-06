import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { settingsService } from '@/features/settings/services/settingsService';
import { VisualReportHeader } from '@/features/accounting/components/VisualReportHeader';
import { AssetForm } from '@/features/technology/components/AssetForm';

export default async function NewAssetPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const tenant = await settingsService.getTenantInfo(supabase);

    return (
        <div className="space-y-6 pb-16 animate-in fade-in duration-500">
            <VisualReportHeader
                title="Nuevo Activo"
                subtitle="Registro de equipo tecnológico"
                tenant={tenant}
            />
            <AssetForm />
        </div>
    );
}
