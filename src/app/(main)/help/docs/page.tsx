"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import { cn } from "@/shared/lib/utils";
import {
    LayoutDashboard,
    Users,
    ShoppingCart,
    Truck,
    Boxes,
    Factory,
    Calculator,
    ArrowLeft,
    ChevronRight,
    Search,
    BookOpen,
    CheckCircle2,
    Target,
    Lightbulb,
    Zap,
    GraduationCap,
    Copy,
    Share2,
    ExternalLink,
    BarChart3
} from "lucide-react";
import Link from "next/link";
import { helpService } from "@/features/help/services/helpService";
import { useI18n } from "@/shared/stores/useLanguageStore";
import { toast } from "sonner";

const ACADEMY_URL = "/academy";
const CONSULTANCY_URL = "https://calendly.com/gvmsas";

export default function DocsPage() {
    const { t, language } = useI18n();
    const [sections, setSections] = useState<any[]>([]);
    const [activeSection, setActiveSection] = useState("onboarding");
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);

    const handleCopyLink = () => {
        navigator.clipboard.writeText(window.location.href);
        toast.success("Enlace copiado al portapapeles");
    };

    const handleAcademyClick = () => {
        window.location.href = ACADEMY_URL;
    };

    const handleConsultancyClick = () => {
        window.open(CONSULTANCY_URL, "_blank");
    };

    useEffect(() => {
        const loadDocs = async () => {
            setLoading(true);
            const data = await helpService.getDocs(language as any);
            setSections(data);
            if (data.length > 0 && !activeSection) {
                setActiveSection(data[0].id);
            }
            setLoading(false);
        };
        loadDocs();
    }, [language]);

    useEffect(() => {
        const performSearch = async () => {
            if (!searchQuery) {
                const data = await helpService.getDocs(language as any);
                setSections(data);
                return;
            }
            const results = await helpService.searchDocs(searchQuery, language as any);
            setSections(results);
            if (results.length > 0 && !results.find(s => s.id === activeSection)) {
                setActiveSection(results[0].id);
            }
        };
        const timer = setTimeout(performSearch, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, language]);

    const currentSection = sections.find(s => s.id === activeSection);

    return (
        <div className="min-h-screen pb-32 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {/* 🏗️ PREMIUM INDUSTRIAL HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-10 mb-16 px-2">
                <div className="flex items-center gap-8">
                    <div className="h-20 w-20 rounded-[2rem] bg-slate-950 flex items-center justify-center text-white shadow-premium group-hover:rotate-12 transition-all duration-700 border-4 border-white">
                        <BookOpen className="h-10 w-10 text-amber-500" />
                    </div>
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-3">
                            <h1 className="text-6xl font-black tracking-tighter text-slate-950 italic">MANUAL<span className="text-indigo-600 block md:inline font-black not-italic ml-2">{t.help.version_v35.split(' ')[0]}</span></h1>
                            <Badge className="bg-amber-50 text-amber-600 border border-amber-100 font-black text-[10px] uppercase tracking-[0.2em] px-3 py-1 mt-2">
                                {t.help.user_manual_corp}
                            </Badge>
                        </div>
                        <div className="flex items-center gap-4">
                            <p className="text-slate-400 font-black text-xs uppercase tracking-[0.4em] italic">{t.help.intel_guide}</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <Button
                        variant="outline"
                        onClick={handleCopyLink}
                        className="h-14 px-8 rounded-2xl border-slate-100 bg-white text-slate-400 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm"
                    >
                        <Share2 className="h-4 w-4 mr-3" /> {t.help.share}
                    </Button>
                    <Button
                        onClick={handleAcademyClick}
                        className="h-16 px-10 rounded-2xl bg-slate-950 text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-indigo-600 transition-all active:scale-95 group"
                    >
                        <GraduationCap className="h-5 w-5 mr-3 group-hover:rotate-12 transition-transform" /> {t.help.academy}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Sidebar Navigation */}
                <div className="lg:col-span-3">
                    <div className="sticky top-8 space-y-6">
                        {/* Search */}
                        <div className="relative group">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                            <Input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Buscar en el manual..."
                                className="h-14 pl-14 bg-white border-none shadow-premium rounded-2xl font-black text-xs uppercase tracking-widest text-slate-950 placeholder:text-slate-300 focus-visible:ring-2 focus-visible:ring-indigo-600/10 placeholder:font-black"
                            />
                        </div>

                        {/* Nav Items */}
                        <Card className="bg-white border-none shadow-premium rounded-[2.5rem] overflow-hidden">
                            <div className="p-6 pb-2 border-b border-slate-50">
                                <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] italic">Módulos de Sistema</span>
                            </div>
                            <CardContent className="p-3 max-h-[600px] overflow-y-auto custom-scrollbar">
                                {loading ? (
                                    <div className="p-8 text-center">
                                        <div className="h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cargando Guías...</span>
                                    </div>
                                ) : sections.map((section) => (
                                    <button
                                        key={section.id}
                                        onClick={() => setActiveSection(section.id)}
                                        className={cn(
                                            "w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-left transition-all group mb-1",
                                            activeSection === section.id
                                                ? "bg-slate-950 text-white shadow-xl shadow-slate-950/20 translate-x-2"
                                                : "text-slate-500 hover:bg-slate-50 hover:text-slate-950"
                                        )}
                                    >
                                        <div className={cn(
                                            "h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition-all",
                                            activeSection === section.id
                                                ? "bg-amber-600 text-white"
                                                : `${section.bg} ${section.color} border border-transparent`
                                        )}>
                                            <section.icon className="h-5 w-5" />
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-[10px] font-black uppercase tracking-widest truncate italic">{section.title}</span>
                                            {activeSection === section.id && (
                                                <span className="text-[7px] font-black text-amber-500/80 uppercase tracking-[0.2em] mt-0.5">LECTURA ACTIVA</span>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </CardContent>
                        </Card>

                        <div className="p-8 bg-indigo-600 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden group/card shadow-indigo-200">
                            <div className="absolute right-0 bottom-0 p-4 opacity-10 pointer-events-none group-hover/card:scale-125 transition-transform duration-1000">
                                <Zap className="h-24 w-24" />
                            </div>
                            <h4 className="text-lg font-black italic tracking-tight leading-none mb-2">{t.help.need_help}</h4>
                            <p className="text-[10px] font-bold text-indigo-100 uppercase tracking-widest leading-relaxed mb-6">{t.help.help_desc}</p>
                            <Button
                                onClick={handleConsultancyClick}
                                variant="outline"
                                className="w-full h-12 rounded-xl bg-white/10 border-white/20 text-white hover:bg-white hover:text-indigo-600 font-black text-[9px] uppercase tracking-widest"
                            >
                                {t.help.schedule_consultancy}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="lg:col-span-9 space-y-8">
                    {currentSection ? (
                        <>
                            {/* Section Header */}
                            <Card className="bg-white border-none shadow-premium rounded-[3rem] overflow-hidden mb-8">
                                <div className={cn("h-4", currentSection.id === 'onboarding' ? 'bg-gradient-to-r from-amber-500 via-indigo-600 to-emerald-500' : currentSection.bg.replace("bg-", "bg-") + " bg-slate-950")} />
                                <CardContent className="p-14">
                                    <div className="flex flex-col md:flex-row items-start gap-12 mb-10">
                                        <div className={cn(
                                            "h-24 w-24 rounded-[2rem] flex items-center justify-center shadow-premium shrink-0 group-hover:scale-110 transition-transform duration-700",
                                            currentSection.bg,
                                            currentSection.color,
                                            "border-2 border-white"
                                        )}>
                                            <currentSection.icon className="h-10 w-10" />
                                        </div>
                                        <div className="space-y-4 max-w-2xl">
                                            <div className="flex items-center gap-4">
                                                <h2 className="text-5xl font-black text-slate-950 tracking-tighter italic leading-none">{currentSection.title}</h2>
                                                {currentSection.id === 'onboarding' && (
                                                    <Badge className="bg-amber-100 text-amber-700 animate-pulse border-none px-3 py-1 font-black text-[10px] uppercase tracking-widest">{t.help.fundamental}</Badge>
                                                )}
                                            </div>
                                            <p className="text-xl font-bold text-slate-400 leading-relaxed italic">
                                                {currentSection.content.description}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Subsections Links */}
                                    {currentSection.content.subsections && currentSection.content.subsections.length > 0 && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-12 p-8 bg-slate-50/50 rounded-[2.5rem] border border-slate-100 shadow-inner">
                                            {currentSection.content.subsections.map((sub: any, i: number) => (
                                                <Link
                                                    key={`${sub.path}-${i}`}
                                                    href={sub.path}
                                                    className="flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-100 hover:border-indigo-600 hover:shadow-premium transition-all group/sub"
                                                >
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-black text-slate-950 uppercase tracking-widest">{sub.title}</span>
                                                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">{t.help.go_to_module}</span>
                                                    </div>
                                                    <ExternalLink className="h-4 w-4 text-slate-300 group-hover/sub:text-indigo-600 group-hover/sub:translate-x-1 transition-all" />
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Features */}
                            <Card className="bg-white border-none shadow-premium rounded-[3rem] overflow-hidden mb-8">
                                <CardContent className="p-14">
                                    <div className="flex items-center gap-6 mb-12">
                                        <div className="h-14 w-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-sm">
                                            <CheckCircle2 className="h-8 w-8" />
                                        </div>
                                        <div className="flex flex-col">
                                            <h3 className="text-2xl font-black text-slate-950 tracking-tight italic uppercase">{t.help.module_capabilities}</h3>
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-1 italic leading-none">{t.help.master_functions}</span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {currentSection.content.features.map((feature: string, i: number) => (
                                            <div
                                                key={i}
                                                className="flex items-start gap-5 p-6 rounded-[1.5rem] bg-slate-50/50 hover:bg-white hover:shadow-premium transition-all border border-transparent hover:border-slate-100 group/feat"
                                            >
                                                <div className="h-8 w-8 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5 group-hover/feat:scale-110 transition-transform">
                                                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                                </div>
                                                <span className="text-[13px] font-bold text-slate-600 leading-relaxed group-hover:text-slate-950 transition-colors">{feature}</span>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Workflow */}
                            {currentSection.content.workflow && (
                                <Card className="bg-white border-none shadow-premium rounded-[3rem] overflow-hidden mb-8">
                                    <CardContent className="p-14">
                                        <div className="flex items-center gap-6 mb-12">
                                            <div className="h-14 w-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-sm">
                                                <Target className="h-8 w-8" />
                                            </div>
                                            <div className="flex flex-col">
                                                <h3 className="text-2xl font-black text-slate-950 tracking-tight italic uppercase">{t.help.suggested_workflow}</h3>
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-1 italic leading-none">{t.help.efficiency_steps}</span>
                                            </div>
                                        </div>
                                        <div className="space-y-4 relative">
                                            <div className="absolute left-7 top-0 bottom-0 w-0.5 bg-slate-50" />
                                            {currentSection.content.workflow.map((step: any, i: number) => (
                                                <div key={i} className="flex gap-10 group relative z-10">
                                                    {/* Timeline */}
                                                    <div className="flex flex-col items-center">
                                                        <div className="h-14 w-14 rounded-2xl bg-slate-950 border-4 border-white flex items-center justify-center text-amber-500 font-black text-xl shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-premium group-hover:rotate-6">
                                                            {step.step}
                                                        </div>
                                                    </div>
                                                    {/* Content */}
                                                    <div className="pb-10 pt-2 flex-1">
                                                        <div className="p-6 rounded-[1.5rem] bg-slate-50/50 border border-transparent hover:border-slate-100 hover:bg-white hover:shadow-premium transition-all">
                                                            <h4 className="text-lg font-black text-slate-950 tracking-tight mb-2 italic uppercase">{step.title}</h4>
                                                            <p className="text-sm text-slate-500 font-bold leading-relaxed">{step.description}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Subsections Detail */}
                            {currentSection.content.subsections && currentSection.content.subsections.length > 0 && (
                                <Card className="bg-white border-none shadow-sm rounded-[2rem] overflow-hidden">
                                    <CardContent className="p-10">
                                        <div className="flex items-center gap-3 mb-8">
                                            <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                                <BarChart3 className="h-5 w-5" />
                                            </div>
                                            <h3 className="text-xl font-black text-slate-900 tracking-tight">{t.help.module_sections}</h3>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {currentSection.content.subsections.map((sub: any, i: number) => (
                                                <Link
                                                    key={`${sub.path}-${i}`}
                                                    href={sub.path}
                                                    className="flex items-center gap-4 p-5 rounded-2xl bg-slate-50/50 hover:bg-slate-50 hover:shadow-sm transition-all group border border-transparent hover:border-slate-100"
                                                >
                                                    <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-slate-300 group-hover:text-primary shadow-sm transition-colors shrink-0">
                                                        <ChevronRight className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-black text-slate-900 group-hover:text-primary transition-colors">{sub.title}</h4>
                                                        <p className="text-xs text-slate-400 font-medium mt-0.5">{sub.description}</p>
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Tips */}
                            {currentSection.content.tips && (
                                <Card className="bg-slate-950 border-none shadow-2xl rounded-[3rem] overflow-hidden group/tips relative">
                                    <div className="absolute right-0 top-0 p-8 opacity-10 pointer-events-none group-hover/tips:rotate-12 transition-transform duration-1000">
                                        <Lightbulb className="h-40 w-40 text-amber-500" />
                                    </div>
                                    <CardContent className="p-14 relative z-10">
                                        <div className="flex items-center gap-6 mb-10">
                                            <div className="h-16 w-16 rounded-2xl bg-amber-500 flex items-center justify-center text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                                                <Lightbulb className="h-8 w-8" />
                                            </div>
                                            <div className="flex flex-col">
                                                <h3 className="text-2xl font-black text-white tracking-tight italic uppercase">{t.help.pro_tips}</h3>
                                                <span className="text-[10px] font-black text-amber-500/60 uppercase tracking-[0.4em] mt-1 italic leading-none">{t.help.expert_secrets}</span>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {currentSection.content.tips.map((tip: string, i: number) => (
                                                <div key={i} className="flex items-start gap-5 p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group/tip">
                                                    <Zap className="h-5 w-5 text-amber-500 mt-0.5 shrink-0 group-hover/tip:scale-125 transition-transform" />
                                                    <span className="text-sm font-bold text-slate-300 leading-relaxed italic">{tip}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </>
                    ) : (
                        <div className="py-20 text-center">
                            <p className="text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                                {t.help.no_results} "{searchQuery}"
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
