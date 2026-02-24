import { ChatInterface } from "@/features/collaboration/components/ChatInterface";
import { MessageSquare } from "lucide-react";

export default function CollaborationPage() {
    return (
        <div className="p-8 lg:p-12 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 md:gap-8">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="h-10 w-10 md:h-12 md:w-12 rounded-[1rem] md:rounded-[1.2rem] bg-indigo-50 flex items-center justify-center text-primary shadow-sm">
                            <MessageSquare className="h-5 w-5 md:h-6 md:w-6" />
                        </div>
                        <span className="text-slate-400 font-bold text-[10px] md:text-xs uppercase tracking-[0.2em]">Centro de Comunicación</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter text-slate-900 italic leading-none">
                        Colaboración
                    </h1>
                    <p className="text-slate-500 font-bold text-xs md:text-sm mt-3 flex items-center gap-2">
                        Chat interno, intercambio de archivos y trabajo en equipo.
                    </p>
                </div>
            </div>

            {/* Chat Interface */}
            <ChatInterface />
        </div>
    );
}
