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

    // Fetch active employees for assignment selector
    const { data: rawEmployees } = await supabase
        .from('employees')
        .select('id, party:parties(legal_name)')
        .eq('status', 'ACTIVE')
        .order('created_at');

    const employees = (rawEmployees || []).map((e: Record<string, unknown>) => ({
        id: e.id as string,
        party: Array.isArray(e.party) ? (e.party[0] as { legal_name: string } | null) : (e.party as { legal_name: string } | null),
    }));

    return (
        <div className="space-y-6 pb-16 animate-in fade-in duration-500">
            <VisualReportHeader
                title="Nuevo Activo"
                subtitle="Registro de equipo tecnologico"
                tenant={tenant}
            />
            <AssetForm employees={employees} />
        </div>
    );
}
