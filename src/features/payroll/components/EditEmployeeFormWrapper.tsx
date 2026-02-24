"use client"

import { EmployeeForm } from "./EmployeeForm"
import { employeeService } from "@/features/payroll/services/employeeService"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Employee } from "../types"
import { Loader2 } from "lucide-react"

interface Props {
    employeeId: string
}

export function EditEmployeeFormWrapper({ employeeId }: Props) {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [initialData, setInitialData] = useState<Employee | null>(null)
    const [fetching, setFetching] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        async function loadEmployee() {
            try {
                const data = await employeeService.getEmployeeById(supabase, employeeId)
                if (data) {
                    setInitialData(data)
                } else {
                    toast.error("Colaborador no encontrado")
                    router.push('/payroll/employees')
                }
            } catch (error) {
                console.error("Error loading employee:", error)
                toast.error("Error cargando datos del colaborador")
            } finally {
                setFetching(false)
            }
        }
        loadEmployee()
    }, [employeeId, router, supabase])

    const handleSubmit = async (data: Employee) => {
        setIsLoading(true)
        try {
            await employeeService.updateEmployee(supabase, employeeId, data)
            toast.success("¡Datos actualizados con éxito!")
            router.push('/payroll/employees')
            router.refresh()
        } catch (error: any) {
            console.error("Error updating employee:", error);
            toast.error(error.message || "No se pudo actualizar al colaborador.")
        } finally {
            setIsLoading(false)
        }
    }

    if (fetching) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
        )
    }

    if (!initialData) return null

    return (
        <EmployeeForm initialData={initialData} onSubmit={handleSubmit} isLoading={isLoading} />
    )
}
