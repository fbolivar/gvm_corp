import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { parseODataParams, applyODataFilter } from '@/lib/odata/parser';
import { validateApiKey } from '@/lib/odata/auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Allowed entities and their table mappings
const ENTITY_MAP: Record<string, { table: string; defaultSelect: string }> = {
    documents: { table: 'documents', defaultSelect: '*, party:parties(legal_name)' },
    document_lines: { table: 'document_lines', defaultSelect: '*, product:products(name, sku)' },
    parties: { table: 'parties', defaultSelect: '*' },
    products: { table: 'products', defaultSelect: '*' },
    journal_entries: { table: 'journal_entries', defaultSelect: '*' },
    journal_lines: { table: 'journal_lines', defaultSelect: '*, account:chart_accounts(code, name)' },
    inventory_movements: { table: 'inventory_movements', defaultSelect: '*, product:products(name, sku)' },
    purchase_orders: { table: 'purchase_orders', defaultSelect: '*, party:parties(legal_name)' },
    fixed_assets: { table: 'fixed_assets', defaultSelect: '*' },
    leads: { table: 'leads', defaultSelect: '*' },
    crm_opportunities: { table: 'crm_opportunities', defaultSelect: '*' },
};

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ entity: string }> }
) {
    const { entity } = await params;

    // 1. Validate API key
    const auth = await validateApiKey(request);
    if (!auth.valid) {
        return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    // 2. Check entity is allowed
    const entityConfig = ENTITY_MAP[entity];
    if (!entityConfig) {
        return NextResponse.json(
            {
                error: `Unknown entity: ${entity}. Available: ${Object.keys(ENTITY_MAP).join(', ')}`,
            },
            { status: 404 }
        );
    }

    // 3. Parse OData query params
    const odataQuery = parseODataParams(request.nextUrl.searchParams);

    // 4. Build Supabase query with service role (bypass RLS) but filter by tenant
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    try {
        // Build select
        const selectFields =
            odataQuery.select.length > 0
                ? odataQuery.select.join(',')
                : entityConfig.defaultSelect;

        let query = adminClient
            .from(entityConfig.table)
            .select(selectFields, { count: odataQuery.count ? 'exact' : undefined })
            .eq('tenant_id', auth.tenantId!)
            .range(odataQuery.skip, odataQuery.skip + odataQuery.top - 1);

        // Apply filters
        query = applyODataFilter(query, odataQuery.filter) as typeof query;

        // Apply orderby
        for (const ob of odataQuery.orderby) {
            query = query.order(ob.field, { ascending: ob.direction === 'asc' });
        }

        // If no explicit order, default by created_at desc
        if (odataQuery.orderby.length === 0) {
            query = query.order('created_at', { ascending: false });
        }

        const { data, error, count } = await query;

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // 5. Format OData response
        const response: Record<string, unknown> = {
            '@odata.context': `${request.nextUrl.origin}/api/v1/odata/$metadata#${entity}`,
            value: data ?? [],
        };

        if (odataQuery.count && count !== null) {
            response['@odata.count'] = count;
        }

        return NextResponse.json(response, {
            headers: {
                'Content-Type': 'application/json;odata.metadata=minimal',
                'OData-Version': '4.0',
            },
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Internal server error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
