"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronDown, Users, Building2, MessageSquareQuote } from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { scoreLabel } from "../utils/vendorSurveyScoring"
import type { VendorCompanyResult } from "../services/vendorSurveyService"
import { VENDOR_ROLE_WEIGHT_OPTIONS } from "../types/vendorSurvey"

const TONE_STYLES: Record<string, string> = {
    good: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    ok: 'bg-sky-50 text-sky-700 border-sky-200',
    warn: 'bg-amber-50 text-amber-700 border-amber-200',
    bad: 'bg-rose-50 text-rose-700 border-rose-200',
    none: 'bg-slate-50 text-slate-500 border-slate-200',
}

export function ScorePill({ score, className }: { score: number | null; className?: string }) {
    const { label, tone } = scoreLabel(score)
    return (
        <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold', TONE_STYLES[tone], className)}>
            {score === null ? '—' : `${score.toFixed(0)}/100`}
            <span className="font-medium opacity-80">{label}</span>
        </span>
    )
}

function MiniScore({ label, value, suffix = '/100' }: { label: string; value: number | null; suffix?: string }) {
    return (
        <div className="min-w-0">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider truncate">{label}</p>
            <p className="text-sm font-bold text-slate-800 tabular-nums">
                {value === null ? '—' : `${value.toFixed(value % 1 === 0 ? 0 : 1)}${suffix}`}
            </p>
        </div>
    )
}

/**
 * Resultados agrupados por proveedor. Cada fila abre el detalle de quiénes
 * respondieron, con el peso de su cargo — que es lo que explica por qué la nota
 * del proveedor no es el promedio simple de las respuestas.
 */
export function VendorSurveyResults({ companies }: { companies: VendorCompanyResult[] }) {
    const [open, setOpen] = useState<string | null>(null)

    if (companies.length === 0) {
        return (
            <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center">
                <Building2 className="h-8 w-8 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-700">Aún no hay encuestas registradas</p>
                <p className="text-xs text-slate-500 mt-1">
                    Registra la primera y aquí verás el consolidado por proveedor, ponderado según el cargo de cada persona.
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-3">
            {companies.map(c => {
                const isOpen = open === c.party_id
                return (
                    <div key={c.party_id} className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                        <button
                            type="button"
                            onClick={() => setOpen(isOpen ? null : c.party_id)}
                            className="w-full text-left p-5 hover:bg-slate-50/60 transition-colors"
                        >
                            <div className="flex flex-wrap items-center justify-between gap-4">
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-sm font-bold text-slate-900 truncate">{c.party_name}</p>
                                        <ScorePill score={c.overall} />
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-3 flex-wrap">
                                        {c.doc_number && <span>NIT {c.doc_number}</span>}
                                        <span className="inline-flex items-center gap-1">
                                            <Users className="h-3 w-3" /> {c.responses} respuesta(s) · peso {c.totalWeight}
                                        </span>
                                        <span>Última: {c.last_survey_date}</span>
                                    </p>
                                </div>

                                <div className="grid grid-cols-3 sm:grid-cols-5 gap-4 sm:gap-6">
                                    <MiniScore label="Relación" value={c.relationship} />
                                    <MiniScore label="Pedidos/Pagos" value={c.ordersPayments} />
                                    <MiniScore label="Comercial" value={c.commercial} />
                                    <MiniScore label="CSAT" value={c.csat} suffix="/10" />
                                    <MiniScore label="NPS" value={c.nps} suffix="" />
                                </div>

                                <ChevronDown className={cn('h-4 w-4 text-slate-400 transition-transform shrink-0', isOpen && 'rotate-180')} />
                            </div>
                        </button>

                        {isOpen && (
                            <div className="border-t border-slate-100 divide-y divide-slate-50">
                                {c.rows.map(r => {
                                    const weight = VENDOR_ROLE_WEIGHT_OPTIONS.find(o => o.value === Number(r.role_weight))
                                    return (
                                        <div key={r.id} className="p-5 flex flex-wrap items-start justify-between gap-4">
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-slate-800">{r.respondent_name}</p>
                                                <p className="text-xs text-slate-500">
                                                    {r.respondent_role} · <span className="font-semibold">{weight?.label ?? `Peso ${r.role_weight}`}</span>
                                                </p>
                                                {r.recommendation && (
                                                    <p className="text-xs text-slate-600 mt-2 flex gap-1.5 max-w-xl">
                                                        <MessageSquareQuote className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                                                        <span className="italic">{r.recommendation}</span>
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <MiniScore label="CSAT" value={r.csat} suffix="/10" />
                                                <MiniScore label="NPS" value={r.nps} suffix="" />
                                                <ScorePill score={r.overall_score} />
                                                <Link href={`/purchasing/vendor-surveys/${r.id}`}
                                                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 whitespace-nowrap">
                                                    Ver detalle
                                                </Link>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}
