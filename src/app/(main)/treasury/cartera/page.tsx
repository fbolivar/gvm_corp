import { createClient } from '@/lib/supabase/server';
import { CarteraList } from '@/features/treasury/components/CarteraList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Wallet, TrendingUp, TrendingDown, ShieldCheck, Zap, Activity } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { VisualReportHeader } from '@/features/accounting/components/VisualReportHeader';
import { settingsService } from '@/features/settings/services/settingsService';

export default async function CarteraPage() {
    const supabase = await createClient();

    const [tenant, { data: receivables }, { data: payables }] = await Promise.all([
        settingsService.getTenantInfo(supabase),
        supabase
            .from('documents')
            .select(`
                id, 
                number, 
                doc_type, 
                total, 
                issue_date,
                due_date,
                status,
                party:parties(legal_name)
            `)
            .eq('doc_type', 'INVOICE')
            .neq('status', 'SENT')
            .order('due_date', { ascending: true }),
        supabase
            .from('documents')
            .select(`
                id, 
                number, 
                doc_type, 
                total, 
                issue_date,
                due_date,
                status,
                party:parties(legal_name)
            `)
            .eq('doc_type', 'VENDOR_BILL')
            .neq('status', 'SENT')
            .order('due_date', { ascending: true })
    ]);

    const mapItems = (items: any[]) => items?.map(item => ({
        id: item.id,
        number: item.number || 'BORRADOR',
        doc_type: item.doc_type,
        party_name: item.party?.legal_name || 'N/A',
        issue_date: item.issue_date,
        due_date: item.due_date || item.issue_date,
        total: item.total,
        balance: item.total, // Simplified for MVP
        status: item.status
    })) || [];

    return (
        <div className="page-container space-y-12 pb-32 animate-in fade-in slide-in-from-bottom-8 duration-1000">

            {/* 💎 PREMIUM HEADER INDUSTRIAL V3 */}
            <VisualReportHeader
                title="Gestión Estratégica de Cartera"
                subtitle="Control de Cuentas por Cobrar & Obligaciones"
                tenant={tenant}
            />

            {/* 📊 TABS DE NAVEGACIÓN INDUSTRIAL */}
            <Tabs defaultValue="receivables" className="w-full space-y-10">
                <div className="flex justify-start">
                    <TabsList className="bg-slate-100/50 border border-slate-100 p-1.5 rounded-2xl h-16 backdrop-blur-md w-fit">
                        <TabsTrigger value="receivables" className="rounded-xl px-10 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm font-black text-[10px] uppercase tracking-widest transition-all h-full gap-3 text-slate-400">
                            <TrendingUp className="h-4 w-4" /> Cuentas por Cobrar (Asset)
                        </TabsTrigger>
                        <TabsTrigger value="payables" className="rounded-xl px-10 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm font-black text-[10px] uppercase tracking-widest transition-all h-full gap-3 text-slate-400">
                            <TrendingDown className="h-4 w-4" /> Cuentas por Pagar (Liability)
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="receivables" className="animate-in fade-in zoom-in-95 duration-500">
                    <CarteraList items={mapItems(receivables || [])} type="RECEIVABLES" tenant={tenant} />
                </TabsContent>

                <TabsContent value="payables" className="animate-in fade-in zoom-in-95 duration-500">
                    <CarteraList items={mapItems(payables || [])} type="PAYABLES" tenant={tenant} />
                </TabsContent>
            </Tabs>

            {/* 🔒 PROTOCOLO DE PRIVACIDAD */}
            <div className="flex items-center justify-center gap-6 opacity-30 pt-10">
                <div className="h-px bg-slate-300 flex-1" />
                <div className="flex items-center gap-3">
                    <ShieldCheck className="h-4 w-4 text-slate-400" />
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em]">Protocolo de Seguridad de Datos Bancarios</span>
                </div>
                <div className="h-px bg-slate-300 flex-1" />
            </div>
        </div>
    );
}
