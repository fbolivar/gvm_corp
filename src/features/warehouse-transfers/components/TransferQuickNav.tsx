"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/shared/components/ui/button"
import { SearchableSelect } from "@/shared/components/ui/searchable-select"
import { ChevronLeft, ChevronRight } from "lucide-react"

export interface TransferNavSibling {
    id: string
    number: string | null
    route: string
}

/**
 * Navegación rápida entre traslados sin volver a la lista:
 * anterior/siguiente + selector para saltar a cualquiera.
 */
export function TransferQuickNav({
    currentId,
    siblings,
}: {
    currentId: string
    siblings: TransferNavSibling[]
}) {
    const router = useRouter()
    const idx = siblings.findIndex((s) => s.id === currentId)
    const newer = idx > 0 ? siblings[idx - 1] : null
    const older = idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null

    const items = siblings.map((s) => ({
        value: s.id,
        label: s.number ?? "s/n",
        subLabel: s.route,
        keywords: `${s.number ?? ""} ${s.route}`,
    }))

    const position = idx >= 0 ? `${idx + 1} de ${siblings.length}` : ""

    return (
        <div className="flex flex-wrap items-center gap-2 bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-2.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mr-1">
                Traslados
                {position && (
                    <span className="text-slate-300 ml-2 font-medium normal-case tracking-normal">{position}</span>
                )}
            </span>

            {older ? (
                <Button asChild variant="outline" size="sm" className="h-9 rounded-lg text-xs gap-1">
                    <Link href={`/inventory/transfers/${older.id}`}><ChevronLeft className="h-4 w-4" /> Anterior</Link>
                </Button>
            ) : (
                <Button variant="outline" size="sm" disabled className="h-9 rounded-lg text-xs gap-1">
                    <ChevronLeft className="h-4 w-4" /> Anterior
                </Button>
            )}

            <div className="min-w-[220px] flex-1 max-w-sm">
                <SearchableSelect
                    items={items}
                    value={currentId}
                    onChange={(v) => { if (v && v !== currentId) router.push(`/inventory/transfers/${v}`) }}
                    placeholder="Saltar a otro..."
                    emptyMessage="Sin traslados"
                    className="h-9 bg-white border border-slate-200 rounded-lg px-3 text-xs text-slate-700 hover:border-slate-300 transition"
                />
            </div>

            {newer ? (
                <Button asChild variant="outline" size="sm" className="h-9 rounded-lg text-xs gap-1">
                    <Link href={`/inventory/transfers/${newer.id}`}>Siguiente <ChevronRight className="h-4 w-4" /></Link>
                </Button>
            ) : (
                <Button variant="outline" size="sm" disabled className="h-9 rounded-lg text-xs gap-1">
                    Siguiente <ChevronRight className="h-4 w-4" />
                </Button>
            )}
        </div>
    )
}
