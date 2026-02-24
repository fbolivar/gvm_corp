import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Input } from "@/shared/components/ui/input"
import { Button } from "@/shared/components/ui/button"
import { Badge } from "@/shared/components/ui/badge"
import { Switch } from "@/shared/components/ui/switch"
import { Search, UserX, ShieldCheck, UserCheck } from "lucide-react"
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
                    debtor:debtor_profiles(excluded)
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

                <div className="space-y-2 min-h-[200px]">
                    {parties.map((party) => {
                        const isExcluded = party.debtor?.[0]?.excluded || false
                        return (
                            <div
                                key={party.id}
                                className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-white shadow-[0_2px_4px_rgba(0,0,0,0.02)] transition-all hover:border-indigo-100"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold ${isExcluded ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                        {party.legal_name.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-700 leading-tight">{party.legal_name}</p>
                                        <p className="text-[10px] text-slate-400 mt-0.5">{party.email || 'Sin email'}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="text-right flex flex-col items-end">
                                        <Badge variant={isExcluded ? "destructive" : "outline"} className="text-[9px] h-4 px-1.5 uppercase font-bold tracking-tighter">
                                            {isExcluded ? "EXCLUIDO" : "PROTEGIDO"}
                                        </Badge>
                                        <span className="text-[8px] text-slate-400 mt-1 uppercase font-medium">Automatic Cobro</span>
                                    </div>
                                    <Switch
                                        checked={isExcluded}
                                        onCheckedChange={() => toggleExclusion(party.id, isExcluded, party.tenant_id)}
                                        className="data-[state=checked]:bg-rose-500 scale-90"
                                    />
                                </div>
                            </div>
                        )
                    })}

                    {parties.length === 0 && searchTerm.length >= 2 && !loading && (
                        <div className="text-center py-8">
                            <p className="text-xs text-slate-400">No se encontraron clientes.</p>
                        </div>
                    )}

                    {searchTerm.length < 2 && (
                        <div className="flex flex-col items-center justify-center py-8 opacity-40 grayscale">
                            <ShieldCheck className="w-8 h-8 text-slate-300 mb-2" />
                            <p className="text-[10px] text-slate-400 text-center px-4">
                                Ingresa al menos 2 caracteres para buscar y gestionar clientes.
                            </p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
