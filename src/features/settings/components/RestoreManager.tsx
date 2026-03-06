"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
    UploadCloud, Database,
    CheckCircle2, AlertTriangle, ArrowRight,
    RefreshCcw, ShieldAlert, FileJson,
    AlertCircle, XCircle
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/shared/lib/utils";

interface RestoreResult {
    success: boolean;
    message: string;
    total_restored: number;
    tables_restored: number;
    tables_with_errors: number;
    backup_date: string;
    details: Record<string, { restored: number; errors: string[] }>;
}

interface BackupPreview {
    version: string;
    system: string;
    tenant_id: string;
    created_at: string;
    created_by: string;
    record_count: number;
    tables_included: string[];
    auth_users: Array<{ email: string }>;
}

export function RestoreManager({ tenantId: _tenantId }: { tenantId: string }) {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<BackupPreview | null>(null);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState<RestoreResult | null>(null);
    const [parseError, setParseError] = useState<string | null>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        setParseError(null);

        // Parse and validate the backup
        try {
            const text = await selectedFile.text();
            const data = JSON.parse(text);

            if (data.system !== 'GVM_CORP_ERP' || !data.version || !data.data) {
                setParseError('Este archivo no es un backup válido de GVM Corp ERP.');
                setPreview(null);
                return;
            }

            setPreview({
                version: data.version,
                system: data.system,
                tenant_id: data.tenant_id,
                created_at: data.created_at,
                created_by: data.created_by,
                record_count: data.record_count || 0,
                tables_included: data.tables_included || [],
                auth_users: data.auth_users || [],
            });
        } catch {
            setParseError('Error al leer el archivo. Asegúrese de que sea un JSON válido.');
            setPreview(null);
        }
    };

    const startRestore = async () => {
        if (!file || !preview) return;

        setUploading(true);
        setStep(2);

        try {
            toast.info("Restaurando datos...", {
                description: "Procesando backup. Esto puede tomar varios segundos."
            });

            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch('/api/backup/restore', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Error en la restauración');
            }

            setResult(data);
            setStep(3);

            toast.success("Restauración completada", {
                description: data.message,
            });

        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Error en la restauración';
            toast.error(msg);
            setResult({
                success: false,
                message: msg,
                total_restored: 0,
                tables_restored: 0,
                tables_with_errors: 1,
                backup_date: preview?.created_at || '',
                details: {},
            });
            setStep(3);
        } finally {
            setUploading(false);
        }
    };

    const resetProcess = () => {
        setStep(1);
        setFile(null);
        setPreview(null);
        setUploading(false);
        setResult(null);
        setParseError(null);
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-black tracking-tighter text-slate-900 italic">Restaurar Sistema</h2>
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">
                    Restaura datos desde un backup GVM generado por este sistema
                </p>
            </div>

            {/* STEP 1: FILE SELECTION */}
            {step === 1 && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                    {/* Info Card */}
                    <Card className="border-none shadow-premium rounded-[2.5rem] overflow-hidden bg-slate-900 text-white relative">
                        <CardContent className="p-10 flex items-start gap-6">
                            <div className="h-16 w-16 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
                                <ShieldAlert className="h-8 w-8 text-amber-400" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black italic">Restauración de Datos</h3>
                                <p className="text-slate-400 mt-2 text-sm leading-relaxed">
                                    Sube un archivo <strong className="text-white">.json</strong> generado por el sistema de backup de GVM Corp.
                                    La restauración insertará o actualizará los registros sin eliminar datos existentes (upsert).
                                    Los usuarios eliminados serán recreados con una contraseña temporal.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Upload Area */}
                    <Card className="border-none shadow-premium rounded-[2.5rem] overflow-hidden bg-white">
                        <CardHeader className="p-10 pb-4">
                            <CardTitle className="text-2xl font-black text-slate-900 italic">Seleccionar Archivo de Backup</CardTitle>
                            <CardDescription>Solo archivos .json generados por el sistema de backup de GVM Corp.</CardDescription>
                        </CardHeader>

                        <CardContent className="p-10 pt-4 space-y-6">
                            <div className="space-y-4">
                                <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">
                                    Archivo de Backup (.json)
                                </Label>
                                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors w-full cursor-pointer relative">
                                    <Input
                                        type="file"
                                        accept=".json"
                                        onChange={handleFileChange}
                                        className="absolute inset-0 opacity-0 cursor-pointer h-full"
                                    />
                                    {file && !parseError ? (
                                        <div className="flex flex-col items-center">
                                            <div className="h-14 w-14 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 mb-4">
                                                <CheckCircle2 className="h-8 w-8" />
                                            </div>
                                            <p className="font-bold text-slate-900">{file.name}</p>
                                            <p className="text-xs text-slate-400 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                        </div>
                                    ) : file && parseError ? (
                                        <div className="flex flex-col items-center">
                                            <div className="h-14 w-14 bg-rose-100 rounded-2xl flex items-center justify-center text-rose-600 mb-4">
                                                <XCircle className="h-8 w-8" />
                                            </div>
                                            <p className="font-bold text-rose-600">{parseError}</p>
                                            <p className="text-xs text-slate-400 mt-2">Selecciona otro archivo</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="h-14 w-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mb-4">
                                                <UploadCloud className="h-8 w-8" />
                                            </div>
                                            <p className="font-bold text-slate-600">Arrastra tu archivo de backup aquí</p>
                                            <p className="text-xs text-slate-400 mt-1">Soporta archivos .json (generados por GVM)</p>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Preview */}
                            {preview && (
                                <div className="bg-slate-50 rounded-2xl p-6 space-y-4 animate-in fade-in duration-300">
                                    <div className="flex items-center gap-2">
                                        <FileJson className="h-5 w-5 text-indigo-600" />
                                        <h4 className="font-bold text-slate-900">Vista Previa del Backup</h4>
                                    </div>

                                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                        <div className="bg-white p-4 rounded-xl">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Fecha Creación</p>
                                            <p className="font-bold text-slate-900 mt-1 text-sm">
                                                {new Date(preview.created_at).toLocaleString()}
                                            </p>
                                        </div>
                                        <div className="bg-white p-4 rounded-xl">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Registros</p>
                                            <p className="font-bold text-slate-900 mt-1 text-sm">{preview.record_count.toLocaleString()}</p>
                                        </div>
                                        <div className="bg-white p-4 rounded-xl">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Tablas</p>
                                            <p className="font-bold text-slate-900 mt-1 text-sm">{preview.tables_included.length}</p>
                                        </div>
                                        <div className="bg-white p-4 rounded-xl">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Usuarios Auth</p>
                                            <p className="font-bold text-slate-900 mt-1 text-sm">{preview.auth_users.length}</p>
                                        </div>
                                    </div>

                                    <div>
                                        <p className="text-xs font-bold text-slate-500 mb-2">Tablas incluidas:</p>
                                        <div className="flex flex-wrap gap-1">
                                            {preview.tables_included.map(t => (
                                                <Badge key={t} variant="secondary" className="text-[10px] bg-slate-200 text-slate-600 border-none">
                                                    {t}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>

                                    {preview.auth_users.length > 0 && (
                                        <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex gap-3 items-start">
                                            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-xs font-bold text-amber-900">Usuarios a restaurar:</p>
                                                <p className="text-xs text-amber-700 mt-1">
                                                    {preview.auth_users.map(u => u.email).join(', ')}
                                                </p>
                                                <p className="text-xs text-amber-600 mt-1 italic">
                                                    Los usuarios eliminados serán recreados con contraseña temporal. Deberás asignarles una nueva contraseña.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    <p className="text-xs text-slate-400">
                                        Creado por: {preview.created_by} · Versión: {preview.version}
                                    </p>
                                </div>
                            )}
                        </CardContent>

                        <CardFooter className="p-10 pt-0 flex justify-end gap-4">
                            <Button
                                variant="outline"
                                onClick={resetProcess}
                                className="h-12 px-6 rounded-xl border-slate-200 text-slate-500"
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={startRestore}
                                disabled={!file || !preview || !!parseError}
                                className="h-14 px-8 rounded-2xl bg-slate-900 text-white font-bold hover:bg-slate-800 shadow-xl shadow-slate-200"
                            >
                                Iniciar Restauración
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            )}

            {/* STEP 2: PROCESSING */}
            {step === 2 && uploading && (
                <Card className="border-none shadow-premium rounded-[2.5rem] overflow-hidden bg-white text-center py-16 animate-in zoom-in-95 duration-500">
                    <CardContent className="flex flex-col items-center">
                        <div className="h-24 w-24 bg-indigo-100 rounded-full flex items-center justify-center mb-6">
                            <RefreshCcw className="h-12 w-12 text-indigo-600 animate-spin" />
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 italic">Restaurando datos...</h2>
                        <p className="text-slate-500 font-medium max-w-md mx-auto mt-2">
                            Procesando el backup y restaurando registros en la base de datos.
                            No cierres esta ventana.
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* STEP 3: RESULTS */}
            {step === 3 && result && (
                <div className="space-y-6 animate-in zoom-in-95 duration-500">
                    {/* Summary Card */}
                    <Card className={cn(
                        "border-none shadow-premium rounded-[2.5rem] overflow-hidden text-center py-12",
                        result.success ? "bg-emerald-50" : "bg-rose-50"
                    )}>
                        <CardContent className="flex flex-col items-center">
                            <div className={cn(
                                "h-24 w-24 rounded-full flex items-center justify-center mb-6",
                                result.success ? "bg-emerald-100" : "bg-rose-100"
                            )}>
                                {result.success ? (
                                    <CheckCircle2 className="h-12 w-12 text-emerald-600" />
                                ) : (
                                    <AlertCircle className="h-12 w-12 text-rose-600" />
                                )}
                            </div>
                            <h2 className={cn(
                                "text-3xl font-black italic",
                                result.success ? "text-emerald-900" : "text-rose-900"
                            )}>
                                {result.success ? '¡Restauración Exitosa!' : 'Error en Restauración'}
                            </h2>
                            <p className={cn(
                                "font-medium max-w-md mx-auto mt-2 mb-4",
                                result.success ? "text-emerald-700" : "text-rose-700"
                            )}>
                                {result.message}
                            </p>

                            {result.success && (
                                <div className="flex items-center gap-6 mt-4 mb-8">
                                    <div className="text-center">
                                        <p className="text-3xl font-black text-emerald-800">{result.total_restored}</p>
                                        <p className="text-xs font-bold text-emerald-600 uppercase">Registros</p>
                                    </div>
                                    <div className="h-8 w-px bg-emerald-200" />
                                    <div className="text-center">
                                        <p className="text-3xl font-black text-emerald-800">{result.tables_restored}</p>
                                        <p className="text-xs font-bold text-emerald-600 uppercase">Tablas</p>
                                    </div>
                                    {result.tables_with_errors > 0 && (
                                        <>
                                            <div className="h-8 w-px bg-emerald-200" />
                                            <div className="text-center">
                                                <p className="text-3xl font-black text-amber-700">{result.tables_with_errors}</p>
                                                <p className="text-xs font-bold text-amber-600 uppercase">Con errores</p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            <div className="flex gap-4">
                                <Button
                                    onClick={resetProcess}
                                    variant="outline"
                                    className={cn(
                                        "font-bold bg-transparent h-12 px-6 rounded-xl",
                                        result.success
                                            ? "border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                                            : "border-rose-200 text-rose-700 hover:bg-rose-100"
                                    )}
                                >
                                    {result.success ? 'Restaurar Otro' : 'Reintentar'}
                                </Button>
                                <Button
                                    onClick={() => router.push('/dashboard')}
                                    className={cn(
                                        "text-white font-bold h-12 px-6 rounded-xl shadow-lg",
                                        result.success
                                            ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200"
                                            : "bg-slate-900 hover:bg-slate-800 shadow-slate-200"
                                    )}
                                >
                                    Ir al Dashboard
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Detail Table */}
                    {result.details && Object.keys(result.details).length > 0 && (
                        <Card className="border-none shadow-premium rounded-[2.5rem] overflow-hidden bg-white">
                            <CardHeader className="p-8 pb-4 border-b border-slate-100">
                                <CardTitle className="text-lg font-black text-slate-900 italic">
                                    Detalle por Tabla
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y divide-slate-100">
                                    {Object.entries(result.details).map(([table, info]) => (
                                        <div key={table} className="flex items-center justify-between p-4 px-8">
                                            <div className="flex items-center gap-3">
                                                <Database className="h-4 w-4 text-slate-300" />
                                                <span className="font-mono text-sm font-bold text-slate-700">{table}</span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="text-sm font-bold text-slate-900">
                                                    {info.restored} registros
                                                </span>
                                                {info.errors.length > 0 && (
                                                    <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-none text-[10px]">
                                                        {info.errors.length} error(es)
                                                    </Badge>
                                                )}
                                                {info.errors.length === 0 && info.restored > 0 && (
                                                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
}
