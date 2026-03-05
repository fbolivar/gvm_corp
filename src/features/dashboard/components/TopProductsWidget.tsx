'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Package, TrendingUp, Zap } from 'lucide-react';

interface Props {
    products: Array<{ name: string; sku: string; qty: number; total: number }>;
}

export function TopProductsWidget({ products }: Props) {
    const maxTotal = Math.max(...products.map(p => p.total), 1);

    return (
        <Card className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
            <CardHeader className="p-5 pb-0 flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-900">
                        <Package className="h-5 w-5" />
                    </div>
                    <div>
                        <CardTitle className="text-sm font-bold text-slate-900">Productos Top</CardTitle>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Eficiencia Comercial</p>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-5 space-y-4">
                {products.length === 0 ? (
                    <div className="py-10 text-center space-y-2">
                        <Zap className="h-8 w-8 text-slate-200 mx-auto" />
                        <p className="text-[10px] font-semibold text-slate-400">Sin datos de ventas este mes</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {products.map((p, idx) => (
                            <div key={idx} className="space-y-2">
                                <div className="flex items-start justify-between">
                                    <div className="space-y-0.5">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-semibold text-slate-300 tabular-nums">0{idx + 1}</span>
                                            <p className="text-sm font-bold text-slate-900">{p.name}</p>
                                        </div>
                                        <p className="text-[10px] text-slate-400 ml-6">{p.sku}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-slate-900 tabular-nums">${p.total.toLocaleString('es-CO')}</p>
                                        <p className="text-[10px] text-slate-400">{p.qty} Unidades</p>
                                    </div>
                                </div>
                                <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-slate-900 transition-all duration-1000 ease-out rounded-full"
                                        style={{ width: `${(p.total / maxTotal) * 100}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                            <span className="text-[10px] font-semibold text-slate-400">Crecimiento Demanda</span>
                        </div>
                        <Badge className="bg-emerald-100 text-emerald-600 border-none font-semibold text-[9px] px-2">+12.5%</Badge>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
