import { createClient } from "@/lib/supabase/server";
import { NewTicketForm } from "@/features/support/components/NewTicketForm";
import { Button } from "@/shared/components/ui/button";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default async function NewTicketPage() {
    const supabase = await createClient();

    const [partiesRes, docsRes, productsRes] = await Promise.all([
        supabase.from('parties').select('id, legal_name').limit(100),
        supabase.from('documents').select('id, number, doc_type').limit(100),
        supabase.from('products').select('id, name').limit(100)
    ]);

    return (
        <div className="space-y-8 pb-16 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-1">
                <div className="space-y-3">
                    <Button variant="ghost" asChild className="text-slate-400 font-semibold hover:text-slate-900 -ml-4 group">
                        <Link href="/support/tickets" className="flex items-center gap-2">
                            <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                            <span className="text-[10px] uppercase tracking-wider">Mesa de Ayuda</span>
                        </Link>
                    </Button>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Nueva Solicitud</h1>
                    <p className="text-slate-400 font-semibold text-xs uppercase tracking-wide">Vincule clientes y transacciones para una resolucion inmediata</p>
                </div>
            </div>

            <NewTicketForm
                parties={partiesRes.data || []}
                documents={docsRes.data || []}
                products={productsRes.data || []}
            />
        </div>
    );
}
