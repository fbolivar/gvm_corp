import { createClient } from '@/lib/supabase/server';
import { productService } from '@/features/products/services/productService';
import { ProductList } from '@/features/products/components/ProductList';
import { ProductFilters, ProductTypeEnum, ProductStatusEnum } from '@/features/products/types';

interface PageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function ProductsPage({ searchParams }: PageProps) {
    const supabase = await createClient();
    const params = await searchParams;

    const page = Number(params?.page) || 1;
    const per_page = Number(params?.per_page) || 10;
    const search = params?.search as string || undefined;

    const typeParam = params?.type as string;
    const statusParam = params?.status as string;

    const filters: ProductFilters = {
        search,
        type: typeParam ? ProductTypeEnum.parse(typeParam) : undefined,
        status: statusParam ? ProductStatusEnum.parse(statusParam) : undefined,
        page,
        per_page
    };

    const { data, count } = await productService.getProducts(supabase, filters);

    return (
        <div className="container mx-auto py-6">
            <h1 className="text-2xl font-bold mb-4">Productos y Servicios</h1>
            <ProductList
                initialData={data}
                totalCount={count || 0}
                currentPage={page}
                perPage={per_page}
            />
        </div>
    );
}
