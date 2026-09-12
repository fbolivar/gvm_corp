"use client";

import { useState } from "react";
import { Database, RotateCcw } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { BackupManager } from "./BackupManager";
import { RestoreManager } from "./RestoreManager";

type Tab = "backup" | "restore";

export function BackupCenter({
    tenantId,
    initialTab = "backup",
}: {
    tenantId: string;
    initialTab?: Tab;
}) {
    const [tab, setTab] = useState<Tab>(initialTab);

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            {/* Tabs */}
            <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl w-fit mx-auto">
                <TabButton active={tab === "backup"} onClick={() => setTab("backup")} icon={<Database className="h-4 w-4" />}>
                    Copias de Seguridad
                </TabButton>
                <TabButton active={tab === "restore"} onClick={() => setTab("restore")} icon={<RotateCcw className="h-4 w-4" />}>
                    Restaurar
                </TabButton>
            </div>

            {tab === "backup" ? <BackupManager tenantId={tenantId} /> : <RestoreManager tenantId={tenantId} />}
        </div>
    );
}

function TabButton({
    active, onClick, icon, children,
}: {
    active: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "flex items-center gap-2 px-5 h-11 rounded-xl text-sm font-black transition-all",
                active ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
            )}
        >
            {icon}
            {children}
        </button>
    );
}
