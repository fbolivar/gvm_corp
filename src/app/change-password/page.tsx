import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { ChangePasswordForm } from './ChangePasswordForm'
import { KeyRound, ShieldCheck, Lock } from 'lucide-react'
import Image from 'next/image'

export const metadata: Metadata = {
    title: 'Cambio de contraseña · GVM Corp',
}

export default async function ChangePasswordPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Si el usuario ya no requiere cambio, que siga su flujo normal
    if (user.user_metadata?.must_change_password !== true) {
        redirect('/dashboard')
    }

    const userEmail = user.email || ''
    const displayName = (user.user_metadata?.full_name as string) || userEmail.split('@')[0]

    return (
        <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 p-6">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="flex flex-col items-center mb-10">
                    <div className="h-16 w-16 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center overflow-hidden mb-4">
                        <Image
                            src="/logo-gvm.png"
                            alt="GVM"
                            width={44}
                            height={44}
                            className="rounded-lg w-auto h-auto"
                            unoptimized
                        />
                    </div>
                    <h1 className="text-slate-900 font-black italic text-xl tracking-tighter">GVM S.A.S</h1>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em] mt-1">
                        Seguridad de Acceso
                    </p>
                </div>

                {/* Card */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-xl p-8 space-y-6">
                    {/* Header */}
                    <div className="flex items-start gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                            <KeyRound className="h-5 w-5 text-indigo-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h2 className="text-xl font-black text-slate-900 tracking-tighter italic">
                                Cambia tu contraseña
                            </h2>
                            <p className="text-sm text-slate-500 mt-1 leading-snug">
                                Hola, <span className="font-bold text-slate-700">{displayName}</span>. Por seguridad, debes
                                definir una contraseña personal antes de continuar.
                            </p>
                        </div>
                    </div>

                    {/* Requisitos */}
                    <div className="bg-slate-50 rounded-2xl p-4 space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-1.5">
                            <Lock className="h-3 w-3" /> Requisitos
                        </p>
                        <ul className="space-y-1.5 text-xs text-slate-600 font-medium">
                            <li className="flex items-center gap-2">
                                <span className="h-1 w-1 rounded-full bg-indigo-500" />
                                Mínimo 8 caracteres
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="h-1 w-1 rounded-full bg-indigo-500" />
                                Al menos una letra y un número
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="h-1 w-1 rounded-full bg-indigo-500" />
                                Distinta a la contraseña inicial compartida
                            </li>
                        </ul>
                    </div>

                    {/* Form */}
                    <ChangePasswordForm />

                    {/* Footer */}
                    <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                            Tu contraseña se guarda cifrada
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
