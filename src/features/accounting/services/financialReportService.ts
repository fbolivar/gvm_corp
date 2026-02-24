
import { AccountData, FinancialNode } from '../types';

export const financialReportService = {
    /**
     * Groups a flat list of accounts into a hierarchy based on PUC codes.
     * Synthesizes parent levels (CI, Gr., Acc.) if they don't exist explicitly.
     */
    buildHierarchy(accounts: { code: string, name: string, balance: number }[]): FinancialNode[] {
        // 1. Sort by code
        const sorted = [...accounts].sort((a, b) => a.code.localeCompare(b.code));

        // Map to store all nodes by code
        const nodeMap = new Map<string, FinancialNode>();
        const roots: FinancialNode[] = [];

        // Helper to get or create a node
        const getOrCreateNode = (code: string, name: string = ''): FinancialNode => {
            if (nodeMap.has(code)) return nodeMap.get(code)!;

            const level = this.getLevel(code);
            const newNode: FinancialNode = {
                code,
                name: name || this.inferName(code), // Fallback name
                balance: 0,
                level,
                children: []
            };
            nodeMap.set(code, newNode);
            return newNode;
        };

        // 2. Process each account
        sorted.forEach(acc => {
            // Ensure this account exists as a node
            const node = getOrCreateNode(acc.code, acc.name);
            node.balance += acc.balance; // Add its own balance (leaf)
            // Note: If it's a leaf transaction account, it adds to itself.
            // If we have parents in the input list, we should be careful not to double count if we sum up.
            // Assumption: Input 'accounts' are mutually exclusive transaction accounts (leaves of the data).
            // accountingService.getTrialBalance aggregates by account_id from journal_lines. 
            // These are usually distinct.
        });

        // 3. Build the tree structure by processing ALL nodes in the map
        // We need to ensure parents exist for all nodes and propagate balances up.
        // We iterate specifically on the keys we have, but we need to create parents if missing.

        // Better approach:
        // For each account in the input, walk up its hierarchy (110505 -> 1105 -> 11 -> 1)
        // Add balance to all ancestors.

        nodeMap.clear(); // Reset to do it properly with propagation

        // Define standard names for top levels (optional, can be expanded)
        const standardNames: Record<string, string> = {
            '1': 'ACTIVOS',
            '2': 'PASIVOS',
            '3': 'PATRIMONIO',
            '4': 'INGRESOS',
            '5': 'GASTOS',
            '6': 'COSTOS DE VENTAS',
            '7': 'COSTOS DE PRODUCCIÓN',
            '8': 'CUENTAS DE ORDEN'
        };

        sorted.forEach(acc => {
            let currentCode = acc.code;
            let currentName = acc.name;
            const leafBalance = acc.balance;

            // Add leaf node
            const leafNode = this.getNode(nodeMap, currentCode, currentName, standardNames);
            // leafNode.balance = leafBalance; // Don't just set, the loop below will add to it if we treat it as its own ancestor sequence?
            // Actually, let's just add to the specific node.
            if (nodeMap.has(currentCode)) {
                nodeMap.get(currentCode)!.balance = leafBalance; // Set leaf balance explicitly
            } else {
                const n = this.getNode(nodeMap, currentCode, currentName, standardNames);
                n.balance = leafBalance;
            }
        });

        // Now propagate balances UP using parent logic
        // We need to do this carefully. 
        // Iterate all codes in map, sorted descending by length to do leaves first?
        // No, we can just project parents for every leaf.

        const nodes = Array.from(nodeMap.values());

        // We only possess leaves in the map currently (from the loop above).
        // Wait, I need to create parents. 

        sorted.forEach(acc => {
            let code = acc.code;
            const balance = acc.balance;

            // Walk up
            while (code.length > 1) {
                // Determine parent code
                let parentCode = '';
                if (code.length === 8) parentCode = code.substring(0, 6);
                else if (code.length === 6) parentCode = code.substring(0, 4);
                else if (code.length === 4) parentCode = code.substring(0, 2);
                else if (code.length === 2) parentCode = code.substring(0, 1);

                if (!parentCode) break;

                const parent = this.getNode(nodeMap, parentCode, '', standardNames);
                parent.balance += balance;

                code = parentCode;
            }
        });

        // Now link children to parents
        const allNodes = Array.from(nodeMap.values()).sort((a, b) => a.code.localeCompare(b.code));

        allNodes.forEach(node => {
            if (node.code.length === 1) {
                roots.push(node);
            } else {
                // Find immediate parent
                let parentCode = '';
                if (node.code.length === 8) parentCode = node.code.substring(0, 6);
                else if (node.code.length === 6) parentCode = node.code.substring(0, 4);
                else if (node.code.length === 4) parentCode = node.code.substring(0, 2);
                else if (node.code.length === 2) parentCode = node.code.substring(0, 1);

                if (parentCode && nodeMap.has(parentCode)) {
                    nodeMap.get(parentCode)!.children.push(node);
                }
            }
        });

        return roots;
    },

    getNode(map: Map<string, FinancialNode>, code: string, name: string, standardNames: Record<string, string>) {
        if (map.has(code)) return map.get(code)!;

        const finalName = name || standardNames[code] || `GRUPO ${code}`;
        const newNode: FinancialNode = {
            code,
            name: finalName,
            balance: 0,
            level: this.getLevel(code),
            children: []
        };
        map.set(code, newNode);
        return newNode;
    },

    getLevel(code: string): number {
        if (code.length === 1) return 1; // Clase
        if (code.length === 2) return 2; // Grupo
        if (code.length === 4) return 3; // Cuenta
        if (code.length === 6) return 4; // Subcuenta
        return 5; // Auxiliar
    },

    inferName(code: string): string {
        return `Cuenta ${code}`;
    }
};
