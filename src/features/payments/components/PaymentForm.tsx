'use client'

import { useState } from 'react'
import { Loader2, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react'
import type { PublicPaymentLinkData, PaymentMethod, ProcessPaymentResult } from '../types'

interface PaymentFormProps {
    linkData: PublicPaymentLinkData
}

interface PaymentMethodOption {
    value: PaymentMethod
    label: string
    description: string
    icon: string
    color: string
}

const PAYMENT_METHODS: PaymentMethodOption[] = [
    {
        value: 'PSE',
        label: 'PSE',
        description: 'Débito bancario en línea (ACH Colombia)',
        icon: '🏦',
        color: 'from-blue-500 to-blue-600',
    },
    {
        value: 'NEQUI',
        label: 'Nequi',
        description: 'Billetera digital Nequi',
        icon: '💜',
        color: 'from-purple-500 to-purple-600',
    },
    {
        value: 'BANCOLOMBIA_TRANSFER',
        label: 'Bancolombia',
        description: 'Transferencia Bancolombia',
        icon: '🟡',
        color: 'from-yellow-500 to-yellow-600',
    },
    {
        value: 'CASH',
        label: 'Efectivo',
        description: 'Pago en efectivo (notificar)',
        icon: '💵',
        color: 'from-green-500 to-green-600',
    },
]

type FormState = 'idle' | 'processing' | 'success' | 'error'

const formatCurrency = (amount: number, currency = 'COP') =>
    new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount)

export function PaymentForm({ linkData }: PaymentFormProps) {
    const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null)
    const [payerName, setPayerName] = useState('')
    const [payerEmail, setPayerEmail] = useState('')
    const [payerDoc, setPayerDoc] = useState('')
    const [formState, setFormState] = useState<FormState>('idle')
    const [errorMessage, setErrorMessage] = useState('')
    const [successData, setSuccessData] = useState<ProcessPaymentResult | null>(null)

    const isFormValid =
        selectedMethod !== null &&
        payerName.trim().length >= 2 &&
        payerEmail.includes('@') &&
        payerDoc.trim().length >= 5

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()

        if (!isFormValid || selectedMethod === null) return

        setFormState('processing')
        setErrorMessage('')

        try {
            const response = await fetch('/api/payments/process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token: linkData.token,
                    payment_method: selectedMethod,
                    payer_name: payerName.trim(),
                    payer_email: payerEmail.trim().toLowerCase(),
                    payer_doc: payerDoc.trim(),
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                setErrorMessage(data.error ?? 'Error al procesar el pago.')
                setFormState('error')
                return
            }

            setSuccessData(data as ProcessPaymentResult)
            setFormState('success')
        } catch {
            setErrorMessage('Error de conexión. Verifica tu internet e intenta nuevamente.')
            setFormState('error')
        }
    }

    const handleRetry = () => {
        setFormState('idle')
        setErrorMessage('')
    }

    // Pantalla de exito
    if (formState === 'success' && successData) {
        return (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center space-y-6">
                <div className="h-24 w-24 rounded-full bg-emerald-50 flex items-center justify-center border-4 border-emerald-100 shadow-lg">
                    <CheckCircle2 className="h-12 w-12 text-emerald-500" />
                </div>

                <div className="space-y-2">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                        Pago Registrado Exitosamente
                    </h2>
                    <p className="text-slate-500 font-medium">
                        Tu pago por{' '}
                        <span className="font-black text-slate-900">
                            {formatCurrency(successData.amount)}
                        </span>{' '}
                        fue procesado.
                    </p>
                </div>

                <div className="w-full max-w-sm bg-slate-50 rounded-2xl p-6 space-y-3 text-left border border-slate-100">
                    <div className="flex justify-between items-center">
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                            Referencia Bancaria
                        </span>
                        <span className="font-mono font-black text-slate-900 text-sm">
                            {successData.reference}
                        </span>
                    </div>
                    <div className="h-px bg-slate-200" />
                    <div className="flex justify-between items-center">
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                            Método
                        </span>
                        <span className="text-sm font-black text-slate-700">
                            {PAYMENT_METHODS.find(m => m.value === successData.payment_method)?.label ?? successData.payment_method}
                        </span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                            Monto
                        </span>
                        <span className="text-sm font-black text-emerald-600">
                            {formatCurrency(successData.amount)}
                        </span>
                    </div>
                </div>

                <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                    Guarda tu referencia bancaria como comprobante. El emisor recibirá
                    notificación automática del pago.
                </p>
            </div>
        )
    }

    // Pantalla de error con retry
    if (formState === 'error') {
        return (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center space-y-6">
                <div className="h-24 w-24 rounded-full bg-red-50 flex items-center justify-center border-4 border-red-100 shadow-lg">
                    <AlertCircle className="h-12 w-12 text-red-400" />
                </div>

                <div className="space-y-2">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                        Error en el Pago
                    </h2>
                    <p className="text-slate-500 font-medium max-w-sm">{errorMessage}</p>
                </div>

                <button
                    onClick={handleRetry}
                    className="flex items-center gap-2 px-8 py-3 bg-slate-900 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-slate-800 transition-all hover:scale-105 active:scale-95"
                >
                    <RefreshCw className="h-4 w-4" />
                    Intentar de Nuevo
                </button>
            </div>
        )
    }

    // Formulario principal
    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            {/* Resumen de la factura */}
            <div className="bg-slate-50 rounded-2xl p-6 space-y-4 border border-slate-100">
                <div className="space-y-1">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                        Empresa Emisora
                    </p>
                    <p className="font-black text-slate-900 text-lg leading-tight">
                        {linkData.tenant.legal_name}
                    </p>
                    <p className="text-xs text-slate-500 font-bold">NIT {linkData.tenant.nit}</p>
                </div>

                <div className="h-px bg-slate-200" />

                <div className="flex justify-between items-center">
                    <div className="space-y-0.5">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                            Factura
                        </p>
                        <p className="font-black text-slate-700">#{linkData.document.number}</p>
                    </div>
                    {linkData.party && (
                        <div className="text-right space-y-0.5">
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                                Pagador
                            </p>
                            <p className="font-bold text-slate-600 text-sm">{linkData.party.legal_name}</p>
                        </div>
                    )}
                </div>

                <div className="bg-white rounded-xl p-5 border border-slate-100 text-center">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">
                        Total a Pagar
                    </p>
                    <p className="text-4xl font-black text-slate-900 tracking-tighter italic">
                        {formatCurrency(linkData.amount, linkData.currency)}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">{linkData.currency}</p>
                </div>
            </div>

            {/* Seleccion metodo de pago */}
            <div className="space-y-3">
                <p className="text-xs font-black text-slate-500 uppercase tracking-widest">
                    Metodo de Pago
                </p>
                <div className="grid grid-cols-2 gap-3">
                    {PAYMENT_METHODS.map((method) => (
                        <button
                            key={method.value}
                            type="button"
                            onClick={() => setSelectedMethod(method.value)}
                            className={`
                                relative p-4 rounded-2xl border-2 text-left transition-all duration-150
                                ${selectedMethod === method.value
                                    ? 'border-slate-900 bg-slate-900 text-white shadow-lg scale-[1.02]'
                                    : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm text-slate-700'
                                }
                            `}
                        >
                            <span className="text-2xl block mb-2">{method.icon}</span>
                            <span className="block font-black text-sm leading-tight">
                                {method.label}
                            </span>
                            <span className={`block text-[10px] leading-tight mt-0.5 ${
                                selectedMethod === method.value ? 'text-slate-300' : 'text-slate-400'
                            }`}>
                                {method.description}
                            </span>

                            {selectedMethod === method.value && (
                                <div className="absolute top-3 right-3">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Datos del pagador */}
            <div className="space-y-4">
                <p className="text-xs font-black text-slate-500 uppercase tracking-widest">
                    Datos del Pagador
                </p>

                <div className="space-y-3">
                    <div>
                        <label
                            htmlFor="payer_name"
                            className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5"
                        >
                            Nombre Completo
                        </label>
                        <input
                            id="payer_name"
                            type="text"
                            value={payerName}
                            onChange={(e) => setPayerName(e.target.value)}
                            placeholder="Juan Carlos Perez"
                            required
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 font-medium placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="payer_email"
                            className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5"
                        >
                            Correo Electronico
                        </label>
                        <input
                            id="payer_email"
                            type="email"
                            value={payerEmail}
                            onChange={(e) => setPayerEmail(e.target.value)}
                            placeholder="juan@empresa.com"
                            required
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 font-medium placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="payer_doc"
                            className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5"
                        >
                            Numero de Documento
                        </label>
                        <input
                            id="payer_doc"
                            type="text"
                            value={payerDoc}
                            onChange={(e) => setPayerDoc(e.target.value)}
                            placeholder="1234567890"
                            required
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 font-medium placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                        />
                    </div>
                </div>
            </div>

            {/* Boton de pago */}
            <button
                type="submit"
                disabled={!isFormValid || formState === 'processing'}
                className={`
                    w-full flex items-center justify-center gap-3 py-4 rounded-2xl
                    font-black text-sm uppercase tracking-widest transition-all duration-150
                    ${isFormValid && formState !== 'processing'
                        ? 'bg-slate-900 text-white hover:bg-slate-800 hover:scale-[1.02] active:scale-[0.98] shadow-lg'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }
                `}
            >
                {formState === 'processing' ? (
                    <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Procesando Pago...
                    </>
                ) : (
                    <>
                        Pagar {formatCurrency(linkData.amount, linkData.currency)}
                    </>
                )}
            </button>

            {/* Nota de seguridad */}
            <p className="text-center text-[10px] text-slate-400 leading-relaxed">
                Tu informacion de pago esta protegida con cifrado de extremo a extremo.
                Esta transaccion es gestionada de forma segura.
            </p>
        </form>
    )
}
