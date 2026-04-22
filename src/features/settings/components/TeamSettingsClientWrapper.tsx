"use client"

import dynamic from "next/dynamic";
import { TeamMember, AppRole, AppModule, Zone, RolePermission, TenantInfo } from "@/features/settings/services/settingsService";

// ssr: false evita hidratación y asegura que cliente y servidor nunca difieran
const TeamSettingsForm = dynamic(
    () => import("./TeamSettingsForm").then(mod => mod.TeamSettingsForm),
    {
        ssr: false,
        loading: () => (
            <div className="flex items-center justify-center p-24">
                <div className="animate-spin h-8 w-8 border-4 border-slate-900 border-t-transparent rounded-full" />
            </div>
        )
    }
);

interface Props {
    initialMembers: TeamMember[];
    currentUserId: string;
    tenantId: string;
    tenant: TenantInfo;
    generatedBy: string;
    roles: AppRole[];
    modules: AppModule[];
    initialZones: Zone[];
    initialPermissions: RolePermission[];
}

export function TeamSettingsClientWrapper(props: Props) {
    return <TeamSettingsForm {...props} />;
}
