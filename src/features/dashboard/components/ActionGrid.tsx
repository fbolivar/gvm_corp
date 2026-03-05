'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import Link from 'next/link';
import {
    Package,
    ShoppingCart,
    ShoppingBag,
    Zap,
    ChevronRight,
    TrendingUp,
    TrendingDown,
} from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';
import { cn } from '@/shared/lib/utils';

const ACTIONS = [
    { title: 'Ventas', icon: ShoppingCart, href: '/sales', color: 'text-blue-500', bg: 'bg-blue-50', stat: '+12.4%', isPositive: true },
    { title: 'Compras', icon: ShoppingBag, href: '/purchasing', color: 'text-emerald-500', bg: 'bg-emerald-50', stat: '-2.1%', isPositive: false },
    { title: 'Inventario', icon: Package, href: '/inventory', color: 'text-amber-500', bg: 'bg-amber-50', stat: '+5.3%', isPositive: true },
    { title: 'Nómina', icon: Zap, href: '/payroll', color: 'text-rose-500', bg: 'bg-rose-50', stat: '+1.2%', isPositive: true },
];

export function ActionGrid() {
    return (
        <Card className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
            <CardHeader className="p-5 border-b border-slate-50">
                <CardTitle className="text-sm font-bold text-slate-900">Accesos Rápidos</CardTitle>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">Módulos principales</p>
            </CardHeader>
            <CardContent className="p-3 space-y-1">
                {ACTIONS.map((action) => (
                    <Link
                        key={action.title}
                        href={action.href}
                        className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors group"
                    >
                        <div className="flex items-center gap-3">
                            <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center', action.bg)}>
                                <action.icon className={cn('h-4 w-4', action.color)} />
                            </div>
                            <span className="text-sm font-semibold text-slate-700">{action.title}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge className={cn(
                                'text-[9px] font-semibold px-1.5 py-0.5 rounded-full border-none flex items-center gap-1',
                                action.isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600',
                            )}>
                                {action.isPositive ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                                {action.stat}
                            </Badge>
                            <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                        </div>
                    </Link>
                ))}

                <div className="pt-2">
                    <div className="bg-slate-50 rounded-xl p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-slate-900">Centro de Reportes</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">Análisis detallado</p>
                        </div>
                        <Button asChild variant="outline" className="h-8 rounded-lg text-[10px] font-semibold">
                            <Link href="/accounting/reports">Ver</Link>
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
