"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { accountFormSchema, AccountFormData, Account } from "../types"
import { createAccountAction, updateAccountAction } from "../accountActions"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/shared/components/ui/select"
import { Switch } from "@/shared/components/ui/switch"
import { useToast } from "@/shared/hooks/use-toast"
import { ArrowLeft, Save, Loader2 } from "lucide-react"

interface AccountFormProps {
    account?: Account | null;
    parentAccounts: Account[];
}

const NATURE_OPTIONS = [
    { value: 'DEBIT', label: 'Débito' },
    { value: 'CREDIT', label: 'Crédito' },
] as const;

const TYPE_OPTIONS = [
    { value: 'ASSET', label: 'Activo (1)' },
    { value: 'LIABILITY', label: 'Pasivo (2)' },
    { value: 'EQUITY', label: 'Patrimonio (3)' },
    { value: 'REVENUE', label: 'Ingreso (4)' },
    { value: 'EXPENSE', label: 'Gasto (5)' },
    { value: 'COST', label: 'Costo (6-7)' },
    { value: 'ORDER', label: 'Orden (8-9)' },
] as const;

export function AccountForm({ account, parentAccounts }: AccountFormProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const isEditing = !!account;

    const [code, setCode] = useState(account?.code || '');
    const [name, setName] = useState(account?.name || '');
    const [nature, setNature] = useState<'DEBIT' | 'CREDIT'>(account?.nature || 'DEBIT');
    const [type, setType] = useState<string>(account?.type || '');
    const [isAuxiliary, setIsAuxiliary] = useState(account?.is_auxiliary ?? false);
    const [parentId, setParentId] = useState<string>(account?.parent_id || 'none');
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const formData: AccountFormData = {
            code,
            name,
            nature,
            type: type ? type as AccountFormData['type'] : undefined,
            is_auxiliary: isAuxiliary,
            parent_id: parentId === 'none' ? null : parentId,
        };

        const parsed = accountFormSchema.safeParse(formData);
        if (!parsed.success) {
            const fieldErrors: Record<string, string> = {};
            parsed.error.issues.forEach(issue => {
                const field = issue.path[0] as string;
                if (!fieldErrors[field]) fieldErrors[field] = issue.message;
            });
            setErrors(fieldErrors);
            return;
        }
        setErrors({});

        setLoading(true);
        try {
            const result = isEditing
                ? await updateAccountAction(account!.id, formData)
                : await createAccountAction(formData);

            if (result.error) {
                toast({ variant: "destructive", description: result.error });
                return;
            }

            toast({ description: isEditing ? 'Cuenta actualizada' : 'Cuenta creada exitosamente' });
            router.push('/accounting/accounts');
            router.refresh();
        } catch {
            toast({ variant: "destructive", description: 'Error inesperado' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-container max-w-2xl mx-auto space-y-6 pb-20 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => router.back()}
                    className="h-10 w-10 rounded-xl"
                >
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                        {isEditing ? 'Editar Cuenta Contable' : 'Nueva Cuenta Contable'}
                    </h1>
                    <p className="text-xs text-slate-400">
                        {isEditing ? `Editando ${account.code} — ${account.name}` : 'Agregar cuenta al PUC'}
                    </p>
                </div>
            </div>

            {/* Form */}
            <Card className="rounded-2xl border border-slate-100 bg-white shadow-sm">
                <CardHeader className="py-4 px-6 border-b border-slate-100 bg-slate-50/30">
                    <CardTitle className="text-sm font-bold text-slate-900">Información de la Cuenta</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-5">

                        {/* Code + Name */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-600">Código PUC</Label>
                                <Input
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    placeholder="Ej: 110505"
                                    className="h-10 font-mono text-sm rounded-xl"
                                />
                                {errors.code && (
                                    <p className="text-[10px] text-rose-500">{errors.code}</p>
                                )}
                            </div>
                            <div className="md:col-span-2 space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-600">Nombre de la Cuenta</Label>
                                <Input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Ej: Caja General"
                                    className="h-10 text-sm rounded-xl"
                                />
                                {errors.name && (
                                    <p className="text-[10px] text-rose-500">{errors.name}</p>
                                )}
                            </div>
                        </div>

                        {/* Nature + Type */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-600">Naturaleza</Label>
                                <Select value={nature} onValueChange={(v) => setNature(v as 'DEBIT' | 'CREDIT')}>
                                    <SelectTrigger className="h-10 rounded-xl text-sm">
                                        <SelectValue placeholder="Seleccionar" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {NATURE_OPTIONS.map(opt => (
                                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.nature && (
                                    <p className="text-[10px] text-rose-500">{errors.nature}</p>
                                )}
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-600">Clasificación</Label>
                                <Select value={type || 'auto'} onValueChange={(v) => setType(v === 'auto' ? '' : v)}>
                                    <SelectTrigger className="h-10 rounded-xl text-sm">
                                        <SelectValue placeholder="Auto-detectar por código" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="auto">Auto-detectar por código</SelectItem>
                                        {TYPE_OPTIONS.map(opt => (
                                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Parent Account */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-600">Cuenta Padre (opcional)</Label>
                            <Select value={parentId} onValueChange={setParentId}>
                                <SelectTrigger className="h-10 rounded-xl text-sm">
                                    <SelectValue placeholder="Sin cuenta padre" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Sin cuenta padre</SelectItem>
                                    {parentAccounts
                                        .filter(a => !a.is_auxiliary)
                                        .map(a => (
                                            <SelectItem key={a.id} value={a.id}>
                                                {a.code} — {a.name}
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Is Auxiliary */}
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                            <div>
                                <p className="text-xs font-semibold text-slate-700">Cuenta Auxiliar</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                    Las cuentas auxiliares permiten registrar movimientos directamente
                                </p>
                            </div>
                            <Switch checked={isAuxiliary} onCheckedChange={setIsAuxiliary} />
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-3 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.back()}
                                className="h-10 px-6 rounded-xl text-xs"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={loading}
                                className="h-10 px-6 rounded-xl gap-2 bg-indigo-600 hover:bg-indigo-700 text-xs"
                            >
                                {loading ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <Save className="h-3.5 w-3.5" />
                                )}
                                {isEditing ? 'Guardar Cambios' : 'Crear Cuenta'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
