import { createClient } from "@/lib/supabase/server";
import { NewTicketForm } from "@/features/support/components/NewTicketForm";
import { Button } from "@/shared/components/ui/button";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default async function NewTicketPage() {
    const supabase = await createClient();

    // Fetch dependencies
    const [partiesRes, docsRes, productsRes] = await Promise.all([
        supabase.from('parties').select('id, legal_name').limit(100),
        supabase.from('documents').select('id, number, doc_type').limit(100),
        supabase.from('products').select('id, name').limit(100)
    ]);

    return (
        <div className="space-y-12 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 px-1">
                <div className="space-y-4">
                    <Button variant="ghost" asChild className="text-slate-400 font-black hover:text-slate-900 -ml-4 group">
                        <Link href="/support/tickets" className="flex items-center gap-2">
                            <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                            <span className="text-[10px] uppercase tracking-widest">Mesa de Ayuda</span>
                        </Link>
                    </Button>
                    <h1 className="text-5xl font-black tracking-tighter text-slate-900 italic">Nueva Solicitud</h1>
                    <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">Vincule clientes y transacciones para una resolución inmediata</p>
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
