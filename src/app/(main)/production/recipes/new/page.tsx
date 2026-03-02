import { createClient } from "@/lib/supabase/server"
import { productService } from "@/features/products/services/productService"
import { RecipeForm } from "@/features/production/components/RecipeForm"
import { createRecipeAction } from "@/features/production/actions"
import { redirect } from "next/navigation"
import { Factory, ArrowLeft, ShieldCheck, Sparkles, BookOpen } from "lucide-react"
import Link from "next/link"
import { Button } from "@/shared/components/ui/button"

export default async function NewRecipePage() {
    const supabase = await createClient()

    // Auth Check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    // Fetch products for selection (all active products)
    const { data: products } = await productService.getProducts(supabase, {
        page: 1,
        per_page: 500,
        status: 'ACTIVE'
    })

    async function handleCreateRecipe(data: any) {
        "use server"
        const result = await createRecipeAction(data)
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
                                <BookOpen className="h-5 w-5" />
                            </div>
                            <h1 className="text-4xl font-black tracking-tight text-slate-900 italic">Nueva Receta</h1>
                        </div>
                        <div className="flex items-center gap-3">
                            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em]">Ficha Técnica de Manufactura</p>
                            <span className="h-1 w-1 rounded-full bg-slate-200" />
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="h-3 w-3 text-emerald-500" />
                                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Estándar de Calidad</span>
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
                    <RecipeForm
                        products={products}
                        onSubmit={handleCreateRecipe}
                    />
                </div>
            </main>
        </div>
    )
}
