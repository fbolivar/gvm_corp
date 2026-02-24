import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { PayrollDispersionHub } from "@/features/payroll/components/PayrollDispersionHub"

export default async function PayrollDispersionPage() {
    const supabase = await createClient()

    // Auth Check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect('/login')
    }

    return (
        <div className="container mx-auto py-12 px-4">
            <PayrollDispersionHub />
        </div>
    )
}
