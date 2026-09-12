'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { selfCompleteTrainingAction, getProgramVideoUrlAction } from '../actions';
import { TrainingRecord, CATEGORY_CONFIG, TRAINING_STATUS } from '../types';
import {
    GraduationCap,
    PlayCircle,
    CheckCircle2,
    Loader2,
    CalendarDays,
    Award,
    Clock,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';

interface Props {
    records: TrainingRecord[];
}

function TrainingCard({ record }: { record: TrainingRecord }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [opening, setOpening] = useState(false);

    const program = record.program;
    const cfg = program?.category ? CATEGORY_CONFIG[program.category] : undefined;
    const statusCfg = TRAINING_STATUS[record.status] ?? {
        label: record.status,
        className: 'bg-slate-50 text-slate-500 border border-slate-100',
    };
    const hasVideo = Boolean(program?.video_url || program?.video_path);
    const isPendingStatus = record.status === 'SCHEDULED';

    async function handleWatch() {
        if (!program?.id) return;
        setOpening(true);
        try {
            const res = await getProgramVideoUrlAction(program.id);
            if (res.url) window.open(res.url, '_blank', 'noopener,noreferrer');
            else toast.error(res.error || 'No se pudo abrir el video');
        } finally {
            setOpening(false);
        }
    }

    function handleSelfComplete() {
        startTransition(async () => {
            const res = await selfCompleteTrainingAction(record.id!);
            if (res.success) {
                toast.success('¡Listo! Quedó registrada como vista');
                router.refresh();
            } else {
                toast.error(res.error || 'No se pudo registrar');
            }
        });
    }

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
            <div className="flex items-start gap-3">
                <div className={cn(
                    'h-9 w-9 rounded-xl flex items-center justify-center shrink-0',
                    isPendingStatus ? 'bg-blue-50 text-blue-500' : 'bg-emerald-50 text-emerald-500'
                )}>
                    <GraduationCap className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 leading-snug break-words">
                        {program?.name ?? 'Capacitación'}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap mt-1">
                        {cfg && (
                            <span className={cn('inline-flex px-2 py-0.5 rounded-lg text-[9px] font-semibold', cfg.className)}>
                                {cfg.label}
                            </span>
                        )}
                        <span className={cn('inline-flex px-2 py-0.5 rounded-lg text-[9px] font-semibold', statusCfg.className)}>
                            {statusCfg.label}
                        </span>
                        {program?.is_mandatory && (
                            <span className="text-[9px] font-semibold text-rose-600">Obligatoria</span>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-4 flex-wrap text-[10px] text-slate-400 pl-12">
                <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="h-3 w-3" />
                    Programada: {record.scheduled_date}
                </span>
                {program?.duration_hours ? (
                    <span className="inline-flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        {program.duration_hours}h
                    </span>
                ) : null}
                {record.completion_date && (
                    <span className="inline-flex items-center gap-1.5 text-emerald-600 font-semibold">
                        <CheckCircle2 className="h-3 w-3" />
                        Completada: {record.completion_date}
                    </span>
                )}
                {record.score !== null && record.score !== undefined && (
                    <span className="inline-flex items-center gap-1 text-amber-700 font-bold font-mono tabular-nums">
                        <Award className="h-3 w-3 text-amber-500" />
                        {record.score}pts
                    </span>
                )}
            </div>

            {program?.description && (
                <p className="text-[11px] text-slate-500 pl-12 leading-relaxed">{program.description}</p>
            )}

            <div className="flex items-center gap-2 flex-wrap pl-12">
                {hasVideo ? (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleWatch}
                        disabled={opening}
                        className="h-9 px-4 rounded-xl text-xs font-semibold border-indigo-100 text-indigo-700 hover:bg-indigo-50 gap-1.5"
                    >
                        {opening ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlayCircle className="h-3.5 w-3.5" />}
                        Ver video
                    </Button>
                ) : (
                    <span className="text-[10px] text-slate-300 font-semibold">Sin material en video</span>
                )}

                {isPendingStatus && (
                    <Button
                        size="sm"
                        onClick={handleSelfComplete}
                        disabled={isPending}
                        className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold gap-1.5"
                    >
                        {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                        Ya la vi
                    </Button>
                )}

                {!isPendingStatus && record.self_completed_at && (
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-emerald-600">
                        <CheckCircle2 className="h-3 w-3" />
                        La marcaste como vista
                    </span>
                )}
            </div>
        </div>
    );
}

export function MyTrainings({ records }: Props) {
    if (records.length === 0) {
        return (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-10 flex flex-col items-center justify-center gap-2 text-center">
                <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center">
                    <GraduationCap className="h-5 w-5 text-slate-300" />
                </div>
                <p className="text-[11px] font-bold text-slate-400">No tienes capacitaciones asignadas</p>
                <p className="text-[10px] text-slate-300">Cuando RRHH te programe una, aparecerá aquí</p>
            </div>
        );
    }

    const pendientes = records.filter(r => r.status === 'SCHEDULED');

    return (
        <div className="space-y-3">
            {pendientes.length > 0 && (
                <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5">
                    <Clock className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                    <p className="text-[11px] font-semibold text-blue-700">
                        Tienes {pendientes.length} capacitación{pendientes.length > 1 ? 'es' : ''} pendiente{pendientes.length > 1 ? 's' : ''}.
                        Mira el video y marca «Ya la vi».
                    </p>
                </div>
            )}
            {records.map(r => (
                <TrainingCard key={r.id} record={r} />
            ))}
        </div>
    );
}
