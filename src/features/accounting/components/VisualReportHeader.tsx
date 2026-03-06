"use client"

import { TenantInfo } from "../../settings/services/settingsService"
import { Building2, MapPin, Phone, Mail, Globe } from "lucide-react"

interface Props {
    title: string
    subtitle?: string
    tenant: TenantInfo | null
}

export function VisualReportHeader({ title, subtitle, tenant }: Props) {
    if (!tenant) return null;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 px-4 md:px-6 py-4 md:py-5">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-5">
                {/* Company info */}
                <div className="space-y-2 md:space-y-2.5 min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                        {tenant.logo_url ? (
                            <img src={tenant.logo_url} alt={tenant.name} className="h-8 md:h-10 w-auto object-contain shrink-0" />
                        ) : (
                            <div className="h-8 w-8 md:h-10 md:w-10 rounded-lg bg-slate-900 flex items-center justify-center text-white shrink-0">
                                <Building2 className="h-4 w-4 md:h-5 md:w-5" />
                            </div>
                        )}
                        <div className="min-w-0">
                            <h2 className="text-xs md:text-sm font-bold text-slate-900 leading-snug truncate">
                                {tenant.name}
                            </h2>
                            <p className="text-[10px] text-slate-400">
                                NIT: {tenant.nit}-{tenant.dv}
                            </p>
                        </div>
                    </div>

                    <div className="hidden md:flex flex-wrap items-center gap-x-5 gap-y-1 text-[10px] text-slate-400">
                        {tenant.address && (
                            <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3 text-slate-300 shrink-0" />
                                {tenant.address}, {tenant.city}
                            </span>
                        )}
                        {tenant.phone && (
                            <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3 text-slate-300 shrink-0" />
                                {tenant.phone}
                            </span>
                        )}
                        {tenant.email && (
                            <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3 text-slate-300 shrink-0" />
                                {tenant.email}
                            </span>
                        )}
                        {tenant.website && (
                            <span className="flex items-center gap-1">
                                <Globe className="h-3 w-3 text-slate-300 shrink-0" />
                                {tenant.website}
                            </span>
                        )}
                    </div>
                </div>

                {/* Report title */}
                <div className="shrink-0 border-l-2 border-indigo-500 pl-4 text-left md:text-right">
                    <h1 className="text-sm md:text-base font-bold text-slate-900">
                        {title}
                    </h1>
                    {subtitle && (
                        <p className="text-[10px] text-slate-400 mt-0.5 hidden sm:block">
                            {subtitle}
                        </p>
                    )}
                    <p className="text-[9px] text-emerald-600 font-medium mt-0.5">
                        Generado: {new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>
            </div>
        </div>
    )
}
