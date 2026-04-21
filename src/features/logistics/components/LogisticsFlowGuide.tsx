"use client";

import { Button } from "@/shared/components/ui/button";
import { logisticsFlowPdfService } from "../services/logisticsFlowPdfService";
import {
    Download,
    ShoppingBag,
    PackageSearch,
    Package,
    Truck,
    CheckCircle2,
    ArrowRight,
    Lightbulb,
} from "lucide-react";

const STEPS = [
    {
        n: 1,
        title: "El comercial crea la orden de venta",
        route: "Inicio → Ventas → Órdenes → Nuevo Pedido",
        icon: ShoppingBag,
        color: "bg-sky-500",
        bg: "bg-sky-50",
        text: "text-sky-700",
        items: [
            "Click en 'Nuevo Pedido' arriba a la derecha.",
            "Seleccionar el cliente.",
            "Agregar líneas de productos.",
            "Diligenciar la receta médica y el comercial responsable (ICA).",
            "Click en 'Guardar Pedido'. El sistema asigna un número (OV-XXXX).",
            "Al enviarlo, el pedido queda con estado SENT y pasa a Logística.",
        ],
        tip: "Por ahora los pedidos se generan aquí cuando WorldOffice no permite remisionar directamente. Si WO está disponible, sigue siendo la opción preferida.",
    },
    {
        n: 2,
        title: "La orden aparece como Pendiente en Logística",
        route: "Inicio → Logística → tab 'Pendientes'",
        icon: PackageSearch,
        color: "bg-amber-500",
        bg: "bg-amber-50",
        text: "text-amber-700",
        items: [
            "Listado en tiempo real de todas las órdenes por despachar.",
            "Número, cliente, fecha y cantidad de productos.",
            "Botón 'Alistar Despacho' a la derecha de cada orden.",
            "Buscador por número de orden o nombre de cliente.",
        ],
        tip: "La pestaña 'Resumen' tiene KPIs: cuántas órdenes hay pendientes, en alistamiento, en tránsito y entregadas.",
    },
    {
        n: 3,
        title: "Logística alista y crea el Despacho",
        route: "Tab 'Pendientes' → botón 'Alistar Despacho'",
        icon: Package,
        color: "bg-indigo-500",
        bg: "bg-indigo-50",
        text: "text-indigo-700",
        items: [
            "Bodega de salida.",
            "Transportadora (externa o 'Transporte Propio').",
            "Número de guía (opcional).",
            "Responsables: alistó, verificó, despachó.",
            "Costo de flete (opcional).",
            "Cantidad por producto a despachar.",
            "Click 'Crear Despacho'. Inicia en estado RECIBIDO.",
        ],
        tip: "Una vez creado, aparece en la pestaña 'Despachos' con badge de color según su estado.",
    },
    {
        n: 4,
        title: "Logística avanza los estados del despacho",
        route: "Tab 'Despachos' → click en un despacho",
        icon: Truck,
        color: "bg-purple-500",
        bg: "bg-purple-50",
        text: "text-purple-700",
        items: [
            "RECIBIDO → EN_ALISTAMIENTO  (botón 'Iniciar Alistamiento')",
            "EN_ALISTAMIENTO → LISTO_DESPACHO  (botón 'Marcar Listo')",
            "LISTO_DESPACHO → DESPACHADO  (descuenta inventario automático)",
            "DESPACHADO → EN_TRANSITO  (la transportadora lo tiene en movimiento)",
            "EN_TRANSITO → ENTREGADO  (cliente recibió la mercancía)",
        ],
        tip: "El estado DESPACHADO es crítico: desencadena el descuento automático de inventario. Marcarlo solo cuando el pedido fue entregado al transportista.",
    },
];

const STATES = [
    { label: "RECIBIDO", color: "bg-amber-500" },
    { label: "EN ALISTAMIENTO", color: "bg-sky-500" },
    { label: "LISTO DESPACHO", color: "bg-indigo-500" },
    { label: "DESPACHADO", color: "bg-purple-500" },
    { label: "EN TRÁNSITO", color: "bg-teal-500" },
    { label: "ENTREGADO", color: "bg-emerald-500" },
];

export function LogisticsFlowGuide() {
    return (
        <div className="page-container max-w-4xl space-y-8 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Flujo de Logística</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        De la orden de venta al despacho al cliente — guía paso a paso.
                    </p>
                </div>
                <Button
                    size="lg"
                    onClick={() => logisticsFlowPdfService.generate()}
                    className="bg-indigo-600 hover:bg-indigo-700"
                >
                    <Download className="h-4 w-4 mr-2" />
                    Descargar PDF
                </Button>
            </div>

            {/* State flow overview */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-4">
                    Estados del despacho
                </h2>
                <div className="flex flex-wrap items-center gap-2">
                    {STATES.map((s, i) => (
                        <div key={s.label} className="flex items-center gap-2">
                            <div className={`${s.color} text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full`}>
                                {s.label}
                            </div>
                            {i < STATES.length - 1 && (
                                <ArrowRight className="h-3 w-3 text-slate-300" />
                            )}
                        </div>
                    ))}
                </div>
                <p className="text-xs text-slate-500 mt-4">
                    El inventario se descuenta automáticamente al pasar a <strong className="text-slate-900">DESPACHADO</strong>.
                </p>
            </div>

            {/* Steps */}
            {STEPS.map((step) => {
                const Icon = step.icon;
                return (
                    <div key={step.n} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                        <div className={`${step.bg} px-6 py-5 flex items-center gap-4 border-b border-slate-100`}>
                            <div className={`${step.color} h-12 w-12 rounded-xl flex items-center justify-center text-white shrink-0`}>
                                <Icon className="h-6 w-6" />
                            </div>
                            <div>
                                <p className={`text-[10px] font-bold uppercase tracking-wider ${step.text}`}>Paso {step.n}</p>
                                <h3 className="text-lg font-bold text-slate-900">{step.title}</h3>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="bg-slate-900 text-white rounded-lg px-4 py-2.5 inline-flex items-center gap-2 text-sm font-mono">
                                <span>🧭</span> {step.route}
                            </div>

                            <ul className="space-y-2">
                                {step.items.map((item, i) => (
                                    <li key={i} className="flex items-start gap-3">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                                        <span className="text-sm text-slate-700">{item}</span>
                                    </li>
                                ))}
                            </ul>

                            <div className="bg-amber-50 border-l-4 border-amber-400 rounded-r-lg p-4 flex items-start gap-3">
                                <Lightbulb className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                                <p className="text-sm text-amber-900"><strong>Tip:</strong> {step.tip}</p>
                            </div>
                        </div>
                    </div>
                );
            })}

            {/* FAQ */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900 mb-4">Preguntas frecuentes</h2>
                <dl className="space-y-4">
                    {[
                        ["¿Cómo sabe el sistema que Logística recibió la orden?",
                            "Al crear un Despacho desde la orden, el sistema lo toma automáticamente. Antes de eso, aparece en 'Pendientes'."],
                        ["¿Dónde veo qué órdenes están en qué estado?",
                            "En el tab 'Resumen' del módulo Logística hay KPIs por estado. En 'Despachos' hay una lista con badge de color."],
                        ["¿Puedo retroceder un estado?",
                            "No directamente. Si hay error, crear un despacho corregido o usar la opción de devolución (RETURNED)."],
                        ["¿Qué pasa con el inventario al despachar?",
                            "Al pasar a DESPACHADO, el sistema crea un movimiento de salida (OUT) en la bodega correspondiente y descuenta el stock."],
                        ["¿Y si uso WorldOffice directamente?",
                            "WorldOffice sigue siendo la opción preferida cuando está disponible. Este flujo se usa cuando WO no permite remisionar directamente."],
                    ].map(([q, a]) => (
                        <div key={q}>
                            <dt className="text-sm font-semibold text-slate-900">{q}</dt>
                            <dd className="text-sm text-slate-600 mt-1">{a}</dd>
                        </div>
                    ))}
                </dl>
            </div>
        </div>
    );
}
