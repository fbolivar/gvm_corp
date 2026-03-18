import { Loader2 } from "lucide-react"

export default function MainLoading() {
    return (
        <div className="min-h-[60vh] flex items-center justify-center p-8">
            <div className="text-center space-y-6">
                <div className="mx-auto h-16 w-16 rounded-[1.5rem] bg-slate-50 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 text-primary animate-spin" />
                </div>
                <div className="space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">
                        Cargando Modulo
                    </p>
                    <div className="flex justify-center gap-1">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
                        <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:150ms]" />
                        <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:300ms]" />
                    </div>
                </div>
            </div>
        </div>
    )
}
