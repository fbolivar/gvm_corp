import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { cn } from "@/shared/lib/utils";
import {
    Settings,
    User,
    Building2,
    ShieldCheck,
    Bell,
    LayoutGrid,
    Globe,
    CreditCard,
    ChevronRight,
    Sparkles,
    Smartphone,
    Database,
    Mail,
    Brain
} from "lucide-react";
import Link from "next/link";

export default function SettingsPage() {
    const categories = [
        {
            title: "Perfil de Usuario",
            description: "Gestiona tu información personal y preferencias de cuenta.",
            icon: User,
            color: "text-blue-400",
            bg: "bg-blue-500/10",
            links: [
                { name: "Información Personal", href: "/settings/profile" },
                { name: "Preferencias de Lenguaje", href: "/settings/language" }
            ]
        },
        {
            title: "Organización",
            description: "Configura los datos legales de tu empresa y equipo.",
            icon: Building2,
            color: "text-indigo-400",
            bg: "bg-indigo-500/10",
            links: [
                { name: "Datos de Empresa", href: "/settings/company" },
                { name: "Gestión de Equipo", href: "/settings/team" }
            ]
        },
        {
            title: "Seguridad & Acceso",
            description: "Protege tu cuenta con 2FA y gestiona tus sesiones.",
            icon: ShieldCheck,
            color: "text-rose-400",
            bg: "bg-rose-500/10",
            links: [
                { name: "Contraseña & 2FA", href: "/settings/security" },
                { name: "Registro de Actividad", href: "/settings/activity" }
            ]
        },
        {
            title: "Notificaciones",
            description: "Elige qué alertas recibir por correo y en la app.",
            icon: Bell,
            color: "text-amber-400",
            bg: "bg-amber-500/10",
            links: [
                { name: "Configurar Alertas", href: "/settings/notifications" },
                { name: "Digest Semanal", href: "/settings/digest" }
            ]
        },
        {
            title: "Inteligencia Artificial",
            description: "Gestiona agentes autónomos que automatizan procesos de negocio.",
            icon: Brain,
            color: "text-indigo-500",
            bg: "bg-indigo-500/10",
            links: [
                { name: "Portfolio IQ Agent", href: "/settings/portfolio-agent" }
            ]
        },
        {
            title: "Integraciones",
            description: "Conecta GVM S.A.S con otras herramientas y servicios externos.",
            icon: Globe,
            color: "text-sky-400",
            bg: "bg-sky-500/10",
            links: [
                { name: "API & DIAN Config", href: "/settings/integrations" },
                { name: "Correo Electrónico", href: "/settings/email" }
            ]
        },
        {
            title: "Contingencia",
            description: "Protocolos de seguridad, copias y recuperación ante desastres.",
            icon: Database,
            color: "text-emerald-400",
            bg: "bg-emerald-500/10",
            links: [
                { name: "Generar Backup", href: "/settings/backup" },
                { name: "Restaurar Sistema", href: "/settings/restore" }
            ]
        }
    ];

    return (
        <div className="space-y-12 pb-24 animate-in fade-in duration-1000 px-4 md:px-0">
            {/* 🛡️ MASTER CONTROL HEADER */}
            <div className="bg-slate-900 rounded-[4rem] p-12 md:p-20 text-white shadow-active relative overflow-hidden group">
                {/* Background Decor */}
                <div className="absolute top-0 right-0 p-16 opacity-[0.03] pointer-events-none group-hover:scale-110 group-hover:rotate-12 transition-all duration-1000">
                    <Settings className="h-80 w-80 text-white" />
                </div>

                <div className="relative z-10 space-y-8">
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="h-2 w-12 bg-indigo-500 rounded-full" />
                            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-indigo-400">System Configuration Hub v3.0</span>
                        </div>
                        <h1 className="text-6xl md:text-8xl font-black tracking-tighter italic uppercase leading-[0.8]">
                            Panel de <br /><span className="text-slate-500">Control</span>
                        </h1>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center gap-6">
                        <div className="flex items-center gap-2 bg-indigo-500/10 px-4 py-1.5 rounded-xl border border-indigo-500/20">
                            <Sparkles className="h-4 w-4 text-indigo-400 animate-pulse" />
                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest italic leading-none">Engine Status: Optimized</span>
                        </div>
                        <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.4em]">Auditando Ajustes Globales & Seguridad</p>
                    </div>
                </div>
            </div>

            {/* Settings Categories Grid */}
            <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3">
                {categories.map((cat) => (
                    <div key={cat.title} className="group bg-white rounded-[3rem] p-4 shadow-premium hover:shadow-active transition-all duration-500 border border-transparent hover:border-slate-100/50 overflow-hidden">
                        <div className="p-10 space-y-8">
                            <div className="flex items-center justify-between">
                                <div className={cn(
                                    "h-20 w-20 rounded-[1.8rem] flex items-center justify-center shadow-sm group-hover:scale-110 group-hover:rotate-6 transition-all duration-500",
                                    cat.bg,
                                    cat.color
                                )}>
                                    <cat.icon className="h-10 w-10" />
                                </div>
                                <Badge className={cn("border-none text-[8px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest leading-none", cat.bg, cat.color)}>
                                    Habilitado
                                </Badge>
                            </div>

                            <div className="space-y-3">
                                <h3 className="text-2xl font-black text-slate-900 tracking-tighter italic uppercase group-hover:text-indigo-600 transition-colors">
                                    {cat.title}
                                </h3>
                                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-relaxed opacity-70">
                                    {cat.description}
                                </p>
                            </div>

                            <div className="space-y-2 pt-4 border-t border-slate-50">
                                {cat.links.map((link) => (
                                    <Link
                                        key={link.name}
                                        href={link.href}
                                        className="flex items-center justify-between p-5 rounded-2xl bg-slate-50/50 hover:bg-slate-900 group/link transition-all"
                                    >
                                        <span className="text-xs font-black text-slate-600 uppercase tracking-widest group-hover/link:text-white transition-colors">{link.name}</span>
                                        <div className="h-8 w-8 rounded-xl bg-white flex items-center justify-center shadow-sm group-hover/link:bg-indigo-600 transition-all">
                                            <ChevronRight className="h-4 w-4 text-slate-300 group-hover/link:text-white group-hover/link:translate-x-1 transition-all" />
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
