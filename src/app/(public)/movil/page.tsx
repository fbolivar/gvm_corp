import type { Metadata } from 'next';
import {
    Smartphone,
    Share2,
    Plus,
    CheckCircle2,
    Chrome,
    Globe,
    ArrowDown,
    Star,
    Zap,
    Shield,
    LayoutDashboard,
} from 'lucide-react';

export const metadata: Metadata = {
    title: 'Instalar en tu celular — GVM Corp',
    description: 'Guía paso a paso para instalar GVM Corp en tu celular Android o iPhone como una app nativa.',
};

const APP_URL = 'https://app.bc-security.com';

// ---------------------------------------------------------------------------
// Paso individual
// ---------------------------------------------------------------------------
function Step({
    number,
    title,
    description,
    icon: Icon,
}: {
    number: number;
    title: string;
    description: string;
    icon: React.ElementType;
}) {
    return (
        <div className="flex gap-4 items-start">
            <div className="relative flex-shrink-0">
                <div className="h-10 w-10 rounded-2xl bg-slate-900 flex items-center justify-center shadow-lg">
                    <Icon className="h-5 w-5 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-amber-400 flex items-center justify-center">
                    <span className="text-[9px] font-black text-slate-900">{number}</span>
                </div>
            </div>
            <div className="space-y-1 pt-1">
                <p className="text-sm font-black text-slate-900 leading-tight">{title}</p>
                <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Beneficio
// ---------------------------------------------------------------------------
function Benefit({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
    return (
        <div className="flex gap-3 items-start p-4 rounded-2xl bg-white shadow-sm border border-slate-100">
            <div className="h-9 w-9 rounded-xl bg-slate-900 flex items-center justify-center flex-shrink-0">
                <Icon className="h-4 w-4 text-amber-400" />
            </div>
            <div>
                <p className="text-xs font-black text-slate-900 uppercase tracking-wide">{title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{description}</p>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Página principal
// ---------------------------------------------------------------------------
export default function MovilPage() {
    return (
        <div className="min-h-screen bg-slate-50">

            {/* ── HERO ──────────────────────────────────────────── */}
            <div className="bg-slate-900 px-6 pt-14 pb-16 text-white relative overflow-hidden">
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
                    <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-amber-400 translate-x-1/3 translate-y-1/3" />
                </div>
                <div className="relative max-w-lg mx-auto space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-2xl bg-amber-400 flex items-center justify-center shadow-lg shadow-amber-400/20">
                            <Smartphone className="h-6 w-6 text-slate-900" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-amber-400">GVM Corp</p>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Sistema ERP</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h1 className="text-3xl font-black tracking-tight leading-tight">
                            Usa GVM Corp<br />
                            <span className="text-amber-400">en tu celular</span>
                        </h1>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            Instala la app en tu teléfono en menos de un minuto. Sin descargar nada de la tienda — funciona directamente desde el navegador.
                        </p>
                    </div>

                    <a
                        href={APP_URL}
                        className="inline-flex items-center gap-2 bg-amber-400 text-slate-900 font-black text-xs uppercase tracking-widest px-6 py-3 rounded-2xl shadow-lg shadow-amber-400/20 hover:bg-amber-300 transition-colors"
                    >
                        <Globe className="h-4 w-4" />
                        Abrir la app
                    </a>
                </div>
            </div>

            <div className="max-w-lg mx-auto px-6 space-y-10 py-10 pb-20">

                {/* ── BENEFICIOS ────────────────────────────────── */}
                <section className="space-y-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">¿Por qué instalarla?</p>
                    <div className="space-y-2">
                        <Benefit icon={Zap} title="Acceso instantáneo" description="Ábrela desde tu pantalla de inicio como cualquier app, sin abrir el navegador." />
                        <Benefit icon={LayoutDashboard} title="Pantalla completa" description="Sin barra de direcciones. Experiencia de app nativa completa." />
                        <Benefit icon={Shield} title="Funciona sin internet" description="Algunas funciones están disponibles aunque pierdas la señal momentáneamente." />
                        <Benefit icon={Star} title="Sin costo extra" description="No ocupa espacio en la tienda de apps. Es gratis e instantáneo." />
                    </div>
                </section>

                {/* ── ANDROID ───────────────────────────────────── */}
                <section className="space-y-5">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-xl bg-emerald-500 flex items-center justify-center">
                            <Chrome className="h-4 w-4 text-white" />
                        </div>
                        <div>
                            <p className="text-base font-black text-slate-900">Android</p>
                            <p className="text-[10px] text-slate-400 font-medium">Con Chrome (recomendado)</p>
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-5">
                        <Step
                            number={1}
                            icon={Globe}
                            title={`Abre Chrome y ve a ${APP_URL}`}
                            description="Asegúrate de estar usando Google Chrome. Si usas otro navegador, abre Chrome y escribe la dirección."
                        />
                        <div className="h-px bg-slate-100" />
                        <Step
                            number={2}
                            icon={Share2}
                            title='Toca los tres puntos "⋮" arriba a la derecha'
                            description="Se abre un menú con opciones. Busca la opción que dice 'Agregar a pantalla de inicio' o 'Instalar app'."
                        />
                        <div className="h-px bg-slate-100" />
                        <Step
                            number={3}
                            icon={Plus}
                            title='Toca "Agregar" o "Instalar"'
                            description="Chrome te pedirá confirmar. Toca Agregar y la app aparecerá en tu pantalla de inicio como un ícono."
                        />
                        <div className="h-px bg-slate-100" />
                        <Step
                            number={4}
                            icon={CheckCircle2}
                            title="¡Listo! Abre la app desde tu pantalla de inicio"
                            description="Busca el ícono de GVM Corp en tu pantalla. Ábrelo y estarás directo en el sistema, sin navegador."
                        />
                    </div>

                    {/* Tip Android */}
                    <div className="flex gap-3 bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                        <div className="text-emerald-500 text-lg flex-shrink-0">💡</div>
                        <p className="text-xs text-emerald-700 leading-relaxed">
                            <strong>Truco:</strong> En algunos Android, Chrome muestra automáticamente un banner en la parte de abajo que dice "Agregar GVM Corp a la pantalla de inicio". Toca ese banner y listo.
                        </p>
                    </div>
                </section>

                {/* ── iOS / IPHONE ──────────────────────────────── */}
                <section className="space-y-5">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-xl bg-slate-800 flex items-center justify-center">
                            <span className="text-white text-sm font-bold"></span>
                        </div>
                        <div>
                            <p className="text-base font-black text-slate-900">iPhone / iPad</p>
                            <p className="text-[10px] text-slate-400 font-medium">Con Safari (obligatorio)</p>
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-5">
                        <Step
                            number={1}
                            icon={Globe}
                            title={`Abre Safari y ve a ${APP_URL}`}
                            description="En iPhone la instalación SOLO funciona con Safari. Si tienes Chrome u otro navegador, primero pásate a Safari."
                        />
                        <div className="h-px bg-slate-100" />
                        <Step
                            number={2}
                            icon={Share2}
                            title='Toca el botón de compartir (cuadro con flecha hacia arriba)'
                            description="Está en la barra de abajo del navegador, al centro. Se ve como un cuadro con una flecha apuntando hacia arriba."
                        />
                        <div className="h-px bg-slate-100" />
                        <Step
                            number={3}
                            icon={ArrowDown}
                            title='Desplázate y toca "Agregar a pantalla de inicio"'
                            description='En el menú que se abre, desliza hacia abajo hasta encontrar "Agregar a pantalla de inicio" con un ícono de cuadro y un +.'
                        />
                        <div className="h-px bg-slate-100" />
                        <Step
                            number={4}
                            icon={Plus}
                            title='Toca "Agregar" en la esquina superior derecha'
                            description="Puedes cambiar el nombre si quieres, pero no es necesario. Toca Agregar y el ícono aparece en tu pantalla de inicio."
                        />
                        <div className="h-px bg-slate-100" />
                        <Step
                            number={5}
                            icon={CheckCircle2}
                            title="¡Listo! Abre GVM Corp desde tu pantalla de inicio"
                            description="El ícono ya está en tu pantalla. Ábrelo y entrarás directo a la app en pantalla completa."
                        />
                    </div>

                    {/* Tip iOS */}
                    <div className="flex gap-3 bg-blue-50 border border-blue-100 rounded-2xl p-4">
                        <div className="text-blue-500 text-lg flex-shrink-0">💡</div>
                        <p className="text-xs text-blue-700 leading-relaxed">
                            <strong>Importante en iPhone:</strong> Si usas Chrome en iPhone y no ves la opción de instalar, es porque Apple solo permite esto desde Safari. Copia el enlace, pégalo en Safari e intenta de nuevo.
                        </p>
                    </div>
                </section>

                {/* ── PREGUNTAS FRECUENTES ──────────────────────── */}
                <section className="space-y-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Preguntas frecuentes</p>

                    <div className="space-y-3">
                        {[
                            {
                                q: '¿Ocupa espacio en mi celular?',
                                a: 'Muy poco. Al instalarse como app web (PWA), no descarga archivos pesados. Ocupa menos de 1 MB en la mayoría de dispositivos.',
                            },
                            {
                                q: '¿Necesito actualizar la app?',
                                a: 'No. La app se actualiza sola cuando el equipo de GVM Corp lanza una nueva versión. No necesitas hacer nada.',
                            },
                            {
                                q: '¿Funciona sin internet?',
                                a: 'La mayoría de funciones requieren conexión. Sin embargo, algunas vistas básicas están disponibles aunque pierdas la señal momentáneamente.',
                            },
                            {
                                q: '¿Cómo inicio sesión?',
                                a: 'Con el correo y contraseña que te proporcionó tu administrador. Si olvidaste tu contraseña, usa la opción "¿Olvidaste tu contraseña?" en la pantalla de inicio.',
                            },
                            {
                                q: '¿Puedo usarla en tableta?',
                                a: 'Sí. El proceso es el mismo en tablets Android o iPad. La app adapta su diseño automáticamente al tamaño de la pantalla.',
                            },
                        ].map(({ q, a }) => (
                            <div key={q} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-1.5">
                                <p className="text-xs font-black text-slate-900">{q}</p>
                                <p className="text-xs text-slate-500 leading-relaxed">{a}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ── CTA FINAL ─────────────────────────────────── */}
                <section className="bg-slate-900 rounded-3xl p-7 text-center space-y-4">
                    <div className="h-14 w-14 rounded-2xl bg-amber-400 flex items-center justify-center mx-auto shadow-lg shadow-amber-400/20">
                        <Smartphone className="h-7 w-7 text-slate-900" />
                    </div>
                    <div className="space-y-2">
                        <p className="text-white font-black text-lg">¿Listo para empezar?</p>
                        <p className="text-slate-400 text-xs leading-relaxed">
                            Abre el enlace en tu celular, instala la app y empieza a gestionar tu negocio desde cualquier lugar.
                        </p>
                    </div>
                    <a
                        href={APP_URL}
                        className="inline-flex items-center gap-2 bg-amber-400 text-slate-900 font-black text-xs uppercase tracking-widest px-8 py-3.5 rounded-2xl shadow-lg shadow-amber-400/20 hover:bg-amber-300 transition-colors"
                    >
                        <Globe className="h-4 w-4" />
                        Abrir GVM Corp
                    </a>
                </section>

            </div>
        </div>
    );
}
