"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/shared/components/ui/button"
import { Badge } from "@/shared/components/ui/badge"
import { toast } from "sonner"
import { createExchangeRateAction, deleteExchangeRateAction } from "../actions/currencyActions"
import { Plus, Trash2, Loader2, Save, TrendingUp, ArrowRightLeft } from "lucide-react"

interface Currency {
    code: string
    name: string
    symbol: string
    decimal_places: number
}

interface ExchangeRate {
    id: string
    from_currency: string
    to_currency: string
    rate: number
    effective_date: string
}

interface Props {
    currencies: Currency[]
    rates: ExchangeRate[]
}

export function CurrencyManager({ currencies, rates }: Props) {
    const router = useRouter()
    const [showForm, setShowForm] = useState(false)
    const [fromCurrency, setFromCurrency] = useState('USD')
    const [toCurrency, setToCurrency] = useState('COP')
    const [rate, setRate] = useState('')
    const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split('T')[0])
    const [saving, setSaving] = useState(false)
    const [deletingId, setDeletingId] = useState<string | null>(null)

    const latestUSD = rates.find(r => r.from_currency === 'USD' && r.to_currency === 'COP')
    const latestEUR = rates.find(r => r.from_currency === 'EUR' && r.to_currency === 'COP')

    const fmtRate = (r: number) =>
        new Intl.NumberFormat('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(r)

    const handleCreate = async () => {
        if (!rate || Number(rate) <= 0) { toast.error("La tasa debe ser mayor a 0"); return }
        if (fromCurrency === toCurrency) { toast.error("Las monedas deben ser diferentes"); return }
        setSaving(true)
        const result = await createExchangeRateAction({
            from_currency: fromCurrency,
            to_currency: toCurrency,
            rate: Number(rate),
            effective_date: effectiveDate,
        })
        setSaving(false)
        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success("Tasa de cambio registrada")
            setRate('')
            setShowForm(false)
            router.refresh()
        }
    }

    const handleDelete = async (id: string) => {
        setDeletingId(id)
        const result = await deleteExchangeRateAction(id)
        setDeletingId(null)
        if (result.error) toast.error(result.error)
        else { toast.success("Tasa eliminada"); router.refresh() }
    }

    return (
        <div className="space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-[2rem] p-6 shadow-premium border border-slate-50">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Monedas</p>
                    <p className="text-3xl font-black text-slate-900 mt-2 italic tracking-tighter">{currencies.length}</p>
                </div>
                <div className="bg-white rounded-[2rem] p-6 shadow-premium border border-slate-50">
                    <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">USD a COP</p>
                    <p className="text-2xl font-black text-emerald-600 mt-2 italic tracking-tighter">
                        {latestUSD ? `$${fmtRate(latestUSD.rate)}` : '—'}
                    </p>
                    {latestUSD && (
                        <p className="text-[10px] text-slate-400 mt-1">{latestUSD.effective_date}</p>
                    )}
                </div>
                <div className="bg-white rounded-[2rem] p-6 shadow-premium border border-slate-50">
                    <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest">EUR a COP</p>
                    <p className="text-2xl font-black text-blue-600 mt-2 italic tracking-tighter">
                        {latestEUR ? `$${fmtRate(latestEUR.rate)}` : '—'}
                    </p>
                    {latestEUR && (
                        <p className="text-[10px] text-slate-400 mt-1">{latestEUR.effective_date}</p>
                    )}
                </div>
            </div>

            {/* Currencies table */}
            <div className="bg-white rounded-[2rem] shadow-premium border border-slate-50 overflow-hidden">
                <div className="p-5 border-b border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Monedas Disponibles</p>
                </div>
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-slate-100">
                            <th className="text-left px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Codigo</th>
                            <th className="text-left px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Nombre</th>
                            <th className="text-left px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Simbolo</th>
                            <th className="text-right px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Decimales</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currencies.map(c => (
                            <tr key={c.code} className="border-b border-slate-50 hover:bg-slate-50/50">
                                <td className="px-6 py-3">
                                    <Badge className="text-[9px] font-mono font-bold bg-slate-100 text-slate-700 border-none rounded px-2">
                                        {c.code}
                                    </Badge>
                                </td>
                                <td className="px-6 py-3 text-sm font-medium text-slate-700">{c.name}</td>
                                <td className="px-6 py-3 text-sm font-bold text-slate-900">{c.symbol}</td>
                                <td className="px-6 py-3 text-sm text-right text-slate-500">{c.decimal_places}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Add rate button / form */}
            {!showForm ? (
                <Button
                    onClick={() => setShowForm(true)}
                    className="h-10 px-5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                    <Plus className="h-3.5 w-3.5 mr-2" /> Registrar Tasa de Cambio
                </Button>
            ) : (
                <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4 shadow-sm">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nueva Tasa</p>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Desde</label>
                            <select
                                value={fromCurrency}
                                onChange={e => setFromCurrency(e.target.value)}
                                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            >
                                {currencies.map(c => (
                                    <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Hacia</label>
                            <select
                                value={toCurrency}
                                onChange={e => setToCurrency(e.target.value)}
                                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            >
                                {currencies.map(c => (
                                    <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tasa</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={rate}
                                onChange={e => setRate(e.target.value)}
                                placeholder="Ej: 4150.50"
                                className="w-full h-10 px-4 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Fecha</label>
                            <input
                                type="date"
                                value={effectiveDate}
                                onChange={e => setEffectiveDate(e.target.value)}
                                className="w-full h-10 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <Button
                            onClick={handleCreate}
                            disabled={saving}
                            className="h-9 px-4 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            {saving
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                                : <Save className="h-3.5 w-3.5 mr-2" />
                            }
                            Guardar
                        </Button>
                        <Button
                            onClick={() => { setShowForm(false); setRate('') }}
                            variant="ghost"
                            className="h-9 px-4 rounded-lg text-xs text-slate-400"
                        >
                            Cancelar
                        </Button>
                    </div>
                </div>
            )}

            {/* Rates history */}
            <div className="bg-white rounded-[2rem] shadow-premium border border-slate-50 overflow-hidden">
                <div className="p-5 border-b border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Historial de Tasas</p>
                </div>
                {rates.length === 0 ? (
                    <div className="p-12 text-center text-slate-300">
                        <TrendingUp className="h-8 w-8 mx-auto mb-3 opacity-50" />
                        <p className="text-xs font-bold uppercase tracking-widest">Sin tasas registradas</p>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-100">
                                <th className="text-left px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Par</th>
                                <th className="text-right px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Tasa</th>
                                <th className="text-left px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Fecha Vigencia</th>
                                <th className="w-10"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {rates.map(r => (
                                <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                                    <td className="px-6 py-3">
                                        <div className="flex items-center gap-2">
                                            <Badge className="text-[9px] font-mono bg-slate-100 text-slate-600 border-none rounded px-2">
                                                {r.from_currency}
                                            </Badge>
                                            <ArrowRightLeft className="h-3 w-3 text-slate-300" />
                                            <Badge className="text-[9px] font-mono bg-indigo-50 text-indigo-600 border-none rounded px-2">
                                                {r.to_currency}
                                            </Badge>
                                        </div>
                                    </td>
                                    <td className="px-6 py-3 text-sm font-bold text-right text-slate-900 font-mono">
                                        {fmtRate(r.rate)}
                                    </td>
                                    <td className="px-6 py-3 text-xs text-slate-500">{r.effective_date}</td>
                                    <td className="px-6 py-3">
                                        <button
                                            onClick={() => handleDelete(r.id)}
                                            disabled={deletingId === r.id}
                                            className="text-slate-300 hover:text-rose-500 transition-colors disabled:opacity-40"
                                            aria-label="Eliminar tasa"
                                        >
                                            {deletingId === r.id
                                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                : <Trash2 className="h-3.5 w-3.5" />
                                            }
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    )
}
