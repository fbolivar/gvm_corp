"use client"

import { EmployeeForm } from "./EmployeeForm"
import { createEmployeeAction } from "../actions"
import { useRouter, useSearchParams } from "next/navigation"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Employee } from "../types"
import { Loader2 } from "lucide-react"

export function NewEmployeeFormWrapper() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [isLoading, setIsLoading] = useState(false)
    const [mounted, setMounted] = useState(false)

    useEffect(() => { setMounted(true) }, [])

    // Only read searchParams AFTER mount to avoid hydration mismatch
    const linkedUserId = mounted ? (searchParams.get('userId') || undefined) : undefined
    const linkedName = mounted ? (searchParams.get('name') || '') : ''
    const linkedEmail = mounted ? (searchParams.get('email') || '') : ''

    const initialData: Partial<Employee> | undefined = linkedUserId ? {
        user_id: linkedUserId,
        party: {
            party_type: 'PERSON',
            doc_type: 'CC',
            is_customer: false,
            is_vendor: false,
            legal_name: linkedName,
            doc_number: '',
            email: linkedEmail,
            phone: ''
        },
        contract_type: 'INDEFINIDO',
        start_date: new Date().toISOString().split('T')[0],
        salary: 0,
        transport_allowance: true,
        risk_level: '1',
        payment_method: 'CASH',
        status: 'ACTIVE'
    } : undefined

    const handleSubmit = async (data: Employee) => {
        setIsLoading(true)
        try {
            const result = await createEmployeeAction({
                party: {
                    legal_name: data.party?.legal_name || '',
                    doc_type: data.party?.doc_type || 'CC',
                    doc_number: data.party?.doc_number || '',
                    email: data.party?.email || null,
                    phone: data.party?.phone || null,
                },
                contract_type: data.contract_type,
                start_date: data.start_date,
                end_date: data.end_date || null,
                salary: data.salary,
                transport_allowance: data.transport_allowance ?? true,
                risk_level: data.risk_level || '1',
                payment_method: data.payment_method || 'CASH',
                bank_name: data.bank_name || null,
                bank_account_type: data.bank_account_type || null,
                bank_account_number: data.bank_account_number || null,
                user_id: linkedUserId || null,
            })

            if (!result.success) {
                toast.error(result.error)
                return
            }

            toast.success("Colaborador vinculado con exito!")
            router.push('/payroll/employees')
            router.refresh()
        } catch (error: unknown) {
            const err = error as { message?: string }
            toast.error(err.message || "No se pudo vincular al colaborador.")
        } finally {
            setIsLoading(false)
        }
    }

    // Show loading until mounted to prevent hydration mismatch
    if (!mounted) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
            </div>
        )
    }

    return (
        <EmployeeForm
            initialData={initialData as Employee | undefined}
            onSubmit={handleSubmit}
            isLoading={isLoading}
            linkedUserEmail={linkedUserId ? linkedEmail : undefined}
        />
    )
}
