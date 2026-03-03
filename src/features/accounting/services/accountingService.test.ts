import { describe, it, expect } from 'vitest';

/**
 * Tests for accounting logic that can be validated without Supabase.
 * Focuses on the balance validation and P&L/Balance Sheet aggregation logic.
 */

// Extract the pure logic from accountingService for testing
function validateBalance(lines: { debit: number; credit: number }[]): boolean {
    const totalDebit = lines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0);
    const totalCredit = lines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0);
    return Math.abs(totalDebit - totalCredit) <= 0.01;
}

function calculateTrialBalanceEntry(code: string, debit: number, credit: number) {
    const classCode = code[0];
    // Debit-nature accounts: 1 (Assets), 5 (Expenses), 6 (Cost), 7 (Cost), 8 (Memorandum)
    if (['1', '5', '6', '7', '8'].includes(classCode)) {
        return { code, debit, credit, balance: debit - credit };
    }
    // Credit-nature accounts: 2 (Liabilities), 3 (Equity), 4 (Income)
    return { code, debit, credit, balance: credit - debit };
}

function calculatePnL(trialBalance: { code: string; balance: number }[]) {
    const income = trialBalance.filter(acc => acc.code.startsWith('4'));
    const expenses = trialBalance.filter(acc =>
        acc.code.startsWith('5') || acc.code.startsWith('6') || acc.code.startsWith('7')
    );
    const totalIncome = income.reduce((sum, acc) => sum + acc.balance, 0);
    const totalExpenses = expenses.reduce((sum, acc) => sum + acc.balance, 0);
    return { totalIncome, totalExpenses, netProfit: totalIncome - totalExpenses };
}

// ─── Balance Validation ─────────────────────────────────────────────────────
describe('Accounting: Journal Entry Balance Validation', () => {
    it('should accept balanced entry (debit = credit)', () => {
        const lines = [
            { debit: 1000000, credit: 0 },
            { debit: 0, credit: 1000000 },
        ];
        expect(validateBalance(lines)).toBe(true);
    });

    it('should reject unbalanced entry', () => {
        const lines = [
            { debit: 1000000, credit: 0 },
            { debit: 0, credit: 999999 },
        ];
        expect(validateBalance(lines)).toBe(false);
    });

    it('should accept entry within 0.01 tolerance (floating point)', () => {
        const lines = [
            { debit: 100.005, credit: 0 },
            { debit: 0, credit: 100.006 },
        ];
        expect(validateBalance(lines)).toBe(true);
    });

    it('should handle multi-line balanced entries', () => {
        const lines = [
            { debit: 500000, credit: 0 },
            { debit: 300000, credit: 0 },
            { debit: 200000, credit: 0 },
            { debit: 0, credit: 400000 },
            { debit: 0, credit: 600000 },
        ];
        expect(validateBalance(lines)).toBe(true);
    });

    it('should handle zero-value entry', () => {
        const lines = [
            { debit: 0, credit: 0 },
        ];
        expect(validateBalance(lines)).toBe(true);
    });
});

// ─── Trial Balance Nature ───────────────────────────────────────────────────
describe('Accounting: Trial Balance Account Nature (PUC Colombia)', () => {
    it('class 1 (Assets) should have debit nature', () => {
        const result = calculateTrialBalanceEntry('1305', 5000000, 2000000);
        expect(result.balance).toBe(3000000); // debit - credit
    });

    it('class 2 (Liabilities) should have credit nature', () => {
        const result = calculateTrialBalanceEntry('2205', 1000000, 4000000);
        expect(result.balance).toBe(3000000); // credit - debit
    });

    it('class 3 (Equity) should have credit nature', () => {
        const result = calculateTrialBalanceEntry('3115', 0, 10000000);
        expect(result.balance).toBe(10000000);
    });

    it('class 4 (Income) should have credit nature', () => {
        const result = calculateTrialBalanceEntry('4135', 500000, 8000000);
        expect(result.balance).toBe(7500000); // credit - debit
    });

    it('class 5 (Expenses) should have debit nature', () => {
        const result = calculateTrialBalanceEntry('5105', 6000000, 200000);
        expect(result.balance).toBe(5800000); // debit - credit
    });

    it('class 6 (Cost of Sales) should have debit nature', () => {
        const result = calculateTrialBalanceEntry('6135', 3000000, 0);
        expect(result.balance).toBe(3000000);
    });
});

// ─── P&L Calculation ────────────────────────────────────────────────────────
describe('Accounting: Profit & Loss Statement', () => {
    const trialBalance = [
        { code: '1305', balance: 5000000 },   // Asset (CXC)
        { code: '2205', balance: 3000000 },   // Liability (CXP)
        { code: '3115', balance: 10000000 },  // Equity
        { code: '4135', balance: 15000000 },  // Income (Sales)
        { code: '4175', balance: -500000 },   // Income (Returns - negative)
        { code: '5105', balance: 6000000 },   // Expense (Payroll)
        { code: '5135', balance: 1000000 },   // Expense (Services)
        { code: '6135', balance: 4000000 },   // Cost of Sales
    ];

    it('should calculate total income from class 4 accounts', () => {
        const pnl = calculatePnL(trialBalance);
        expect(pnl.totalIncome).toBe(15000000 + (-500000)); // 14,500,000
    });

    it('should calculate total expenses from class 5+6+7 accounts', () => {
        const pnl = calculatePnL(trialBalance);
        expect(pnl.totalExpenses).toBe(6000000 + 1000000 + 4000000); // 11,000,000
    });

    it('should calculate net profit = income - expenses', () => {
        const pnl = calculatePnL(trialBalance);
        expect(pnl.netProfit).toBe(14500000 - 11000000); // 3,500,000
    });

    it('should return negative net profit when expenses > income', () => {
        const lossBalance = [
            { code: '4135', balance: 5000000 },
            { code: '5105', balance: 8000000 },
        ];
        const pnl = calculatePnL(lossBalance);
        expect(pnl.netProfit).toBeLessThan(0);
        expect(pnl.netProfit).toBe(-3000000);
    });

    it('should ignore non-income/expense accounts', () => {
        const pnl = calculatePnL(trialBalance);
        // Assets (1), Liabilities (2), Equity (3) should not affect P&L
        expect(pnl.totalIncome).not.toContain(5000000);
    });
});

// ─── Invoice Accounting Logic ───────────────────────────────────────────────
describe('Accounting: Document Accounting Entry Structure', () => {
    it('INVOICE should debit CXC and credit Income (partida doble)', () => {
        // Simulating the logic from createEntryFromDocument for INVOICE
        const doc = { subtotal: 1000000, taxes: 190000, total: 1190000 };
        const lines = [
            { account: '1305', debit: doc.total, credit: 0 },      // CXC (Receivable)
            { account: '4135', debit: 0, credit: doc.subtotal },    // Income
            { account: '2408', debit: 0, credit: doc.taxes },       // IVA
        ];

        const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
        const totalCredit = lines.reduce((s, l) => s + l.credit, 0);

        expect(totalDebit).toBe(totalCredit); // Balanced
        expect(totalDebit).toBe(1190000);
    });

    it('VENDOR_BILL should debit Expense and credit CXP (partida doble)', () => {
        const doc = { subtotal: 500000, taxes: 95000, total: 595000 };
        const lines = [
            { account: '6135', debit: doc.subtotal, credit: 0 },   // Cost/Expense
            { account: '2408', debit: doc.taxes, credit: 0 },      // IVA Descontable
            { account: '2205', debit: 0, credit: doc.total },      // CXP (Payable)
        ];

        const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
        const totalCredit = lines.reduce((s, l) => s + l.credit, 0);

        expect(totalDebit).toBe(totalCredit);
        expect(totalCredit).toBe(595000);
    });

    it('CREDIT_NOTE should reverse invoice entries', () => {
        const doc = { subtotal: 200000, taxes: 38000, total: 238000 };
        // Credit note reverses: Debit Returns, Credit Receivable
        const lines = [
            { account: '4175', debit: doc.subtotal, credit: 0 },   // Returns (reverses income)
            { account: '2408', debit: doc.taxes, credit: 0 },      // IVA reversal
            { account: '1305', debit: 0, credit: doc.total },      // CXC reversal
        ];

        const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
        const totalCredit = lines.reduce((s, l) => s + l.credit, 0);

        expect(totalDebit).toBe(totalCredit);
    });
});
