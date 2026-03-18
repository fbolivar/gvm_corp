import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { partyService } from '@/features/parties/services/partyService';
import { partySchema, partyFilterSchema, PartyTypeEnum } from '@/features/parties/types';
import { z } from 'zod';

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

        const searchParams = request.nextUrl.searchParams;

        // Parse filters
        const filters = {
            search: searchParams.get('search') || undefined,
            type: searchParams.get('type') ? PartyTypeEnum.parse(searchParams.get('type')) : undefined,
            role: (searchParams.get('role') as 'customer' | 'vendor' | 'all') || 'all',
            page: Number(searchParams.get('page')) || 1,
            per_page: Number(searchParams.get('per_page')) || 10
        };

        const validatedFilters = partyFilterSchema.parse(filters);

        const result = await partyService.getParties(supabase, validatedFilters);
        return NextResponse.json(result);
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues.map((e: any) => ({ path: e.path, message: e.message })) }, { status: 400 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const body = await request.json();
        const partyData = partySchema.parse(body);

        // Validate NIT uniqueness only for NIT doc_type to allow duplicates for CC if needed (though usually unique too)
        // Schema constraints in DB (UNIQUE(tenant_id, doc_type, doc_number)) will catch exact duplicates
        // But we want a friendly error for NIT
        if (partyData.doc_type === 'NIT' && partyData.nit) {
            const existing = await partyService.validateNit(supabase, partyData.nit);
            if (existing) {
                return NextResponse.json({
                    error: 'El NIT ya existe en el sistema',
                    code: 'DUPLICATE_NIT',
                    existingId: existing.id
                }, { status: 409 });
            }
        }

        const newParty = await partyService.createParty(supabase, partyData);
        return NextResponse.json(newParty, { status: 201 });
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues.map((e: any) => ({ path: e.path, message: e.message })) }, { status: 400 });
        }
        // Handle Supabase unique violation
        if (error.code === '23505') {
            return NextResponse.json({ error: 'Ya existe un tercero con este documento.' }, { status: 409 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
