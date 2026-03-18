"use client"

import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/components/ui/table";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/shared/components/ui/dropdown-menu";
import { Layers, FileX2, Search, MoreHorizontal, Pencil, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { Account } from "../types";
import { deleteAccountAction, toggleAccountActiveAction } from "../accountActions";
import { cn } from "@/shared/lib/utils";
import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/shared/hooks/use-toast";
import { useConfirm } from "@/shared/hooks/useConfirm";
import Link from "next/link";

interface AccountListProps {
    accounts: Account[];
}

export function AccountList({ accounts }: AccountListProps) {
    const [search, setSearch] = useState("");
    const [isPending, startTransition] = useTransition();
    const router = useRouter();
    const { toast } = useToast();
    const [ConfirmDialogEl, confirmFn] = useConfirm();

    const filtered = useMemo(() => {
        if (!search.trim()) return accounts;
        const q = search.toLowerCase();
        return accounts.filter(a =>
            a.code.toLowerCase().includes(q) || a.name.toLowerCase().includes(q)
        );
    }, [accounts, search]);

    const handleDelete = async (account: Account) => {
        const ok = await confirmFn({ title: "Confirmar accion", description: `Eliminar cuenta ${account.code} — ${account.name}?`, variant: "danger", confirmLabel: "Confirmar" })
        if (!ok) return;

        startTransition(async () => {
            const result = await deleteAccountAction(account.id);
            if (result.error) {
                toast({ variant: "destructive", description: result.error });
            } else {
                toast({ description: `Cuenta ${account.code} eliminada` });
                router.refresh();
            }
        });
    };

    const handleToggleActive = (account: Account) => {
        const newActive = !(account.is_active ?? true);
        startTransition(async () => {
            const result = await toggleAccountActiveAction(account.id, newActive);
            if (result.error) {
                toast({ variant: "destructive", description: result.error });
            } else {
                toast({ description: newActive ? 'Cuenta activada' : 'Cuenta desactivada' });
                router.refresh();
            }
        });
    };

    if (!accounts.length) {
        return (
            <Card className="rounded-2xl border border-slate-100 bg-white shadow-sm">
                <CardContent className="py-16 flex flex-col items-center justify-center text-center">
                    <div className="h-14 w-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 mb-4">
                        <FileX2 className="h-7 w-7" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-700 mb-1">Sin cuentas contables</h3>
                    <p className="text-xs text-slate-400">No se han configurado cuentas en el PUC</p>
                </CardContent>
            </Card>
        );
    }

    return (<>
        <Card className={cn(
            "rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden",
            isPending && "opacity-60 pointer-events-none"
        )}>
            <CardHeader className="py-4 px-6 border-b border-slate-100 bg-slate-50/30">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
                            <Layers className="h-4 w-4" />
                        </div>
                        <div>
                            <CardTitle className="text-sm font-bold text-slate-900">Catálogo de Cuentas</CardTitle>
                            <p className="text-[10px] text-slate-400 mt-0.5">{filtered.length} de {accounts.length} cuentas</p>
                        </div>
                    </div>
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-300" />
                        <Input
                            placeholder="Buscar por código o nombre..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="h-9 pl-9 text-xs rounded-xl border-slate-200"
                        />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow className="border-slate-100 hover:bg-transparent bg-slate-50/50">
                            <TableHead className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider py-3 pl-6 w-[120px]">Código</TableHead>
                            <TableHead className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider py-3">Nombre de la Cuenta</TableHead>
                            <TableHead className="hidden md:table-cell text-slate-400 font-semibold uppercase text-[10px] tracking-wider py-3 w-[100px]">Naturaleza</TableHead>
                            <TableHead className="hidden md:table-cell text-slate-400 font-semibold uppercase text-[10px] tracking-wider py-3 w-[80px]">Tipo</TableHead>
                            <TableHead className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider py-3 text-right pr-6 w-[60px]">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-10 text-sm text-slate-400">
                                    Sin resultados para &ldquo;{search}&rdquo;
                                </TableCell>
                            </TableRow>
                        ) : filtered.map((account) => {
                            const level = getLevel(account.code);
                            const isInactive = account.is_active === false;
                            return (
                                <TableRow
                                    key={account.id}
                                    className={cn(
                                        "border-slate-50 hover:bg-indigo-50/20 transition-colors",
                                        isInactive && "opacity-40"
                                    )}
                                >
                                    <TableCell className="py-3 pl-6">
                                        <span className={cn(
                                            "font-mono text-xs",
                                            level <= 1 ? "font-bold text-slate-900" : "font-semibold text-slate-700"
                                        )}>
                                            {account.code}
                                        </span>
                                    </TableCell>
                                    <TableCell className="py-3">
                                        <span
                                            className={cn(
                                                "text-xs",
                                                level <= 1 && "font-bold text-slate-900",
                                                level === 2 && "font-semibold text-slate-800 pl-3",
                                                level === 3 && "font-medium text-slate-600 pl-6",
                                                level >= 4 && "text-slate-500 pl-9",
                                            )}
                                        >
                                            {account.name}
                                        </span>
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell py-3">
                                        <Badge
                                            variant="outline"
                                            className={cn(
                                                "text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border-none",
                                                account.nature === 'DEBIT'
                                                    ? "bg-blue-50 text-blue-600"
                                                    : "bg-violet-50 text-violet-600"
                                            )}
                                        >
                                            {account.nature === 'DEBIT' ? 'Débito' : 'Crédito'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell py-3">
                                        <span className={cn(
                                            "text-[10px] font-semibold uppercase tracking-wider",
                                            account.is_auxiliary ? "text-amber-600" : "text-slate-400"
                                        )}>
                                            {account.is_auxiliary ? 'Auxiliar' : 'Mayor'}
                                        </span>
                                    </TableCell>
                                    <TableCell className="py-3 text-right pr-4">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-300 hover:text-slate-600">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-44">
                                                <DropdownMenuItem asChild className="gap-2 text-xs">
                                                    <Link href={`/accounting/accounts/${account.id}/edit`}>
                                                        <Pencil className="h-3.5 w-3.5" />
                                                        Editar
                                                    </Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    className="gap-2 text-xs"
                                                    onClick={() => handleToggleActive(account)}
                                                >
                                                    {isInactive ? (
                                                        <><ToggleRight className="h-3.5 w-3.5" /> Activar</>
                                                    ) : (
                                                        <><ToggleLeft className="h-3.5 w-3.5" /> Desactivar</>
                                                    )}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    className="gap-2 text-xs text-rose-600 focus:text-rose-600"
                                                    onClick={() => handleDelete(account)}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                    Eliminar
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
        {ConfirmDialogEl}
    </>);
}

function getLevel(code: string): number {
    const len = code.replace(/0+$/, '').length;
    if (len <= 1) return 0;
    if (len <= 2) return 1;
    if (len <= 4) return 2;
    if (len <= 6) return 3;
    return 4;
}
