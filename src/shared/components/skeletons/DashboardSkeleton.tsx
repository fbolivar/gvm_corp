/** Skeleton for dashboard/analytics pages with charts */
export function DashboardSkeleton() {
    return (
        <div className="space-y-8 animate-pulse">
            {/* Header */}
            <div className="bg-white rounded-[2.5rem] p-10 shadow-sm">
                <div className="flex items-center gap-5">
                    <div className="h-14 w-14 rounded-2xl bg-slate-100" />
                    <div className="space-y-2">
                        <div className="h-6 w-56 bg-slate-100 rounded-lg" />
                        <div className="h-3 w-36 bg-slate-50 rounded" />
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-white rounded-2xl p-6 shadow-sm">
                        <div className="h-3 w-16 bg-slate-100 rounded mb-3" />
                        <div className="h-8 w-24 bg-slate-100 rounded-lg mb-2" />
                        <div className="h-2 w-20 bg-slate-50 rounded" />
                    </div>
                ))}
            </div>

            {/* Chart + Side panel */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-8 shadow-sm">
                    <div className="h-4 w-32 bg-slate-100 rounded mb-6" />
                    <div className="h-64 bg-slate-50 rounded-2xl" />
                </div>
                <div className="bg-white rounded-[2.5rem] p-8 shadow-sm space-y-4">
                    <div className="h-4 w-28 bg-slate-100 rounded mb-4" />
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-slate-100" />
                            <div className="flex-1">
                                <div className="h-3 bg-slate-100 rounded w-full mb-1" />
                                <div className="h-2 bg-slate-50 rounded w-2/3" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
