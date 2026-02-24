import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import { Badge } from "@/shared/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { RefreshCw, Mail, AlertCircle, CheckCircle2, XCircle } from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { Button } from "@/shared/components/ui/button"

interface Props {
    actions: any[]
    onRefresh?: () => void
}

export function PortfolioAgentActivity({ actions, onRefresh }: Props) {
    return (
        <Card className="border-none shadow-premium overflow-hidden">
            <CardHeader className="p-8 bg-slate-50/50 flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-xl font-black italic tracking-tighter uppercase">Bitácora de Inteligencia</CardTitle>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Últimas 10 acciones ejecutadas por el agente</p>
                </div>
                <div className="flex items-center gap-4">
                    {onRefresh && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onRefresh}
                            className="h-8 border-slate-200 bg-white/50 backdrop-blur-sm group px-3"
                        >
                            <RefreshCw className="w-3 h-3 mr-2 text-slate-400 group-hover:rotate-180 transition-transform duration-500" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Actualizar</span>
                        </Button>
                    )}
                    <div className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 rounded-full border border-indigo-500/20">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                        </span>
                        <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest italic">Live Feed</span>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader className="bg-slate-50/30">
                        <TableRow className="hover:bg-transparent border-0">
                            <TableHead className="text-[10px] font-black uppercase tracking-widest px-8">Fecha/Hora</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest">Cliente / Factura</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest text-center">Acción</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest text-center">Estado</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest text-right px-8">Valor</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {actions.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-32 text-center text-slate-400 font-bold italic uppercase tracking-widest">
                                    No se han registrado acciones aún
                                </TableCell>
                            </TableRow>
                        ) : actions.map((action) => (
                            <TableRow key={action.id} className="group transition-colors hover:bg-slate-50/50">
                                <TableCell className="px-8 font-medium text-slate-500 text-xs">
                                    {format(new Date(action.executed_at), "dd MMM, HH:mm", { locale: es })}
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="font-black text-slate-900 text-sm italic group-hover:text-indigo-600 transition-colors">
                                            {action.document?.party?.legal_name}
                                        </span>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider italic">
                                            Factura #{action.document?.number}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-center">
                                    <Badge variant="outline" className={cn(
                                        "bg-white border-2 text-[8px] font-black uppercase tracking-[0.15em] px-3",
                                        action.action_type === 'REMINDER_1' && "border-blue-200 text-blue-600",
                                        action.action_type === 'REMINDER_2' && "border-amber-200 text-amber-600",
                                        action.action_type === 'FINAL_NOTICE' && "border-rose-200 text-rose-600",
                                    )}>
                                        {action.action_type.replace('_', ' ')}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="flex justify-center">
                                        {action.status === 'SENT' ? (
                                            <div className="flex items-center gap-2 text-emerald-600">
                                                <CheckCircle2 className="w-4 h-4" />
                                                <span className="text-[9px] font-black uppercase italic">Enviado</span>
                                            </div>
                                        ) : action.status === 'PENDING' ? (
                                            <div className="flex items-center gap-2 text-amber-500">
                                                <AlertCircle className="w-4 h-4 animate-pulse" />
                                                <span className="text-[9px] font-black uppercase italic">Procesando</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 text-rose-500">
                                                <XCircle className="w-4 h-4" />
                                                <span className="text-[9px] font-black uppercase italic">Error</span>
                                            </div>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="px-8 text-right font-black italic tracking-tighter text-slate-900">
                                    {Number(action.document?.total || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}
