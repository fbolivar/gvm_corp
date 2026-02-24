import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { documentService } from '@/features/documents/services/documentService';
import { documentFilterSchema, documentSchema, DocumentFilters, DocumentTypeEnum, DocumentStatusEnum } from '@/features/documents/types';
import { z } from 'zod';

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();
        const searchParams = request.nextUrl.searchParams;

        const filters = {
            search: searchParams.get('search') || undefined,
            type: searchParams.get('type') ? DocumentTypeEnum.parse(searchParams.get('type')) : undefined,
            status: searchParams.get('status') ? DocumentStatusEnum.parse(searchParams.get('status')) : undefined,
            page: Number(searchParams.get('page')) || 1,
            per_page: Number(searchParams.get('per_page')) || 10
        };

        const validatedFilters = documentFilterSchema.parse(filters);
        const result = await documentService.getDocuments(supabase, validatedFilters);

        return NextResponse.json(result);
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues }, { status: 400 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();

        // Basic validation
        const documentData = documentSchema.parse(body);

        // Recalculate totals to be safe
        if (documentData.lines) {
            const totals = documentService.calculateTotals(documentData.lines);
            documentData.subtotal = totals.subtotal;
            documentData.taxes = totals.taxes;
            documentData.total = totals.total;
        }

        const newDoc = await documentService.createDocument(supabase, documentData as any);
        return NextResponse.json(newDoc, { status: 201 });
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues }, { status: 400 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
