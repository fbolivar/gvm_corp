"use client"

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { assignTicketAction, getAssignableUsersAction } from "../actions";
import { toast } from "sonner";
import { Loader2, ChevronDown, UserCircle } from "lucide-react";

interface Props {
    ticketId: string;
    currentAssignedTo: string | null;
    currentName?: string | null;
}

export function TicketAssignControl({ ticketId, currentAssignedTo, currentName }: Props) {
    const router = useRouter();
    const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        getAssignableUsersAction()
            .then(setUsers)
            .catch(() => setUsers([]))
            .finally(() => setLoading(false));
    }, []);

    async function onChange(next: string) {
        const value = next === '' ? null : next;
        if (value === (currentAssignedTo ?? null)) return;
        setSaving(true);
        const res = await assignTicketAction(ticketId, value, currentAssignedTo);
        setSaving(false);
        if (res.error) {
            toast.error(res.error);
        } else {
            toast.success(value ? "Responsable asignado" : "Ticket sin asignar");
            router.refresh();
        }
    }

    return (
        <div className="space-y-2">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Asignar a</p>
            <div className="relative flex items-center">
                <UserCircle className="absolute left-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                <select
                    value={currentAssignedTo ?? ''}
                    disabled={saving || loading}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full h-9 pl-8 pr-8 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 shadow-sm outline-none focus:ring-2 focus:ring-indigo-500/20 appearance-none cursor-pointer disabled:opacity-60"
                >
                    <option value="">Sin asignar</option>
                    {/* Si el responsable actual no está en la lista (aún cargando), lo mostramos igual */}
                    {currentAssignedTo && !users.some((u) => u.id === currentAssignedTo) && (
                        <option value={currentAssignedTo}>{currentName || 'Responsable actual'}</option>
                    )}
                    {users.map((u) => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                </select>
                {(saving || loading) ? (
                    <Loader2 className="absolute right-2.5 h-3.5 w-3.5 text-slate-400 animate-spin pointer-events-none" />
                ) : (
                    <ChevronDown className="absolute right-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                )}
            </div>
        </div>
    );
}
