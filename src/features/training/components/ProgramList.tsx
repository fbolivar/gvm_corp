'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import * as tus from 'tus-js-client';
import { createClient } from '@/lib/supabase/client';
import { setProgramVideoAction, getProgramVideoUrlAction, removeProgramVideoAction, assignProgramToEmployeesAction } from '../actions';
import { TrainingProgram, CATEGORY_CONFIG } from '../types';
import {
    BookOpen,
    Video,
    PlayCircle,
    Upload,
    Link2,
    Loader2,
    Trash2,
    CheckCircle2,
    AlertCircle,
    X,
    UserPlus,
    CalendarDays,
} from 'lucide-react';

interface EmployeeOption { id: string; name: string }
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';

const VIDEO_BUCKET = 'training-videos';
const MAX_BYTES = 500 * 1024 * 1024; // 500 MB
/** Supabase exige exactamente 6 MB por chunk en subidas reanudables (TUS). */
const TUS_CHUNK_SIZE = 6 * 1024 * 1024;

function formatMB(bytes: number): string {
    return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
}

/**
 * Sube un archivo con TUS (protocolo reanudable que Supabase Storage soporta).
 *
 * Ventajas sobre `storage.upload()` para videos pesados:
 *  - Progreso real byte a byte (la API estándar no expone progreso).
 *  - Si se cae la red, reintenta solo y retoma desde el último chunk confirmado
 *    en vez de reenviar el archivo completo.
 *  - Al volver a elegir el mismo archivo, `findPreviousUploads()` recupera la
 *    subida previa (guardada en localStorage) y continúa donde iba.
 */
function uploadResumable(opts: {
    file: File;
    path: string;
    token: string;
    onProgress: (pct: number, resumedFrom: boolean) => void;
    onUpload: (u: tus.Upload) => void;
}): Promise<void> {
    const { file, path, token, onProgress, onUpload } = opts;
    return new Promise<void>((resolve, reject) => {
        let resumedFromPrevious = false;
        const upload = new tus.Upload(file, {
            endpoint: `${process.env.NEXT_PUBLIC_SUPABASE_URL!.trim()}/storage/v1/upload/resumable`,
            retryDelays: [0, 3000, 5000, 10000, 20000], // reintentos automáticos ante caída de red
            headers: {
                authorization: `Bearer ${token}`,
                'x-upsert': 'true', // permite sobrescribir al reanudar/reemplazar
            },
            uploadDataDuringCreation: true,
            removeFingerprintOnSuccess: true,
            chunkSize: TUS_CHUNK_SIZE,
            metadata: {
                bucketName: VIDEO_BUCKET,
                objectName: path,
                contentType: file.type,
                cacheControl: '3600',
            },
            onError: (err) => reject(err),
            onProgress: (sent, total) => {
                onProgress(total > 0 ? Math.round((sent / total) * 100) : 0, resumedFromPrevious);
            },
            onSuccess: () => resolve(),
        });

        onUpload(upload);

        upload.findPreviousUploads()
            .then((previous) => {
                if (previous.length > 0) {
                    resumedFromPrevious = true;
                    upload.resumeFromPreviousUpload(previous[0]);
                }
                upload.start();
            })
            .catch(() => upload.start()); // si falla la búsqueda, subir desde cero
    });
}

interface Props {
    programs: TrainingProgram[];
    tenantId: string;
    employees: EmployeeOption[];
    /** programId → lista de employee_ids que YA tienen ese programa asignado */
    assignedByProgram: Record<string, string[]>;
}

function ProgramRow({ program, tenantId, employees, assignedIds }: { program: TrainingProgram; tenantId: string; employees: EmployeeOption[]; assignedIds: string[] }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [expanded, setExpanded] = useState(false);

    // Asignación a empleados
    const [assignOpen, setAssignOpen] = useState(false);
    const [picked, setPicked] = useState<Set<string>>(new Set());
    const [assignDate, setAssignDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [assigning, setAssigning] = useState(false);
    const [assignMsg, setAssignMsg] = useState<{ success?: boolean; error?: string; count?: number } | null>(null);

    const assignedSet = new Set(assignedIds);
    const assignable = employees.filter(e => !assignedSet.has(e.id)); // solo los que NO la tienen
    const allPicked = assignable.length > 0 && picked.size === assignable.length;
    const togglePick = (id: string) => setPicked(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    const toggleAll = () => setPicked(allPicked ? new Set() : new Set(assignable.map(e => e.id)));

    async function handleAssign() {
        if (picked.size === 0) { setAssignMsg({ error: 'Selecciona al menos un empleado' }); return; }
        setAssigning(true); setAssignMsg(null);
        const res = await assignProgramToEmployeesAction(program.id!, Array.from(picked), assignDate);
        setAssigning(false);
        if (res.error) { setAssignMsg({ error: res.error }); return; }
        setAssignMsg({ success: true, count: res.assigned });
        setPicked(new Set());
        router.refresh();
    }
    const [mode, setMode] = useState<'file' | 'link'>('file');
    const [linkUrl, setLinkUrl] = useState('');
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [resumed, setResumed] = useState(false);
    const [result, setResult] = useState<{ success?: boolean; error?: string } | null>(null);
    const [opening, setOpening] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);
    const uploadRef = useRef<tus.Upload | null>(null);

    const cfg = CATEGORY_CONFIG[program.category];
    const hasVideo = Boolean(program.video_url || program.video_path);

    /**
     * Aborta la subida en curso. `shouldTerminate: false` deja el progreso
     * guardado en el servidor, así al volver a elegir el mismo archivo se
     * reanuda desde donde iba en vez de empezar de cero.
     */
    function handleCancelUpload() {
        uploadRef.current?.abort(false);
        uploadRef.current = null;
        setUploading(false);
        setProgress(0);
        setResult({ error: 'Subida cancelada. Si vuelves a elegir el mismo archivo, continuará donde iba.' });
        if (fileRef.current) fileRef.current.value = '';
    }

    async function handleFileUpload(file: File) {
        setResult(null);
        if (!file.type.startsWith('video/')) {
            setResult({ error: 'El archivo debe ser un video (mp4, webm, mov...)' });
            return;
        }
        if (file.size > MAX_BYTES) {
            setResult({ error: 'El video no debe superar 500 MB. Usa un enlace (YouTube/Drive) para archivos más grandes.' });
            return;
        }

        setUploading(true);
        setProgress(0);
        setResumed(false);
        try {
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            if (!token) {
                setResult({ error: 'Tu sesión expiró. Vuelve a iniciar sesión e inténtalo de nuevo.' });
                setUploading(false);
                return;
            }

            // Ruta DETERMINISTA (sin timestamp): es lo que permite que al reintentar el
            // mismo archivo se reanude sobre el mismo objeto en vez de empezar de cero.
            const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120);
            const path = `${tenantId}/${program.id}/${safeName}`;

            await uploadResumable({
                file,
                path,
                token,
                onProgress: (pct, resumedFrom) => {
                    setProgress(pct);
                    if (resumedFrom) setResumed(true);
                },
                onUpload: (u) => { uploadRef.current = u; },
            });

            const res = await setProgramVideoAction(program.id!, { video_path: path, video_name: file.name });
            if (res.success) {
                setResult({ success: true });
                setExpanded(false);
                router.refresh();
            } else {
                // limpiar archivo huérfano si no se pudo guardar la referencia
                await supabase.storage.from(VIDEO_BUCKET).remove([path]).catch(() => {});
                setResult({ error: res.error || 'No se pudo guardar el video' });
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Error inesperado subiendo el video';
            // Supabase aplica el MENOR entre el límite del bucket y el límite global del
            // proyecto; al excederlo responde en inglés y sin contexto.
            const esLimite = /maximum allowed size|exceeded|payload too large|413/i.test(msg);
            setResult({
                error: esLimite
                    ? `El servidor rechazó el video por tamaño (${formatMB(file.size)}). Usa la opción «Pegar enlace» (YouTube/Drive), o pide al administrador subir el límite de Storage en Supabase.`
                    : `Error subiendo el video: ${msg}`,
            });
        } finally {
            uploadRef.current = null;
            setUploading(false);
        }
    }

    function handleSaveLink() {
        setResult(null);
        const url = linkUrl.trim();
        if (!url) { setResult({ error: 'Pega un enlace de video' }); return; }
        startTransition(async () => {
            const res = await setProgramVideoAction(program.id!, { video_url: url });
            if (res.success) {
                setResult({ success: true });
                setExpanded(false);
                setLinkUrl('');
                router.refresh();
            } else {
                setResult({ error: res.error || 'No se pudo guardar el enlace' });
            }
        });
    }

    async function handleView() {
        setOpening(true);
        try {
            const res = await getProgramVideoUrlAction(program.id!);
            if (res.url) {
                window.open(res.url, '_blank', 'noopener,noreferrer');
            } else {
                setResult({ error: res.error || 'No se pudo abrir el video' });
            }
        } finally {
            setOpening(false);
        }
    }

    function handleRemove() {
        setResult(null);
        startTransition(async () => {
            const res = await removeProgramVideoAction(program.id!);
            if (res.success) {
                setExpanded(false);
                router.refresh();
            } else {
                setResult({ error: res.error || 'No se pudo quitar el video' });
            }
        });
    }

    return (
        <div className="px-5 py-3 border-b border-slate-50 last:border-0">
            <div className="flex flex-wrap items-center gap-3">
                <div className={cn(
                    'h-8 w-8 rounded-xl flex items-center justify-center shrink-0',
                    hasVideo ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'
                )}>
                    {hasVideo ? <Video className="h-3.5 w-3.5" /> : <BookOpen className="h-3.5 w-3.5" />}
                </div>

                <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 leading-snug truncate">
                        {program.name} <span className="text-slate-300 font-mono">· {program.code}</span>
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                        {cfg && (
                            <span className={cn('inline-flex px-2 py-0.5 rounded-lg text-[9px] font-semibold', cfg.className)}>
                                {cfg.label}
                            </span>
                        )}
                        <span className="text-[10px] text-slate-400">{program.duration_hours}h</span>
                        {program.is_mandatory && (
                            <span className="text-[9px] font-semibold text-rose-600">Obligatoria</span>
                        )}
                        {hasVideo && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-600">
                                <CheckCircle2 className="h-2.5 w-2.5" /> Con video
                            </span>
                        )}
                    </div>
                </div>

                {hasVideo && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleView}
                        disabled={opening}
                        className="h-8 px-3 rounded-xl text-xs font-semibold border-indigo-100 text-indigo-700 hover:bg-indigo-50 gap-1.5 shrink-0"
                    >
                        {opening ? <Loader2 className="h-3 w-3 animate-spin" /> : <PlayCircle className="h-3 w-3" />}
                        Ver
                    </Button>
                )}
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setAssignOpen(v => !v); setAssignMsg(null); }}
                    className="h-8 px-3 rounded-xl text-xs font-semibold border-emerald-100 text-emerald-700 hover:bg-emerald-50 gap-1.5 shrink-0"
                >
                    <UserPlus className="h-3 w-3" />
                    Asignar
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setExpanded(v => !v); setResult(null); }}
                    className="h-8 px-3 rounded-xl text-xs font-semibold gap-1.5 shrink-0"
                >
                    <Upload className="h-3 w-3" />
                    {hasVideo ? 'Cambiar' : 'Subir video'}
                </Button>
            </div>

            {assignOpen && (
                <div className="mt-3 ml-11 bg-emerald-50/40 rounded-xl border border-emerald-200 p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <CalendarDays className="h-3.5 w-3.5 text-emerald-600" />
                            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Fecha</label>
                            <input
                                type="date"
                                value={assignDate}
                                onChange={e => setAssignDate(e.target.value)}
                                className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-900"
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            {assignedSet.size > 0 && (
                                <span className="text-[10px] font-semibold text-slate-400">{assignedSet.size} ya la tiene{assignedSet.size > 1 ? 'n' : ''}</span>
                            )}
                            {assignable.length > 0 && (
                                <button type="button" onClick={toggleAll} className="text-[10px] font-semibold text-emerald-700 hover:underline">
                                    {allPicked ? 'Quitar todos' : 'Marcar todos'}
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="max-h-48 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-0.5">
                        {employees.map(e => {
                            const already = assignedSet.has(e.id);
                            return (
                                <label
                                    key={e.id}
                                    className={cn(
                                        'flex items-center gap-2 px-2 py-1 rounded-lg text-xs',
                                        already ? 'opacity-70 cursor-default' : 'hover:bg-white cursor-pointer'
                                    )}
                                >
                                    <input
                                        type="checkbox"
                                        checked={already || picked.has(e.id)}
                                        disabled={already}
                                        onChange={() => !already && togglePick(e.id)}
                                        className="h-3.5 w-3.5 accent-emerald-600 disabled:accent-slate-300"
                                    />
                                    <span className={cn('truncate', already ? 'text-slate-400' : 'text-slate-700')}>{e.name}</span>
                                    {already && (
                                        <span className="ml-auto inline-flex items-center gap-0.5 text-[9px] font-semibold text-emerald-600 shrink-0">
                                            <CheckCircle2 className="h-2.5 w-2.5" /> Ya asignada
                                        </span>
                                    )}
                                </label>
                            );
                        })}
                        {employees.length === 0 && <p className="text-[10px] text-slate-400 px-2">No hay empleados activos.</p>}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[10px] text-slate-500">{picked.size} seleccionado(s)</span>
                        <div className="flex items-center gap-2">
                            <button type="button" onClick={() => { setAssignOpen(false); setAssignMsg(null); }} className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400 hover:text-slate-600">
                                <X className="h-3 w-3" /> Cerrar
                            </button>
                            <Button
                                size="sm"
                                onClick={handleAssign}
                                disabled={assigning || picked.size === 0}
                                className="h-8 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold gap-1.5"
                            >
                                {assigning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
                                Asignar ({picked.size})
                            </Button>
                        </div>
                    </div>

                    {assignMsg?.error && (
                        <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-100 px-3 py-2">
                            <AlertCircle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                            <p className="text-[10px] font-bold text-rose-600">{assignMsg.error}</p>
                        </div>
                    )}
                    {assignMsg?.success && (
                        <p className="text-[10px] font-bold text-emerald-700">✓ Asignado a {assignMsg.count} empleado(s). Se les notificó en su portal.</p>
                    )}
                </div>
            )}

            {expanded && (
                <div className="mt-3 ml-11 bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
                    {/* Selector de modo */}
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={() => setMode('file')}
                            className={cn(
                                'inline-flex items-center gap-1.5 h-7 px-3 rounded-lg text-[10px] font-semibold transition-colors',
                                mode === 'file' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-500 border border-slate-200'
                            )}
                        >
                            <Upload className="h-3 w-3" /> Subir archivo
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode('link')}
                            className={cn(
                                'inline-flex items-center gap-1.5 h-7 px-3 rounded-lg text-[10px] font-semibold transition-colors',
                                mode === 'link' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-500 border border-slate-200'
                            )}
                        >
                            <Link2 className="h-3 w-3" /> Pegar enlace
                        </button>
                    </div>

                    {mode === 'file' ? (
                        <div className="space-y-2">
                            <input
                                ref={fileRef}
                                type="file"
                                accept="video/*"
                                disabled={uploading}
                                onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }}
                                className="block w-full text-[11px] text-slate-600 file:mr-3 file:h-8 file:rounded-lg file:border-0 file:bg-indigo-600 file:px-3 file:text-[11px] file:font-semibold file:text-white hover:file:bg-indigo-700 file:cursor-pointer disabled:opacity-50"
                            />
                            <p className="text-[10px] text-slate-400">
                                Formatos: mp4, webm, mov, avi... Máximo 500 MB. Para videos más pesados usa un enlace.
                                La subida se reanuda sola si se cae la conexión.
                            </p>
                            {uploading && (
                                <div className="space-y-1.5 pt-1">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="flex items-center gap-1.5 text-[10px] font-semibold text-indigo-600">
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                            {progress === 100
                                                ? 'Procesando y guardando...'
                                                : resumed
                                                    ? 'Reanudando subida...'
                                                    : 'Subiendo video...'}
                                        </span>
                                        <span className="text-[10px] font-bold text-indigo-600 tabular-nums">{progress}%</span>
                                    </div>
                                    <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-indigo-600 transition-all duration-300"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleCancelUpload}
                                        className="text-[10px] font-semibold text-slate-400 hover:text-rose-600 transition-colors"
                                    >
                                        Cancelar subida
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <input
                                    type="url"
                                    value={linkUrl}
                                    onChange={e => setLinkUrl(e.target.value)}
                                    placeholder="https://youtube.com/... o enlace de Drive/Vimeo"
                                    className="flex-1 h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                                />
                                <Button
                                    size="sm"
                                    onClick={handleSaveLink}
                                    disabled={isPending || !linkUrl.trim()}
                                    className="h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold gap-1.5 shrink-0"
                                >
                                    {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                                    Guardar
                                </Button>
                            </div>
                            <p className="text-[10px] text-slate-400">
                                Recomendado para videos grandes: súbelo a YouTube (oculto) o Google Drive y pega el enlace.
                            </p>
                        </div>
                    )}

                    <div className="flex items-center justify-between gap-2">
                        {hasVideo ? (
                            <button
                                type="button"
                                onClick={handleRemove}
                                disabled={isPending}
                                className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-rose-500 hover:text-rose-700 transition-colors"
                            >
                                <Trash2 className="h-3 w-3" /> Quitar video actual
                            </button>
                        ) : <span />}
                        <button
                            type="button"
                            onClick={() => { setExpanded(false); setResult(null); }}
                            className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400 hover:text-slate-600"
                        >
                            <X className="h-3 w-3" /> Cerrar
                        </button>
                    </div>

                    {result?.error && (
                        <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-100 px-3 py-2">
                            <AlertCircle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                            <p className="text-[10px] font-bold text-rose-600">{result.error}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export function ProgramList({ programs, tenantId, employees, assignedByProgram }: Props) {
    if (programs.length === 0) {
        return (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-10 flex flex-col items-center justify-center gap-2 text-center">
                <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center">
                    <BookOpen className="h-5 w-5 text-slate-300" />
                </div>
                <p className="text-[11px] font-bold text-slate-400">Sin programas registrados</p>
                <p className="text-[10px] text-slate-300">Crea un programa con el formulario de la izquierda</p>
            </div>
        );
    }

    const withVideo = programs.filter(p => p.video_url || p.video_path).length;

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <BookOpen className="h-4 w-4 text-slate-400" />
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        Programas y Material ({programs.length})
                    </span>
                </div>
                {withVideo > 0 && (
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-indigo-600">
                        <Video className="h-3 w-3" /> {withVideo} con video
                    </span>
                )}
            </div>
            <div className="divide-y divide-slate-50">
                {programs.map(p => (
                    <ProgramRow key={p.id} program={p} tenantId={tenantId} employees={employees} assignedIds={assignedByProgram[p.id!] ?? []} />
                ))}
            </div>
        </div>
    );
}
