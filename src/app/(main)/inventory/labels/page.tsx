import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { canViewModule } from "@/shared/lib/moduleGuard"
import { getProductLabelData } from "@/features/products/labelActions"
import { ProductBarcodeLabels } from "@/features/products/components/ProductBarcodeLabels"
import { Button } from "@/shared/components/ui/button"

export const metadata = { title: "Etiquetas de código de barras — GVM Corp" }

export default async function ProductLabelsPage() {
    if (!(await canViewModule("inventory"))) redirect("/inventory")

    const data = await getProductLabelData()
    if ("error" in data) {
        return (
            <div className="page-container py-16 text-center text-slate-500">{data.error}</div>
        )
    }

    return (
        <div className="page-container space-y-6 pb-20 animate-in fade-in duration-500">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild className="h-10 w-10 rounded-xl">
                    <Link href="/inventory"><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                <div>
                    <h1 className="text-lg font-bold text-slate-900">Etiquetas de código de barras</h1>
                    <p className="text-xs text-slate-500">
                        Imprime y pega códigos de barras en productos sin código de fábrica.
                    </p>
                </div>
            </div>

            <ProductBarcodeLabels
                initialLabels={data.labels}
                initialMissing={data.missingCount}
                prefix={data.prefix}
            />
        </div>
    )
}
