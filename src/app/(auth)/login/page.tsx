import { LoginForm } from "@/features/auth/components/LoginForm";
import { Sparkles } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center p-6 lg:p-12 overflow-hidden bg-[#F8FAFC]">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/5 rounded-full blur-[120px] animate-pulse delay-700" />

      <div className="relative z-10 w-full max-w-lg flex flex-col items-center gap-12">
        <LoginForm />

        {/* Footer info */}
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex items-center gap-6 opacity-20">
            <div className="h-0.5 w-12 bg-slate-900 rounded-full" />
            <Sparkles className="h-4 w-4 text-slate-900" />
            <div className="h-0.5 w-12 bg-slate-900 rounded-full" />
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
            Secure Enterprise Cloud • GVM S.A.S © 2026
          </p>
        </div>
      </div>
    </div>
  );
}
