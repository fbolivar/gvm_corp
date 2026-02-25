import { LoginForm } from "@/features/auth/components/LoginForm";
import { ShieldCheck, Fingerprint, Cpu, Radio } from "lucide-react";
import Image from "next/image";

export default function LoginPage() {
  return (
    <div className="relative min-h-screen flex">

      {/* ═══════════ LEFT PANEL: Brand Identity ═══════════ */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] flex-col justify-between p-16 relative">
        {/* Decorative elements */}
        <div className="absolute bottom-0 right-0 opacity-[0.03] pointer-events-none">
          <Cpu className="h-[500px] w-[500px] text-white" />
        </div>
        <div className="absolute top-20 right-20 opacity-[0.04] pointer-events-none">
          <Radio className="h-48 w-48 text-white animate-pulse" />
        </div>

        {/* Logo */}
        <div className="flex items-center gap-4 relative z-10">
          <div className="h-14 w-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
            <Image src="/logo-gvm.png" alt="GVM" width={36} height={36} className="rounded-lg" />
          </div>
          <div>
            <p className="text-white font-black italic text-xl tracking-tighter">GVM S.A.S</p>
            <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.4em]">ERP Intelligence V3</p>
          </div>
        </div>

        {/* Hero Text */}
        <div className="space-y-8 relative z-10 max-w-xl">
          <h1 className="text-6xl xl:text-7xl font-black text-white tracking-tighter italic uppercase leading-[0.9]">
            Centro de<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-emerald-400 to-indigo-400">
              Acceso Seguro
            </span>
          </h1>
          <p className="text-slate-500 font-bold text-sm leading-relaxed max-w-md">
            Plataforma empresarial integral con módulos de contabilidad, inventarios, nómina, facturación electrónica y gestión comercial — todo en un solo ecosistema blindado.
          </p>

          {/* Feature Chips */}
          <div className="flex flex-wrap gap-3">
            {[
              { icon: ShieldCheck, label: "Auth E2E" },
              { icon: Fingerprint, label: "Supabase RLS" },
              { icon: Cpu, label: "Edge Runtime" },
            ].map((chip) => (
              <div key={chip.label} className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/5 border border-white/10">
                <chip.icon className="h-3.5 w-3.5 text-indigo-400" />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">{chip.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Security Badge */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
          <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.5em] italic">
            Secure Enterprise Cloud — Encriptación AES-256
          </p>
        </div>
      </div>

      {/* ═══════════ RIGHT PANEL: Login Form ═══════════ */}
      <div className="w-full lg:w-1/2 xl:w-[45%] flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md flex flex-col items-center gap-10">
          {/* Mobile-only logo */}
          <div className="lg:hidden flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
              <Image src="/logo-gvm.png" alt="GVM" width={32} height={32} className="rounded-lg" />
            </div>
            <div>
              <p className="text-white font-black italic text-lg tracking-tighter">GVM S.A.S</p>
              <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em]">Centro de Acceso</p>
            </div>
          </div>

          <LoginForm />

          {/* Footer */}
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex items-center gap-4 opacity-20">
              <div className="h-px w-12 bg-white" />
              <Fingerprint className="h-4 w-4 text-white" />
              <div className="h-px w-12 bg-white" />
            </div>
            <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.4em]">
              Secure Enterprise Cloud • GVM S.A.S © 2026
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
