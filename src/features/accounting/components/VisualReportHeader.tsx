"use client"

import { TenantInfo } from "../../settings/services/settingsService"
import { Building2, MapPin, Phone, Mail, Globe, Calendar } from "lucide-react"

interface Props {
    title: string
    subtitle?: string
    tenant: TenantInfo | null
}

export function VisualReportHeader({ title, subtitle, tenant }: Props) {
    if (!tenant) return null;

    const generatedDate = new Date().toLocaleDateString('es-CO', {
        year: 'numeric', month: 'long', day: 'numeric',
    });

    return (
        <div className="surface-card p-5 md:p-6 print:shadow-none print:border-slate-300">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5">
                {/* Company block */}
                <div className="flex items-start gap-4 min-w-0 flex-1">
                    {tenant.logo_url ? (
                        <img
                            src={tenant.logo_url}
                            alt={tenant.name}
                            className="h-12 w-12 object-contain shrink-0 rounded-lg bg-white border border-slate-100 p-1"
                        />
                    ) : (
                        <div className="h-12 w-12 rounded-lg bg-slate-900 flex items-center justify-center text-white shrink-0">
                            <Building2 className="h-5 w-5" />
                        </div>
                    )}

                    <div className="min-w-0 flex-1 space-y-1">
                        <h2 className="text-sm md:text-base font-semibold text-slate-900 leading-tight truncate">
                            {tenant.name}
                        </h2>
                        <p className="text-xs text-slate-500 tabular-nums">
                            NIT {tenant.nit}-{tenant.dv}
                        </p>
                        <div className="hidden md:flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 pt-1">
                            {tenant.address && (
                                <span className="inline-flex items-center gap-1">
                                    <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                                    <span className="truncate max-w-[200px]">{tenant.address}{tenant.city ? `, ${tenant.city}` : ''}</span>
                                </span>
                            )}
                            {tenant.phone && (
                                <span className="inline-flex items-center gap-1">
                                    <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                                    {tenant.phone}
                                </span>
                            )}
                            {tenant.email && (
                                <span className="inline-flex items-center gap-1">
                                    <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                                    <span className="truncate max-w-[180px]">{tenant.email}</span>
                                </span>
                            )}
                            {tenant.website && (
                                <span className="inline-flex items-center gap-1">
                                    <Globe className="h-3 w-3 text-slate-400 shrink-0" />
                                    {tenant.website}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Report block */}
                <div className="shrink-0 md:text-right md:pl-5 md:border-l md:border-slate-200">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Reporte
                    </p>
                    <h1 className="text-lg md:text-xl font-bold text-slate-900 mt-0.5">
                        {title}
                    </h1>
                    {subtitle && (
                        <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
                    )}
                    <p className="inline-flex items-center gap-1.5 text-xs text-slate-500 mt-2">
                        <Calendar className="h-3 w-3" />
                        Generado: {generatedDate}
                    </p>
                </div>
            </div>
        </div>
    );
}
