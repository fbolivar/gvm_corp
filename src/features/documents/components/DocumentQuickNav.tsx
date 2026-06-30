"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/shared/components/ui/button"
import { SearchableSelect } from "@/shared/components/ui/searchable-select"
import { ChevronLeft, ChevronRight } from "lucide-react"

export interface QuickNavSibling {
    id: string
    number: string | null
    party: string
}

/**
 * Navegación rápida entre documentos del mismo tipo (ej. pedidos) sin volver
 * a la lista: anterior/siguiente + selector para saltar a cualquiera.
 */
export function DocumentQuickNav({
    currentId,
    typeLabel,
    siblings,
}: {
    currentId: string
    typeLabel: string
    siblings: QuickNavSibling[]
}) {
    const router = useRouter()
    const idx = siblings.findIndex(s => s.id === currentId)
    const newer = idx > 0 ? siblings[idx - 1] : null          // más reciente
    const older = idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null  // anterior

    const items = siblings.map(s => ({
        value: s.id,
        label: `#${s.number ?? 's/n'}`,
        subLabel: s.party,
        keywords: `${s.number ?? ''} ${s.party}`,
    }))

    const position = idx >= 0 ? `${idx + 1} de ${siblings.length}` : ''

    return (
        <div className="flex flex-wrap items-center gap-2 bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-2.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mr-1">
                {typeLabel}
                {position && <span className="text-slate-300 ml-2 font-medium normal-case tracking-normal">{position}</span>}
            </span>

            {newer ? (
                <Button asChild variant="outline" size="sm" className="h-9 rounded-lg text-xs gap-1">
                    <Link href={`/documents/${newer.id}`}><ChevronLeft className="h-4 w-4" /> Anterior</Link>
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
                    onChange={(v) => { if (v && v !== currentId) router.push(`/documents/${v}`) }}
                    placeholder="Saltar a otro..."
                    emptyMessage="Sin documentos"
                    className="h-9 bg-white border border-slate-200 rounded-lg px-3 text-xs text-slate-700 hover:border-slate-300 transition"
                />
            </div>

            {older ? (
                <Button asChild variant="outline" size="sm" className="h-9 rounded-lg text-xs gap-1">
                    <Link href={`/documents/${older.id}`}>Siguiente <ChevronRight className="h-4 w-4" /></Link>
                </Button>
            ) : (
                <Button variant="outline" size="sm" disabled className="h-9 rounded-lg text-xs gap-1">
                    Siguiente <ChevronRight className="h-4 w-4" />
                </Button>
            )}
        </div>
    )
}
