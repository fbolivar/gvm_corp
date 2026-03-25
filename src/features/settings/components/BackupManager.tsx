"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import {
    Database, Download, Clock, ShieldCheck,
    FileJson, HardDrive, RefreshCw,
    Server, Trash2, AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/shared/lib/utils";
import { useConfirm } from "@/shared/hooks/useConfirm";

interface BackupRecord {
    id: string;
    created_at: string;
    file_size_bytes: number;
    type: 'manual' | 'auto';
    status: 'pending' | 'completed' | 'failed';
    created_by_email?: string;
    record_count: number;
    tables_included: string[];
    file_path: string | null;
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Ahora mismo';
    if (mins < 60) return `Hace ${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Hace ${hours}h`;
    const days = Math.floor(hours / 24);
    return `Hace ${days}d`;
}

export function BackupManager({ tenantId }: { tenantId: string }) {
    const [ConfirmDialogEl, confirmFn] = useConfirm();
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState<BackupRecord[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const fetchHistory = useCallback(async () => {
        try {
            const res = await fetch('/api/backup');
            if (res.ok) {
                const data = await res.json();
                setHistory(data.backups || []);
            }
        } catch {
            console.error('Error fetching backup history');
        } finally {
            setLoadingHistory(false);
        }
    }, []);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    const handleGenerateBackup = async () => {
        setLoading(true);

        try {
            toast.info("Generando backup real...", {
                description: "Exportando todas las tablas del tenant. Esto puede tomar unos segundos."
            });

            const res = await fetch('/api/backup', { method: 'POST' });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Error generando backup');
            }

            // Get metadata from headers
            const recordCount = res.headers.get('X-Record-Count') || '0';
            const tablesCount = res.headers.get('X-Tables-Count') || '0';

            // Download the file
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            a.download = `backup-gvm-${dateStr}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            toast.success("Backup generado exitosamente", {
                description: `${recordCount} registros de ${tablesCount} tablas exportados.`
            });

            // Refresh history
            await fetchHistory();

        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Error al generar backup';
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (backup: BackupRecord) => {
        try {
            const res = await fetch(`/api/backup/${backup.id}`);
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Error descargando');
            }

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const dateStr = new Date(backup.created_at).toISOString().slice(0, 10);
            a.download = `backup-gvm-${dateStr}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            toast.success("Backup descargado");
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Error descargando';
            toast.error(msg);
        }
    };

    const handleDelete = async (backupId: string) => {
        const ok = await confirmFn({ title: "Confirmar", description: "¿Eliminar esta copia de seguridad? Esta acción no se puede deshacer.", variant: "danger", confirmLabel: "Confirmar" })
        if (!ok) return;
        setDeletingId(backupId);
        try {
            const res = await fetch(`/api/backup/${backupId}`, { method: 'DELETE' });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Error eliminando');
            }
            toast.success("Backup eliminado");
            await fetchHistory();
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Error eliminando';
            toast.error(msg);
        } finally {
            setDeletingId(null);
        }
    };

    const lastBackup = history.length > 0 ? history[0] : null;
    const totalSize = history.reduce((sum, b) => sum + (b.file_size_bytes || 0), 0);
    void tenantId;

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-black tracking-tighter text-slate-900 italic">Centro de Contingencia</h2>
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Copias de Seguridad Reales — Exporta y Restaura tus Datos</p>
                </div>
                <div className="flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">Datos Reales del Tenant</span>
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Main Status Card */}
                <Card className="lg:col-span-2 border-none shadow-premium rounded-[2.5rem] overflow-hidden bg-slate-900 text-white relative">
                    <div className="absolute top-0 right-0 p-12 opacity-5">
                        <Server className="h-24 w-24" />
                    </div>

                    <CardContent className="p-10 space-y-8 relative z-10">
                        <div className="flex items-start justify-between">
                            <div>
                                <Badge className={cn(
                                    "border-none mb-4",
                                    lastBackup
                                        ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                                        : "bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
                                )}>
                                    {lastBackup ? 'BACKUP DISPONIBLE' : 'SIN BACKUPS'}
                                </Badge>
                                <h3 className="text-4xl font-black italic tracking-wide">
                                    {lastBackup ? 'Datos protegidos.' : 'Sin copias aún.'}
                                </h3>
                                <p className="text-slate-400 mt-2 font-medium max-w-md">
                                    {lastBackup
                                        ? `Última copia: ${new Date(lastBackup.created_at).toLocaleString()} — ${lastBackup.record_count} registros de ${lastBackup.tables_included.length} tablas.`
                                        : 'Genera tu primera copia de seguridad para proteger los datos de tu empresa.'}
                                </p>
                            </div>
                            <div className="h-20 w-20 rounded-2xl bg-white/5 backdrop-blur-sm flex items-center justify-center border border-white/10">
                                <Database className={cn("h-10 w-10", lastBackup ? "text-emerald-400" : "text-amber-400")} />
                            </div>
                        </div>

                        <div className="grid sm:grid-cols-3 gap-4 pt-6">
                            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm">
                                <p className="text-xs font-bold text-slate-400 uppercase">Último Backup</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <Clock className="h-4 w-4 text-emerald-400" />
                                    <span className="font-mono text-lg font-bold">
                                        {lastBackup ? timeAgo(lastBackup.created_at) : '—'}
                                    </span>
                                </div>
                            </div>
                            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm">
                                <p className="text-xs font-bold text-slate-400 uppercase">Tamaño Total</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <HardDrive className="h-4 w-4 text-blue-400" />
                                    <span className="font-mono text-lg font-bold">
                                        {totalSize > 0 ? formatBytes(totalSize) : '—'}
                                    </span>
                                </div>
                            </div>
                            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm">
                                <p className="text-xs font-bold text-slate-400 uppercase">Copias Guardadas</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <FileJson className="h-4 w-4 text-purple-400" />
                                    <span className="font-mono text-lg font-bold">{history.length}</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Manual Action Card */}
                <Card className="border-none shadow-premium rounded-[2.5rem] bg-indigo-600 text-white relative overflow-hidden flex flex-col justify-center">
                    <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-indigo-900/50 to-transparent"></div>
                    <CardHeader className="p-8 pb-4 relative z-10">
                        <CardTitle className="text-2xl font-black italic">Generar Backup</CardTitle>
                        <CardDescription className="text-indigo-200">
                            Exporta TODOS los datos reales de tu tenant: usuarios, terceros, documentos, inventario, nómina, contabilidad y más.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 pt-0 relative z-10">
                        <Button
                            onClick={handleGenerateBackup}
                            disabled={loading}
                            className="w-full h-16 rounded-2xl bg-white text-indigo-900 font-black text-lg hover:bg-indigo-50 shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3"
                        >
                            {loading ? (
                                <RefreshCw className="h-6 w-6 animate-spin" />
                            ) : (
                                <Download className="h-6 w-6" />
                            )}
                            {loading ? "Exportando datos..." : "Generar Copia Ahora"}
                        </Button>
                        <p className="text-xs text-indigo-300 text-center mt-4">
                            Incluye base de datos completa. Se guarda en servidor y se descarga.
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Auto Backup Schedule Card */}
            <Card className="border-none shadow-premium rounded-[2.5rem] bg-gradient-to-r from-emerald-50 to-teal-50 overflow-hidden">
                <CardContent className="p-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="h-14 w-14 rounded-2xl bg-emerald-100 flex items-center justify-center">
                                <Clock className="h-7 w-7 text-emerald-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-900">Backup Automático Semanal</h3>
                                <p className="text-sm text-slate-500 mt-0.5">Cada domingo a las 3:00 AM UTC se genera automáticamente una copia de seguridad completa.</p>
                            </div>
                        </div>
                        <Badge className="bg-emerald-500 text-white border-none hover:bg-emerald-600 text-xs font-black px-4 py-1.5">
                            ACTIVO
                        </Badge>
                    </div>
                    <div className="mt-4 grid sm:grid-cols-3 gap-4">
                        <div className="p-3 rounded-xl bg-white/60 border border-emerald-100">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Frecuencia</p>
                            <p className="text-sm font-bold text-slate-800 mt-0.5">Semanal (Domingos)</p>
                        </div>
                        <div className="p-3 rounded-xl bg-white/60 border border-emerald-100">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Retención</p>
                            <p className="text-sm font-bold text-slate-800 mt-0.5">Últimas 8 copias</p>
                        </div>
                        <div className="p-3 rounded-xl bg-white/60 border border-emerald-100">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Backups Auto</p>
                            <p className="text-sm font-bold text-slate-800 mt-0.5">{history.filter(b => b.type === 'auto').length} realizados</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* History List */}
            <Card className="border-none shadow-premium rounded-[2.5rem] bg-white overflow-hidden">
                <CardHeader className="p-8 pb-4 border-b border-slate-100">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-xl font-black text-slate-900 italic">Historial de Copias</CardTitle>
                        <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-none">
                            {history.length} copias
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {loadingHistory ? (
                        <div className="p-12 text-center">
                            <RefreshCw className="h-8 w-8 animate-spin text-slate-300 mx-auto mb-3" />
                            <p className="text-sm text-slate-400 font-medium">Cargando historial...</p>
                        </div>
                    ) : history.length === 0 ? (
                        <div className="p-12 text-center">
                            <AlertCircle className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                            <p className="text-sm text-slate-400 font-bold">No hay copias de seguridad</p>
                            <p className="text-xs text-slate-300 mt-1">Genera tu primera copia con el botón de arriba.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {history.map((record) => (
                                <div key={record.id} className="flex items-center justify-between p-6 hover:bg-slate-50 transition-colors group">
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "h-12 w-12 rounded-2xl flex items-center justify-center transition-colors",
                                            record.status === 'completed'
                                                ? "bg-emerald-50 text-emerald-600"
                                                : "bg-rose-50 text-rose-600"
                                        )}>
                                            {record.status === 'completed' ? <FileJson className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-bold text-slate-900 text-sm">
                                                    Copia de Seguridad
                                                </h4>
                                                <Badge variant="secondary" className="text-[10px] bg-indigo-100 text-indigo-700 border-none px-2 h-5">
                                                    {record.type === 'manual' ? 'MANUAL' : 'AUTO'}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 font-medium font-mono">
                                                <span>{new Date(record.created_at).toLocaleDateString()} {new Date(record.created_at).toLocaleTimeString()}</span>
                                                <span>·</span>
                                                <span>{formatBytes(record.file_size_bytes)}</span>
                                                <span>·</span>
                                                <span>{record.record_count} registros</span>
                                                <span>·</span>
                                                <span>{record.tables_included.length} tablas</span>
                                                {record.created_by_email && (
                                                    <>
                                                        <span>·</span>
                                                        <span className="text-slate-500">Por: {record.created_by_email}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-2 mr-4">
                                            <div className={cn(
                                                "h-2 w-2 rounded-full",
                                                record.status === 'completed' ? "bg-emerald-500" : "bg-rose-500"
                                            )} />
                                            <span className={cn(
                                                "text-xs font-bold uppercase hidden md:inline-block",
                                                record.status === 'completed' ? "text-emerald-600" : "text-rose-600"
                                            )}>
                                                {record.status === 'completed' ? 'Completado' : 'Fallido'}
                                            </span>
                                        </div>
                                        {record.file_path && (
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => handleDownload(record)}
                                                className="h-10 w-10 rounded-xl border-indigo-200 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-all"
                                                title="Descargar"
                                            >
                                                <Download className="h-4 w-4" />
                                            </Button>
                                        )}
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => handleDelete(record.id)}
                                            disabled={deletingId === record.id}
                                            className="h-10 w-10 rounded-xl border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100"
                                            title="Eliminar"
                                        >
                                            {deletingId === record.id ? (
                                                <RefreshCw className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Trash2 className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        {ConfirmDialogEl}
        </div>
    );
}
