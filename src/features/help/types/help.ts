import { LucideIcon } from "lucide-react";

export interface WorkflowStep {
    step: number;
    title: string;
    description: string;
}

export interface SubSection {
    title: string;
    path: string;
    description: string;
}

export interface DocContent {
    description: string;
    features: string[];
    workflow?: WorkflowStep[];
    tips?: string[];
    subsections?: SubSection[];
}

export interface DocSection {
    id: string;
    title: string;
    icon: string; // Serialized icon name for storage if needed, or component name
    color: string;
    bg: string;
    content: DocContent;
}

export interface HelpTicket {
    id?: string;
    subject: string;
    description: string;
    status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED';
    created_at?: string;
}
