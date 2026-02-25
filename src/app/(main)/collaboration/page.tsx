import { ChatInterface } from "@/features/collaboration/components/ChatInterface";
import { MessageSquare, ShieldCheck, Zap, Radio } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";

export default function CollaborationPage() {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 pb-12">
            {/* 🏎️ PREMIUM HEADER V3 */}
            <div className="relative overflow-hidden bg-slate-950 rounded-[4rem] p-12 text-white shadow-active group">
                {/* Decorators */}
                <div className="absolute top-0 right-0 p-12 opacity-[0.05] pointer-events-none group-hover:scale-125 group-hover:rotate-12 transition-transform duration-1000">
                    <Radio className="h-56 w-56 text-white" />
                </div>
                <div className="absolute -bottom-10 -left-10 opacity-[0.03] pointer-events-none">
                    <MessageSquare className="h-64 w-64 text-white" />
                </div>

                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_#34d399]" />
                            <span className="text-[9px] font-black uppercase tracking-[0.5em] text-emerald-400/80 italic">Comunicación en Tiempo Real</span>
                        </div>
                        <h1 className="text-5xl md:text-6xl font-black tracking-tighter italic uppercase leading-tight">
                            Centro de<br />
                            <span className="text-indigo-400">Colaboración</span>
                        </h1>
                        <p className="text-slate-500 font-bold text-xs uppercase tracking-[0.3em] max-w-md">
                            Chat corporativo cifrado, intercambio de archivos y coordinación de equipos en un solo nodo.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Badge className="bg-white/5 border border-white/10 text-slate-400 text-[9px] font-black uppercase tracking-[0.3em] px-5 py-2.5 rounded-full">
                            <Zap className="h-3 w-3 mr-2 text-indigo-400 animate-pulse" />
                            WebSocket Activo
                        </Badge>
                        <Badge className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase tracking-[0.3em] px-5 py-2.5 rounded-full">
                            <ShieldCheck className="h-3 w-3 mr-2" />
                            E2E
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Chat Interface */}
            <ChatInterface />
        </div>
    );
}
