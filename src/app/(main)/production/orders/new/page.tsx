import { createClient } from "@/lib/supabase/server"
import { inventoryService } from "@/features/inventory/services/inventoryService"
import { productionService } from "@/features/production/services/productionService"
import { OrderForm } from "@/features/production/components/OrderForm"
import { createOrderAction } from "@/features/production/actions"
import { redirect } from "next/navigation"
import { ClipboardList, ArrowLeft, Sparkles, Factory, ShieldCheck } from "lucide-react"
import Link from "next/link"
import { Button } from "@/shared/components/ui/button"

export default async function NewOrderPage() {
    const supabase = await createClient()

    // Auth Check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    // Fetch recipes for selection
    const recipes = await productionService.getRecipes(supabase)

    // Fetch warehouses for selection
    const warehouses = await inventoryService.getWarehouses(supabase)

    async function handleCreateOrder(data: any) {
        "use server"
        const result = await createOrderAction(data)
        if (!result.error) {
            redirect('/production')
        }
    }

    return (
        <div className="min-h-screen bg-[#FDFDFF] pb-20">
            {/* 💎 PREMIUM HEADER */}
            <div className="bg-white border-b border-slate-100/80 sticky top-0 z-30">
                <div className="max-w-[1200px] mx-auto px-8 py-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-lg">
                                <ClipboardList className="h-5 w-5" />
                            </div>
                            <h1 className="text-3xl font-black tracking-tight text-slate-900">Nueva Orden</h1>
                        </div>
                        <div className="flex items-center gap-3">
                            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em]">Apertura de Lote en Planta</p>
                            <span className="h-1 w-1 rounded-full bg-slate-200" />
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="h-3 w-3 text-indigo-500" />
                                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Procedimiento Estandarizado</span>
                            </div>
                        </div>
                    </div>

                    <Button variant="outline" asChild className="h-14 px-8 border-slate-100 bg-white text-slate-400 hover:text-slate-900 transition-all rounded-[1.25rem] shadow-sm font-black text-[10px] uppercase tracking-widest">
                        <Link href="/production">
                            <ArrowLeft className="h-5 w-5 mr-3" />
                            Volver al Panel
                        </Link>
                    </Button>
                </div>
            </div>

            <main className="max-w-[1200px] mx-auto px-8 mt-12 animate-in fade-in slide-in-from-bottom-5 duration-1000">
                <div className="grid grid-cols-1 gap-12">
                    <OrderForm
                        recipes={recipes}
                        warehouses={warehouses}
                        onSubmit={handleCreateOrder}
                    />
                </div>
            </main>
        </div>
    )
}
