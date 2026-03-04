import { Badge } from "@/shared/components/ui/badge";
import { cn } from "@/shared/lib/utils";
import { TicketStatus } from "../types";

interface Props {
    status: TicketStatus;
    className?: string;
}

export function TicketStatusBadge({ status, className }: Props) {
    const styles: Record<TicketStatus, string> = {
        'OPEN': 'bg-blue-50 text-blue-600 border-blue-100',
        'IN_PROGRESS': 'bg-amber-50 text-amber-600 border-amber-100',
        'PENDING_APPROVAL': 'bg-violet-50 text-violet-600 border-violet-100',
        'RESOLVED': 'bg-emerald-50 text-emerald-600 border-emerald-100',
        'CLOSED': 'bg-slate-50 text-slate-400 border-slate-100',
    };

    const labels: Record<TicketStatus, string> = {
        'OPEN': 'Abierto',
        'IN_PROGRESS': 'En Proceso',
        'PENDING_APPROVAL': 'Esperando Aprobacion',
        'RESOLVED': 'Resuelto',
        'CLOSED': 'Cerrado',
    };

    return (
        <Badge variant="outline" className={cn("px-2 py-0 text-[10px] font-semibold uppercase tracking-wider", styles[status], className)}>
            {labels[status]}
        </Badge>
    );
}
