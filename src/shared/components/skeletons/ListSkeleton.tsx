/** Skeleton for list/table pages (inventory, parties, products, etc.) */
export function ListSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            {/* Header + Actions */}
            <div className="bg-white rounded-[2.5rem] p-10 shadow-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-5">
                        <div className="h-14 w-14 rounded-2xl bg-slate-100" />
                        <div className="space-y-2">
                            <div className="h-5 w-48 bg-slate-100 rounded-lg" />
                            <div className="h-3 w-32 bg-slate-50 rounded" />
                        </div>
                    </div>
                    <div className="h-11 w-36 bg-slate-100 rounded-xl" />
                </div>
            </div>

            {/* Search + Filters */}
            <div className="flex gap-3">
                <div className="h-12 flex-1 bg-white rounded-2xl shadow-sm" />
                <div className="h-12 w-32 bg-white rounded-2xl shadow-sm" />
            </div>

            {/* KPI strip */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-white rounded-2xl p-5 shadow-sm">
                        <div className="h-3 w-16 bg-slate-100 rounded mb-2" />
                        <div className="h-6 w-20 bg-slate-100 rounded-lg" />
                    </div>
                ))}
            </div>

            {/* Table rows */}
            <div className="bg-white rounded-[2.5rem] p-6 shadow-sm space-y-3">
                {[...Array(10)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4 py-3 border-b border-slate-50 last:border-0">
                        <div className="h-10 w-10 rounded-xl bg-slate-100 shrink-0" />
                        <div className="flex-1 space-y-2">
                            <div className="h-4 bg-slate-100 rounded w-3/4" />
                            <div className="h-3 bg-slate-50 rounded w-1/2" />
                        </div>
                        <div className="h-6 w-16 bg-slate-50 rounded-full" />
                    </div>
                ))}
            </div>
        </div>
    )
}
