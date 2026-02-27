"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { cn } from "@/shared/lib/utils";

interface SliderCaptchaProps {
    onVerified: () => void;
}

export function SliderCaptcha({ onVerified }: SliderCaptchaProps) {
    const [verified, setVerified] = useState(false);
    const [dragging, setDragging] = useState(false);
    const [position, setPosition] = useState(0); // 0 a 100 (%)
    const [startX, setStartX] = useState(0);
    const trackRef = useRef<HTMLDivElement>(null);
    const THRESHOLD = 85; // % del track necesario para verificar

    const getPercent = useCallback((clientX: number) => {
        const track = trackRef.current;
        if (!track) return 0;
        const rect = track.getBoundingClientRect();
        const thumbWidth = 56; // w-14 = 56px
        const maxX = rect.width - thumbWidth;
        const raw = clientX - rect.left - thumbWidth / 2;
        return Math.max(0, Math.min(100, (raw / maxX) * 100));
    }, []);

    const handleStart = useCallback((clientX: number) => {
        if (verified) return;
        setDragging(true);
        setStartX(clientX);
    }, [verified]);

    const handleMove = useCallback((clientX: number) => {
        if (!dragging || verified) return;
        const pct = getPercent(clientX);
        setPosition(pct);
    }, [dragging, verified, getPercent]);

    const handleEnd = useCallback(() => {
        if (!dragging) return;
        setDragging(false);
        if (position >= THRESHOLD) {
            setPosition(100);
            setVerified(true);
            setTimeout(() => onVerified(), 300);
        } else {
            // Snap back con animación
            setPosition(0);
        }
    }, [dragging, position, onVerified]);

    // Mouse events
    const onMouseDown = (e: React.MouseEvent) => handleStart(e.clientX);
    const onTouchStart = (e: React.TouchEvent) => handleStart(e.touches[0].clientX);

    useEffect(() => {
        if (!dragging) return;
        const onMouseMove = (e: MouseEvent) => handleMove(e.clientX);
        const onTouchMove = (e: TouchEvent) => { e.preventDefault(); handleMove(e.touches[0].clientX); };
        const onUp = () => handleEnd();
        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onUp);
        window.addEventListener("touchmove", onTouchMove, { passive: false });
        window.addEventListener("touchend", onUp);
        return () => {
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onUp);
            window.removeEventListener("touchmove", onTouchMove);
            window.removeEventListener("touchend", onUp);
        };
    }, [dragging, handleMove, handleEnd]);

    const thumbLeft = `calc(${position}% * (100% - 56px) / 100)`;

    return (
        <div className="space-y-2">
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1">
                Verificación de Seguridad
            </p>

            {/* Track */}
            <div
                ref={trackRef}
                className={cn(
                    "relative h-14 rounded-2xl overflow-hidden select-none transition-all duration-300",
                    verified
                        ? "bg-emerald-50 border-2 border-emerald-200"
                        : "bg-slate-50 border border-slate-200"
                )}
            >
                {/* Fill progress */}
                <div
                    className={cn(
                        "absolute left-0 top-0 h-full transition-colors duration-300 rounded-2xl",
                        verified ? "bg-emerald-100" : "bg-indigo-50"
                    )}
                    style={{
                        width: `calc(${position}% * (100% - 56px) / 100 + 28px)`,
                        transition: dragging ? "none" : "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)"
                    }}
                />

                {/* Label text */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className={cn(
                        "text-[9px] font-black uppercase tracking-[0.3em] transition-all duration-300",
                        verified ? "text-emerald-600 opacity-0" : "text-slate-300 opacity-100",
                        position > 20 && !verified && "opacity-0"
                    )}>
                        Desliza para confirmar →
                    </span>
                    {verified && (
                        <span className="text-[9px] font-black uppercase tracking-[0.3em] text-emerald-600 flex items-center gap-2 animate-in fade-in duration-300">
                            <CheckCircle2 className="h-4 w-4" />
                            Verificado — Acceso permitido
                        </span>
                    )}
                </div>

                {/* Thumb */}
                {!verified && (
                    <div
                        onMouseDown={onMouseDown}
                        onTouchStart={onTouchStart}
                        style={{
                            left: thumbLeft,
                            transition: dragging ? "none" : "left 0.4s cubic-bezier(0.4, 0, 0.2, 1)"
                        }}
                        className={cn(
                            "absolute top-1 bottom-1 w-12 rounded-xl flex items-center justify-center cursor-grab active:cursor-grabbing shadow-md transition-colors duration-200",
                            dragging
                                ? "bg-indigo-600 shadow-indigo-200 scale-105"
                                : "bg-slate-900 hover:bg-indigo-600 shadow-slate-200"
                        )}
                    >
                        <ArrowRight className={cn(
                            "h-5 w-5 text-white transition-transform duration-200",
                            dragging && "translate-x-0.5"
                        )} />
                    </div>
                )}

                {/* Verified state thumb */}
                {verified && (
                    <div className="absolute top-1 bottom-1 right-1 w-12 rounded-xl bg-emerald-500 flex items-center justify-center shadow-emerald-200 shadow-md">
                        <CheckCircle2 className="h-5 w-5 text-white" />
                    </div>
                )}
            </div>

            {/* Hint */}
            {!verified && (
                <p className="text-[8px] font-bold text-slate-300 uppercase tracking-[0.2em] ml-1">
                    Arrastra el control hasta el final para continuar
                </p>
            )}
        </div>
    );
}
