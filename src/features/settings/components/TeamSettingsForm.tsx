"use client";

import { useState, useCallback } from "react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { toast } from "sonner";
import {
    Users,
    UserPlus,
    Shield,
    ShieldCheck,
    Eye,
    MoreVertical,
    Mail,
    Trash2,
    Crown,
    User
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { settingsService, TeamMember } from "../services/settingsService";

interface Props {
    initialMembers: TeamMember[];
    currentUserId: string;
    tenantId: string;
}

const ROLE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
    admin: { label: "Admin", icon: Crown, color: "text-amber-600", bg: "bg-amber-50" },
    editor: { label: "Editor", icon: ShieldCheck, color: "text-blue-600", bg: "bg-blue-50" },
    viewer: { label: "Visor", icon: Eye, color: "text-slate-500", bg: "bg-slate-100" }
};

export function TeamSettingsForm({ initialMembers, currentUserId, tenantId }: Props) {
    const [members, setMembers] = useState<TeamMember[]>(initialMembers);
    const [addEmail, setAddEmail] = useState("");
    const [addRole, setAddRole] = useState("viewer");
    const [addLoading, setAddLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [openMenu, setOpenMenu] = useState<string | null>(null);

    const supabase = createClient();

    const refreshMembers = useCallback(async () => {
        try {
            const { data } = await supabase
                .rpc('get_team_members', { p_tenant_id: tenantId });
            if (data) setMembers(data);
        } catch {
            // Silent fail on refresh
        }
    }, [supabase, tenantId]);

    async function handleAddMember() {
        if (!addEmail.trim()) {
            toast.error("Ingresa un correo electrónico");
            return;
        }

        setAddLoading(true);
        try {
            await settingsService.addExistingUserToTeam(supabase, addEmail.trim(), addRole);
            toast.success(`${addEmail} agregado al equipo como ${ROLE_CONFIG[addRole]?.label || addRole}`);
            setAddEmail("");
            setAddRole("viewer");
            await refreshMembers();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Error desconocido";
            toast.error(message);
        } finally {
            setAddLoading(false);
        }
    }

    async function handleChangeRole(memberId: string, newRole: string) {
        setActionLoading(memberId);
        try {
            await settingsService.updateTeamMemberRole(supabase, memberId, newRole);
            toast.success("Rol actualizado correctamente");
            await refreshMembers();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Error desconocido";
            toast.error("Error al cambiar rol: " + message);
        } finally {
            setActionLoading(null);
            setOpenMenu(null);
        }
    }

    async function handleRemoveMember(memberId: string, memberEmail: string) {
        if (!confirm(`¿Estás seguro de que deseas remover a ${memberEmail} del equipo?`)) return;

        setActionLoading(memberId);
        try {
            await settingsService.removeTeamMember(supabase, memberId);
            toast.success(`${memberEmail} removido del equipo`);
            await refreshMembers();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Error desconocido";
            toast.error("Error al remover: " + message);
        } finally {
            setActionLoading(null);
        }
    }

    const isCurrentUserAdmin = members.some(m => m.user_id === currentUserId && m.role === "admin");

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="px-4 md:px-0">
                <h2 className="text-3xl md:text-4xl font-black tracking-tighter text-slate-900 italic leading-none">Gestión de Equipo</h2>
                <p className="text-slate-400 font-bold text-[10px] md:text-xs uppercase tracking-widest mt-1 leading-none">
                    Administra los miembros de tu organización
                </p>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 px-4 md:px-0">
                {[
                    { label: "Total Miembros", value: members.length, icon: Users, color: "text-indigo-600", bg: "bg-indigo-50" },
                    { label: "Administradores", value: members.filter(m => m.role === "admin").length, icon: Crown, color: "text-amber-600", bg: "bg-amber-50" },
                    { label: "Activos", value: members.filter(m => m.status === "active").length, icon: ShieldCheck, color: "text-emerald-600", bg: "bg-emerald-50" }
                ].map(stat => (
                    <Card key={stat.label} className="border-none bg-white shadow-premium rounded-[2rem] overflow-hidden">
                        <CardContent className="p-6 flex items-center gap-4">
                            <div className={`h-12 w-12 rounded-2xl ${stat.bg} flex items-center justify-center shrink-0`}>
                                <stat.icon className={`h-6 w-6 ${stat.color}`} />
                            </div>
                            <div>
                                <p className="text-2xl font-black text-slate-900">{stat.value}</p>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Add Member Card */}
            {isCurrentUserAdmin && (
                <Card className="border-none bg-white shadow-premium rounded-[2.5rem] overflow-hidden">
                    <CardHeader className="p-8 pb-4">
                        <CardTitle className="text-lg font-black text-slate-900 flex items-center gap-3 italic">
                            <UserPlus className="h-5 w-5 text-primary" />
                            Agregar Miembro
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 md:p-8 pt-0">
                        <div className="flex flex-col md:flex-row items-stretch md:items-end gap-6 md:gap-4">
                            <div className="flex-1 space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Correo electrónico
                                </Label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
                                    <Input
                                        value={addEmail}
                                        onChange={(e) => setAddEmail(e.target.value)}
                                        placeholder="usuario@empresa.com"
                                        className="h-14 bg-slate-50 border-none rounded-2xl font-bold pl-12 text-base"
                                        onKeyDown={(e) => e.key === "Enter" && handleAddMember()}
                                    />
                                </div>
                            </div>
                            <div className="w-full md:w-44 space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Rol
                                </Label>
                                <select
                                    value={addRole}
                                    onChange={(e) => setAddRole(e.target.value)}
                                    className="h-14 w-full bg-slate-50 border-none rounded-2xl font-black text-xs px-4 text-slate-700 focus:ring-2 focus:ring-primary/20 outline-none appearance-none cursor-pointer"
                                >
                                    <option value="admin">ADMIN</option>
                                    <option value="editor">EDITOR</option>
                                    <option value="viewer">VISOR</option>
                                </select>
                            </div>
                            <Button
                                onClick={handleAddMember}
                                disabled={addLoading}
                                className="h-14 px-10 rounded-2xl bg-slate-900 hover:bg-primary text-white font-black shadow-active transition-all active:scale-95 whitespace-nowrap"
                            >
                                {addLoading ? "..." : (
                                    <span className="flex items-center gap-2">
                                        <UserPlus className="h-5 w-5" />
                                        AGREGAR
                                    </span>
                                )}
                            </Button>
                        </div>
                        <p className="text-xs text-slate-400 mt-4 font-medium">
                            El usuario debe estar registrado previamente en la plataforma para poder ser agregado al equipo.
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Members List */}
            <Card className="border-none bg-white shadow-premium rounded-[2.5rem] overflow-hidden">
                <CardHeader className="p-8 pb-4">
                    <CardTitle className="text-lg font-black text-slate-900 flex items-center gap-3 italic">
                        <Users className="h-5 w-5 text-indigo-500" />
                        Miembros del Equipo
                        <Badge className="ml-2 text-[10px] font-black bg-indigo-50 text-indigo-600 border-none rounded-full px-3">
                            {members.length}
                        </Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-8 pt-0">
                    <div className="space-y-3">
                        {members.map((member) => {
                            const roleConfig = ROLE_CONFIG[member.role] || ROLE_CONFIG.viewer;
                            const RoleIcon = roleConfig.icon;
                            const isCurrentUser = member.user_id === currentUserId;
                            const isLoading = actionLoading === member.id;

                            return (
                                <div
                                    key={member.id}
                                    className="flex flex-col md:flex-row md:items-center justify-between p-6 rounded-[2.5rem] bg-slate-50 hover:bg-slate-100/80 transition-all group gap-6"
                                >
                                    <div className="flex items-center gap-4">
                                        {/* Avatar */}
                                        <div className="h-14 w-14 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center shrink-0 relative">
                                            <User className="h-7 w-7 text-slate-400" />
                                            {isCurrentUser && (
                                                <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-emerald-500 border-4 border-white" />
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="font-black text-slate-900 italic tracking-tight truncate">
                                                    {member.full_name || "Sin nombre"}
                                                </p>
                                                {isCurrentUser && (
                                                    <Badge className="text-[8px] font-black bg-emerald-500 text-white border-none rounded-full px-2">
                                                        MI CUENTA
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-xs font-medium text-slate-400 truncate">{member.email}</p>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center justify-between md:justify-end gap-3 pt-4 md:pt-0 border-t md:border-t-0 border-slate-100">
                                        {/* Role Badge */}
                                        <Badge className={`text-[10px] font-black ${roleConfig.bg} ${roleConfig.color} border-none rounded-full px-3 py-1 flex items-center gap-1.5`}>
                                            <RoleIcon className="h-3 w-3" />
                                            {roleConfig.label}
                                        </Badge>

                                        {/* Status */}
                                        <Badge className={`text-[8px] font-black border-none rounded-full px-2 py-0.5 ${member.status === "active"
                                            ? "bg-emerald-50 text-emerald-600"
                                            : "bg-slate-100 text-slate-400"
                                            }`}>
                                            {member.status === "active" ? "ACTIVO" : member.status === "invited" ? "INVITADO" : member.status?.toUpperCase()}
                                        </Badge>

                                        {/* Actions */}
                                        {isCurrentUserAdmin && !isCurrentUser && (
                                            <div className="relative">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={() => setOpenMenu(openMenu === member.id ? null : member.id)}
                                                    disabled={isLoading}
                                                >
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>

                                                {openMenu === member.id && (
                                                    <div className="absolute right-0 top-10 z-50 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                                        <p className="px-4 py-1 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                            Cambiar Rol
                                                        </p>
                                                        {Object.entries(ROLE_CONFIG).map(([role, config]) => (
                                                            <button
                                                                key={role}
                                                                onClick={() => handleChangeRole(member.id, role)}
                                                                className={`w-full px-4 py-2 text-left text-sm font-bold hover:bg-slate-50 flex items-center gap-2 transition-colors ${member.role === role ? "text-primary" : "text-slate-600"
                                                                    }`}
                                                            >
                                                                <config.icon className="h-4 w-4" />
                                                                {config.label}
                                                                {member.role === role && (
                                                                    <Shield className="h-3 w-3 ml-auto text-primary" />
                                                                )}
                                                            </button>
                                                        ))}
                                                        <div className="h-px bg-slate-100 my-1" />
                                                        <button
                                                            onClick={() => handleRemoveMember(member.id, member.email)}
                                                            className="w-full px-4 py-2 text-left text-sm font-bold text-rose-500 hover:bg-rose-50 flex items-center gap-2 transition-colors"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                            Remover del equipo
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {members.length === 0 && (
                            <div className="text-center py-12">
                                <Users className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                                <p className="font-black text-slate-300 italic">No hay miembros en el equipo</p>
                                <p className="text-xs text-slate-300 mt-1">Agrega el primer miembro usando el formulario de arriba.</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
