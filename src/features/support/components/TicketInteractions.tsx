"use client"

import { useState } from "react";
import { TicketInteraction } from "../types";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Send, Lock, User } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { addInteractionAction } from "../actions";
import { toast } from "sonner";

interface Props {
    ticketId: string;
    initialInteractions: TicketInteraction[];
}

export function TicketInteractions({ ticketId, initialInteractions }: Props) {
    const [interactions, setInteractions] = useState(initialInteractions);
    const [newNote, setNewNote] = useState("");
    const [isInternal, setIsInternal] = useState(false);
    const [isSending, setIsSending] = useState(false);

    const handleSubmit = async () => {
        if (!newNote.trim()) return;

        setIsSending(true);
        const result = await addInteractionAction(ticketId, newNote, isInternal);
        setIsSending(false);

        if (result.error) {
            toast.error(result.error);
        } else {
            setInteractions(prev => [...prev, result.data as TicketInteraction]);
            setNewNote("");
            toast.success("Mensaje enviado");
        }
    };

    return (
        <div className="flex flex-col h-full space-y-8">
            {/* Timeline */}
            <div className="flex-1 space-y-8 pr-2 custom-scrollbar">
                {interactions.map((interaction, idx) => (
                    <div key={interaction.id} className={cn(
                        "flex gap-4",
                        interaction.is_internal ? "opacity-90" : ""
                    )}>
                        <Avatar className="h-10 w-10 border-2 border-white shadow-sm shrink-0">
                            <AvatarFallback className={cn(
                                "font-black text-[10px]",
                                interaction.is_internal ? "bg-amber-100 text-amber-700" : "bg-indigo-100 text-indigo-700"
                            )}>
                                {interaction.author?.full_name?.charAt(0) || <User className="h-4 w-4" />}
                            </AvatarFallback>
                        </Avatar>

                        <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="font-black text-xs text-slate-900">{interaction.author?.full_name || "Sistema"}</span>
                                <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">
                                    {format(new Date(interaction.created_at), 'HH:mm', { locale: es })}
                                </span>
                                {interaction.is_internal && (
                                    <Badge variant="outline" className="bg-amber-50 text-amber-600 border-none px-1.5 py-0 h-4 text-[8px] font-black uppercase tracking-tighter">
                                        <Lock className="h-2 w-2 mr-1" /> Nota Interna
                                    </Badge>
                                )}
                            </div>
                            <div className={cn(
                                "p-4 rounded-2xl text-sm leading-relaxed",
                                interaction.is_internal
                                    ? "bg-amber-50/50 border border-amber-100 text-amber-900 italic"
                                    : "bg-white border border-slate-100 text-slate-700 shadow-sm"
                            )}>
                                {formatContent(interaction.content)}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Input */}
            <div className="bg-slate-50 rounded-[2rem] p-4 space-y-3 sticky bottom-0">
                <Textarea
                    placeholder="Escribe un mensaje o mención @..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="border-none bg-transparent shadow-none focus-visible:ring-0 resize-none min-h-[80px] font-medium text-sm placeholder:text-slate-300"
                />
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsInternal(!isInternal)}
                            className={cn(
                                "h-8 px-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                                isInternal ? "bg-amber-100 text-amber-600" : "text-slate-400 hover:bg-slate-100"
                            )}
                        >
                            <Lock className="h-3.5 w-3.5 mr-1.5" /> Interno
                        </Button>
                    </div>
                    <Button
                        disabled={isSending || !newNote.trim()}
                        onClick={handleSubmit}
                        className="h-10 px-6 rounded-xl bg-slate-900 hover:bg-primary text-white font-black shadow-active transition-all active:scale-95"
                    >
                        {isSending ? (
                            <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <><Send className="h-4 w-4 mr-2" /> Enviar</>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}

function formatContent(content: string) {
    const mentionRegex = /(@\w+)/g;
    const parts = content.split(mentionRegex);

    return parts.map((part, i) => {
        if (part.match(mentionRegex)) {
            return (
                <span key={i} className="px-1.5 py-0.5 rounded-md bg-indigo-100 text-indigo-700 font-black text-[10px] uppercase tracking-tighter mx-0.5">
                    {part}
                </span>
            );
        }
        return part;
    });
}

function Badge({ children, variant, className }: any) {
    return (
        <div className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2", className)}>
            {children}
        </div>
    )
}
