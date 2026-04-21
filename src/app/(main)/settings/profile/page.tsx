import { createClient } from "@/lib/supabase/server";
import { settingsService } from "@/features/settings/services/settingsService";
import { ProfileSettingsForm } from "@/features/settings/components/ProfileSettingsForm";
import { SignatureUploadCard } from "@/features/settings/components/SignatureUploadCard";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
    const supabase = await createClient();
    const userProfile = await settingsService.getUserProfile(supabase);

    if (!userProfile) {
        redirect("/login");
    }

    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = user
        ? await supabase.from("profiles").select("signature_url, commercial_code").eq("id", user.id).maybeSingle()
        : { data: null };

    return (
        <div className="p-8 lg:p-12">
            <ProfileSettingsForm initialData={userProfile} />
            {user && (
                <SignatureUploadCard
                    userId={user.id}
                    initialSignatureUrl={profile?.signature_url || null}
                    initialCommercialCode={profile?.commercial_code || null}
                />
            )}
        </div>
    );
}
