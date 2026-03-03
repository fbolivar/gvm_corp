import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { SettlementForm } from "@/features/payroll/components/SettlementForm"
import { Button } from "@/shared/components/ui/button"
import { ChevronLeft, Calculator, Sparkles } from "lucide-react"
import Link from "next/link"

export default async function PayrollSettlementPage() {
    const supabase = await createClient()

    // Auth Check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect('/login')
    }

    return (
        <div className="space-y-12 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-1000 container mx-auto py-12 px-4">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 px-1">
                <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                        <Button asChild variant="ghost" className="h-8 w-8 p-0 rounded-lg text-slate-400 hover:text-primary">
                            <Link href="/payroll">
                                <ChevronLeft className="h-5 w-5" />
                            </Link>
                        </Button>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Volver al Dashboard</span>
                    </div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900">Liquidación</h1>
                    <div className="flex items-center gap-4">
                        <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">Generación de Nómina Eléctronica</p>
                        <div className="flex items-center gap-2 bg-rose-50 px-3 py-1 rounded-full">
                            <Calculator className="h-3 w-3 text-rose-600 animate-pulse" />
                            <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Periodo Feb 2026</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4 bg-white p-2 rounded-[1.5rem] shadow-premium border-none">
                    <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center text-white">
                        <Sparkles className="h-5 w-5" />
                    </div>
                    <div className="pr-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Algoritmo V3</p>
                        <p className="text-sm font-black text-slate-900 italic">Cálculo Certificado</p>
                    </div>
                </div>
            </div>

            <SettlementForm />
        </div>
    )
}
