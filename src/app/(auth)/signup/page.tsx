import { SignupForm } from "@/features/auth/components/SignupForm";
import { ShieldCheck, Fingerprint, Blocks } from "lucide-react";
import Image from "next/image";

export default function SignupPage() {
  return (
    <div className="relative min-h-screen flex">

      {/* ═══════════ LEFT PANEL: Brand Identity ═══════════ */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] flex-col justify-between p-16 relative bg-slate-50">
        {/* Decorative elements */}
        <div className="absolute bottom-0 left-0 opacity-[0.04] pointer-events-none">
          <Blocks className="h-[500px] w-[500px] text-slate-900" />
        </div>

        {/* Logo */}
        <div className="flex items-center gap-4 relative z-10">
          <div className="h-14 w-14 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center overflow-hidden">
            <Image src="/logo-gvm.png" alt="GVM" width={36} height={36} className="rounded-lg" />
          </div>
          <div>
            <p className="text-slate-900 font-black italic text-xl tracking-tighter">GVM S.A.S</p>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em]">Programa de Onboarding</p>
          </div>
        </div>

        {/* Hero Text */}
        <div className="space-y-8 relative z-10 max-w-xl">
          <h1 className="text-6xl xl:text-7xl font-black text-slate-900 tracking-tighter italic uppercase leading-[0.9]">
            Protocolo de<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-primary to-emerald-600">
              Incorporación
            </span>
          </h1>
          <p className="text-slate-500 font-bold text-sm leading-relaxed max-w-md">
            Solicita acceso a la plataforma empresarial. Tu cuenta será verificada por un administrador antes de activar los módulos disponibles.
          </p>

          {/* Steps */}
          <div className="space-y-4">
            {[
              { step: "01", label: "Registrar datos de acceso" },
              { step: "02", label: "Confirmar email corporativo" },
              { step: "03", label: "Aprobación del administrador" },
            ].map((item) => (
              <div key={item.step} className="flex items-center gap-4 group">
                <div className="h-10 w-10 rounded-xl bg-white border border-slate-100 shadow-sm flex items-center justify-center text-indigo-600 font-black text-xs italic group-hover:bg-indigo-50 group-hover:border-indigo-100 transition-all">
                  {item.step}
                </div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] group-hover:text-slate-700 transition-colors">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Security Badge */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.4)]" />
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.5em] italic">
            Onboarding Seguro — Validación Multi-Factor
          </p>
        </div>
      </div>

      {/* ═══════════ RIGHT PANEL: Signup Form ═══════════ */}
      <div className="w-full lg:w-1/2 xl:w-[45%] flex items-center justify-center p-6 lg:p-12 bg-white">
        <div className="w-full max-w-md flex flex-col items-center gap-10">
          {/* Mobile-only logo */}
          <div className="lg:hidden flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden">
              <Image src="/logo-gvm.png" alt="GVM" width={32} height={32} className="rounded-lg" />
            </div>
            <div>
              <p className="text-slate-900 font-black italic text-lg tracking-tighter">GVM S.A.S</p>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Crear Cuenta</p>
            </div>
          </div>

          <SignupForm />

          {/* Footer */}
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex items-center gap-4 opacity-20">
              <div className="h-px w-12 bg-slate-900" />
              <ShieldCheck className="h-4 w-4 text-slate-900" />
              <div className="h-px w-12 bg-slate-900" />
            </div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em]">
              Enterprise Onboarding • GVM S.A.S © 2026
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
