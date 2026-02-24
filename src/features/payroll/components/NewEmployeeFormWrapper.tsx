"use client"

import { EmployeeForm } from "./EmployeeForm"
import { employeeService } from "@/features/payroll/services/employeeService"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

export function NewEmployeeFormWrapper() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const supabase = createClient()

    const handleSubmit = async (data: any) => {
        setIsLoading(true)
        try {
            await employeeService.createEmployee(supabase, data)
            toast.success("¡Colaborador vinculado con éxito!")
            router.push('/payroll/employees')
            router.refresh()
        } catch (error: any) {
            console.error("Error creating employee:", error);
            toast.error(error.message || "No se pudo vincular al colaborador.")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <EmployeeForm onSubmit={handleSubmit} isLoading={isLoading} />
    )
}
