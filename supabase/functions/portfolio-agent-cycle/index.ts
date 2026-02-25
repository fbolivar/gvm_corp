import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const DEFAULT_TEMPLATES = {
    REMINDER_1: {
        subject: "Recordatorio de Pago: Factura {number} - {company}",
        body: "Hola {name}, recordamos el pago de su factura {number} por {total}."
    },
    REMINDER_2: {
        subject: "AVISO SEGUNDO: Factura pendiente {number} - {company}",
        body: "Estimado {name}, su factura {number} sigue pendiente."
    },
    FINAL_NOTICE: {
        subject: "AVISO FINAL: Suspensión de crédito - Factura {number}",
        body: "Lamentamos informarle que procederemos a la suspensión de servicios por la factura {number}."
    }
}

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            { auth: { persistSession: false } }
        )

        console.log("Portfolio IQ Agent: Starting Collection Cycle...")

        const { data: configs, error: configError } = await supabaseClient
            .from('collection_agent_config')
            .select(`
                *,
                tenant:tenants(name)
            `)
            .eq('is_active', true)

        if (configError) throw configError

        const summaryResults = []

        for (const config of configs || []) {
            const tenantId = config.tenant_id
            const tenantName = (config.tenant as any)?.name || 'Nuestra Empresa'
            const today = new Date().toISOString().split('T')[0]

            const { data: invoices, error: invError } = await supabaseClient
                .from('documents')
                .select(`
                  id, number, total, due_date, tenant_id,
                  party:parties(id, legal_name, email),
                  debtor:debtor_profiles(excluded)
                `)
                .eq('tenant_id', tenantId)
                .eq('doc_type', 'INVOICE')
                .eq('status', 'ACCEPTED')
                .lt('due_date', today)

            if (invError) {
                console.error(`Error fetching invoices for tenant ${tenantId}:`, invError)
                continue
            }

            const templates = config.config_json?.templates || DEFAULT_TEMPLATES
            let tenantActionsCount = 0

            for (const invoice of invoices || []) {
                const party = Array.isArray(invoice.party) ? invoice.party[0] : invoice.party
                const debtorProfile = Array.isArray(invoice.debtor) ? invoice.debtor[0] : invoice.debtor

                if (debtorProfile?.excluded) continue
                if (Number(invoice.total) < config.min_amount_threshold) continue

                // Check for payments to update debtor life-cycle
                const { data: allocations } = await supabaseClient
                    .from('payment_allocations')
                    .select('amount, created_at')
                    .eq('document_id', invoice.id)

                const totalPaid = allocations?.reduce((acc: number, curr: any) => acc + Number(curr.amount), 0) || 0
                if (totalPaid >= Number(invoice.total)) continue // Invoice is paid

                const dueDate = new Date(invoice.due_date)
                const delayDays = Math.floor((new Date().getTime() - dueDate.getTime()) / (1000 * 3600 * 24))
                if (delayDays <= config.grace_days) continue

                // Update Debtor Profile Intelligence (Phase 2 & 3)
                if (party?.id) {
                    const riskLevel = delayDays > 60 ? 'CRITICAL' : delayDays > 30 ? 'HIGH' : delayDays > 15 ? 'MEDIUM' : 'LOW';

                    // Intelligence: Calculate Avg Payment Days for this debtor
                    const { data: allPartyInvoices } = await supabaseClient
                        .from('documents')
                        .select('due_date, allocations:payment_allocations(amount, created_at)')
                        .eq('party_id', party.id)
                        .eq('doc_type', 'INVOICE')

                    let totalDiffDays = 0;
                    let paidDocsCount = 0;

                    allPartyInvoices?.forEach((inv: any) => {
                        const invTotal = Number(invoice.total); // Simplified for this invoice or we could get real totals
                        const pTotal = inv.allocations?.reduce((acc: number, c: any) => acc + Number(c.amount), 0) || 0;
                        if (pTotal > 0 && inv.allocations.length > 0) {
                            const lastP = inv.allocations.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
                            const diff = Math.ceil((new Date(lastP.created_at).getTime() - new Date(inv.due_date).getTime()) / (1000 * 3600 * 24));
                            totalDiffDays += diff;
                            paidDocsCount++;
                        }
                    });

                    const avgDays = paidDocsCount > 0 ? Math.round(totalDiffDays / paidDocsCount) : null;

                    await supabaseClient
                        .from('debtor_profiles')
                        .upsert({
                            tenant_id: tenantId,
                            party_id: party.id,
                            risk_level: riskLevel,
                            average_payment_days: avgDays,
                            last_payment_date: allocations && allocations.length > 0 ? allocations[allocations.length - 1].created_at : null
                        }, { onConflict: 'tenant_id,party_id' })
                }

                // Check last action
                const { data: lastActions } = await supabaseClient
                    .from('collection_actions')
                    .select('*')
                    .eq('document_id', invoice.id)
                    .order('executed_at', { ascending: false })
                    .limit(1)

                const lastAction = lastActions?.[0]

                if (lastAction) {
                    const daysSinceLast = Math.floor((new Date().getTime() - new Date(lastAction.executed_at).getTime()) / (1000 * 3600 * 24))
                    if (daysSinceLast < config.reminder_frequency_days) continue
                }

                let nextActionType = null
                if (!lastAction) nextActionType = 'REMINDER_1'
                else if (lastAction.action_type === 'REMINDER_1') nextActionType = 'REMINDER_2'
                else if (lastAction.action_type === 'REMINDER_2' && delayDays > 15) nextActionType = 'FINAL_NOTICE'
                else if (lastAction.action_type === 'FINAL_NOTICE') {
                    const daysSinceFinal = Math.floor((new Date().getTime() - new Date(lastAction.executed_at).getTime()) / (1000 * 3600 * 24))
                    if (daysSinceFinal >= config.reminder_frequency_days) nextActionType = 'ESCALATE'
                }

                if (nextActionType) {
                    if (nextActionType === 'ESCALATE') {
                        await supabaseClient.from('app_notifications').insert({
                            tenant_id: tenantId,
                            title: "🚨 ESCALADO DE COBRO REQUERIDO",
                            body: `El deudor ${party?.legal_name || 'Desconocido'} requiere intervención humana por factura ${invoice.number}.`,
                            category: 'PORTFOLIO',
                            priority: 'HIGH',
                            link: `/accounting/cartera`
                        })

                        await supabaseClient.from('collection_actions').insert({
                            tenant_id: tenantId,
                            document_id: invoice.id,
                            party_id: party?.id,
                            action_type: 'ESCALATE',
                            channel: 'SYSTEM',
                            status: 'SENT',
                            metadata: { automated: true, reason: 'Sequence completed', delay_days: delayDays }
                        })
                        tenantActionsCount++
                        continue
                    }

                    const template = templates[nextActionType] || DEFAULT_TEMPLATES[nextActionType]
                    if (!template) continue

                    const replaceVars = (str: string) => {
                        return str
                            .replace(/{name}/g, party?.legal_name || 'Cliente')
                            .replace(/{total}/g, Number(Number(invoice.total) - totalPaid).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }))
                            .replace(/{number}/g, invoice.number)
                            .replace(/{company}/g, tenantName)
                            .replace(/{due_date}/g, invoice.due_date)
                            .replace(/{days}/g, delayDays.toString())
                    }

                    const subject = replaceVars(template.subject)
                    const body = replaceVars(template.body)

                    const { error: logError } = await supabaseClient
                        .from('collection_actions')
                        .insert({
                            tenant_id: tenantId,
                            document_id: invoice.id,
                            party_id: party?.id,
                            action_type: nextActionType,
                            channel: 'EMAIL',
                            status: 'SENT',
                            metadata: {
                                automated: true,
                                recipient: party?.email,
                                subject,
                                body_preview: body.substring(0, 150) + '...',
                                delay_days: delayDays
                            }
                        })

                    if (!logError) tenantActionsCount++
                }
            }

            // Update Agent Log in config
            await supabaseClient
                .from('collection_agent_config')
                .update({
                    last_run_at: new Date().toISOString(),
                    last_run_status: 'SUCCESS',
                    last_run_results: { actions_executed: tenantActionsCount, timestamp: new Date().toISOString() }
                })
                .eq('id', config.id)

            summaryResults.push({ tenant: tenantName, actions: tenantActionsCount })
        }

        return new Response(JSON.stringify({ success: true, results: summaryResults }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
        })

    } catch (error) {
        console.error("Critical error in Collection Cycle:", error)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
        })
    }
})
