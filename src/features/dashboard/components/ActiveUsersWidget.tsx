"use client";

import { useOnlinePresence } from "@/features/collaboration/hooks/useOnlinePresence";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
import { Badge } from "@/shared/components/ui/badge";
import { Users, Radio, MessageSquare } from "lucide-react";
import Link from "next/link";

interface Props {
    tenantId: string;
    userId: string;
    userFullName: string;
}

function getInitials(name: string): string {
    return name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();
}

export function ActiveUsersWidget({ tenantId, userId, userFullName }: Props) {
    const onlineUsers = useOnlinePresence(tenantId, userId, userFullName);
    const count = onlineUsers.size;
    const users = Array.from(onlineUsers.values());

    return (
        <Card className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
            <CardContent className="p-5">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                            <Users className="h-5 w-5 text-emerald-500" />
                        </div>
                        <div>
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                                Usuarios Activos
                            </p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-xl font-bold text-slate-900 tabular-nums">
                                    {count}
                                </span>
                                <Badge className="border-none font-semibold text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-600 gap-1">
                                    <Radio className="h-2.5 w-2.5 animate-pulse" />
                                    En linea
                                </Badge>
                            </div>
                        </div>
                    </div>
                </div>

                {/* User list */}
                {count > 0 ? (
                    <div className="space-y-2">
                        {users.slice(0, 8).map((user) => (
                            <div
                                key={user.id}
                                className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-50/80"
                            >
                                <div className="relative shrink-0">
                                    <Avatar className="h-8 w-8 rounded-lg">
                                        <AvatarFallback className="bg-indigo-100 text-indigo-600 text-[10px] font-bold rounded-lg">
                                            {getInitials(user.name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-white" />
                                </div>
                                <span className="text-xs font-semibold text-slate-700 truncate">
                                    {user.id === userId ? `${user.name} (Tú)` : user.name}
                                </span>
                            </div>
                        ))}
                        {count > 8 && (
                            <p className="text-[10px] text-slate-400 font-semibold text-center pt-1">
                                +{count - 8} mas conectados
                            </p>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                        <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center mb-2">
                            <Users className="h-5 w-5 text-slate-300" />
                        </div>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                            Conectando...
                        </p>
                    </div>
                )}

                {/* CTA */}
                <Link
                    href="/collaboration"
                    className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors"
                >
                    <MessageSquare className="h-3.5 w-3.5" />
                    Ir al Chat
                </Link>
            </CardContent>
        </Card>
    );
}
