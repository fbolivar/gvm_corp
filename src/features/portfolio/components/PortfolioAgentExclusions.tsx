import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Input } from "@/shared/components/ui/input"
import { Button } from "@/shared/components/ui/button"
import { Badge } from "@/shared/components/ui/badge"
import { Switch } from "@/shared/components/ui/switch"
import { Search, UserX, ShieldCheck, UserCheck, RefreshCw, Clock } from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { toast } from "sonner"

export function PortfolioAgentExclusions() {
    const [searchTerm, setSearchTerm] = useState("")
    const [parties, setParties] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const supabase = createClient()

    const fetchParties = async () => {
        setLoading(true)
        try {
            // Buscamos partidos (clientes) y su perfil de deudor asociado
            const { data, error } = await supabase
                .from('parties')
                .select(`
                    id,
                    tenant_id,
                    legal_name,
                    email,
                    debtor:debtor_profiles(excluded, risk_level, average_payment_days)
                `)
                .ilike('legal_name', `%${searchTerm}%`)
                .limit(5)

            if (error) throw error
            setParties(data || [])
        } catch (error) {
            console.error("Error fetching parties:", error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (searchTerm.length >= 2) fetchParties()
            else if (searchTerm.length === 0) setParties([])
        }, 500)
        return () => clearTimeout(timeoutId)
    }, [searchTerm])

    const toggleExclusion = async (partyId: string, currentExcluded: boolean, tenantId: string) => {
        try {
            // Upsert en debtor_profiles incluyendo tenant_id
            const { error } = await supabase
                .from('debtor_profiles')
                .upsert({
                    tenant_id: tenantId,
                    party_id: partyId,
                    excluded: !currentExcluded,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'tenant_id,party_id' })

            if (error) throw error

            toast.success(currentExcluded ? "Cliente re-activado para el agente" : "Cliente excluido del agente")
            fetchParties() // Recargar estado
        } catch (error) {
            toast.error("Error al actualizar exclusión")
            console.error(error)
        }
    }

    return (
        <Card className="border-slate-200/60 shadow-sm overflow-hidden bg-white/50 backdrop-blur-sm h-full">
            <CardHeader className="border-b border-slate-100 bg-slate-50/30">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                            <UserX className="w-4 h-4 text-rose-500" />
                            GESTIÓN DE EXCLUSIONES (VIPs)
                        </CardTitle>
                        <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider">
                            Protege a tus clientes especiales del cobro automático
                        </p>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Buscar cliente para excluir..."
                        className="pl-9 h-9 text-xs border-slate-200 bg-white"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="space-y-3 min-h-[400px]">
                    {loading && (
                        <div className="flex flex-col items-center justify-center py-10 animate-pulse">
                            <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mb-2" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Analizando Perfiles...</p>
                        </div>
                    )}

                    {!loading && parties.map((party) => {
                        const profile = party.debtor?.[0]
                        const isExcluded = profile?.excluded || false
                        const riskLevel = profile?.risk_level || 'LOW'

                        return (
                            <div
                                key={party.id}
                                className={cn(
                                    "flex items-center justify-between p-4 rounded-3xl border transition-all hover:shadow-md",
                                    isExcluded ? "bg-slate-50 border-slate-100 opacity-60" : "bg-white border-slate-100 hover:border-indigo-200"
                                )}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={cn(
                                        "w-12 h-12 rounded-2xl flex items-center justify-center text-xs font-black shadow-sm shrink-0",
                                        isExcluded ? "bg-slate-200 text-slate-500" :
                                            riskLevel === 'CRITICAL' ? "bg-rose-500 text-white animate-pulse" :
                                                riskLevel === 'HIGH' ? "bg-amber-500 text-white" :
                                                    "bg-emerald-500 text-white"
                                    )}>
                                        {party.legal_name.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-black text-slate-900 tracking-tight italic uppercase">{party.legal_name}</p>
                                            {!isExcluded && (
                                                <div className="flex items-center gap-2">
                                                    <Badge
                                                        variant="outline"
                                                        className={cn(
                                                            "text-[8px] font-black uppercase tracking-widest px-2 h-4",
                                                            riskLevel === 'CRITICAL' ? "border-rose-200 bg-rose-50 text-rose-600" :
                                                                riskLevel === 'HIGH' ? "border-amber-200 bg-amber-50 text-amber-600" :
                                                                    "border-emerald-200 bg-emerald-50 text-emerald-600"
                                                        )}
                                                    >
                                                        RISK: {riskLevel}
                                                    </Badge>
                                                    {profile?.average_payment_days !== undefined && (
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            AVG {profile.average_payment_days} DÍAS
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-[10px] font-bold text-slate-400 mt-0.5 italic">{party.email || 'NO_COMMS_PROTOCOL'}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6">
                                    <div className="text-right hidden sm:block">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                                            {isExcluded ? "Agent Status" : "Bot Protocol"}
                                        </p>
                                        <span className={cn(
                                            "text-[10px] font-black uppercase italic tracking-tighter",
                                            isExcluded ? "text-slate-400" : "text-indigo-600"
                                        )}>
                                            {isExcluded ? "Sustituido (Manual)" : "Autónomo (AI)"}
                                        </span>
                                    </div>
                                    <Switch
                                        checked={isExcluded}
                                        onCheckedChange={() => toggleExclusion(party.id, isExcluded, party.tenant_id)}
                                        className="data-[state=checked]:bg-slate-900"
                                    />
                                </div>
                            </div>
                        )
                    })}

                    {parties.length === 0 && searchTerm.length >= 2 && !loading && (
                        <div className="flex flex-col items-center justify-center py-20 grayscale opacity-30">
                            <UserX className="w-12 h-12 text-slate-300 mb-4" />
                            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Sujeto no localizado en la matriz</p>
                        </div>
                    )}

                    {searchTerm.length < 2 && (
                        <div className="flex flex-col items-center justify-center py-20 opacity-20 grayscale select-none pointer-events-none">
                            <ShieldCheck className="w-16 h-16 text-slate-300 mb-6" />
                            <div className="text-center space-y-2">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Protocolo de Búsqueda Activo</p>
                                <p className="text-[10px] font-bold text-slate-400 italic">Ingresa el nombre del deudor para gestionar su autonomía</p>
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
