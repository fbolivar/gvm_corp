import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { productService } from '@/features/products/services/productService';
import { productFilterSchema, productSchema, ProductTypeEnum, ProductStatusEnum } from '@/features/products/types';
import { z } from 'zod';

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();
        const searchParams = request.nextUrl.searchParams;

        // Parse filters
        const filters = {
            search: searchParams.get('search') || undefined,
            type: searchParams.get('type') ? ProductTypeEnum.parse(searchParams.get('type')) : undefined,
            status: searchParams.get('status') ? ProductStatusEnum.parse(searchParams.get('status')) : undefined,
            page: Number(searchParams.get('page')) || 1,
            per_page: Number(searchParams.get('per_page')) || 10
        };

        const validatedFilters = productFilterSchema.parse(filters);

        const result = await productService.getProducts(supabase, validatedFilters);
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
        const productData = productSchema.parse(body);

        const newProduct = await productService.createProduct(supabase, productData);
        return NextResponse.json(newProduct, { status: 201 });
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues.map((e: any) => ({ path: e.path, message: e.message })) }, { status: 400 });
        }
        if (error.code === '23505') { // Unique violation (e.g. SKU)
            return NextResponse.json({ error: 'Ya existe un producto con este SKU.' }, { status: 409 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
