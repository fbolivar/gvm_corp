import { z } from 'zod';

export enum AccountNature {
    DEBIT = 'DEBIT',
    CREDIT = 'CREDIT'
}

export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE' | 'COST' | 'ORDER';

export interface Account {
    id: string;
    code: string;
    name: string;
    is_auxiliary: boolean;
    nature: AccountNature;
    type?: AccountType;
    level?: number;
    parent_id?: string | null;
    is_active?: boolean;
    balance?: number;
    created_at?: string;
    updated_at?: string;
}

export const accountFormSchema = z.object({
    code: z.string().min(1, 'El código es obligatorio').max(20, 'Máximo 20 caracteres'),
    name: z.string().min(1, 'El nombre es obligatorio').max(200, 'Máximo 200 caracteres'),
    nature: z.enum(['DEBIT', 'CREDIT']),
    type: z.enum(['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE', 'COST', 'ORDER']).optional(),
    is_auxiliary: z.boolean(),
    parent_id: z.string().uuid().nullable().optional(),
});

export type AccountFormData = z.infer<typeof accountFormSchema>;

export interface JournalEntry {
    id?: string;
    entry_date: string;
    description?: string;
    number?: string;
    period?: string;
    status?: string;
    document_id?: string;
    lines: JournalLine[];
}

export interface JournalLine {
    id?: string;
    account_id: string;
    party_id?: string;
    debit: number;
    credit: number;
    description?: string;
    base_amount?: number;
    tax_rate?: number;
    dimension1_id?: string | null;
    dimension2_id?: string | null;

    // Relations
    account?: Account;
}

// Schemas
export const journalLineSchema = z.object({
    account_id: z.string().uuid(),
    party_id: z.string().uuid().optional().nullable(),
    debit: z.number().min(0),
    credit: z.number().min(0),
    description: z.string().optional(),
    base_amount: z.number().optional().default(0),
    tax_rate: z.number().optional().default(0),
    dimension1_id: z.string().uuid().optional().nullable(),
    dimension2_id: z.string().uuid().optional().nullable(),
});

export const journalEntrySchema = z.object({
    entry_date: z.string(),
    description: z.string().optional(),
    lines: z.array(journalLineSchema).refine((lines) => {
        const totalDebit = lines.reduce((sum, line) => sum + line.debit, 0);
        const totalCredit = lines.reduce((sum, line) => sum + line.credit, 0);
        return Math.abs(totalDebit - totalCredit) < 0.01;
    }, { message: "El asiento no está balanceado (Débitos != Créditos)" })
});

export interface AccountData {
    code: string;
    name: string;
    balance: number;
    debit?: number;
    credit?: number;
}

export interface FinancialNode {
    code: string;
    name: string;
    balance: number;
    level: number;
    children: FinancialNode[];
}

export interface ReportingFilters {
    startDate?: string;
    endDate?: string;
    accountId?: string;
    partyId?: string;
    search?: string;
}
