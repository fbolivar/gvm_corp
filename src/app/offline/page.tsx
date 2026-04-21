'use client';

// Página 100% client-side, sin datos dinámicos → estática permanente.
export const dynamic = 'force-static';

export default function OfflinePage() {
    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-8">
            <div className="text-center space-y-6 max-w-sm">
                <div className="h-24 w-24 rounded-[2rem] bg-slate-800 flex items-center justify-center mx-auto">
                    <svg className="h-12 w-12 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                    </svg>
                </div>
                <div className="space-y-2">
                    <h1 className="text-2xl font-black text-white uppercase tracking-tight">Sin conexión</h1>
                    <p className="text-slate-400 text-sm font-medium">
                        GVM Corp requiere conexión a internet para operar. Verifica tu red y vuelve a intentarlo.
                    </p>
                </div>
                <button
                    onClick={() => window.location.reload()}
                    className="w-full h-12 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black uppercase text-xs tracking-widest transition-colors"
                >
                    Reintentar conexión
                </button>
            </div>
        </div>
    );
}
