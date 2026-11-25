import Link from 'next/link';
import { ClipboardCheck, ChevronRight } from 'lucide-react';

export interface PendingEvaluation {
    id: string;
    name: string;
    dueDate: string;
}

/**
 * Bandeja del portal del empleado: evaluaciones de desempeño anuales (360°) en las que
 * esta persona fue designada como evaluadora y aún no ha calificado. El enlace la lleva al
 * detalle, donde califica (el acceso lo controla la propia página: evaluador asignado).
 */
export function MyPendingEvaluations({ evaluations }: { evaluations: PendingEvaluation[] }) {
    if (!evaluations.length) return null;
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 divide-y divide-slate-100">
            {evaluations.map(e => (
                <Link
                    key={e.id}
                    href={`/payroll/performance/${e.id}`}
                    className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors group"
                >
                    <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                        <ClipboardCheck className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900 truncate">{e.name}</p>
                        <p className="text-xs text-slate-400">Pendiente de tu calificación · cierre {e.dueDate}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 shrink-0" />
                </Link>
            ))}
        </div>
    );
}
