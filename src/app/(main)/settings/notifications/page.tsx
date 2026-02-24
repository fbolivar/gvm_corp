import { createClient } from "@/lib/supabase/server";
import { settingsService } from "@/features/settings/services/settingsService";
import { NotificationSettingsForm } from "@/features/settings/components/NotificationSettingsForm";
import { redirect } from "next/navigation";

export default async function NotificationsPage() {
    const supabase = await createClient();
    const userProfile = await settingsService.getUserProfile(supabase);

    if (!userProfile) {
        redirect("/login");
    }

    return (
        <div className="p-8 lg:p-12">
            <NotificationSettingsForm initialData={userProfile} />
        </div>
    );
}
