import { SecuritySettingsForm } from "@/features/settings/components/SecuritySettingsForm";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function SecurityPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");
    return (
        <div className="p-8 lg:p-12">
            <SecuritySettingsForm />
        </div>
    );
}
