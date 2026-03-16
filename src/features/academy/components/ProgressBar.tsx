interface ProgressBarProps {
    completed: number
    total: number
    className?: string
}

export function ProgressBar({ completed, total, className = '' }: ProgressBarProps) {
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0
    const isComplete = total > 0 && completed === total

    return (
        <div className={`space-y-1 ${className}`}>
            <div className="flex items-center justify-between text-[10px]">
                <span className="font-semibold text-slate-500">{completed}/{total} lecciones</span>
                <span className={`font-bold ${isComplete ? 'text-emerald-600' : 'text-indigo-600'}`}>{pct}%</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-500 ${isComplete ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    )
}
