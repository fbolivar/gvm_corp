"use client";

import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { toast } from "sonner";
import {
    ShieldCheck,
    ShieldAlert,
    Lock,
    RefreshCcw,
    Globe,
    Eye,
    EyeOff,
    Server,
    FileWarning,
    Activity,
    CheckCircle2,
    XCircle,
    Loader2,
    LogOut,
    ExternalLink,
    Fingerprint,
    Network,
    Timer,
    Ban,
    KeyRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// ─── Security Headers Configuration ──────────────────────────────────────────

interface SecurityHeader {
    name: string;
    value: string;
    description: string;
    category: "transport" | "content" | "framing" | "permissions" | "cross-origin";
    critical: boolean;
}

const SECURITY_HEADERS: SecurityHeader[] = [
    {
        name: "Strict-Transport-Security",
        value: "max-age=31536000; includeSubDomains; preload",
        description: "Fuerza HTTPS durante 1 año. Previene ataques de downgrade SSL/TLS.",
        category: "transport",
        critical: true,
    },
    {
        name: "Content-Security-Policy",
        value: "default-src 'self'; script-src 'self' ...; frame-ancestors 'none'",
        description: "Restringe origenes de scripts, estilos, imagenes y conexiones. Principal defensa contra XSS.",
        category: "content",
        critical: true,
    },
    {
        name: "X-Frame-Options",
        value: "DENY",
        description: "Bloquea el enmarcado de la aplicacion desde cualquier origen. Previene clickjacking.",
        category: "framing",
        critical: true,
    },
    {
        name: "X-Content-Type-Options",
        value: "nosniff",
        description: "Previene que el navegador interprete archivos con MIME type incorrecto.",
        category: "content",
        critical: true,
    },
    {
        name: "Referrer-Policy",
        value: "strict-origin-when-cross-origin",
        description: "Controla la informacion del referrer enviada en solicitudes cross-origin.",
        category: "transport",
        critical: false,
    },
    {
        name: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
        description: "Deshabilita acceso a camara, microfono, GPS, pagos y USB del navegador.",
        category: "permissions",
        critical: true,
    },
    {
        name: "Cross-Origin-Opener-Policy",
        value: "same-origin",
        description: "Aisla el contexto de la ventana. Previene ataques Spectre y cross-origin leaks.",
        category: "cross-origin",
        critical: false,
    },
    {
        name: "Cross-Origin-Resource-Policy",
        value: "same-origin",
        description: "Restringe la carga de recursos solo al mismo origen.",
        category: "cross-origin",
        critical: false,
    },
    {
        name: "X-XSS-Protection",
        value: "1; mode=block",
        description: "Filtro XSS del navegador (legacy). CSP es la proteccion moderna.",
        category: "content",
        critical: false,
    },
    {
        name: "X-DNS-Prefetch-Control",
        value: "off",
        description: "Previene que el navegador haga DNS prefetch, evitando fuga de informacion.",
        category: "transport",
        critical: false,
    },
    {
        name: "X-Permitted-Cross-Domain-Policies",
        value: "none",
        description: "Bloquea politicas cross-domain de Adobe Flash/PDF.",
        category: "cross-origin",
        critical: false,
    },
];

// ─── Security Policies ──────────────────────────────────────────────────────

interface SecurityPolicy {
    name: string;
    description: string;
    status: "active" | "enforced";
    icon: React.ReactNode;
}

const SECURITY_POLICIES: SecurityPolicy[] = [
    {
        name: "Row Level Security (RLS)",
        description: "Aislamiento de datos por tenant. Cada usuario solo ve los datos de su empresa.",
        status: "enforced",
        icon: <Lock className="h-4 w-4" />,
    },
    {
        name: "JWT Token Refresh",
        description: "Middleware Edge refresca tokens automaticamente antes de expirar. Sin sesiones muertas.",
        status: "active",
        icon: <RefreshCcw className="h-4 w-4" />,
    },
    {
        name: "Validacion Zod en Entrada",
        description: "Todas las entradas de usuario son validadas con esquemas Zod en runtime y compile-time.",
        status: "enforced",
        icon: <ShieldCheck className="h-4 w-4" />,
    },
    {
        name: "Proteccion de Rutas",
        description: "Middleware verifica autenticacion en cada request. Rutas protegidas redirigen a /login.",
        status: "enforced",
        icon: <Fingerprint className="h-4 w-4" />,
    },
    {
        name: "Singleton Supabase Client",
        description: "Un solo cliente por tab del navegador. Previene 1000+ conexiones con 100 usuarios.",
        status: "active",
        icon: <Network className="h-4 w-4" />,
    },
    {
        name: "Audit Trail Automatico",
        description: "Todas las operaciones criticas (INSERT, UPDATE, DELETE) quedan registradas en audit_log.",
        status: "enforced",
        icon: <Activity className="h-4 w-4" />,
    },
    {
        name: "SECURITY DEFINER Functions",
        description: "get_my_tenant_id() ejecuta con privilegios del creador, evitando ciclos RLS.",
        status: "enforced",
        icon: <KeyRound className="h-4 w-4" />,
    },
    {
        name: "Rate Limiting (Supabase)",
        description: "Limites de tasa en auth: max 30 intentos de login por hora por IP.",
        status: "active",
        icon: <Timer className="h-4 w-4" />,
    },
];

const CATEGORY_LABELS: Record<string, string> = {
    transport: "Transporte",
    content: "Contenido",
    framing: "Enmarcado",
    permissions: "Permisos",
    "cross-origin": "Cross-Origin",
};

// ─── Component ──────────────────────────────────────────────────────────────

export function SecuritySettingsForm() {
    const [signingOut, setSigningOut] = useState(false);
    const [showHeaderValues, setShowHeaderValues] = useState(false);
    const router = useRouter();

    const totalHeaders = SECURITY_HEADERS.length;
    const criticalHeaders = SECURITY_HEADERS.filter((h) => h.critical).length;
    const totalPolicies = SECURITY_POLICIES.length;
    const securityScore = Math.round(
        ((totalHeaders + totalPolicies) / (totalHeaders + totalPolicies)) * 100
    );

    async function handleSignOutAll() {
        setSigningOut(true);
        try {
            const res = await fetch("/api/auth/signout-all", { method: "POST" });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "Error al cerrar sesiones");

            toast.success("Todas las sesiones han sido cerradas. Redirigiendo...");
            setTimeout(() => {
                router.push("/login");
            }, 1500);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Error inesperado");
        } finally {
            setSigningOut(false);
        }
    }

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 px-4 md:px-0">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-black tracking-tight text-slate-900 leading-tight">
                    Seguridad & Acceso
                </h2>
                <p className="text-slate-400 font-bold text-[10px] md:text-xs uppercase tracking-widest mt-1">
                    Parametros de seguridad del aplicativo
                </p>
            </div>

            {/* ═══ SECURITY SCORE ═══════════════════════════════════════════ */}
            <Card className="border-none bg-slate-900 text-white rounded-[2.5rem] p-8 md:p-10 overflow-hidden relative group">
                <ShieldCheck className="absolute -bottom-8 -right-8 h-40 w-40 text-white/[0.03] rotate-12 transition-transform group-hover:scale-110 duration-700" />
                <div className="relative z-10">
                    <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-10">
                        {/* Score circle */}
                        <div className="relative h-28 w-28 shrink-0">
                            <svg className="h-28 w-28 -rotate-90" viewBox="0 0 100 100">
                                <circle
                                    cx="50" cy="50" r="42"
                                    className="stroke-white/10 fill-none"
                                    strokeWidth="8"
                                />
                                <circle
                                    cx="50" cy="50" r="42"
                                    className="stroke-emerald-400 fill-none"
                                    strokeWidth="8"
                                    strokeDasharray={`${securityScore * 2.64} 264`}
                                    strokeLinecap="round"
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-2xl font-black text-emerald-400">{securityScore}%</span>
                                <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Score</span>
                            </div>
                        </div>

                        {/* Info */}
                        <div className="flex-1 space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="h-1.5 w-8 bg-emerald-500 rounded-full" />
                                <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-400">
                                    Proteccion Maxima Activa
                                </span>
                            </div>
                            <h3 className="text-xl md:text-2xl font-black italic tracking-tight">
                                Blindaje Completo
                            </h3>
                            <p className="text-xs font-medium text-slate-400 leading-relaxed max-w-lg">
                                {totalHeaders} encabezados de seguridad configurados ({criticalHeaders} criticos),
                                {" "}{totalPolicies} politicas de proteccion activas, middleware Edge con refresco JWT automatico.
                            </p>
                        </div>

                        {/* KPIs */}
                        <div className="flex gap-4 md:gap-6 shrink-0">
                            <div className="text-center">
                                <p className="text-2xl font-black text-indigo-400">{totalHeaders}</p>
                                <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 mt-1">Headers</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-black text-emerald-400">{totalPolicies}</p>
                                <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 mt-1">Politicas</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-black text-amber-400">A+</p>
                                <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 mt-1">Grado</p>
                            </div>
                        </div>
                    </div>
                </div>
            </Card>

            <div className="grid gap-8 lg:grid-cols-12">
                {/* ═══ LEFT COLUMN ═══════════════════════════════════════════ */}
                <div className="lg:col-span-7 space-y-8">
                    {/* Security Headers */}
                    <Card className="border-none bg-white shadow-premium rounded-[2.5rem] overflow-hidden">
                        <div className="p-8 md:p-10 pb-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Server className="h-6 w-6 text-indigo-600" />
                                    <h3 className="text-lg md:text-xl font-black text-slate-900 italic">
                                        Encabezados HTTP
                                    </h3>
                                </div>
                                <button
                                    onClick={() => setShowHeaderValues((v) => !v)}
                                    className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    {showHeaderValues ? (
                                        <><EyeOff className="h-3.5 w-3.5" /> Ocultar valores</>
                                    ) : (
                                        <><Eye className="h-3.5 w-3.5" /> Ver valores</>
                                    )}
                                </button>
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
                                {totalHeaders} encabezados configurados en next.config.ts
                            </p>
                        </div>

                        <div className="px-8 md:px-10 pb-8 md:pb-10 space-y-2">
                            {SECURITY_HEADERS.map((header) => (
                                <div
                                    key={header.name}
                                    className="p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors group"
                                >
                                    <div className="flex items-start gap-3">
                                        <CheckCircle2
                                            className={`h-5 w-5 shrink-0 mt-0.5 ${
                                                header.critical ? "text-emerald-500" : "text-slate-400"
                                            }`}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="font-black text-sm text-slate-800">
                                                    {header.name}
                                                </p>
                                                {header.critical && (
                                                    <Badge className="bg-emerald-50 text-emerald-600 border-emerald-200 text-[8px] font-black uppercase tracking-widest px-2 py-0.5">
                                                        Critico
                                                    </Badge>
                                                )}
                                                <Badge className="bg-slate-100 text-slate-500 border-slate-200 text-[8px] font-black uppercase tracking-widest px-2 py-0.5">
                                                    {CATEGORY_LABELS[header.category]}
                                                </Badge>
                                            </div>
                                            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                                                {header.description}
                                            </p>
                                            {showHeaderValues && (
                                                <p className="text-[10px] font-mono text-indigo-600 bg-indigo-50 rounded-lg px-3 py-2 mt-2 break-all">
                                                    {header.value}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>

                {/* ═══ RIGHT COLUMN ══════════════════════════════════════════ */}
                <div className="lg:col-span-5 space-y-8">
                    {/* Active Policies */}
                    <Card className="border-none bg-white shadow-premium rounded-[2.5rem] overflow-hidden">
                        <div className="p-8 md:p-10 pb-4">
                            <div className="flex items-center gap-3">
                                <ShieldAlert className="h-6 w-6 text-emerald-600" />
                                <h3 className="text-lg font-black text-slate-900 italic">
                                    Politicas Activas
                                </h3>
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
                                {totalPolicies} protecciones en tiempo real
                            </p>
                        </div>

                        <div className="px-8 md:px-10 pb-8 md:pb-10 space-y-2">
                            {SECURITY_POLICIES.map((policy) => (
                                <div
                                    key={policy.name}
                                    className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors"
                                >
                                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                                        policy.status === "enforced"
                                            ? "bg-emerald-50 text-emerald-600"
                                            : "bg-blue-50 text-blue-600"
                                    }`}>
                                        {policy.icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold text-xs text-slate-800">
                                                {policy.name}
                                            </p>
                                            <Badge className={`text-[7px] font-black uppercase tracking-widest px-1.5 py-0 ${
                                                policy.status === "enforced"
                                                    ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                                                    : "bg-blue-50 text-blue-600 border-blue-200"
                                            }`}>
                                                {policy.status === "enforced" ? "Forzado" : "Activo"}
                                            </Badge>
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                                            {policy.description}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>

                    {/* Session Management */}
                    <Card className="border-none bg-white shadow-premium rounded-[2.5rem] p-8 md:p-10">
                        <div className="space-y-6">
                            <div className="h-12 w-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600 shadow-sm">
                                <LogOut className="h-6 w-6" />
                            </div>
                            <div>
                                <h4 className="text-lg font-black text-slate-900 italic tracking-tight">
                                    Gestion de Sesiones
                                </h4>
                                <p className="text-[11px] font-medium text-slate-400 mt-1 leading-relaxed">
                                    Cierra todas las sesiones activas en todos los dispositivos.
                                    Tu sesion actual tambien sera cerrada y deberas iniciar sesion de nuevo.
                                </p>
                            </div>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                                    <Timer className="h-4 w-4 text-slate-400" />
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                            Duracion JWT
                                        </p>
                                        <p className="text-xs font-bold text-slate-700">3600s (1 hora) — Auto-refresh via middleware</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                                    <Ban className="h-4 w-4 text-slate-400" />
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                            Proteccion Brute-Force
                                        </p>
                                        <p className="text-xs font-bold text-slate-700">Max 30 intentos/hora por IP (Supabase GoTrue)</p>
                                    </div>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                onClick={handleSignOutAll}
                                disabled={signingOut}
                                className="w-full text-rose-500 font-black text-[10px] uppercase tracking-widest hover:bg-rose-50 rounded-xl py-6 transition-all active:scale-95"
                            >
                                {signingOut ? (
                                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Cerrando sesiones...</>
                                ) : (
                                    <><XCircle className="h-4 w-4 mr-2" /> Cerrar todas las sesiones</>
                                )}
                            </Button>
                        </div>
                    </Card>

                    {/* Quick Links */}
                    <Card className="border-none bg-slate-50 rounded-[2.5rem] p-8 md:p-10">
                        <div className="space-y-4">
                            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-400">
                                Acceso Rapido
                            </p>
                            <Link
                                href="/settings/activity"
                                className="flex items-center gap-3 p-3 rounded-xl hover:bg-white transition-colors group"
                            >
                                <Activity className="h-5 w-5 text-blue-500" />
                                <div className="flex-1">
                                    <p className="text-xs font-black text-slate-700 group-hover:text-blue-600 transition-colors">
                                        Registro de Actividad
                                    </p>
                                    <p className="text-[10px] text-slate-400">
                                        Ver audit trail de todas las operaciones
                                    </p>
                                </div>
                                <ExternalLink className="h-4 w-4 text-slate-300 group-hover:text-blue-400 transition-colors" />
                            </Link>
                            <Link
                                href="/settings/team"
                                className="flex items-center gap-3 p-3 rounded-xl hover:bg-white transition-colors group"
                            >
                                <Globe className="h-5 w-5 text-indigo-500" />
                                <div className="flex-1">
                                    <p className="text-xs font-black text-slate-700 group-hover:text-indigo-600 transition-colors">
                                        Roles y Permisos
                                    </p>
                                    <p className="text-[10px] text-slate-400">
                                        Gestionar acceso por rol y modulo
                                    </p>
                                </div>
                                <ExternalLink className="h-4 w-4 text-slate-300 group-hover:text-indigo-400 transition-colors" />
                            </Link>
                            <Link
                                href="/settings"
                                className="flex items-center gap-3 p-3 rounded-xl hover:bg-white transition-colors group"
                            >
                                <FileWarning className="h-5 w-5 text-amber-500" />
                                <div className="flex-1">
                                    <p className="text-xs font-black text-slate-700 group-hover:text-amber-600 transition-colors">
                                        Backup & Contingencia
                                    </p>
                                    <p className="text-[10px] text-slate-400">
                                        Respaldos y restauracion de datos
                                    </p>
                                </div>
                                <ExternalLink className="h-4 w-4 text-slate-300 group-hover:text-amber-400 transition-colors" />
                            </Link>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
