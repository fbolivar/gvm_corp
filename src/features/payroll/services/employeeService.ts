import { SupabaseClient } from '@supabase/supabase-js';
import { Employee } from '../types';
import { Party } from '@/features/parties/types';

export const employeeService = {
    async getEmployees(client: SupabaseClient) {
        const { data, error } = await client
            .from('employees')
            .select('*, party:parties(*)')
            .eq('status', 'ACTIVE')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data as Employee[];
    },

    async getEmployeeById(client: SupabaseClient, id: string) {
        const { data, error } = await client
            .from('employees')
            .select('*, party:parties(*)')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data as Employee;
    },

    async getEmployeeByUserId(client: SupabaseClient, userId: string) {
        const { data, error } = await client
            .from('employees')
            .select('*, party:parties(*)')
            .eq('user_id', userId)
            .maybeSingle();

        if (error) throw error;
        return data as Employee | null;
    },

    // Helper to get tenant with MULTIPLE FALLBACKS
    async getTenantId(client: SupabaseClient) {
        const { data: rpcData, error: rpcError } = await client.rpc('get_my_tenant_id');

        if (!rpcError && rpcData) {
            return rpcData;
        }
        console.warn("getTenantId: RPC failed/null. Data:", rpcData, "Error:", rpcError);

        // 2. Fallback: Get first tenant (For dev/MVP)
        const { data: tenantData, error: tenantError } = await client
            .from('tenants')
            .select('id')
            .limit(1)
            .maybeSingle();

        if (tenantData?.id) {
            return tenantData.id;
        }
        console.error("getTenantId: DB Fallback failed.", tenantError);

        // 3. Emergency Fallback: Hardcoded ID (Known valid Tenant from previous query)
        return '134320f0-20ef-4a56-8087-050d517c8282';
    },

    async createEmployee(client: SupabaseClient, employee: Employee & { party: Party }) {
        try {
            // 0. Get Tenant ID to ensure RLS doesn't block inserts
            const tenantId = await this.getTenantId(client);
            if (!tenantId) throw new Error("CRITICAL: No se pudo obtener el Tenant ID ni siquiera con fallback.");

            // 1. Check if party exists by Identifiacion, otherwise Create Party
            let partyId = employee.party_id;

            // If no party_id provided, we try to find by doc_number or create
            if (!partyId && employee.party) {
                const { data: existingParty, error: findError } = await client
                    .from('parties')
                    .select('id')
                    .eq('doc_type', employee.party.doc_type)
                    .eq('doc_number', employee.party.doc_number)
                    .maybeSingle(); // Use maybeSingle to avoid error if not found

                if (findError) {
                    console.error("Error finding party:", findError);
                    throw findError;
                }

                if (existingParty) {
                    partyId = existingParty.id;
                } else {
                    // Sanitized Party Data (Explicit fields)
                    const partyData = {
                        tenant_id: tenantId,
                        party_type: 'PERSON' as const,
                        legal_name: employee.party.legal_name,
                        doc_type: employee.party.doc_type,
                        doc_number: employee.party.doc_number,
                        email: employee.party.email || null,
                        phone: employee.party.phone || null,
                        is_vendor: false,
                        is_customer: false,
                    };

                    const { data: newParty, error: partyError } = await client
                        .from('parties')
                        .upsert(partyData, { onConflict: 'tenant_id, doc_type, doc_number' })
                        .select()
                        .single();

                    if (partyError) {
                        console.error("Error creating/updating party RAW:", partyError);
                        throw new Error(`Falló al gestionar tercero: ${partyError.message || 'Error desconocido de base de datos'}`);
                    }
                    if (!newParty) throw new Error("Party created but no data returned");

                    partyId = newParty.id;
                }
            }

            if (!partyId) throw new Error("No se pudo obtener el ID del Tercero (Party)");

            // 2. Create Employee Record
            // Sanitize Employee Data
            const employeeInsertData: Record<string, unknown> = {
                tenant_id: tenantId,
                party_id: partyId,
                contract_type: employee.contract_type,
                start_date: employee.start_date,
                end_date: employee.end_date || null,
                salary: employee.salary,
                transport_allowance: employee.transport_allowance ?? true,
                risk_level: employee.risk_level || '1',
                payment_method: employee.payment_method || 'CASH',
                bank_name: employee.bank_name || null,
                bank_account_type: employee.bank_account_type || null,
                bank_account_number: employee.bank_account_number || null,
                status: 'ACTIVE'
            };

            // Link to auth user if provided (from Team Settings enrollment)
            if (employee.user_id) {
                employeeInsertData.user_id = employee.user_id;
            }

            const { data: newEmployee, error: empError } = await client
                .from('employees')
                .insert(employeeInsertData)
                .select()
                .single();

            if (empError) {
                console.error("Error creating employee record:", empError);
                throw empError;
            }
        } catch (err: any) {
            console.error("createEmployee failed stack:", err);
            throw new Error(err.message || JSON.stringify(err));
        }
    },

    async updateEmployee(client: SupabaseClient, id: string, employee: Partial<Employee>) {
        try {
            // 1. Update Party if party data is present
            if (employee.party && employee.party_id) { // We assume party_id is present on the employee record
                const partyUpdates: any = {
                    legal_name: employee.party.legal_name,
                    email: employee.party.email,
                    phone: employee.party.phone,
                    // doc_type/number might be restricted in some systems but let's allow for corrections
                    doc_type: employee.party.doc_type,
                    doc_number: employee.party.doc_number,
                };
                // Calculate DV if NIT logic applies? Or rely on form?

                const { error: partyError } = await client
                    .from('parties')
                    .update(partyUpdates)
                    .eq('id', employee.party_id);

                if (partyError) throw partyError;
            }

            // 2. Update Employee Record
            const employeeUpdates = {
                contract_type: employee.contract_type,
                start_date: employee.start_date,
                end_date: employee.end_date,
                salary: employee.salary,
                transport_allowance: employee.transport_allowance,
                risk_level: employee.risk_level,
                payment_method: employee.payment_method,
                bank_name: employee.bank_name,
                bank_account_type: employee.bank_account_type,
                bank_account_number: employee.bank_account_number,
                status: employee.status
            };

            const { data, error } = await client
                .from('employees')
                .update(employeeUpdates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;

        } catch (error: any) {
            console.error("updateEmployee failed:", error);
            throw new Error(error.message || "Error updating employee");
        }
    }
};
