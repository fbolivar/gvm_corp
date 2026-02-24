"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Progress } from "@/shared/components/ui/progress";
import {
    UploadCloud, FileSpreadsheet, Database,
    CheckCircle2, AlertTriangle, ArrowRight,
    FileType, RefreshCcw, ShieldAlert, Download
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/shared/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";

type SourceSystem = 'world_office' | 'dolibarr' | 'gvm_backup';
type EntityType = 'customers' | 'products' | 'invoices' | 'accounting';

export function RestoreManager({ tenantId }: { tenantId: string }) {
    const [step, setStep] = useState(1);
    const [source, setSource] = useState<SourceSystem | null>(null);
    const [entity, setEntity] = useState<EntityType>('customers');
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const startImport = () => {
        if (!file || !source) return;

        setUploading(true);
        setProgress(0);

        // Simulation of import process
        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    clearInterval(interval);
                    setUploading(false);
                    toast.success("Migración completada con éxito", {
                        description: `Se han importado los datos de ${entity} desde ${source === 'world_office' ? 'World Office' : 'Dolibarr'}.`
                    });
                    setStep(3); // Success step
                    return 100;
                }
                return prev + 5; // increment
            });
        }, 150);
    };

    const resetProcess = () => {
        setStep(1);
        setSource(null);
        setFile(null);
        setUploading(false);
        setProgress(0);
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-black tracking-tighter text-slate-900 italic">Centro de Migración & Restauración</h2>
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Importa datos históricos de World Office, Dolibarr o Restaura Snapshots</p>
            </div>

            {/* STEP 1: SOURCE SELECTION */}
            {step === 1 && (
                <div className="grid md:grid-cols-3 gap-6 animate-in slide-in-from-right-4 duration-500">
                    <Card
                        onClick={() => { setSource('world_office'); setStep(2); }}
                        className="cursor-pointer group hover:border-blue-500 hover:shadow-xl transition-all border-2 border-transparent bg-white overflow-hidden relative"
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <FileSpreadsheet className="h-24 w-24 text-blue-600" />
                        </div>
                        <CardHeader>
                            <div className="h-12 w-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4 text-blue-600 group-hover:scale-110 transition-transform">
                                <FileSpreadsheet className="h-6 w-6" />
                            </div>
                            <CardTitle className="text-xl font-black text-slate-900">World Office</CardTitle>
                            <CardDescription>
                                Migración desde archivos de Excel (.xlsx). Estructura nativa de WO soportada.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Badge variant="secondary" className="bg-blue-50 text-blue-700">Recomendado para Colombia</Badge>
                        </CardContent>
                    </Card>

                    <Card
                        onClick={() => { setSource('dolibarr'); setStep(2); }}
                        className="cursor-pointer group hover:border-purple-500 hover:shadow-xl transition-all border-2 border-transparent bg-white overflow-hidden relative"
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <FileType className="h-24 w-24 text-purple-600" />
                        </div>
                        <CardHeader>
                            <div className="h-12 w-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4 text-purple-600 group-hover:scale-110 transition-transform">
                                <Database className="h-6 w-6" />
                            </div>
                            <CardTitle className="text-xl font-black text-slate-900">Dolibarr ERP</CardTitle>
                            <CardDescription>
                                Importación desde dumps SQL o exportaciones CSV estándar de Dolibarr.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Badge variant="secondary" className="bg-purple-50 text-purple-700">Open Source</Badge>
                        </CardContent>
                    </Card>

                    <Card
                        onClick={() => { setSource('gvm_backup'); setStep(2); }}
                        className="cursor-pointer group hover:border-emerald-500 hover:shadow-xl transition-all border-2 border-transparent bg-white overflow-hidden relative"
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <RefreshCcw className="h-24 w-24 text-emerald-600" />
                        </div>
                        <CardHeader>
                            <div className="h-12 w-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4 text-emerald-600 group-hover:scale-110 transition-transform">
                                <ShieldAlert className="h-6 w-6" />
                            </div>
                            <CardTitle className="text-xl font-black text-slate-900">GVM Snapshot</CardTitle>
                            <CardDescription>
                                Restauración completa desde un archivo de backup .json generado por este sistema.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">Nativo</Badge>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* STEP 2: UPLOAD & CONFIG */}
            {step === 2 && source && (
                <Card className="border-none shadow-premium rounded-[2.5rem] overflow-hidden bg-white animate-in slide-in-from-right-8 duration-500">
                    <CardHeader className="p-10 pb-2 border-b border-slate-50">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-2xl font-black text-slate-900 italic">
                                    Importar desde {source === 'world_office' ? 'World Office' : source === 'dolibarr' ? 'Dolibarr ERP' : 'GVM Backup'}
                                </CardTitle>
                                <CardDescription>Configura los parámetros de la importación.</CardDescription>
                            </div>
                            <Button variant="ghost" onClick={resetProcess} className="text-slate-400 hover:text-slate-900">Cancelar</Button>
                        </div>
                    </CardHeader>

                    <CardContent className="p-10 space-y-8">
                        {source !== 'gvm_backup' && (
                            <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100 flex gap-4 items-start">
                                <AlertTriangle className="h-6 w-6 text-amber-600 shrink-0 mt-1" />
                                <div>
                                    <h4 className="font-bold text-amber-900 text-sm">Advertencia de Estructura</h4>
                                    <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                                        Asegúrate de que el archivo {source === 'world_office' ? 'Excel' : 'CSV'} tenga los encabezados correctos.
                                        {source === 'world_office' ? ' Recomendamos usar la opción "Exportar a Excel Plano" en World Office.' : ' Usa el módulo de exportación estándar de Dolibarr.'}
                                    </p>
                                    <Button variant="link" className="h-auto p-0 text-amber-800 font-bold text-xs mt-2 underline">
                                        Descargar Plantilla de Muestra
                                    </Button>
                                </div>
                            </div>
                        )}

                        <div className="grid md:grid-cols-2 gap-8">
                            {source !== 'gvm_backup' && (
                                <div className="space-y-4">
                                    <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Tipo de Entidad a Importar</Label>
                                    <Select value={entity} onValueChange={(v: any) => setEntity(v)}>
                                        <SelectTrigger className="h-14 rounded-2xl bg-slate-50 border-transparent font-medium">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="customers">Terceros / Clientes</SelectItem>
                                            <SelectItem value="products">Productos / Inventario</SelectItem>
                                            <SelectItem value="invoices">Facturas Históricas</SelectItem>
                                            <SelectItem value="accounting">Puc / Saldos Iniciales</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            <div className={cn("space-y-4", source === 'gvm_backup' && "col-span-2")}>
                                <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Archivo de Datos</Label>
                                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors w-full cursor-pointer relative">
                                    <Input
                                        type="file"
                                        accept={source === 'world_office' ? ".xlsx,.xls" : source === 'dolibarr' ? ".csv,.sql" : ".json"}
                                        onChange={handleFileChange}
                                        className="absolute inset-0 opacity-0 cursor-pointer h-full"
                                    />
                                    {file ? (
                                        <div className="flex flex-col items-center">
                                            <div className="h-14 w-14 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 mb-4">
                                                <CheckCircle2 className="h-8 w-8" />
                                            </div>
                                            <p className="font-bold text-slate-900">{file.name}</p>
                                            <p className="text-xs text-slate-400 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="h-14 w-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mb-4">
                                                <UploadCloud className="h-8 w-8" />
                                            </div>
                                            <p className="font-bold text-slate-600">Arrastra tu archivo aquí</p>
                                            <p className="text-xs text-slate-400 mt-1">
                                                Soporta {source === 'world_office' ? '.xlsx, .xls' : source === 'dolibarr' ? '.csv, .sql' : '.json'}
                                            </p>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {uploading && (
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs font-bold text-slate-500">
                                    <span>Procesando datos...</span>
                                    <span>{progress}%</span>
                                </div>
                                <Progress value={progress} className="h-3 bg-slate-100" />
                            </div>
                        )}
                    </CardContent>

                    <CardFooter className="p-10 pt-0 flex justify-end">
                        <Button
                            onClick={startImport}
                            disabled={!file || uploading}
                            className="h-14 px-8 rounded-2xl bg-slate-900 text-white font-bold hover:bg-slate-800 shadow-xl shadow-slate-200"
                        >
                            {uploading ? "Importando..." : "Iniciar Migración"}
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </CardFooter>
                </Card>
            )}

            {/* STEP 3: SUCCESS */}
            {step === 3 && (
                <Card className="border-none shadow-premium rounded-[2.5rem] overflow-hidden bg-emerald-50 text-center py-16 animate-in zoom-in-95 duration-500">
                    <CardContent className="flex flex-col items-center">
                        <div className="h-24 w-24 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
                            <CheckCircle2 className="h-12 w-12 text-emerald-600" />
                        </div>
                        <h2 className="text-3xl font-black text-emerald-900 italic">¡Importación Exitosa!</h2>
                        <p className="text-emerald-700 font-medium max-w-md mx-auto mt-2 mb-8">
                            Los datos han sido validados e insertados correctamente en el sistema. Puedes ver los registros en su módulo correspondiente.
                        </p>
                        <div className="flex gap-4">
                            <Button onClick={resetProcess} variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-100 font-bold bg-transparent h-12 px-6 rounded-xl">
                                Importar Otro Archivo
                            </Button>
                            <Button className="bg-emerald-600 text-white hover:bg-emerald-700 font-bold h-12 px-6 rounded-xl shadow-lg shadow-emerald-200">
                                Ir al Dashboard
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
