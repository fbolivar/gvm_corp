
"use server"

import { simulateReconciliationFlow } from "@/features/treasury/services/reconciliationDemo";

export async function runIntegritySim() {
    try {
        const result = await simulateReconciliationFlow();
        return { success: true, result };
    } catch (error: any) {
        console.error("Integrity Sim Error:", error);
        return { success: false, error: error.message };
    }
}
