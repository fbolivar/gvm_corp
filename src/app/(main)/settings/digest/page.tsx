import { createClient } from "@/lib/supabase/server";
import { DigestSettingsForm } from "@/features/settings/components/DigestSettingsForm";
import { redirect } from "next/navigation";

export default async function DigestPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const digestPrefs = user.user_metadata?.digest_preferences;

    return (
        <div className="p-8 lg:p-12">
            <DigestSettingsForm initialPrefs={digestPrefs} />
        </div>
    );
}
