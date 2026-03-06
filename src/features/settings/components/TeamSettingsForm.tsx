"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/shared/lib/utils";
import {
    Users,
    UserPlus,
    Shield,
    ShieldCheck,
    ShieldAlert,
    Eye,
    EyeOff,
    MoreVertical,
    Mail,
    Trash2,
    KeyRound,
    Crown,
    User,
    Table,
    MapPin,
    RotateCcw,
    Check,
    X,
    Search,
    LayoutGrid,
    Calculator,
    Package,
    Truck,
    Zap,
    ShoppingCart,
    Banknote,
    Factory,
    Wallet,
    History,
    FileCheck,
    FileText,
    BarChart3,
    Settings as SettingsIcon,
    ShoppingBag,
    Briefcase
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { settingsService, TeamMember, AppRole, AppModule, RolePermission, Zone } from "../services/settingsService";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { ScrollArea } from "@/shared/components/ui/scroll-area";

interface Props {
    initialMembers: TeamMember[];
    currentUserId: string;
    tenantId: string;
    roles: AppRole[];
    modules: AppModule[];
    initialZones: Zone[];
    initialPermissions: RolePermission[];
}

const MOD_ICONS: Record<string, any> = {
    dashboard: LayoutGrid,
    accounting: Calculator,
    inventory: Package,
    logistics: Truck,
    crm: Users,
    sales: ShoppingBag,
    purchasing: ShoppingCart,
    payroll: Banknote,
    production: Factory,
    treasury: Wallet,
    training: Users,
    contracts: FileText,
    dian: FileCheck,
    support: Users,
    documents: FileText,
    analytics: BarChart3,
    settings: SettingsIcon
};

const ROLE_FALLBACK = { label: "Personal", icon: Shield, color: "text-slate-500", bg: "bg-slate-100" };
const ROLE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
    admin: { label: "Admin", icon: Crown, color: "text-amber-600", bg: "bg-amber-50" },
    super_admin: { label: "Super Admin", icon: ShieldCheck, color: "text-rose-600", bg: "bg-rose-50" },
    SUPER_ADMINISTRADOR: { label: "Super Admin", icon: ShieldCheck, color: "text-rose-600", bg: "bg-rose-50" },
    ADMINISTRADOR: { label: "Admin", icon: Crown, color: "text-amber-600", bg: "bg-amber-50" }
};

export function TeamSettingsForm({ initialMembers, currentUserId, tenantId, roles, modules, initialZones, initialPermissions }: Props) {
    const [members, setMembers] = useState<TeamMember[]>(initialMembers);
    const [zones, setZones] = useState<Zone[]>(initialZones);
    const [permissions, setPermissions] = useState<RolePermission[]>(initialPermissions);
    const [addFullName, setAddFullName] = useState("");
    const [addEmail, setAddEmail] = useState("");
    const [addPassword, setAddPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [addRole, setAddRole] = useState(roles[0]?.id || "");
    const [activeTab, setActiveTab] = useState("members");
    const [addLoading, setAddLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [openMenu, setOpenMenu] = useState<string | null>(null);
    const [newZoneName, setNewZoneName] = useState("");
    const [addZone, setAddZone] = useState("");
    const [moduleFilter, setModuleFilter] = useState("");
    const [roleFilter, setRoleFilter] = useState("");
    const [passwordModal, setPasswordModal] = useState<{ userId: string; email: string } | null>(null);
    const [newPassword, setNewPassword] = useState("");
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [passwordLoading, setPasswordLoading] = useState(false);

    const supabase = createClient();
    const router = useRouter();

    const refreshMembers = useCallback(async () => {
        const { data, error } = await supabase
            .rpc('get_team_members', { p_tenant_id: tenantId });
        if (error) {
            console.error('[refreshMembers] RPC error:', error.message);
            // Fallback: full page reload to show updated data
            router.refresh();
            return;
        }
        setMembers(data || []);
    }, [supabase, tenantId, router]);

    async function handleAddMember() {
        if (!addEmail.trim()) {
            toast.error("Ingresa un correo electrónico");
            return;
        }

        setAddLoading(true);
        try {
            const roleName = roles.find(r => r.id === addRole)?.name || addRole;

            // Llamada a la API Route privilegiada (usa Service Role Key server-side)
            const res = await fetch('/api/team/members', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: addEmail.trim(),
                    password: addPassword.trim() || undefined,
                    fullName: addFullName.trim() || undefined,
                    role: roleName,
                    zoneId: addZone || null,
                })
            });

            const result = await res.json();

            if (!res.ok) {
                throw new Error(result.error || 'Error desconocido');
            }

            toast.success(result.message || `${addEmail} vinculado correctamente`);
            setAddFullName("");
            setAddEmail("");
            setAddPassword("");
            setAddRole(roles[0]?.id || "");
            setAddZone("");
            await refreshMembers();
            // Belt-and-suspenders: also refresh server data so a page reload shows updated list
            router.refresh();
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
            toast.success("Rol actualizado");
            await refreshMembers();
        } catch (error: unknown) {
            toast.error("Error al cambiar rol");
        } finally {
            setActionLoading(null);
        }
    }

    async function handleChangeZone(memberId: string, newZoneId: string) {
        setActionLoading(memberId);
        try {
            await settingsService.updateTeamMemberZone(supabase, memberId, newZoneId || null);
            toast.success("Zona actualizada");
            await refreshMembers();
        } catch (error: unknown) {
            toast.error("Error al cambiar zona");
        } finally {
            setActionLoading(null);
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

    async function handleChangePassword() {
        if (!passwordModal || newPassword.length < 6) {
            toast.error("La contraseña debe tener al menos 6 caracteres");
            return;
        }
        setPasswordLoading(true);
        try {
            const res = await fetch('/api/team/members', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: passwordModal.userId, newPassword }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error desconocido');
            toast.success(`Contraseña de ${passwordModal.email} actualizada`);
            setPasswordModal(null);
            setNewPassword("");
            setShowNewPassword(false);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Error desconocido";
            toast.error("Error: " + message);
        } finally {
            setPasswordLoading(false);
        }
    }

    async function handleAddZone() {
        if (!newZoneName.trim()) return;
        try {
            const zone = await settingsService.createZone(supabase, tenantId, newZoneName.trim());
            setZones([...zones, zone]);
            setNewZoneName("");
            toast.success("Zona creada");
        } catch (error: any) {
            toast.error(error.message);
        }
    }

    async function handleDeleteZone(id: string) {
        try {
            await settingsService.deleteZone(supabase, id);
            setZones(zones.filter(z => z.id !== id));
            toast.success("Zona eliminada");
        } catch (error: any) {
            toast.error(error.message);
        }
    }

    async function handleTogglePermission(roleId: string, moduleKey: string, current: boolean) {
        const newValue = !current;
        // Actualización optimista inmediata (UI responde al instante)
        setPermissions(prev => {
            const filtered = prev.filter(p => !(p.role_id === roleId && p.module_key === moduleKey));
            return [...filtered, { role_id: roleId, module_key: moduleKey, can_view: newValue, can_edit: newValue }];
        });
        try {
            await settingsService.updateRolePermission(supabase, roleId, moduleKey, newValue);
            toast.success(newValue ? "✅ Módulo habilitado" : "🔒 Módulo desactivado");
        } catch (error: any) {
            // Rollback si falla
            setPermissions(prev => {
                const filtered = prev.filter(p => !(p.role_id === roleId && p.module_key === moduleKey));
                return [...filtered, { role_id: roleId, module_key: moduleKey, can_view: current, can_edit: current }];
            });
            toast.error("Error al actualizar: " + error.message);
        }
    }

    async function handleBulkToggleRole(roleId: string, roleName: string, enableAll: boolean) {
        // Snapshot para rollback
        const snapshot = permissions.slice();
        // Actualización optimista de TODOS los módulos del rol
        setPermissions(prev => {
            const filtered = prev.filter(p => p.role_id !== roleId);
            const newPerms = modules.map(m => ({ role_id: roleId, module_key: m.key, can_view: enableAll, can_edit: enableAll }));
            return [...filtered, ...newPerms];
        });
        try {
            await Promise.all(modules.map(m => settingsService.updateRolePermission(supabase, roleId, m.key, enableAll)));
            toast.success(enableAll ? `✅ ${roleName}: todos los módulos habilitados` : `🔒 ${roleName}: todos los módulos desactivados`);
        } catch (error: any) {
            // Rollback completo
            setPermissions(snapshot);
            toast.error("Error en sincronización masiva: " + error.message);
        }
    }

    const ADMIN_ROLES = ["admin", "owner", "ADMINISTRADOR", "SUPER ADMINISTRADOR", "Administrador", "Propietario"];
    const isCurrentUserAdmin = members.some(m => m.user_id === currentUserId && ADMIN_ROLES.includes(m.role));

    return (
        <div className="max-w-7xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {/* Header Enhanced */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4 md:px-0">
                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-2 bg-indigo-500 rounded-full" />
                        <h2 className="text-3xl font-black tracking-tight text-slate-900 uppercase leading-tight">Gestión de Equipo</h2>
                    </div>
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.3em] leading-none ml-6">
                        Administración de Roles, Permisos y Zonas Geográficas
                    </p>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-10">
                <div className="px-4 md:px-0">
                    <TabsList className="bg-slate-100/50 p-1.5 rounded-[2rem] h-auto flex flex-wrap gap-2 w-fit">
                        <TabsTrigger value="members" className="rounded-[1.5rem] px-8 py-3 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all">
                            <Users className="h-4 w-4 mr-2" />
                            Miembros
                        </TabsTrigger>
                        <TabsTrigger value="permissions" className="rounded-[1.5rem] px-8 py-3 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all">
                            <ShieldCheck className="h-4 w-4 mr-2" />
                            Seguridad & Gobernanza
                        </TabsTrigger>
                        <TabsTrigger value="zones" className="rounded-[1.5rem] px-8 py-3 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all">
                            <MapPin className="h-4 w-4 mr-2" />
                            Zonas del País
                        </TabsTrigger>
                    </TabsList>
                </div>

                {/* TAB: MEMBERS */}
                <TabsContent value="members" className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500 outline-none">
                    {/* Stats Bar */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 px-4 md:px-0">
                        {[
                            { label: "Total Miembros", value: members.length, icon: Users, color: "text-indigo-600", bg: "bg-indigo-50" },
                            { label: "Roles Activos", value: roles.length, icon: Shield, color: "text-rose-600", bg: "bg-rose-50" },
                            { label: "Zonas Config", value: zones.length, icon: MapPin, color: "text-emerald-600", bg: "bg-emerald-50" }
                        ].map(stat => (
                            <Card key={stat.label} className="border-none bg-white shadow-premium rounded-[2.5rem] overflow-hidden group hover:scale-[1.02] transition-all duration-500">
                                <CardContent className="p-8 flex items-center gap-6">
                                    <div className={`h-16 w-16 rounded-[1.5rem] ${stat.bg} flex items-center justify-center shrink-0 group-hover:rotate-6 transition-all`}>
                                        <stat.icon className={`h-8 w-8 ${stat.color}`} />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-black text-slate-900 tracking-tight">{stat.value}</p>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">{stat.label}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Add Member Card */}
                    {isCurrentUserAdmin && (
                        <Card className="border-none bg-white shadow-premium rounded-[2.5rem] overflow-hidden mx-4 md:mx-0 border-t-4 border-indigo-500">
                            <CardHeader className="p-8 pb-0">
                                <div className="flex items-center justify-between flex-wrap gap-4">
                                    <CardTitle className="text-xl font-black text-slate-900 flex items-center gap-4 uppercase tracking-tight">
                                        <div className="h-10 w-10 rounded-xl bg-violet-600 flex items-center justify-center shrink-0">
                                            <UserPlus className="h-5 w-5 text-white" />
                                        </div>
                                        Vincular Miembro al Equipo
                                    </CardTitle>
                                    <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400 bg-slate-50 px-4 py-2 rounded-full">
                                        Usuario nuevo → se crea automáticamente
                                    </span>
                                </div>
                            </CardHeader>

                            <CardContent className="p-8 pt-6">
                                <div className="space-y-4">

                                    {/* Nombres y Apellidos */}
                                    <div className="space-y-2">
                                        <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 block">
                                            Nombres y Apellidos
                                        </Label>
                                        <div className="relative">
                                            <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                                            <Input
                                                id="member-fullname"
                                                type="text"
                                                value={addFullName}
                                                onChange={(e) => setAddFullName(e.target.value)}
                                                placeholder="Nombre completo del miembro"
                                                className="h-14 bg-slate-50 border-none rounded-2xl font-medium pl-11 text-sm focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                                onKeyDown={(e) => e.key === "Enter" && handleAddMember()}
                                            />
                                        </div>
                                    </div>

                                    {/* Fila 1: Email + Contraseña */}
                                    <div className="grid grid-cols-2 gap-4">
                                        {/* Email */}
                                        <div className="space-y-2">
                                            <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 block">
                                                Correo Electrónico
                                            </Label>
                                            <div className="relative">
                                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                                                <Input
                                                    id="member-email"
                                                    type="email"
                                                    value={addEmail}
                                                    onChange={(e) => setAddEmail(e.target.value)}
                                                    placeholder="usuario@empresa.com"
                                                    className="h-14 bg-slate-50 border-none rounded-2xl font-medium pl-11 text-sm focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                                    onKeyDown={(e) => e.key === "Enter" && handleAddMember()}
                                                />
                                            </div>
                                        </div>

                                        {/* Contraseña */}
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 h-4">
                                                <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                                                    Contraseña
                                                </Label>
                                                {addPassword.length === 0 && (
                                                    <span className="text-[8px] font-semibold text-slate-300 uppercase tracking-wider">opcional</span>
                                                )}
                                                {addPassword.length > 0 && addPassword.length < 8 && (
                                                    <span className="text-[8px] font-black bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full uppercase tracking-widest">{8 - addPassword.length} más</span>
                                                )}
                                                {addPassword.length >= 8 && (
                                                    <span className="text-[8px] font-black bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full uppercase tracking-widest">✓ válida</span>
                                                )}
                                            </div>
                                            <div className="relative">
                                                <Shield className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                                                <Input
                                                    id="member-password"
                                                    type={showPassword ? "text" : "password"}
                                                    value={addPassword}
                                                    onChange={(e) => setAddPassword(e.target.value)}
                                                    placeholder="Mín. 8 caracteres"
                                                    className="h-14 bg-slate-50 border-none rounded-2xl font-medium pl-11 pr-11 text-sm focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                                    onKeyDown={(e) => e.key === "Enter" && handleAddMember()}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600 transition-colors"
                                                >
                                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Fila 2: Rol + Zona */}
                                    <div className="grid grid-cols-2 gap-4">
                                        {/* Rol */}
                                        <div className="space-y-2">
                                            <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 block">
                                                Cargo / Perfil de Rol
                                            </Label>
                                            <div className="relative">
                                                <select
                                                    id="member-role"
                                                    value={addRole}
                                                    onChange={(e) => setAddRole(e.target.value)}
                                                    className="h-14 w-full bg-slate-50 border-none rounded-2xl font-black text-[10px] pl-4 pr-10 text-slate-700 focus:ring-4 focus:ring-indigo-500/10 outline-none appearance-none cursor-pointer uppercase tracking-widest"
                                                >
                                                    {roles.map(r => (
                                                        <option key={r.id} value={r.id}>{r.name}</option>
                                                    ))}
                                                </select>
                                                <Shield className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 pointer-events-none" />
                                            </div>
                                        </div>

                                        {/* Zona */}
                                        <div className="space-y-2">
                                            <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 block">
                                                Asignar Zona
                                            </Label>
                                            <div className="relative">
                                                <select
                                                    id="member-zone"
                                                    value={addZone}
                                                    onChange={(e) => setAddZone(e.target.value)}
                                                    className="h-14 w-full bg-slate-50 border-none rounded-2xl font-black text-[10px] pl-4 pr-10 text-slate-700 focus:ring-4 focus:ring-indigo-500/10 outline-none appearance-none cursor-pointer uppercase tracking-widest"
                                                >
                                                    <option value="">Sin zona</option>
                                                    {zones.map(z => (
                                                        <option key={z.id} value={z.id}>{z.name}</option>
                                                    ))}
                                                </select>
                                                <MapPin className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 pointer-events-none" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Fila 3: Botón */}
                                    <Button
                                        id="btn-vincular-miembro"
                                        onClick={handleAddMember}
                                        disabled={addLoading || !addEmail.trim()}
                                        className="w-full h-14 rounded-2xl bg-slate-900 hover:bg-indigo-600 text-white font-black shadow-lg transition-all active:scale-[0.99] text-[11px] tracking-[0.25em] uppercase disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                                    >
                                        {addLoading ? (
                                            <>
                                                <RotateCcw className="h-4 w-4 animate-spin" />
                                                Procesando...
                                            </>
                                        ) : (
                                            <>
                                                <UserPlus className="h-4 w-4" />
                                                Vincular Miembro al Equipo
                                            </>
                                        )}
                                    </Button>

                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Members Table-like List */}
                    <Card className="border-none bg-white shadow-premium rounded-[2.5rem] overflow-hidden mx-4 md:mx-0">
                        <CardHeader className="p-10 pb-4 flex flex-row items-center justify-between">
                            <CardTitle className="text-xl font-black text-slate-900 flex items-center gap-4 uppercase tracking-tight">
                                <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center">
                                    <Users className="h-5 w-5 text-white" />
                                </div>
                                Nómina de Personal Activo
                                <Badge className="ml-4 text-[10px] font-black bg-slate-100 text-slate-600 border-none rounded-full px-4 py-1.5 uppercase tracking-widest">
                                    {members.length} REGISTROS
                                </Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-10 pt-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-separate border-spacing-y-4">
                                    <thead>
                                        <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                                            <th className="px-6 pb-2">Colaborador</th>
                                            <th className="px-6 pb-2">Perfil de Cargo</th>
                                            <th className="px-6 pb-2">Ubicación / Zona</th>
                                            <th className="px-6 pb-2 text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="space-y-4">
                                        {members.map((member) => {
                                            const roleCfg = ROLE_CONFIG[member.role] || ROLE_FALLBACK;
                                            const RoleIcon = roleCfg.icon;
                                            const isCurrentUser = member.user_id === currentUserId;
                                            const isLoading = actionLoading === member.id;

                                            return (
                                                <tr key={member.id} className="group bg-slate-50/50 hover:bg-slate-100 transition-all">
                                                    <td className="px-6 py-5 first:rounded-l-[2rem]">
                                                        <div className="flex items-center gap-4">
                                                            <div className="h-14 w-14 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center shrink-0 relative">
                                                                <User className="h-7 w-7 text-slate-300" />
                                                                {isCurrentUser && (
                                                                    <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-emerald-500 border-4 border-white shadow-sm" />
                                                                )}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="font-black text-slate-900 italic tracking-tight truncate uppercase text-sm">
                                                                    {member.full_name || "SIN NOMBRE"}
                                                                </p>
                                                                <p className="text-[10px] font-bold text-slate-400 truncate tracking-widest">{member.email}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        {isCurrentUserAdmin && !isCurrentUser ? (
                                                            <div className="relative">
                                                                <select
                                                                    disabled={isLoading}
                                                                    value={roles.find(r => r.name === member.role)?.id || ""}
                                                                    onChange={(e) => {
                                                                        const selectedRole = roles.find(r => r.id === e.target.value);
                                                                        if (selectedRole) handleChangeRole(member.id, selectedRole.name);
                                                                    }}
                                                                    className="h-10 w-full bg-slate-100 border-none rounded-xl font-black text-[9px] px-4 text-slate-700 outline-none appearance-none cursor-pointer uppercase tracking-widest hover:bg-slate-200 transition-all"
                                                                >
                                                                    {roles.map(r => (
                                                                        <option key={r.id} value={r.id}>{r.name}</option>
                                                                    ))}
                                                                </select>
                                                                <Shield className="absolute right-3 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-300 pointer-events-none" />
                                                            </div>
                                                        ) : (
                                                            <Badge className={cn("text-[9px] font-black border-none rounded-full px-4 py-1.5 flex items-center gap-2 w-fit uppercase tracking-widest", roleCfg.bg, roleCfg.color)}>
                                                                <RoleIcon className="h-3 w-3" />
                                                                {member.role || "USUARIO"}
                                                            </Badge>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        {isCurrentUserAdmin && !isCurrentUser ? (
                                                            <div className="relative">
                                                                <select
                                                                    disabled={isLoading}
                                                                    value={member.zone_id || ""}
                                                                    onChange={(e) => handleChangeZone(member.id, e.target.value)}
                                                                    className="h-10 w-full bg-slate-100 border-none rounded-xl font-black text-[9px] px-4 text-slate-700 outline-none appearance-none cursor-pointer uppercase tracking-widest hover:bg-slate-200 transition-all"
                                                                >
                                                                    <option value="">SIN ZONA</option>
                                                                    {zones.map(z => (
                                                                        <option key={z.id} value={z.id}>{z.name}</option>
                                                                    ))}
                                                                </select>
                                                                <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-300 pointer-events-none" />
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-2 text-slate-500">
                                                                <MapPin className="h-3.5 w-3.5" />
                                                                <span className="text-[10px] font-black uppercase tracking-widest italic">{member.zone_name || "SIN ASIGNAR"}</span>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-5 last:rounded-r-[2rem] text-right">
                                                        {isCurrentUserAdmin && !isCurrentUser ? (
                                                            <div className="relative inline-block">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-10 w-10 rounded-xl hover:bg-white hover:shadow-sm"
                                                                    onClick={() => setOpenMenu(openMenu === member.id ? null : member.id)}
                                                                    disabled={isLoading}
                                                                >
                                                                    <MoreVertical className="h-5 w-5 text-slate-400" />
                                                                </Button>
                                                                {openMenu === member.id && (
                                                                    <div className="absolute right-0 top-12 z-50 w-64 bg-white rounded-[1.5rem] shadow-2xl border border-slate-100 py-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                                                        <p className="px-5 py-2 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50 mb-2">Acciones de Sistema</p>
                                                                        <a
                                                                            href={`/payroll/employees/new?userId=${member.user_id}&name=${encodeURIComponent(member.full_name || '')}&email=${encodeURIComponent(member.email)}`}
                                                                            className="w-full px-5 py-3 text-left text-[11px] font-black text-indigo-600 hover:bg-indigo-50 flex items-center gap-3 transition-colors uppercase tracking-widest"
                                                                            onClick={() => setOpenMenu(null)}
                                                                        >
                                                                            <Briefcase className="h-4 w-4" />
                                                                            Enrolar como Empleado
                                                                        </a>
                                                                        <button
                                                                            onClick={() => {
                                                                                setPasswordModal({ userId: member.user_id, email: member.email });
                                                                                setOpenMenu(null);
                                                                            }}
                                                                            className="w-full px-5 py-3 text-left text-[11px] font-black text-amber-600 hover:bg-amber-50 flex items-center gap-3 transition-colors uppercase tracking-widest"
                                                                        >
                                                                            <KeyRound className="h-4 w-4" />
                                                                            Cambiar Contraseña
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleRemoveMember(member.id, member.email)}
                                                                            className="w-full px-5 py-3 text-left text-[11px] font-black text-rose-500 hover:bg-rose-50 flex items-center gap-3 transition-colors uppercase tracking-widest"
                                                                        >
                                                                            <Trash2 className="h-4 w-4" />
                                                                            Dar de baja
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <Badge className="bg-slate-100 text-slate-400 border-none rounded-full text-[8px] font-black px-3 py-1">SOLO LECTURA</Badge>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB: SECURITY & GOVERNANCE MATRIX REDESIGNED */}
                <TabsContent value="permissions" className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700 outline-none">
                    <Card className="border-none bg-white shadow-premium rounded-[2.5rem] overflow-hidden border-t-4 border-slate-900">
                        <CardHeader className="p-10 pb-8 space-y-8">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                <div className="space-y-2">
                                    <CardTitle className="text-3xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white rotate-3 group-hover:rotate-0 transition-transform">
                                            <ShieldCheck className="h-6 w-6" />
                                        </div>
                                        Matriz de <span className="text-indigo-600">Gobernanza</span>
                                    </CardTitle>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] ml-16">Configuación de Capas de Acceso Industrial</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Badge className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-4 py-2 rounded-xl text-[10px] font-black italic">
                                        MOTOR DE PERMISOS v3.0
                                    </Badge>
                                    <Badge className="bg-slate-900 text-white border-none px-4 py-2 rounded-xl text-[10px] font-black">
                                        SINCRO REAL-TIME
                                    </Badge>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="relative group">
                                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="BUSCAR MÓDULO OPERATIVO..."
                                        className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl py-5 pl-14 pr-6 text-[11px] font-black uppercase tracking-widest focus:bg-white focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-600/20 transition-all outline-none"
                                        value={moduleFilter}
                                        onChange={(e) => setModuleFilter(e.target.value.toLowerCase())}
                                    />
                                </div>
                                <div className="relative group">
                                    <Users className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="FILTRAR ROLES DEFINIDOS..."
                                        className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl py-5 pl-14 pr-6 text-[11px] font-black uppercase tracking-widest focus:bg-white focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-600/20 transition-all outline-none"
                                        value={roleFilter}
                                        onChange={(e) => setRoleFilter(e.target.value.toLowerCase())}
                                    />
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent className="p-0 border-t border-slate-50">
                            <div className="relative">
                                <div className="overflow-x-auto custom-scrollbar">
                                    <table className="w-full border-separate border-spacing-0">
                                        <thead>
                                            <tr>
                                                <th className="sticky left-0 z-40 bg-white p-6 text-left border-b border-r border-slate-100 min-w-[280px] shadow-[4px_0_12px_-6px_rgba(0,0,0,0.05)]">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Estructura de</span>
                                                        <span className="text-sm font-black text-slate-900 uppercase tracking-tight">Módulos Funcionales</span>
                                                    </div>
                                                </th>
                                                {roles.filter(r => !roleFilter || r.name.toLowerCase().includes(roleFilter)).map((role) => (
                                                    <th key={role.id} className="p-4 border-b border-slate-100 min-w-[140px] bg-slate-50/30 group/th hover:bg-slate-50 transition-colors">
                                                        <div className="flex flex-col items-center gap-3">
                                                            <div className={cn(
                                                                "h-8 w-8 rounded-xl flex items-center justify-center shadow-active transition-all group-hover/th:scale-110",
                                                                role.name.includes("ADMINISTRADOR") ? "bg-slate-900 text-white" : "bg-white text-slate-400 border border-slate-100"
                                                            )}>
                                                                {role.name.includes("ADMINISTRADOR") ? <Crown className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                                                            </div>
                                                            <div className="text-center space-y-1">
                                                                <p className="text-[11px] font-black text-slate-900 uppercase tracking-widest italic">{role.name}</p>
                                                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em]">ID: {role.id.substring(0, 8)}</p>
                                                            </div>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-6 px-3 rounded-md text-[8px] font-black uppercase tracking-widest border border-slate-200 hover:bg-slate-900 hover:text-white transition-all opacity-0 group-hover/th:opacity-100"
                                                                onClick={() => {
                                                                    const hasAny = modules.some(m => permissions.some(p => p.role_id === role.id && p.module_key === m.key && p.can_view));
                                                                    handleBulkToggleRole(role.id, role.name, !hasAny);
                                                                }}
                                                            >
                                                                {modules.some(m => permissions.some(p => p.role_id === role.id && p.module_key === m.key && p.can_view))
                                                                    ? "⊘ Apagar"
                                                                    : "⊕ Encender"
                                                                }
                                                            </Button>
                                                        </div>
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {modules.filter(m => !moduleFilter || m.name.toLowerCase().includes(moduleFilter) || m.key.toLowerCase().includes(moduleFilter)).map((mod) => {
                                                const Icon = MOD_ICONS[mod.key] || LayoutGrid;
                                                return (
                                                    <tr key={mod.id} className="group/row hover:bg-slate-50/50 transition-all duration-300">
                                                        <td className="sticky left-0 z-30 bg-white p-4 border-r border-slate-50 shadow-[4px_0_12px_-6px_rgba(0,0,0,0.05)] group-hover/row:bg-slate-50 transition-colors">
                                                            <div className="flex items-center justify-between gap-4">
                                                                <div className="flex items-center gap-4">
                                                                    <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100 group-hover/row:bg-slate-900 group-hover/row:text-white shadow-sm transition-all duration-300">
                                                                        <Icon className="h-5 w-5" />
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        <span className="text-[12px] font-black uppercase tracking-tight text-slate-800 italic block leading-none">{mod.name}</span>
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest leading-none bg-slate-100 px-1.5 py-0.5 rounded-full">{permissions.filter(p => p.module_key === mod.key && p.can_view).length} ROLES ACTIVOS</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    title="Alternar todos los roles para este módulo"
                                                                    className="h-7 w-7 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 text-slate-300 opacity-0 group-hover/row:opacity-100 transition-all flex-shrink-0"
                                                                    onClick={() => {
                                                                        // Habilitar a todos si NO están todos habilitados
                                                                        const filteredRoles = roles.filter(r => !roleFilter || r.name.toLowerCase().includes(roleFilter));
                                                                        const hasAll = filteredRoles.every(r =>
                                                                            permissions.some(p => p.role_id === r.id && p.module_key === mod.key && p.can_view)
                                                                        );

                                                                        // Actualizar iterando
                                                                        filteredRoles.forEach(r => {
                                                                            const isSuperAdmin = r.name === "SUPER ADMINISTRADOR";
                                                                            if (!isSuperAdmin) {
                                                                                handleTogglePermission(r.id, mod.key, hasAll);
                                                                            }
                                                                        });
                                                                    }}
                                                                >
                                                                    <LayoutGrid className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </td>
                                                        {roles.filter(r => !roleFilter || r.name.toLowerCase().includes(roleFilter)).map((role) => {
                                                            const hasPerm = permissions.some(p => p.role_id === role.id && p.module_key === mod.key && p.can_view);
                                                            const isSuperAdmin = role.name === "SUPER ADMINISTRADOR";

                                                            return (
                                                                <td key={role.id} className="p-4 text-center relative group/cell">
                                                                    <div className="absolute inset-0 bg-slate-50/0 group-hover/cell:bg-slate-100/50 transition-colors pointer-events-none" />
                                                                    <div className="relative inline-flex flex-col items-center justify-center w-full h-full">
                                                                        <button
                                                                            disabled={isSuperAdmin}
                                                                            onClick={() => handleTogglePermission(role.id, mod.key, hasPerm)}
                                                                            className={cn(
                                                                                "h-8 w-14 rounded-full p-1 transition-all duration-300 relative shadow-inner flex items-center shrink-0",
                                                                                hasPerm
                                                                                    ? "bg-emerald-500 shadow-emerald-500/20 shadow-md border-emerald-500 hover:bg-emerald-400"
                                                                                    : "bg-slate-100 border border-slate-200 hover:bg-slate-200",
                                                                                isSuperAdmin && "opacity-30 cursor-not-allowed grayscale"
                                                                            )}
                                                                        >
                                                                            <div className={cn(
                                                                                "h-6 w-6 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm shrink-0",
                                                                                hasPerm
                                                                                    ? "bg-white translate-x-6 text-emerald-500"
                                                                                    : "bg-white translate-x-0 text-slate-300 border border-slate-200"
                                                                            )}>
                                                                                {hasPerm ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                                                                            </div>
                                                                        </button>
                                                                        {isSuperAdmin && (
                                                                            <span className="absolute -bottom-3 text-[5px] font-black text-slate-400 uppercase tracking-widest opacity-60">ADMIN</span>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white flex flex-col justify-center gap-2 shadow-2xl">
                            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-indigo-500 italic">Total Conexiones</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-black tracking-tight">{(roles.length * modules.length).toLocaleString()}</span>
                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Nodos</span>
                            </div>
                        </div>
                        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-premium flex items-center gap-6">
                            <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
                                <Check className="h-6 w-6" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 leading-none">Status RLS</p>
                                <p className="text-lg font-black text-slate-900 uppercase tracking-tight">Sincronizado</p>
                            </div>
                        </div>
                        <div className="md:col-span-2 bg-slate-50/50 rounded-[2.5rem] p-8 border border-dashed border-slate-200 flex items-center gap-6">
                            <div className="h-10 w-10 shrink-0 rounded-full bg-white flex items-center justify-center shadow-sm">
                                <Zap className="h-4 w-4 text-indigo-600" />
                            </div>
                            <p className="text-[10px] font-black text-slate-500 leading-relaxed uppercase tracking-[0.15em]">
                                Los cambios aplicados se despliegan instantáneamente en el Sidebar y el motor de rutas.
                                <span className="text-slate-900 ml-1">Para administradores, el acceso es omnipotente por diseño.</span>
                            </p>
                        </div>
                    </div>
                </TabsContent>

                {/* TAB: ZONES */}
                <TabsContent value="zones" className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500 outline-none">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mx-4 md:mx-0">
                        {/* Zone Config */}
                        <Card className="border-none bg-white shadow-premium rounded-[2.5rem] overflow-hidden lg:col-span-1 border-t-4 border-emerald-500">
                            <CardHeader className="p-10 pb-4">
                                <CardTitle className="text-xl font-black text-slate-900 flex items-center gap-4 uppercase tracking-tight">
                                    <div className="h-10 w-10 rounded-xl bg-emerald-500 flex items-center justify-center">
                                        <MapPin className="h-5 w-5 text-white" />
                                    </div>
                                    Nueva Zona
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-10 pt-6 space-y-6">
                                <div className="space-y-3">
                                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Nombre de la Zona</Label>
                                    <Input
                                        value={newZoneName}
                                        onChange={(e) => setNewZoneName(e.target.value)}
                                        placeholder="Ej: Zona Sur - Cali"
                                        className="h-14 bg-slate-50 border-none rounded-2xl font-bold px-6 text-sm"
                                    />
                                </div>
                                <Button
                                    onClick={handleAddZone}
                                    className="w-full h-14 rounded-2xl bg-slate-900 hover:bg-emerald-600 text-white font-black tracking-widest text-[10px]"
                                >
                                    REGISTRAR ZONA
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Zone List */}
                        <Card className="border-none bg-white shadow-premium rounded-[2.5rem] overflow-hidden lg:col-span-2">
                            <CardHeader className="p-10 pb-4">
                                <CardTitle className="text-xl font-black text-slate-900 flex items-center gap-4 uppercase tracking-tight">
                                    <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-900">
                                        <Table className="h-5 w-5" />
                                    </div>
                                    Zonas Registradas
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-10 pt-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {zones.map(zone => (
                                        <div key={zone.id} className="flex items-center justify-between p-6 rounded-[2rem] bg-slate-50 group hover:bg-slate-900 transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                                                    <MapPin className="h-5 w-5 text-emerald-500" />
                                                </div>
                                                <span className="font-black text-[11px] uppercase tracking-widest text-slate-600 group-hover:text-white">{zone.name}</span>
                                            </div>
                                            <Button
                                                onClick={() => handleDeleteZone(zone.id)}
                                                variant="ghost"
                                                size="sm"
                                                className="text-rose-500 bg-rose-50 rounded-xl h-10 w-10 p-0 opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                    {zones.length === 0 && (
                                        <p className="col-span-full py-12 text-center text-slate-400 font-black text-[10px] uppercase tracking-widest italic bg-slate-50 rounded-[2rem]">No hay zonas configuradas</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>

            {/* Modal: Cambiar Contraseña */}
            {passwordModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md mx-4 animate-in slide-in-from-bottom-4 duration-300">
                        <div className="p-8 space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                                    <KeyRound className="h-6 w-6 text-amber-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Cambiar Contraseña</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{passwordModal.email}</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-400">Nueva Contraseña</Label>
                                <div className="relative">
                                    <Input
                                        type={showNewPassword ? "text" : "password"}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Mínimo 6 caracteres"
                                        className="h-12 pr-12 rounded-xl bg-slate-50 border-slate-100 font-bold"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600"
                                    >
                                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                                {newPassword.length > 0 && newPassword.length < 6 && (
                                    <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Mínimo 6 caracteres</p>
                                )}
                            </div>

                            <div className="flex gap-3 pt-2">
                                <Button
                                    variant="outline"
                                    className="flex-1 h-12 rounded-xl font-black text-xs uppercase tracking-widest"
                                    onClick={() => { setPasswordModal(null); setNewPassword(""); setShowNewPassword(false); }}
                                    disabled={passwordLoading}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    className="flex-1 h-12 rounded-xl font-black text-xs uppercase tracking-widest bg-amber-600 hover:bg-amber-700 text-white"
                                    onClick={handleChangePassword}
                                    disabled={passwordLoading || newPassword.length < 6}
                                >
                                    {passwordLoading ? "Actualizando..." : "Guardar"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
