"use client";

import { useState } from "react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import { cn } from "@/shared/lib/utils";
import {
    HelpCircle,
    BookOpen,
    LifeBuoy,
    ChevronRight,
    Zap,
    X,
    Send
} from "lucide-react";
import Link from "next/link";
import { helpService } from "@/features/help/services/helpService";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/shared/components/ui/dialog";
import { Textarea } from "@/shared/components/ui/textarea";
import { useI18n } from "@/shared/stores/useLanguageStore";

export default function HelpPage() {
    const { t } = useI18n();
    const [isTicketOpen, setIsTicketOpen] = useState(false);
    const [ticketData, setTicketData] = useState({ subject: "", description: "" });
    const [submitting, setSubmitting] = useState(false);

    const handleSubmitTicket = async () => {
        if (!ticketData.subject || !ticketData.description) {
            toast.error(t.help.complete_fields);
            return;
        }

        setSubmitting(true);
        try {
            // In a real scenario, we'd pass the supabase client here
            // For now, the service mocks success
            const res = await helpService.submitTicket({} as any, ticketData);
            toast.success(`${t.help.success_ticket}: ${res.id}`);
            setIsTicketOpen(false);
            setTicketData({ subject: "", description: "" });
        } catch (error: any) {
            toast.error(t.help.error_ticket + ": " + error.message);
        } finally {
            setSubmitting(false);
        }
    };


    const supportChannels = [
        {
            name: t.help.ticket_support,
            description: t.help.ticket_support_desc,
            icon: LifeBuoy,
            action: () => setIsTicketOpen(true),
            label: t.help.open_ticket,
            status: t.help.ticket_status,
            statusColor: "text-blue-500"
        }
    ];

    return (
        <div className="space-y-12 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {/* Header */}
            <div className="space-y-2 px-1">
                <div className="inline-flex items-center gap-2 bg-indigo-50 px-4 py-1.5 rounded-full">
                    <HelpCircle className="h-4 w-4 text-indigo-600" />
                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em]">{t.help.title}</span>
                </div>
                <h1 className="text-5xl font-black tracking-tighter text-slate-900 italic">{t.help.subtitle}</h1>
                <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">{t.help.support_subtitle}</p>
            </div>

            {/* Documentación */}
            <Link href="/help/docs" className="block group">
                <Card className="border-none bg-white shadow-premium rounded-[3rem] overflow-hidden hover:scale-[1.02] transition-all duration-500 cursor-pointer">
                    <CardContent className="p-10 flex items-center gap-10">
                        <div className="h-20 w-20 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500 shadow-sm shrink-0">
                            <BookOpen className="h-10 w-10" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-4 mb-2">
                                <h3 className="text-3xl font-black text-slate-900 tracking-tight italic group-hover:text-primary transition-colors">{t.help.user_manual}</h3>
                                <Badge className="bg-blue-50 text-blue-600 border-none font-black text-[10px] uppercase tracking-widest">Completo</Badge>
                            </div>
                            <p className="text-slate-400 font-medium text-sm leading-relaxed">
                                {t.help.user_manual_desc}
                            </p>
                        </div>
                        <div className="flex items-center gap-2 text-primary font-black text-xs uppercase tracking-widest group-hover:gap-4 transition-all shrink-0">
                            {t.help.open_manual} <ChevronRight className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>
            </Link>

            {/* Support Channels */}
            <div className="space-y-8">
                <div className="flex items-center gap-4 px-1">
                    <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center text-white">
                        <LifeBuoy className="h-5 w-5" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight italic">{t.help.support_channels}</h2>
                </div>

                <div className="grid gap-6 md:grid-cols-1 max-w-xl">
                    {supportChannels.map((channel) => (
                        <Card key={channel.name} className="border-none bg-white shadow-premium rounded-[3rem] overflow-hidden group hover:bg-slate-950 transition-all duration-500">
                            <CardContent className="p-10 flex flex-col justify-between h-full space-y-8">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="h-14 w-14 rounded-2xl bg-indigo-50 group-hover:bg-white/10 flex items-center justify-center text-indigo-600 group-hover:text-white shadow-sm transition-all shadow-indigo-100 group-hover:shadow-none">
                                            <channel.icon className="h-8 w-8" />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className={cn("w-2 h-2 rounded-full animate-pulse", channel.statusColor.replace('text-', 'bg-'))} />
                                            <span className={cn("text-[10px] font-black uppercase tracking-widest", channel.statusColor)}>{channel.status}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="text-xl font-black text-slate-900 group-hover:text-white transition-colors italic">{channel.name}</h4>
                                        <p className="text-slate-400 font-medium text-sm mt-1">{channel.description}</p>
                                    </div>
                                </div>
                                <Button
                                    onClick={channel.action}
                                    className="w-full h-14 rounded-[1.2rem] bg-slate-950 group-hover:bg-white group-hover:text-slate-950 text-white font-black uppercase tracking-widest text-[10px] shadow-lg transition-all active:scale-95"
                                >
                                    {channel.label}
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Ticket Dialog */}
            <Dialog open={isTicketOpen} onOpenChange={setIsTicketOpen}>
                <DialogContent className="sm:max-w-xl rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden bg-white">
                    <div className="bg-slate-900 p-8 text-white relative">
                        <DialogHeader>
                            <DialogTitle className="text-3xl font-black italic tracking-tighter">{t.help.report_issue}</DialogTitle>
                            <DialogDescription className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1">
                                {t.help.technical_support}
                            </DialogDescription>
                        </DialogHeader>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-4 right-4 text-white hover:bg-white/10 rounded-full"
                            onClick={() => setIsTicketOpen(false)}
                        >
                            <X className="h-5 w-5" />
                        </Button>
                    </div>

                    <div className="p-8 space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t.help.subject}</label>
                            <Input
                                value={ticketData.subject}
                                onChange={(e) => setTicketData({ ...ticketData, subject: e.target.value })}
                                placeholder={t.help.subject_placeholder}
                                className="h-14 bg-slate-50 border-none rounded-2xl font-bold"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t.help.description}</label>
                            <Textarea
                                value={ticketData.description}
                                onChange={(e) => setTicketData({ ...ticketData, description: e.target.value })}
                                placeholder={t.help.description_placeholder}
                                className="min-h-[150px] bg-slate-50 border-none rounded-2xl font-medium p-4"
                            />
                        </div>

                        <div className="bg-blue-50 p-4 rounded-2xl flex items-center gap-4">
                            <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0">
                                <Zap className="h-5 w-5" />
                            </div>
                            <p className="text-xs font-bold text-blue-900 leading-tight">
                                {t.help.response_time}
                            </p>
                        </div>
                    </div>

                    <DialogFooter className="p-8 pt-0">
                        <Button
                            onClick={handleSubmitTicket}
                            disabled={submitting}
                            className="w-full h-16 rounded-2xl bg-slate-900 hover:bg-primary text-white font-black italic tracking-tight text-xl transition-all shadow-active active:scale-95"
                        >
                            {submitting ? t.help.sending : (
                                <span className="flex items-center gap-3">
                                    {t.help.send_ticket} <Send className="h-5 w-5" />
                                </span>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
