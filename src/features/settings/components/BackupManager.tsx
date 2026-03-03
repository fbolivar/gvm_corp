"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import {
    Database, Download, Clock, ShieldCheck,
    FileJson, HardDrive, RefreshCw,
    CalendarDays, Server
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/shared/lib/utils";

interface BackupRecord {
    id: string;
    date: string;
    size: string;
    type: 'manual' | 'auto';
    status: 'completed' | 'failed';
    author?: string;
}

const MOCK_HISTORY: BackupRecord[] = [
    { id: 'bk-001', date: '2025-05-15T02:00:00', size: '45.2 MB', type: 'auto', status: 'completed' },
    { id: 'bk-002', date: '2025-05-14T15:30:00', size: '45.1 MB', type: 'manual', status: 'completed', author: 'Admin' },
    { id: 'bk-003', date: '2025-05-14T02:00:00', size: '44.8 MB', type: 'auto', status: 'completed' },
];

export function BackupManager({ tenantId }: { tenantId: string }) {
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState<BackupRecord[]>(MOCK_HISTORY);

    const handleGenerateBackup = async () => {
        setLoading(true);

        // Simulación de proceso de backup
        try {
            toast.info("Iniciando generación de snapshot...", {
                description: "Recopilando datos de todas las tablas del tenant."
            });

            await new Promise(resolve => setTimeout(resolve, 3000)); // Fake lag

            const newBackup: BackupRecord = {
                id: `bk-${Date.now()}`,
                date: new Date().toISOString(),
                size: '45.3 MB',
                type: 'manual',
                status: 'completed',
                author: 'Tú'
            };

            setHistory([newBackup, ...history]);

            toast.success("Snapshot generado exitosamente", {
                description: "El archivo se ha descargado a tu equipo."
            });

            // Trigger fake download
            const element = document.createElement("a");
            const file = new Blob([JSON.stringify({ tenantId, timestamp: new Date(), data: "encrypted_mock_data" }, null, 2)], { type: 'application/json' });
            element.href = URL.createObjectURL(file);
            element.download = `backup-${tenantId}-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(element);
            element.click();

        } catch (error) {
            toast.error("Error al generar backup");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-black tracking-tighter text-slate-900 italic">Centro de Contingencia</h2>
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Gestión de Copias de Seguridad y Recuperación</p>
                </div>
                <div className="flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">Sistema Seguro & Encriptado</span>
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
                                <Badge className="bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border-none mb-4">ESTADO OPERATIVO</Badge>
                                <h3 className="text-4xl font-black italic tracking-wide">Todo en orden.</h3>
                                <p className="text-slate-400 mt-2 font-medium max-w-md">
                                    La última copia de seguridad automática se realizó exitosamente hoy a las 02:00 AM.
                                </p>
                            </div>
                            <div className="h-20 w-20 rounded-2xl bg-white/5 backdrop-blur-sm flex items-center justify-center border border-white/10">
                                <Database className="h-10 w-10 text-emerald-400" />
                            </div>
                        </div>

                        <div className="grid sm:grid-cols-3 gap-4 pt-6">
                            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm">
                                <p className="text-xs font-bold text-slate-400 uppercase">Último Backup</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <Clock className="h-4 w-4 text-emerald-400" />
                                    <span className="font-mono text-lg font-bold">Hace 2h</span>
                                </div>
                            </div>
                            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm">
                                <p className="text-xs font-bold text-slate-400 uppercase">Tamaño Total</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <HardDrive className="h-4 w-4 text-blue-400" />
                                    <span className="font-mono text-lg font-bold">45.2 MB</span>
                                </div>
                            </div>
                            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm">
                                <p className="text-xs font-bold text-slate-400 uppercase">Retención</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <CalendarDays className="h-4 w-4 text-purple-400" />
                                    <span className="font-mono text-lg font-bold">30 Días</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Manual Action Card */}
                <Card className="border-none shadow-premium rounded-[2.5rem] bg-indigo-600 text-white relative overflow-hidden flex flex-col justify-center">
                    <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-indigo-900/50 to-transparent"></div>
                    <CardHeader className="p-8 pb-4 relative z-10">
                        <CardTitle className="text-2xl font-black italic">Snapshot Manual</CardTitle>
                        <CardDescription className="text-indigo-200">
                            Genera una copia instantánea de todos tus datos actuales para descarga local.
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
                            {loading ? "Generando..." : "Generar Copia Ahora"}
                        </Button>
                        <p className="text-xs text-indigo-300 text-center mt-4">
                            Incluye base de datos y logs. No incluye archivos adjuntos (imágenes).
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* History List */}
            <Card className="border-none shadow-premium rounded-[2.5rem] bg-white overflow-hidden">
                <CardHeader className="p-8 pb-4 border-b border-slate-100">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-xl font-black text-slate-900 italic">Historial de Copias</CardTitle>
                        <Button variant="ghost" size="sm" className="text-slate-400 font-bold text-xs uppercase hover:bg-slate-50 rounded-lg">
                            Ver Logs Completos
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y divide-slate-100">
                        {history.map((record) => (
                            <div key={record.id} className="flex items-center justify-between p-6 hover:bg-slate-50 transition-colors group">
                                <div className="flex items-center gap-4">
                                    <div className={cn(
                                        "h-12 w-12 rounded-2xl flex items-center justify-center transition-colors",
                                        record.type === 'auto' ? "bg-slate-100 text-slate-500" : "bg-indigo-50 text-indigo-600"
                                    )}>
                                        {record.type === 'auto' ? <Clock className="h-5 w-5" /> : <FileJson className="h-5 w-5" />}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-bold text-slate-900 text-sm">
                                                {record.type === 'auto' ? 'Copia de Seguridad Automática' : 'Snapshot Manual de Datos'}
                                            </h4>
                                            {record.type === 'manual' && (
                                                <Badge variant="secondary" className="text-[10px] bg-indigo-100 text-indigo-700 border-none px-2 h-5">MANUAL</Badge>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 font-medium font-mono">
                                            <span>{new Date(record.date).toLocaleDateString()} {new Date(record.date).toLocaleTimeString()}</span>
                                            <span>•</span>
                                            <span>{record.size}</span>
                                            {record.author && (
                                                <>
                                                    <span>•</span>
                                                    <span className="text-slate-500">Por: {record.author}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                                        <span className="text-xs font-bold text-emerald-600 uppercase hidden md:inline-block">Completado</span>
                                    </div>
                                    <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-all opacity-0 group-hover:opacity-100">
                                        <Download className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
