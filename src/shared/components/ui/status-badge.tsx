import * as React from "react";
import { cn } from "@/shared/lib/utils";

export type StatusTone = "neutral" | "draft" | "info" | "success" | "warning" | "danger";

const toneClasses: Record<StatusTone, string> = {
    neutral: "bg-slate-100 text-slate-700",
    draft: "bg-slate-50 text-slate-600 ring-1 ring-slate-200",
    info: "bg-sky-50 text-sky-700 ring-1 ring-sky-200/60",
    success: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60",
    warning: "bg-amber-50 text-amber-700 ring-1 ring-amber-200/60",
    danger: "bg-rose-50 text-rose-700 ring-1 ring-rose-200/60",
};

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    tone?: StatusTone;
    dot?: boolean;
}

export function StatusBadge({
    tone = "neutral",
    dot = false,
    className,
    children,
    ...props
}: StatusBadgeProps) {
    const dotColor =
        tone === "success" ? "bg-emerald-500" :
        tone === "warning" ? "bg-amber-500" :
        tone === "danger" ? "bg-rose-500" :
        tone === "info" ? "bg-sky-500" :
        "bg-slate-400";

    return (
        <span
            className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium",
                toneClasses[tone],
                className
            )}
            {...props}
        >
            {dot && <span className={cn("h-1.5 w-1.5 rounded-full", dotColor)} />}
            {children}
        </span>
    );
}

export function statusToTone(status: string | null | undefined): StatusTone {
    const s = (status || "").toUpperCase();
    if (["DRAFT", "BORRADOR", "PENDING"].includes(s)) return "draft";
    if (["ACCEPTED", "APROBADO", "APPROVED", "EMITTED", "PAID", "PAGADO", "COMPLETED", "ACTIVE"].includes(s)) return "success";
    if (["SENT", "PENDING_APPROVAL", "AWAITING", "VALIDATED", "VALIDADO", "EN_PROCESO"].includes(s)) return "info";
    if (["EXPIRING", "OVERDUE", "VENCIDO", "WARNING"].includes(s)) return "warning";
    if (["REJECTED", "RECHAZADO", "CANCELLED", "CANCELED", "ANULADO", "ERROR", "EXPIRED"].includes(s)) return "danger";
    return "neutral";
}
