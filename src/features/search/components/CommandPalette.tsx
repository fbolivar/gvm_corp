
"use client"

import { useState, useEffect, useCallback } from "react";
import {
    Search,
    Command,
    Package,
    Users,
    FileText,
    Zap,
    ArrowRight,
    Plus,
    LayoutDashboard,
    HelpCircle,
    ChevronRight,
    Sparkles,
    TrendingUp,
    Briefcase,
    History,
    Receipt,
    Wallet,
    BarChart,
    Brain,
    Activity,
    ShieldAlert,
    BookOpen,
    CheckCircle2
} from "lucide-react";
// ... existing imports ...
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { cn } from "@/shared/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { globalSearchService } from "../services/globalSearchService";
import { portfolioAgentService } from "../../portfolio/services/portfolioAgentService";
import { analyticsService } from "../../analytics/services/analyticsService";
import { SearchResult } from "../types";
import { useRouter } from "next/navigation";
import { Badge } from "@/shared/components/ui/badge";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { toast } from "sonner";

const HISTORY_KEY = 'gvm_search_history';

export function CommandPalette() {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [history, setHistory] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [executingAI, setExecutingAI] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const router = useRouter();
    const supabase = createClient();

    // Interpret category filter from prefix
    const activeFilter = query.match(/^([pcdltsh]):/i)?.[1].toLowerCase();
    const filterMap: Record<string, { label: string, color: string }> = {
        'p': { label: 'Productos', color: 'bg-indigo-500' },
        'c': { label: 'Terceros', color: 'bg-blue-500' },
        'd': { label: 'Documentos', color: 'bg-slate-700' },
        'l': { label: 'Leads (CRM)', color: 'bg-orange-500' },
        't': { label: 'Tesorería', color: 'bg-emerald-500' },
        's': { label: 'Soporte', color: 'bg-rose-500' },
        'h': { label: 'Manual/Ayuda', color: 'bg-amber-500' }
    };

    // Comandos rápidos estáticos (Power Actions + AI)
    const staticCommands: SearchResult[] = [
        { id: 'cmd-brain-diag', title: 'IA: Diagnóstico Maestro 360', subtitle: 'Análisis de salud financiera y liquidez', category: 'COMMAND', icon: 'Brain' },
        { id: 'cmd-agent-run', title: 'IA: Agente de Cobranza', subtitle: 'Disparar automatización de cartera', category: 'COMMAND', icon: 'Sparkles' },
        { id: 'cmd-new-invoice', title: 'Nueva Factura de Venta', subtitle: 'Acceso rápido a facturación', category: 'COMMAND', link: '/sales/quotations/new', icon: 'Plus' },
        { id: 'cmd-new-party', title: 'Nuevo Cliente / Proveedor', subtitle: 'Registro en el directorio maestro', category: 'COMMAND', link: '/parties/new', icon: 'Users' },
        { id: 'cmd-portfolio-aging', title: 'Ver Cartera (Aging)', subtitle: 'Gestión y estado de cuentas por cobrar', category: 'COMMAND', link: '/portfolio/aging', icon: 'TrendingUp' },
        { id: 'cmd-payroll-settle', title: 'Liquidación de Nómina', subtitle: 'Ejecutar procesos de pago masivo', category: 'COMMAND', link: '/payroll/settlement', icon: 'Zap' },
        { id: 'cmd-analytics-bi', title: 'BI Gerencial / Reportes', subtitle: 'Analítica avanzada de la operación', category: 'COMMAND', link: '/analytics', icon: 'BarChart' },
        { id: 'cmd-inventory-val', title: 'Valoración de Inventario', subtitle: 'Stock actual y costos reales', category: 'COMMAND', link: '/inventory-valuation', icon: 'Package' },
        { id: 'cmd-new-lead', title: 'Nuevo Prospecto CRM', subtitle: 'Registrar lead en el pipeline', category: 'COMMAND', link: '/crm/leads/new', icon: 'Briefcase' },
    ];

    // Load History
    useEffect(() => {
        const saved = localStorage.getItem(HISTORY_KEY);
        if (saved) {
            try {
                setHistory(JSON.parse(saved));
            } catch (e) {
                console.error("Error loading search history:", e);
            }
        }
    }, [open]);

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };

        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, []);

    const performSearch = useCallback(async (q: string) => {
        if (q.length < 2) {
            setResults(q.startsWith('/') ? staticCommands.filter(c => c.title.toLowerCase().includes(q.slice(1).toLowerCase())) : []);
            return;
        }

        setLoading(true);
        try {
            const searchResults = await globalSearchService.search(supabase, q);
            // Si el query empieza por /, priorizamos comandos
            if (q.startsWith('/')) {
                const filteredCmds = staticCommands.filter(c => c.title.toLowerCase().includes(q.slice(1).toLowerCase()));
                setResults([...filteredCmds, ...searchResults]);
            } else {
                setResults(searchResults);
            }
        } catch (error) {
            console.error("Search error:", error);
        } finally {
            setLoading(false);
        }
    }, [supabase]);

    useEffect(() => {
        const timer = setTimeout(() => {
            performSearch(query);
            setSelectedIndex(0);
        }, 300);
        return () => clearTimeout(timer);
    }, [query, performSearch]);

    const addToHistory = (result: SearchResult) => {
        if (result.category === 'COMMAND') return; // Don't save commands in history

        const newHistory = [result, ...history.filter(h => h.id !== result.id)].slice(0, 5);
        setHistory(newHistory);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
    };

    const handleAIAction = async (commandId: string) => {
        setExecutingAI(true);
        setOpen(false); // Cerramos para mostrar visualmente la ejecución fuera

        try {
            if (commandId === 'cmd-brain-diag') {
                toast.loading("IA: Realizando Diagnóstico de Salud 360...", { duration: 3000 });
                const summary = await analyticsService.getExecutiveSummary(supabase);

                setTimeout(() => {
                    toast.success("Diagnóstico Completo", {
                        description: `Supervivencia: ${summary.liquidity_metrics?.survival_days} días. Salud: ${summary.liquidity_metrics?.survival_days && summary.liquidity_metrics.survival_days > 30 ? 'Óptima' : 'Alerta'}`,
                        icon: <Brain className="h-4 w-4 text-indigo-500" />,
                        action: {
                            label: "Ver Detalles",
                            onClick: () => router.push('/dashboard')
                        }
                    });
                }, 1500);
            }

            if (commandId === 'cmd-agent-run') {
                toast.loading("Iniciando Ciclo del Agente de Cobranza...", { duration: 3000 });
                await portfolioAgentService.triggerRemoteCycle(supabase);

                setTimeout(() => {
                    toast.success("Ciclo Completado", {
                        description: "El agente ha procesado las facturas en mora y enviado las notificaciones correspondientes.",
                        icon: <Sparkles className="h-4 w-4 text-amber-500" />
                    });
                }, 1500);
            }
        } catch (error) {
            toast.error("Error al ejecutar acción de IA");
            console.error(error);
        } finally {
            setExecutingAI(false);
            setQuery("");
        }
    };

    const handleSelect = (result: SearchResult) => {
        if (result.suggestion) {
            setQuery(result.suggestion);
            return;
        }

        if (result.id.startsWith('cmd-brain') || result.id.startsWith('cmd-agent')) {
            handleAIAction(result.id);
            return;
        }

        if (result.link) {
            addToHistory(result);
            router.push(result.link);
            setOpen(false);
            setQuery("");
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        const totalItems = query.length === 0 && history.length > 0 ? history.length : results.length;
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setSelectedIndex(prev => (prev + 1) % (totalItems || 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setSelectedIndex(prev => (prev - 1 + (totalItems || 1)) % (totalItems || 1));
        } else if (e.key === "Enter") {
            const currentList = query.length === 0 && history.length > 0 ? history : results;
            if (currentList[selectedIndex]) {
                handleSelect(currentList[selectedIndex]);
            }
        } else if (e.key === "Escape") {
            setOpen(false);
        }
    };

    const getIcon = (category: string, iconName?: string) => {
        if (iconName === 'Brain') return <Brain className="h-4 w-4 text-indigo-500" />;
        if (iconName === 'Sparkles') return <Sparkles className="h-4 w-4 text-amber-500" />;
        if (iconName === 'BarChart') return <BarChart className="h-4 w-4 text-emerald-500" />;
        if (iconName === 'TrendingUp') return <TrendingUp className="h-4 w-4 text-indigo-500" />;
        if (iconName === 'Users') return <Users className="h-4 w-4 text-blue-500" />;
        if (iconName === 'Briefcase') return <Briefcase className="h-4 w-4 text-slate-500" />;

        switch (category) {
            case 'PRODUCT': return <Package className="h-4 w-4" />;
            case 'PARTY': return <Users className="h-4 w-4" />;
            case 'DOCUMENT': return <FileText className="h-4 w-4" />;
            case 'COMMAND': return <Zap className="h-4 w-4" />;
            case 'LEAD': return <Briefcase className="h-4 w-4" />;
            case 'TICKET': return <HelpCircle className="h-4 w-4" />;
            case 'ACCOUNT': return <Wallet className="h-4 w-4" />;
            case 'HELP': return <BookOpen className="h-4 w-4" />;
            default: return <Search className="h-4 w-4" />;
        }
    };

    const PreviewPanel = ({ result }: { result: SearchResult }) => {
        if (!result || !result.metadata) return null;

        const renderDetails = () => {
            switch (result.category) {
                case 'PRODUCT':
                    return (
                        <div className="space-y-4">
                            <div className="h-40 bg-slate-50 rounded-2xl border border-dashed border-slate-200 flex items-center justify-center overflow-hidden group">
                                {result.metadata.image_url ? (
                                    <img
                                        src={result.metadata.image_url}
                                        alt={result.title}
                                        className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500"
                                    />
                                ) : (
                                    <Package className="h-12 w-12 text-slate-200 group-hover:scale-110 transition-transform duration-500" />
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="p-3 bg-slate-900 rounded-xl">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Stock Actual</p>
                                    <p className="text-xl font-black italic text-white leading-none">
                                        {result.metadata.stock_total || 0} <span className="text-[9px] font-bold text-slate-500 not-italic">UND</span>
                                    </p>
                                </div>
                                <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-1">Ubicación</p>
                                    <p className="text-xs font-black italic text-indigo-900 leading-none">{result.metadata.location || 'Bodega Principal'}</p>
                                </div>
                            </div>
                            <div className="p-3 bg-white border border-slate-100 rounded-xl">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Categoría</p>
                                <p className="text-xs font-bold text-slate-600">{result.metadata.category_name || 'Insumos Industriales'}</p>
                            </div>
                        </div>
                    );
                case 'PARTY':
                    return (
                        <div className="space-y-4">
                            <div className="flex items-center gap-4 p-4 bg-white border border-slate-100 rounded-2xl">
                                <div className="h-14 w-14 rounded-2xl bg-slate-900 flex items-center justify-center text-white text-xl font-black italic shadow-active shrink-0">
                                    {result.title.charAt(0)}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-black italic uppercase leading-none mb-1 truncate">{result.title}</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{result.metadata.doc_number}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                                <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100">
                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-rose-500 mb-1">Deuda Vigente</p>
                                    <p className="text-2xl font-black italic text-rose-900">
                                        {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(result.metadata.current_debt || 0)}
                                    </p>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-xl">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Última Operación</p>
                                    <p className="text-xs font-bold text-slate-600 italic">
                                        {result.metadata.last_purchase_date ? new Date(result.metadata.last_purchase_date).toLocaleDateString('es-CO') : 'Sin historial'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    );
                case 'DOCUMENT':
                    return (
                        <div className="space-y-4">
                            <div className="p-5 bg-slate-900 rounded-[2rem] text-white shadow-xl relative overflow-hidden">
                                <div className="flex justify-between items-start mb-6 border-b border-white/10 pb-4">
                                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 italic">{result.metadata.doc_type}</p>
                                    <Badge className={cn(
                                        "text-[9px] font-black px-2 py-0.5 border-none",
                                        result.metadata.status === 'PAID' ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white'
                                    )}>{result.metadata.status}</Badge>
                                </div>
                                <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-1 italic">Monto Total</p>
                                <p className="text-2xl font-black italic tracking-tight">{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(result.metadata.total)}</p>
                                <LayoutDashboard className="absolute bottom-[-10px] right-[-10px] h-20 w-20 text-white/5 -rotate-12" />
                            </div>
                            <div className="space-y-3 p-1">
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Cliente / Beneficiario</p>
                                    <p className="text-xs font-black italic text-slate-700 truncate">{result.metadata.party_name || 'Sin Asignar'}</p>
                                </div>
                                <div className="flex justify-between items-center text-[10px]">
                                    <span className="font-bold text-slate-400 uppercase tracking-widest">Emisión</span>
                                    <span className="font-black italic text-slate-600">{result.metadata.issue_date}</span>
                                </div>
                            </div>
                        </div>
                    );
                case 'LEAD':
                    return (
                        <div className="space-y-4">
                            <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                                <p className="text-[9px] font-black uppercase tracking-widest text-indigo-400 mb-1">Empresa</p>
                                <p className="text-sm font-black italic text-indigo-900">{result.metadata.company_name || 'Particular'}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="p-3 bg-slate-50 rounded-xl">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Estado</p>
                                    <Badge className="text-[8px] uppercase">{result.metadata.status}</Badge>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-xl">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Origen</p>
                                    <p className="text-xs font-bold">{result.metadata.source || 'Sin datos'}</p>
                                </div>
                            </div>
                        </div>
                    );
                case 'TICKET':
                    return (
                        <div className="space-y-4">
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex gap-4">
                                <div className="h-10 w-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0">
                                    <HelpCircle className="h-5 w-5 text-indigo-500" />
                                </div>
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-indigo-500 mb-0.5 italic">Asunto</p>
                                    <p className="text-xs font-black italic text-slate-900 line-clamp-2">{result.metadata.subject}</p>
                                </div>
                            </div>

                            <div className="p-4 bg-white border border-slate-100 rounded-2xl">
                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Descripción</p>
                                <p className="text-[10px] font-bold text-slate-600 leading-relaxed italic line-clamp-3">
                                    "{result.metadata.description || 'Sin descripción detallada...'}"
                                </p>
                            </div>

                            <div className="flex items-center gap-3 p-3 bg-indigo-900 rounded-2xl shadow-lg">
                                <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center">
                                    <Users className="h-4 w-4 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[8px] font-black text-indigo-300 uppercase tracking-widest leading-none mb-1">Asignado a</p>
                                    <p className="text-[10px] font-black text-white italic truncate">{result.metadata.assigned_to || 'Sin asignar'}</p>
                                </div>
                            </div>
                        </div>
                    );
                case 'ACCOUNT':
                    return (
                        <div className="space-y-4">
                            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                                <p className="text-[9px] font-black uppercase tracking-widest text-emerald-400 mb-1">Saldo Disponible</p>
                                <p className="text-2xl font-black italic text-emerald-900">
                                    {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(result.metadata.balance)}
                                </p>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-xl">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Banco / Tipo</p>
                                <p className="text-xs font-bold">{result.metadata.bank_name || 'Efectivo'}</p>
                                <p className="text-[9px] font-medium text-slate-400 italic">No: {result.metadata.account_number || '---'}</p>
                            </div>
                        </div>
                    );
                case 'HELP':
                    return (
                        <div className="space-y-6">
                            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                                <p className="text-[9px] font-black uppercase tracking-widest text-amber-500 mb-2">Base de Conocimientos</p>
                                <p className="text-sm font-black italic text-amber-900 leading-tight">{result.title}</p>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">¿Qué incluye?</p>
                                    <ul className="space-y-1.5">
                                        {result.metadata.content.features.slice(0, 3).map((f: string, i: number) => (
                                            <li key={i} className="text-[10px] font-bold text-slate-500 flex items-start gap-2 italic">
                                                <CheckCircle2 className="h-3 w-3 text-amber-500 mt-0.5 shrink-0" />
                                                {f}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {result.metadata.content.workflow && (
                                    <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 shadow-xl">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-3">Guía de Acción</p>
                                        <div className="space-y-3">
                                            {result.metadata.content.workflow.slice(0, 2).map((w: any) => (
                                                <div key={w.step} className="flex gap-3 items-start border-l-2 border-indigo-500/30 pl-3">
                                                    <span className="text-[10px] font-black text-indigo-400 italic shrink-0">0{w.step}</span>
                                                    <div>
                                                        <p className="text-[10px] font-black text-white italic mb-0.5">{w.title}</p>
                                                        <p className="text-[8px] font-bold text-slate-400 leading-tight">{w.description}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                default:
                    return <p className="text-xs text-slate-400 italic">Previsualización no disponible para esta categoría.</p>;
            }
        };

        return (
            <div className="h-full p-8 flex flex-col">
                <div className="flex-1">
                    <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] mb-8 italic flex items-center gap-2">
                        <Activity className="h-3 w-3 text-indigo-500" /> Vista Previa Inteligente
                    </h4>
                    {renderDetails()}
                </div>
                <div className="mt-8 pt-6 border-t border-slate-100">
                    <button
                        onClick={() => handleSelect(result)}
                        className="w-full bg-slate-900 text-white rounded-xl py-3 text-[10px] font-black uppercase tracking-[0.2em] italic flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors"
                    >
                        Abrir Registro Completo <ArrowRight className="h-3 w-3" />
                    </button>
                    <p className="text-[8px] text-center text-slate-400 mt-4 uppercase tracking-widest font-bold">Presiona Enter para navegar</p>
                </div>
            </div>
        );
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="max-w-4xl p-0 bg-white/80 backdrop-blur-2xl border-slate-200/50 shadow-2xl rounded-[2rem] overflow-hidden gap-0">
                <DialogHeader className="sr-only">
                    <DialogTitle>Buscador Maestro Maestro 360</DialogTitle>
                    <DialogDescription>
                        Busca productos, clientes, documentos y ejecuta comandos de IA.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex items-center gap-3 p-6 border-b border-slate-100 bg-white/50">
                    <div className="h-10 w-10 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-active">
                        <Command className="h-5 w-5" />
                    </div>
                    <div className="flex-1 relative flex items-center gap-2">
                        {activeFilter && filterMap[activeFilter] && (
                            <Badge className={cn("shrink-0 h-6 px-2 text-[10px] font-black uppercase italic animate-in fade-in zoom-in duration-300", filterMap[activeFilter].color)}>
                                {filterMap[activeFilter].label}
                            </Badge>
                        )}
                        <Input
                            autoFocus
                            placeholder={activeFilter ? "Buscando en esta categoría..." : "p:Producto, c:Cliente, t:Tesorería..."}
                            className="w-full bg-transparent border-none text-xl font-bold tracking-tight italic placeholder:text-slate-300 focus-visible:ring-0 focus-visible:ring-offset-0 px-0 h-10"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-2">
                            <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest text-slate-400 border-slate-100">ESC para salir</Badge>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[1fr,320px] divide-x divide-slate-100">
                    <div className="flex flex-col">
                        <ScrollArea className="h-[60vh]">
                            <div className="p-3 space-y-2">
                                {loading ? (
                                    <div className="py-20 text-center animate-pulse">
                                        <Search className="h-10 w-10 text-slate-200 mx-auto mb-4 animate-bounce" />
                                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] italic">Consultando Inteligencia Central...</p>
                                    </div>
                                ) : query.length === 0 && history.length > 0 ? (
                                    <div className="space-y-4 p-2">
                                        <h4 className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em] italic flex items-center gap-2 px-2">
                                            <History className="h-3 w-3" /> Búsquedas Recientes
                                        </h4>
                                        <div className="space-y-1">
                                            {history.map((item, index) => (
                                                <button
                                                    key={`hist-${item.id}`}
                                                    className={cn(
                                                        "w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 group text-left border border-transparent",
                                                        selectedIndex === index
                                                            ? "bg-slate-900 text-white shadow-active scale-[1.02] border-slate-800"
                                                            : "hover:bg-slate-50 text-slate-600"
                                                    )}
                                                    onClick={() => handleSelect(item)}
                                                    onMouseEnter={() => setSelectedIndex(index)}
                                                >
                                                    <div className={cn(
                                                        "h-10 w-10 rounded-[1rem] flex items-center justify-center shrink-0 shadow-sm transition-colors",
                                                        selectedIndex === index ? "bg-white/10 text-white" : "bg-white border border-slate-100 text-slate-400 group-hover:text-slate-900"
                                                    )}>
                                                        {getIcon(item.category, item.icon)}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-black uppercase tracking-tight italic line-clamp-1">{item.title}</span>
                                                            <Badge className={cn(
                                                                "text-[7px] font-black tracking-widest uppercase px-1.5 h-4 border-none shrink-0",
                                                                selectedIndex === index ? "bg-white/10 text-white" : "bg-slate-50 text-slate-400"
                                                            )}>
                                                                {item.category}
                                                            </Badge>
                                                        </div>
                                                        <p className="text-[10px] font-bold line-clamp-1 italic mt-0.5 text-slate-400">{item.subtitle}</p>
                                                    </div>
                                                    <ChevronRight className={cn("h-4 w-4 transition-all", selectedIndex === index ? "opacity-100 translate-x-0" : "opacity-0")} />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ) : results.length > 0 ? (
                                    <div className="space-y-1">
                                        {results.map((result, index) => (
                                            <button
                                                key={result.id}
                                                onClick={() => handleSelect(result)}
                                                onMouseEnter={() => setSelectedIndex(index)}
                                                className={cn(
                                                    "w-full flex items-center gap-5 p-4 rounded-2xl transition-all duration-300 group text-left",
                                                    selectedIndex === index ? "bg-slate-900 text-white shadow-2xl scale-[1.02] translate-x-1" :
                                                        result.suggestion ? "bg-amber-50/50 border border-amber-100 hover:bg-amber-50" : "hover:bg-slate-50"
                                                )}
                                            >
                                                <div className={cn(
                                                    "h-10 w-10 rounded-[1rem] flex items-center justify-center shrink-0 shadow-sm transition-colors",
                                                    selectedIndex === index ? "bg-white/10 text-white" :
                                                        result.suggestion ? "bg-amber-100 text-amber-600" : "bg-white border border-slate-100 text-slate-400 group-hover:text-slate-900"
                                                )}>
                                                    {result.suggestion ? <ShieldAlert className="h-5 w-5" /> : getIcon(result.category, result.icon)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    {result.suggestion && (
                                                        <p className={cn(
                                                            "text-[8px] font-black uppercase tracking-[0.2em] mb-0.5 italic",
                                                            selectedIndex === index ? "text-amber-400" : "text-amber-600"
                                                        )}>Quizás quisiste decir:</p>
                                                    )}
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-black uppercase tracking-tight italic line-clamp-1">{result.title}</span>
                                                        <Badge className={cn(
                                                            "text-[7px] font-black tracking-widest uppercase px-1.5 h-4 border-none shrink-0",
                                                            selectedIndex === index ? "bg-white/10 text-white" :
                                                                result.suggestion ? "bg-amber-200 text-amber-900" : "bg-slate-50 text-slate-400"
                                                        )}>
                                                            {result.suggestion ? 'IA SUGGEST' : result.category}
                                                        </Badge>
                                                    </div>
                                                    {!result.suggestion && result.subtitle && (
                                                        <p className={cn(
                                                            "text-[10px] font-bold line-clamp-1 italic mt-0.5",
                                                            selectedIndex === index ? "text-slate-400" : "text-slate-400"
                                                        )}>{result.subtitle}</p>
                                                    )}
                                                </div>
                                                <div className={cn(
                                                    "transition-all duration-300",
                                                    selectedIndex === index ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2"
                                                )}>
                                                    <ChevronRight className="h-4 w-4" />
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                ) : query.length > 0 ? (
                                    <div className="py-20 text-center space-y-4">
                                        <div className="h-20 w-20 rounded-3xl bg-slate-50 flex items-center justify-center mx-auto text-slate-200">
                                            <HelpCircle className="h-10 w-10" />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] italic">No se encontraron registros</p>
                                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Intenta con otros términos o usa /comandos</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="py-12 px-6">
                                        <div className="mb-8">
                                            <h4 className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em] mb-6 italic flex items-center gap-2">
                                                <Zap className="h-3 w-3 text-indigo-500" /> Accesos Rápidos Inteligentes
                                            </h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {staticCommands.map((cmd) => (
                                                    <button
                                                        key={cmd.id}
                                                        onClick={() => handleSelect(cmd)}
                                                        className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-slate-100 hover:border-indigo-200 hover:bg-slate-50/50 transition-all group text-left shadow-sm hover:shadow-md"
                                                    >
                                                        <div className={cn(
                                                            "h-9 w-9 rounded-xl flex items-center justify-center transition-all shadow-inner",
                                                            cmd.icon === 'Brain' ? "bg-indigo-50 text-indigo-500 group-hover:bg-indigo-600 group-hover:text-white" :
                                                                cmd.icon === 'Sparkles' ? "bg-amber-50 text-amber-500 group-hover:bg-amber-600 group-hover:text-white" :
                                                                    "bg-slate-50 text-slate-400 group-hover:bg-slate-900 group-hover:text-white"
                                                        )}>
                                                            {getIcon(cmd.category, cmd.icon)}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-[10px] font-black uppercase tracking-tight italic text-slate-900">{cmd.title}</p>
                                                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest line-clamp-1">{cmd.subtitle}</p>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100 flex items-center justify-between group cursor-help transition-all hover:bg-white hover:shadow-active">
                                            <div className="flex items-center gap-6">
                                                <div className="h-16 w-16 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm group-hover:rotate-12 transition-transform">
                                                    <Command className="h-8 w-8" />
                                                </div>
                                                <div className="space-y-1">
                                                    <h4 className="text-sm font-black italic uppercase tracking-tight text-slate-900">Búsqueda Maestro Maestro 360</h4>
                                                    <p className="text-[10px] font-medium text-slate-400 leading-relaxed italic max-w-xs">Navega instantáneamente entre facturas, proveedores y productos sin quitar las manos del teclado.</p>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                <div className="flex gap-1">
                                                    <kbd className="px-2 py-1 rounded-md bg-white border border-slate-200 text-[10px] font-black shadow-sm">CTRL</kbd>
                                                    <kbd className="px-2 py-1 rounded-md bg-white border border-slate-200 text-[10px] font-black shadow-sm">K</kbd>
                                                </div>
                                                <div className="flex items-center gap-2 text-indigo-500 animate-bounce mt-2">
                                                    <span className="text-[8px] font-black uppercase tracking-widest italic">Comienza a escribir</span>
                                                    <ArrowRight className="h-3 w-3" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </div>

                    {/* Preview Panel (Solo desktop) */}
                    <div className="hidden md:block bg-slate-50/30">
                        {(() => {
                            const currentList = (query.length === 0 && history.length > 0) ? history : results;
                            const result = currentList[selectedIndex];

                            if (result) {
                                return <PreviewPanel result={result} />;
                            }

                            return (
                                <div className="h-full flex flex-col items-center justify-center p-12 text-center space-y-4 opacity-30 grayscale">
                                    <Activity className="h-12 w-12 text-slate-300" />
                                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 italic">Selecciona un registro para previsualizar</p>
                                </div>
                            );
                        })()}
                    </div>
                </div>

                <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 grayscale opacity-50">
                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] italic">Desarrollado con</span>
                            <Zap className="h-2.5 w-2.5 text-indigo-600 fill-indigo-600" />
                            <span className="text-[8px] font-black text-slate-900 uppercase tracking-[0.2em] italic">Inteligencia Artificial</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Badge className="bg-white text-slate-400 border-slate-200 text-[8px] font-black uppercase px-1.5 h-4">Ctrl + K</Badge>
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest italic">Atajo Global</span>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export function CommandPaletteTrigger() {
    const [isMac, setIsMac] = useState(false);

    useEffect(() => {
        setIsMac(navigator.platform.toUpperCase().indexOf('MAC') >= 0);
    }, []);

    return (
        <button
            onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
            className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-white hover:shadow-sm transition-all group lg:min-w-[300px]"
        >
            <Search className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
            <span className="text-[11px] font-bold text-slate-400 group-hover:text-slate-600 transition-colors italic">Buscador Maestro...</span>
            <div className="ml-auto flex items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                <kbd className="px-1.5 py-0.5 rounded border border-slate-200 bg-white text-[9px] font-black">{isMac ? '⌘' : 'CTRL'}</kbd>
                <kbd className="px-1.5 py-0.5 rounded border border-slate-200 bg-white text-[9px] font-black">K</kbd>
            </div>
        </button>
    );
}
