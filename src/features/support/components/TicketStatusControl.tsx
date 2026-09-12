"use client"

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateTicketStatusAction } from "../actions";
import { toast } from "sonner";
import { Loader2, ChevronDown } from "lucide-react";
import { TicketStatus } from "../types";

const STATUS_OPTIONS: { value: TicketStatus; label: string }[] = [
    { value: 'OPEN', label: 'Abierto' },
    { value: 'IN_PROGRESS', label: 'En Progreso' },
    { value: 'PENDING_APPROVAL', label: 'Pendiente Aprobación' },
    { value: 'RESOLVED', label: 'Resuelto' },
    { value: 'CLOSED', label: 'Cerrado' },
];

interface Props {
    ticketId: string;
    currentStatus: TicketStatus;
}

export function TicketStatusControl({ ticketId, currentStatus }: Props) {
    const router = useRouter();
    const [saving, setSaving] = useState(false);

    async function onChange(next: string) {
        if (next === currentStatus) return;
        setSaving(true);
        const res = await updateTicketStatusAction(ticketId, next, { status: currentStatus });
        setSaving(false);
        if (res.error) {
            toast.error(res.error);
        } else {
            toast.success("Estado actualizado");
            router.refresh();
        }
    }

    return (
        <div className="relative inline-flex items-center">
            <select
                value={currentStatus}
                disabled={saving}
                onChange={(e) => onChange(e.target.value)}
                className="h-9 pl-3 pr-8 rounded-xl border border-slate-200 bg-white text-[11px] font-bold uppercase tracking-wider text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-indigo-500/20 appearance-none cursor-pointer disabled:opacity-60"
            >
                {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                ))}
            </select>
            {saving ? (
                <Loader2 className="absolute right-2.5 h-3.5 w-3.5 text-slate-400 animate-spin pointer-events-none" />
            ) : (
                <ChevronDown className="absolute right-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            )}
        </div>
    );
}
