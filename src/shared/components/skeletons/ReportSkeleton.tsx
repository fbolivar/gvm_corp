/** Skeleton for report pages (accounting, analytics, heavy data) */
export function ReportSkeleton() {
    return (
        <div className="space-y-8 animate-pulse">
            {/* Header */}
            <div className="bg-white rounded-[2.5rem] p-10 shadow-sm">
                <div className="flex items-center gap-6">
                    <div className="h-16 w-16 rounded-2xl bg-slate-100" />
                    <div className="space-y-2 flex-1">
                        <div className="h-5 w-64 bg-slate-100 rounded-lg" />
                        <div className="h-3 w-40 bg-slate-50 rounded" />
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-white rounded-2xl p-6 shadow-sm">
                        <div className="h-3 w-20 bg-slate-100 rounded mb-3" />
                        <div className="h-7 w-28 bg-slate-100 rounded-lg" />
                    </div>
                ))}
            </div>

            {/* Table */}
            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm space-y-4">
                <div className="flex justify-between items-center mb-6">
                    <div className="h-4 w-32 bg-slate-100 rounded" />
                    <div className="h-10 w-40 bg-slate-50 rounded-xl" />
                </div>
                {/* Table header */}
                <div className="grid grid-cols-5 gap-4 pb-3 border-b border-slate-50">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-3 bg-slate-100 rounded w-full" />
                    ))}
                </div>
                {/* Table rows */}
                {[...Array(8)].map((_, i) => (
                    <div key={i} className="grid grid-cols-5 gap-4 py-3">
                        {[...Array(5)].map((_, j) => (
                            <div key={j} className="h-4 bg-slate-50 rounded w-full" />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    )
}
