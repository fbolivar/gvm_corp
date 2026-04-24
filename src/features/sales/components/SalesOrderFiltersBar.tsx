"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useCallback, useTransition } from "react"
import { Search, CalendarDays, X, Filter } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { cn } from "@/shared/lib/utils"

const STATUS_OPTIONS = [
    { value: '', label: 'Todos los estados' },
    { value: 'DRAFT', label: 'Borrador' },
    { value: 'SENT', label: 'Confirmado' },
    { value: 'ACCEPTED', label: 'Facturado' },
    { value: 'VOIDED', label: 'Anulado' },
]

interface Props {
    defaultSearch?: string
    defaultStatus?: string
    defaultFrom?: string
    defaultTo?: string
}

export function SalesOrderFiltersBar({ defaultSearch, defaultStatus, defaultFrom, defaultTo }: Props) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const [isPending, startTransition] = useTransition()

    const update = useCallback((key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString())
        if (value) {
            params.set(key, value)
        } else {
            params.delete(key)
        }
        params.delete('page')
        startTransition(() => {
            router.push(`${pathname}?${params.toString()}`)
        })
    }, [router, pathname, searchParams])

    const hasFilters = !!(defaultSearch || defaultStatus || defaultFrom || defaultTo)

    const clearAll = () => {
        startTransition(() => {
            router.push(pathname)
        })
    }

    return (
        <div className={cn(
            "bg-white rounded-2xl border border-slate-100 shadow-sm p-4",
            isPending && "opacity-60 pointer-events-none"
        )}>
            <div className="flex flex-wrap gap-3 items-center">
                <div className="flex items-center gap-2 text-slate-400 shrink-0">
                    <Filter className="h-4 w-4" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider">Filtros</span>
                </div>

                {/* Search */}
                <div className="relative flex-1 min-w-[180px] max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-300" />
                    <input
                        type="text"
                        placeholder="Número o cliente..."
                        defaultValue={defaultSearch}
                        className="w-full h-9 bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-200 focus:border-indigo-300"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') update('search', (e.target as HTMLInputElement).value.trim())
                        }}
                        onBlur={(e) => update('search', e.target.value.trim())}
                    />
                </div>

                {/* Status */}
                <select
                    defaultValue={defaultStatus ?? ''}
                    className="h-9 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-200 focus:border-indigo-300"
                    onChange={(e) => update('status', e.target.value)}
                >
                    {STATUS_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                </select>

                {/* Date range */}
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <CalendarDays className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-300 pointer-events-none" />
                        <input
                            type="date"
                            defaultValue={defaultFrom}
                            className="h-9 bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 text-xs text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-200 focus:border-indigo-300"
                            onChange={(e) => update('from', e.target.value)}
                        />
                    </div>
                    <span className="text-[10px] text-slate-300">–</span>
                    <input
                        type="date"
                        defaultValue={defaultTo}
                        className="h-9 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-200 focus:border-indigo-300"
                        onChange={(e) => update('to', e.target.value)}
                    />
                </div>

                {hasFilters && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 rounded-xl text-xs text-slate-400 hover:text-rose-500 gap-1.5 shrink-0"
                        onClick={clearAll}
                    >
                        <X className="h-3.5 w-3.5" /> Limpiar
                    </Button>
                )}
            </div>
        </div>
    )
}
