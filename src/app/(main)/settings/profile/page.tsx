import { createClient } from "@/lib/supabase/server";
import { settingsService } from "@/features/settings/services/settingsService";
import { ProfileSettingsForm } from "@/features/settings/components/ProfileSettingsForm";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
    const supabase = await createClient();
    const userProfile = await settingsService.getUserProfile(supabase);

    if (!userProfile) {
        redirect("/login");
    }

    return (
        <div className="p-8 lg:p-12">
            <ProfileSettingsForm initialData={userProfile} />
        </div>
    );
}
