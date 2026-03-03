"use client"

import { TenantInfo } from "../../settings/services/settingsService"
import { Building2, MapPin, Phone, Mail, Globe } from "lucide-react"
import { Badge } from "@/shared/components/ui/badge"

interface Props {
    title: string
    subtitle?: string
    tenant: TenantInfo | null
}

export function VisualReportHeader({ title, subtitle, tenant }: Props) {
    if (!tenant) return null;

    return (
        <div className="bg-white rounded-[2.5rem] shadow-premium p-8 md:p-12 mb-10 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full -mr-20 -mt-20 group-hover:bg-primary/5 transition-colors duration-700" />

            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                <div className="space-y-4">
                    <div className="flex items-center gap-5">
                        {tenant.logo_url ? (
                            <img src={tenant.logo_url} alt={tenant.name} className="h-16 w-auto object-contain" />
                        ) : (
                            <div className="h-16 w-16 rounded-[1.25rem] bg-slate-900 flex items-center justify-center text-white shadow-xl shadow-slate-900/20">
                                <Building2 className="h-8 w-8" />
                            </div>
                        )}
                        <div>
                            <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-tight">
                                {tenant.name}
                            </h2>
                            <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="bg-slate-50 text-slate-400 border-none px-3 font-black text-[10px] uppercase tracking-widest">
                                    NIT: {tenant.nit}-{tenant.dv}
                                </Badge>
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Entidad Certificada</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 pl-2">
                        {tenant.address && (
                            <div className="flex items-center gap-2 text-slate-400">
                                <MapPin className="h-3.5 w-3.5 text-primary" />
                                <span className="text-[11px] font-bold uppercase tracking-tight">{tenant.address}, {tenant.city}</span>
                            </div>
                        )}
                        {tenant.phone && (
                            <div className="flex items-center gap-2 text-slate-400">
                                <Phone className="h-3.5 w-3.5 text-primary" />
                                <span className="text-[11px] font-bold uppercase tracking-tight">{tenant.phone}</span>
                            </div>
                        )}
                        {tenant.email && (
                            <div className="flex items-center gap-2 text-slate-400">
                                <Mail className="h-3.5 w-3.5 text-primary" />
                                <span className="text-[11px] font-bold uppercase tracking-tight">{tenant.email}</span>
                            </div>
                        )}
                        {tenant.website && (
                            <div className="flex items-center gap-2 text-slate-400">
                                <Globe className="h-3.5 w-3.5 text-primary" />
                                <span className="text-[11px] font-bold uppercase tracking-tight">{tenant.website}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="text-left md:text-right space-y-2 border-l-4 md:border-l-0 md:border-r-4 border-slate-900 pl-6 md:pl-0 md:pr-6 py-2">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase leading-tight">
                        {title}
                    </h1>
                    {subtitle && (
                        <p className="text-slate-400 font-black text-xs uppercase tracking-[0.2em]">
                            {subtitle}
                        </p>
                    )}
                    <div className="pt-2">
                        <span className="text-[9px] text-emerald-600 font-black uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full">
                            Generado: {new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    )
}
