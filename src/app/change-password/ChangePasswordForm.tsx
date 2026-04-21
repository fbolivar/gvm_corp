'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Eye, EyeOff, Lock, ArrowRight } from 'lucide-react'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'
import { changePasswordAction } from '@/features/auth/actions'

function strengthOf(pw: string): { label: string; score: number; color: string } {
    let score = 0
    if (pw.length >= 8) score++
    if (pw.length >= 12) score++
    if (/[A-Z]/.test(pw)) score++
    if (/[0-9]/.test(pw)) score++
    if (/[^A-Za-z0-9]/.test(pw)) score++
    if (score <= 1) return { label: 'Débil', score, color: 'bg-rose-500' }
    if (score <= 3) return { label: 'Media', score, color: 'bg-amber-500' }
    return { label: 'Fuerte', score, color: 'bg-emerald-500' }
}

export function ChangePasswordForm() {
    const router = useRouter()
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showNew, setShowNew] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    const strength = strengthOf(newPassword)
    const match = confirmPassword.length > 0 && newPassword === confirmPassword

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (isLoading) return

        if (newPassword.length < 8) {
            toast.error('La contraseña debe tener al menos 8 caracteres')
            return
        }
        if (newPassword !== confirmPassword) {
            toast.error('Las contraseñas no coinciden')
            return
        }

        setIsLoading(true)
        try {
            const result = await changePasswordAction(newPassword, confirmPassword)
            if (!result.success) {
                toast.error(result.error || 'No se pudo cambiar la contraseña')
                setIsLoading(false)
                return
            }
            toast.success('Contraseña actualizada. ¡Bienvenido!')
            router.push('/dashboard')
            router.refresh()
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Error inesperado'
            toast.error(msg)
            setIsLoading(false)
        }
    }

    return (
        <form onSubmit={onSubmit} className="space-y-5">
            {/* Nueva */}
            <div className="space-y-2">
                <Label className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-400 ml-1">
                    Nueva contraseña
                </Label>
                <div className="relative group">
                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                    <Input
                        type={showNew ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        autoComplete="new-password"
                        className="h-12 pl-13 pr-12 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-900 placeholder:text-slate-300 focus-visible:ring-2 focus-visible:ring-indigo-500/20"
                        style={{ paddingLeft: '3.25rem' }}
                    />
                    <button
                        type="button"
                        onClick={() => setShowNew(!showNew)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600"
                    >
                        {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                </div>

                {newPassword.length > 0 && (
                    <div className="flex items-center gap-2 px-1">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className={cn('h-full transition-all duration-300', strength.color)}
                                style={{ width: `${(strength.score / 5) * 100}%` }}
                            />
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">
                            {strength.label}
                        </span>
                    </div>
                )}
            </div>

            {/* Confirmar */}
            <div className="space-y-2">
                <Label className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-400 ml-1">
                    Confirmar contraseña
                </Label>
                <div className="relative group">
                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                    <Input
                        type={showConfirm ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        autoComplete="new-password"
                        className={cn(
                            'h-12 pl-13 pr-12 bg-slate-50 border rounded-2xl font-bold text-slate-900 placeholder:text-slate-300 focus-visible:ring-2',
                            confirmPassword.length > 0 && !match
                                ? 'border-rose-300 focus-visible:ring-rose-500/20'
                                : 'border-slate-100 focus-visible:ring-indigo-500/20'
                        )}
                        style={{ paddingLeft: '3.25rem' }}
                    />
                    <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600"
                    >
                        {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                </div>
                {confirmPassword.length > 0 && !match && (
                    <p className="text-[10px] font-bold text-rose-500 ml-1">
                        Las contraseñas no coinciden
                    </p>
                )}
            </div>

            {/* Submit */}
            <Button
                type="submit"
                disabled={isLoading || !match || newPassword.length < 8}
                className={cn(
                    'w-full h-13 rounded-2xl font-black italic tracking-tight transition-all shadow-lg group mt-2',
                    match && newPassword.length >= 8
                        ? 'bg-slate-900 hover:bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none'
                )}
            >
                {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                    <span className="flex items-center gap-2">
                        Actualizar contraseña
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </span>
                )}
            </Button>
        </form>
    )
}
