import { SignupForm } from "@/features/auth/components/SignupForm";
import { ShieldCheck, Fingerprint, Cpu, Blocks } from "lucide-react";
import Image from "next/image";

export default function SignupPage() {
  return (
    <div className="relative min-h-screen flex">

      {/* ═══════════ LEFT PANEL: Brand Identity ═══════════ */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] flex-col justify-between p-16 relative">
        {/* Decorative elements */}
        <div className="absolute bottom-0 left-0 opacity-[0.03] pointer-events-none">
          <Blocks className="h-[500px] w-[500px] text-white" />
        </div>

        {/* Logo */}
        <div className="flex items-center gap-4 relative z-10">
          <div className="h-14 w-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
            <Image src="/logo-gvm.png" alt="GVM" width={36} height={36} className="rounded-lg" />
          </div>
          <div>
            <p className="text-white font-black italic text-xl tracking-tighter">GVM S.A.S</p>
            <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.4em]">Programa de Onboarding</p>
          </div>
        </div>

        {/* Hero Text */}
        <div className="space-y-8 relative z-10 max-w-xl">
          <h1 className="text-6xl xl:text-7xl font-black text-white tracking-tighter italic uppercase leading-[0.9]">
            Protocolo de<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-indigo-400 to-emerald-400">
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
                <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-indigo-400 font-black text-xs italic group-hover:bg-indigo-500/10 group-hover:border-indigo-500/20 transition-all">
                  {item.step}
                </div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] group-hover:text-slate-300 transition-colors">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Security Badge */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse shadow-[0_0_8px_#818cf8]" />
          <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.5em] italic">
            Onboarding Seguro — Validación Multi-Factor
          </p>
        </div>
      </div>

      {/* ═══════════ RIGHT PANEL: Signup Form ═══════════ */}
      <div className="w-full lg:w-1/2 xl:w-[45%] flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md flex flex-col items-center gap-10">
          {/* Mobile-only logo */}
          <div className="lg:hidden flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
              <Image src="/logo-gvm.png" alt="GVM" width={32} height={32} className="rounded-lg" />
            </div>
            <div>
              <p className="text-white font-black italic text-lg tracking-tighter">GVM S.A.S</p>
              <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em]">Crear Cuenta</p>
            </div>
          </div>

          <SignupForm />

          {/* Footer */}
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex items-center gap-4 opacity-20">
              <div className="h-px w-12 bg-white" />
              <ShieldCheck className="h-4 w-4 text-white" />
              <div className="h-px w-12 bg-white" />
            </div>
            <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.4em]">
              Enterprise Onboarding • GVM S.A.S © 2026
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
