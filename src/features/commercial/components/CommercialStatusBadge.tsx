import { cn } from '@/shared/lib/utils'
import { STATUS_META, type CommercialStatus } from '../types'

export function CommercialStatusBadge({ status }: { status: CommercialStatus }) {
    const meta = STATUS_META[status] ?? { label: status, cls: 'bg-slate-100 text-slate-500' }
    return (
        <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest', meta.cls)}>
            {meta.label}
        </span>
    )
}
