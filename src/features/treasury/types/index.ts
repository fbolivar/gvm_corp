import { z } from "zod";

export const treasuryAccountSchema = z.object({
    id: z.string().uuid().optional(),
    tenant_id: z.string().uuid(),
    name: z.string().min(1, "Nombre es requerido"),
    type: z.enum(["CASH", "BANK"]),
    chart_account_id: z.string().uuid().optional().nullable(),
    account_number: z.string().optional().nullable(),
    bank_name: z.string().optional().nullable(),
    balance: z.number().default(0),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
});

export type TreasuryAccount = z.infer<typeof treasuryAccountSchema>;

export const taxWithholdingSchema = z.object({
    id: z.string().uuid().optional(),
    tenant_id: z.string().uuid(),
    name: z.string(),
    rate: z.number(),
    account_code: z.string(),
    is_active: z.boolean().default(true),
    created_at: z.string().optional(),
});

export type TaxWithholding = z.infer<typeof taxWithholdingSchema>;

export const transactionWithholdingSchema = z.object({
    id: z.string().uuid().optional(),
    transaction_id: z.string().uuid(),
    withholding_id: z.string().uuid(),
    base_amount: z.number(),
    applied_amount: z.number(),
    created_at: z.string().optional(),
});

export type TransactionWithholding = z.infer<typeof transactionWithholdingSchema>;

export const treasuryTransactionSchema = z.object({
    id: z.string().uuid().optional(),
    tenant_id: z.string().uuid(),
    account_id: z.string().uuid(),
    party_id: z.string().uuid().optional().nullable(),
    amount: z.number(),
    transaction_type: z.enum(["RECEIPT", "PAYMENT", "TRANSFER"]),
    date: z.string(),
    description: z.string().optional().nullable(),
    reference_number: z.string().optional().nullable(),
    is_reconciled: z.boolean().default(false).optional(),
    reconciled_at: z.string().optional().nullable(),
    accounting_entry_id: z.string().uuid().optional().nullable(),
    created_at: z.string().optional(),
});

export type TreasuryTransaction = z.infer<typeof treasuryTransactionSchema>;

export const paymentAllocationSchema = z.object({
    id: z.string().uuid().optional(),
    transaction_id: z.string().uuid(),
    document_id: z.string().uuid(),
    amount: z.number(),
    created_at: z.string().optional(),
});

export type PaymentAllocation = z.infer<typeof paymentAllocationSchema>;

export const bankStatementSchema = z.object({
    id: z.string().uuid().optional(),
    tenant_id: z.string().uuid(),
    account_id: z.string().uuid(),
    start_date: z.string(),
    end_date: z.string(),
    opening_balance: z.number().default(0),
    closing_balance: z.number().default(0),
    status: z.enum(["DRAFT", "COMPLETED"]).default("DRAFT"),
});

export type BankStatement = z.infer<typeof bankStatementSchema>;

export const bankStatementLineSchema = z.object({
    id: z.string().uuid().optional(),
    statement_id: z.string().uuid(),
    tenant_id: z.string().uuid(),
    date: z.string(),
    description: z.string(),
    amount: z.number(),
    transaction_id: z.string().uuid().optional().nullable(),
    status: z.enum(["UNMATCHED", "MATCHED", "EXCLUDED"]).default("UNMATCHED"),
});

export type BankStatementLine = z.infer<typeof bankStatementLineSchema>;
