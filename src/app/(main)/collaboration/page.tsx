import { ChatInterface, type DirectoryMember } from "@/features/collaboration/components/ChatInterface";
import { MessagesSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = { title: "Colaboración — GVM Corp" };

interface TeamMemberRow {
    user_id: string;
    full_name: string | null;
    email: string | null;
    role_name: string | null;
    role: string | null;
    status: string | null;
}

export default async function CollaborationPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const [{ data: profile }, { data: userTenant }] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
        supabase.from("user_tenants").select("tenant_id").eq("user_id", user.id).maybeSingle(),
    ]);

    const tenantId = userTenant?.tenant_id;
    if (!tenantId) redirect("/login");

    const userFullName =
        profile?.full_name ||
        user.user_metadata?.full_name ||
        user.email?.split("@")[0] ||
        "Usuario";

    // Directorio de la empresa (todos los usuarios con su rol)
    const { data: teamRows } = await supabase.rpc("get_team_members", { p_tenant_id: tenantId });
    const members: DirectoryMember[] = ((teamRows ?? []) as TeamMemberRow[])
        .filter((m) => m.status !== "inactive" && !!m.user_id)
        .map((m) => ({
            user_id: m.user_id,
            full_name: m.full_name || m.email?.split("@")[0] || "Usuario",
            role: m.role_name || m.role || null,
            email: m.email,
        }));

    return (
        <div className="page-container">
            <div className="space-y-5 pb-10 animate-in fade-in duration-500">
                {/* Header limpio */}
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-sm shrink-0">
                        <MessagesSquare className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">Colaboración</h1>
                        <p className="text-sm text-slate-500">
                            Chat del equipo en tiempo real · mensajes directos y canales
                        </p>
                    </div>
                </div>

                <ChatInterface
                    userId={user.id}
                    userFullName={userFullName}
                    tenantId={tenantId}
                    members={members}
                />
            </div>
        </div>
    );
}
