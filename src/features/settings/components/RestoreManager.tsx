"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import {
    UploadCloud, Database, CheckCircle2, AlertTriangle,
    RefreshCcw, ShieldAlert, Lock, XCircle, PackagePlus,
    History, ArrowRight, FileCheck2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/shared/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────

interface TableDiff {
    table: string;
    in_backup: number;
    missing: number;
    present: number;
    comparable: boolean;
}

interface AnalyzeResult {
    valid: boolean;
    meta: {
        created_at: string;
        created_by: string;
        version: string;
        type: string;
        record_count: number;
        tables_included: string[];
        auth_users: number;
        encrypted: boolean;
    };
    totals: { in_backup: number; missing: number; present: number };
    tables: TableDiff[];
}

interface RestoreResult {
    success: boolean;
    mode?: string;
    message: string;
    total_restored: number;
    tables_restored: number;
    tables_with_errors: number;
    details: Record<string, { restored: number; errors: string[] }>;
}

type Mode = "missing_only" | "full";
type Step = "select" | "analyzing" | "review" | "restoring" | "done";

// ── Component ─────────────────────────────────────────────────────────────────

export function RestoreManager({ tenantId: _tenantId }: { tenantId: string }) {
    void _tenantId;
    const router = useRouter();
    const [step, setStep] = useState<Step>("select");
    const [file, setFile] = useState<File | null>(null);
    const [analysis, setAnalysis] = useState<AnalyzeResult | null>(null);
    const [mode, setMode] = useState<Mode>("missing_only");
    const [result, setResult] = useState<RestoreResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (!selected) return;
        setFile(selected);
        setError(null);
        setStep("analyzing");

        try {
            const fd = new FormData();
            fd.append("file", selected);
            const res = await fetch("/api/backup/analyze", { method: "POST", body: fd });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "No se pudo analizar el backup");
            setAnalysis(data);
            setMode("missing_only");
            setStep("review");
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Error al analizar el archivo";
            setError(msg);
            setStep("select");
            toast.error(msg);
        }
    };

    const startRestore = async () => {
        if (!file) return;
        setStep("restoring");
        try {
            const fd = new FormData();
            fd.append("file", file);
            fd.append("mode", mode);
            const res = await fetch("/api/backup/restore", { method: "POST", body: fd });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Error en la restauración");
            setResult(data);
            setStep("done");
            toast.success("Restauración completada", { description: data.message });
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Error en la restauración";
            toast.error(msg);
            setResult({
                success: false, message: msg, total_restored: 0,
                tables_restored: 0, tables_with_errors: 1, details: {},
            });
            setStep("done");
        }
    };

    const reset = () => {
        setStep("select"); setFile(null); setAnalysis(null);
        setMode("missing_only"); setResult(null); setError(null);
    };

    const tablesWithMissing = analysis?.tables.filter((t) => t.missing > 0) ?? [];

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div>
                <h2 className="text-3xl font-black tracking-tighter text-slate-900 italic">Restaurar Sistema</h2>
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">
                    Analiza un backup .gvm y recupera lo que falta — sin pisar tu trabajo actual
                </p>
            </div>

            {/* STEP: SELECT */}
            {step === "select" && (
                <Card className="border-none shadow-premium rounded-[2.5rem] overflow-hidden bg-white">
                    <CardContent className="p-10 space-y-6">
                        <div className="flex items-start gap-4 rounded-2xl bg-slate-900 text-white p-6">
                            <Lock className="h-8 w-8 text-emerald-400 shrink-0" />
                            <div>
                                <h3 className="text-lg font-black italic">Sube tu copia de seguridad</h3>
                                <p className="text-slate-400 text-sm mt-1 leading-relaxed">
                                    Acepta archivos <strong className="text-white">.gvm</strong> (cifrados) generados por GVM Corp.
                                    Al subirlo, el sistema lo descifra y te dice <strong className="text-white">exactamente qué información falta</strong> antes de restaurar.
                                </p>
                            </div>
                        </div>

                        <div className="border-2 border-dashed border-slate-200 rounded-2xl p-10 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors relative cursor-pointer">
                            <input
                                type="file"
                                accept=".gvm,.json"
                                onChange={handleFileChange}
                                className="absolute inset-0 opacity-0 cursor-pointer h-full w-full"
                            />
                            <div className="h-14 w-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mb-4">
                                <UploadCloud className="h-8 w-8" />
                            </div>
                            <p className="font-bold text-slate-600">Arrastra tu archivo .gvm aquí</p>
                            <p className="text-xs text-slate-400 mt-1">o haz clic para seleccionar (.gvm o .json legado)</p>
                        </div>

                        {error && (
                            <div className="flex items-center gap-3 bg-rose-50 border border-rose-200 rounded-2xl px-5 py-3">
                                <XCircle className="h-5 w-5 text-rose-500 shrink-0" />
                                <p className="text-sm font-bold text-rose-600">{error}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* STEP: ANALYZING */}
            {step === "analyzing" && (
                <Card className="border-none shadow-premium rounded-[2.5rem] bg-white text-center py-16">
                    <CardContent className="flex flex-col items-center">
                        <div className="h-24 w-24 bg-indigo-100 rounded-full flex items-center justify-center mb-6">
                            <RefreshCcw className="h-12 w-12 text-indigo-600 animate-spin" />
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 italic">Descifrando y analizando…</h2>
                        <p className="text-slate-500 font-medium max-w-md mx-auto mt-2">
                            Comparando el backup con tu base de datos actual para detectar qué falta.
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* STEP: REVIEW */}
            {step === "review" && analysis && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                    {/* Meta */}
                    <Card className="border-none shadow-premium rounded-[2.5rem] bg-white overflow-hidden">
                        <CardContent className="p-8">
                            <div className="flex items-center gap-2 mb-4">
                                <FileCheck2 className="h-5 w-5 text-emerald-600" />
                                <h3 className="font-black text-slate-900">Backup válido y descifrado</h3>
                                {analysis.meta.encrypted && (
                                    <Badge className="bg-emerald-100 text-emerald-700 border-none text-[10px] ml-1">
                                        <Lock className="h-3 w-3 mr-1" /> AES-256
                                    </Badge>
                                )}
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <MetaBox label="Fecha" value={new Date(analysis.meta.created_at).toLocaleString("es-CO")} />
                                <MetaBox label="Registros" value={analysis.meta.record_count.toLocaleString("es-CO")} />
                                <MetaBox label="Tablas" value={String(analysis.meta.tables_included.length)} />
                                <MetaBox label="Creado por" value={analysis.meta.created_by} />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Diagnóstico: qué falta */}
                    <Card className="border-none shadow-premium rounded-[2.5rem] bg-white overflow-hidden">
                        <CardContent className="p-8 space-y-6">
                            <h3 className="font-black text-slate-900 text-lg italic">Diagnóstico de la base actual</h3>
                            <div className="grid grid-cols-3 gap-4">
                                <StatBig value={analysis.totals.missing} label="Faltantes" color="rose" />
                                <StatBig value={analysis.totals.present} label="Ya existen" color="emerald" />
                                <StatBig value={analysis.totals.in_backup} label="En el backup" color="slate" />
                            </div>

                            {tablesWithMissing.length > 0 ? (
                                <div className="space-y-2">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                                        Tablas con registros faltantes
                                    </p>
                                    <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100 overflow-hidden">
                                        {tablesWithMissing.map((t) => (
                                            <div key={t.table} className="flex items-center justify-between px-4 py-3">
                                                <span className="font-mono text-sm font-bold text-slate-700">{t.table}</span>
                                                <div className="flex items-center gap-3 text-xs">
                                                    <Badge className="bg-rose-100 text-rose-700 border-none">{t.missing} faltan</Badge>
                                                    <span className="text-slate-400">{t.present} ya existen</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-2xl px-5 py-4">
                                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                                    <p className="text-sm font-bold text-emerald-700">
                                        Tu base ya tiene todos los registros del backup. No falta nada por recuperar.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Modo de restauración */}
                    <Card className="border-none shadow-premium rounded-[2.5rem] bg-white overflow-hidden">
                        <CardContent className="p-8 space-y-4">
                            <h3 className="font-black text-slate-900 text-lg italic">¿Qué quieres restaurar?</h3>

                            <ModeOption
                                active={mode === "missing_only"}
                                onClick={() => setMode("missing_only")}
                                icon={<PackagePlus className="h-6 w-6" />}
                                title="Solo lo faltante"
                                recommended
                                desc={`Recupera únicamente los ${analysis.totals.missing.toLocaleString("es-CO")} registros que ya no existen. NO sobreescribe ni borra nada de lo actual. Seguro.`}
                                accent="emerald"
                            />
                            <ModeOption
                                active={mode === "full"}
                                onClick={() => setMode("full")}
                                icon={<History className="h-6 w-6" />}
                                title="Restauración completa (rollback)"
                                desc="Sobrescribe TODO con el contenido del backup (vuelve el sistema a ese punto en el tiempo). Los cambios hechos después del backup se perderán."
                                accent="amber"
                            />

                            {mode === "full" && (
                                <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3">
                                    <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                                    <p className="text-xs font-bold text-amber-700">
                                        Modo destructivo: sobreescribirá registros modificados desde la fecha del backup.
                                        Úsalo solo para revertir el sistema completo.
                                    </p>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-2">
                                <Button variant="outline" onClick={reset} className="h-12 px-6 rounded-xl border-slate-200 text-slate-500">
                                    Cancelar
                                </Button>
                                <Button
                                    onClick={startRestore}
                                    disabled={mode === "missing_only" && analysis.totals.missing === 0}
                                    className={cn(
                                        "h-12 px-8 rounded-xl text-white font-bold shadow-lg",
                                        mode === "full" ? "bg-amber-600 hover:bg-amber-700" : "bg-emerald-600 hover:bg-emerald-700"
                                    )}
                                >
                                    {mode === "full" ? "Restaurar TODO" : "Recuperar lo faltante"}
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* STEP: RESTORING */}
            {step === "restoring" && (
                <Card className="border-none shadow-premium rounded-[2.5rem] bg-white text-center py-16">
                    <CardContent className="flex flex-col items-center">
                        <div className="h-24 w-24 bg-indigo-100 rounded-full flex items-center justify-center mb-6">
                            <RefreshCcw className="h-12 w-12 text-indigo-600 animate-spin" />
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 italic">Restaurando…</h2>
                        <p className="text-slate-500 font-medium max-w-md mx-auto mt-2">No cierres esta ventana.</p>
                    </CardContent>
                </Card>
            )}

            {/* STEP: DONE */}
            {step === "done" && result && (
                <div className="space-y-6 animate-in zoom-in-95 duration-500">
                    <Card className={cn("border-none shadow-premium rounded-[2.5rem] text-center py-12", result.success ? "bg-emerald-50" : "bg-rose-50")}>
                        <CardContent className="flex flex-col items-center">
                            <div className={cn("h-24 w-24 rounded-full flex items-center justify-center mb-6", result.success ? "bg-emerald-100" : "bg-rose-100")}>
                                {result.success ? <CheckCircle2 className="h-12 w-12 text-emerald-600" /> : <ShieldAlert className="h-12 w-12 text-rose-600" />}
                            </div>
                            <h2 className={cn("text-3xl font-black italic", result.success ? "text-emerald-900" : "text-rose-900")}>
                                {result.success ? "¡Restauración Exitosa!" : "Error en Restauración"}
                            </h2>
                            <p className={cn("font-medium max-w-md mx-auto mt-2 mb-4", result.success ? "text-emerald-700" : "text-rose-700")}>
                                {result.message}
                            </p>
                            {result.success && (
                                <div className="flex items-center gap-6 mt-2 mb-6">
                                    <div className="text-center">
                                        <p className="text-3xl font-black text-emerald-800">{result.total_restored}</p>
                                        <p className="text-xs font-bold text-emerald-600 uppercase">Recuperados</p>
                                    </div>
                                    <div className="h-8 w-px bg-emerald-200" />
                                    <div className="text-center">
                                        <p className="text-3xl font-black text-emerald-800">{result.tables_restored}</p>
                                        <p className="text-xs font-bold text-emerald-600 uppercase">Tablas</p>
                                    </div>
                                </div>
                            )}
                            <div className="flex gap-4">
                                <Button onClick={reset} variant="outline" className="h-12 px-6 rounded-xl border-slate-200 text-slate-600 bg-transparent">
                                    Restaurar Otro
                                </Button>
                                <Button onClick={() => router.push("/dashboard")} className="h-12 px-6 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800">
                                    Ir al Dashboard
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {result.details && Object.keys(result.details).length > 0 && (
                        <Card className="border-none shadow-premium rounded-[2.5rem] bg-white overflow-hidden">
                            <CardContent className="p-0 divide-y divide-slate-100">
                                {Object.entries(result.details).map(([table, info]) => (
                                    <div key={table} className="flex items-center justify-between p-4 px-8">
                                        <div className="flex items-center gap-3">
                                            <Database className="h-4 w-4 text-slate-300" />
                                            <span className="font-mono text-sm font-bold text-slate-700">{table}</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-sm font-bold text-slate-900">{info.restored} registros</span>
                                            {info.errors.length > 0 && (
                                                <Badge className="bg-amber-100 text-amber-700 border-none text-[10px]">{info.errors.length} error(es)</Badge>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MetaBox({ label, value }: { label: string; value: string }) {
    return (
        <div className="bg-slate-50 p-3 rounded-xl">
            <p className="text-[10px] font-bold text-slate-400 uppercase">{label}</p>
            <p className="font-bold text-slate-900 mt-0.5 text-xs truncate">{value}</p>
        </div>
    );
}

function StatBig({ value, label, color }: { value: number; label: string; color: "rose" | "emerald" | "slate" }) {
    const colors = {
        rose: "bg-rose-50 text-rose-700",
        emerald: "bg-emerald-50 text-emerald-700",
        slate: "bg-slate-50 text-slate-700",
    };
    return (
        <div className={cn("rounded-2xl p-5 text-center", colors[color])}>
            <p className="text-3xl font-black tabular-nums">{value.toLocaleString("es-CO")}</p>
            <p className="text-[10px] font-black uppercase tracking-widest mt-1 opacity-70">{label}</p>
        </div>
    );
}

function ModeOption({
    active, onClick, icon, title, desc, recommended, accent,
}: {
    active: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    title: string;
    desc: string;
    recommended?: boolean;
    accent: "emerald" | "amber";
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "w-full text-left flex items-start gap-4 rounded-2xl border-2 p-5 transition-all",
                active
                    ? accent === "emerald"
                        ? "border-emerald-400 bg-emerald-50/60"
                        : "border-amber-400 bg-amber-50/60"
                    : "border-slate-100 hover:border-slate-200 bg-white"
            )}
        >
            <div className={cn(
                "h-11 w-11 rounded-xl flex items-center justify-center shrink-0",
                active ? (accent === "emerald" ? "bg-emerald-500 text-white" : "bg-amber-500 text-white") : "bg-slate-100 text-slate-400"
            )}>
                {icon}
            </div>
            <div>
                <div className="flex items-center gap-2">
                    <p className="font-black text-slate-900">{title}</p>
                    {recommended && <Badge className="bg-emerald-100 text-emerald-700 border-none text-[9px]">RECOMENDADO</Badge>}
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{desc}</p>
            </div>
        </button>
    );
}
