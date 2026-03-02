'use client';

import { useChat } from '@ai-sdk/react';
import { TextStreamChatTransport, UIMessage } from 'ai';
import { useState, useRef, useEffect, useMemo } from 'react';
import {
    Bot, Send, X, Minimize2, Maximize2, Sparkles,
    Loader2, User, ChevronDown, RefreshCw
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';

const QUICK_QUESTIONS = [
    '¿Cuánto vendí este mes?',
    '¿Qué facturas están vencidas?',
    '¿Cuál es mi utilidad del año?',
    '¿Cómo está el presupuesto?',
    '¿Hay productos con stock bajo?',
    '¿Cuál es mi flujo de caja?',
];

function getMessageText(m: UIMessage): string {
    return m.parts
        .filter(p => p.type === 'text')
        .map(p => p.text)
        .join('');
}

interface Props {
    mode?: 'floating' | 'inline';
}

export function AIAssistantChat({ mode = 'floating' }: Props) {
    const [open, setOpen] = useState(false);
    const [minimized, setMinimized] = useState(false);
    const [inputText, setInputText] = useState('');
    const bottomRef = useRef<HTMLDivElement>(null);

    const transport = useMemo(() => new TextStreamChatTransport({ api: '/api/ai/chat' }), []);
    const { messages, sendMessage, status, setMessages } = useChat({ transport });

    const isLoading = status === 'submitted' || status === 'streaming';

    useEffect(() => {
        if (open && !minimized) {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, open, minimized]);

    const handleSend = async () => {
        if (!inputText.trim() || isLoading) return;
        const text = inputText;
        setInputText('');
        await sendMessage({ text });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleQuick = async (q: string) => {
        if (isLoading) return;
        setInputText('');
        await sendMessage({ text: q });
    };

    const chatContent = (
        <div className={cn(
            'flex flex-col bg-white overflow-hidden',
            mode === 'floating'
                ? 'rounded-[2rem] shadow-[0_8px_64px_rgba(0,0,0,0.15)] border border-slate-100 w-[380px]'
                : 'rounded-[2rem] shadow-premium border border-slate-100 h-full'
        )}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 bg-slate-900 rounded-t-[2rem]">
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                        <Sparkles className="h-4 w-4 text-indigo-300" />
                    </div>
                    <div>
                        <p className="text-[11px] font-black text-white uppercase tracking-widest">GVM AI</p>
                        <div className="flex items-center gap-1.5">
                            <div className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-pulse" />
                            <p className="text-[9px] text-slate-400 font-bold uppercase">Asistente Financiero</p>
                        </div>
                    </div>
                </div>
                {mode === 'floating' && (
                    <div className="flex items-center gap-1">
                        <button onClick={() => setMinimized(!minimized)}
                            className="h-7 w-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-400 hover:text-white transition-all">
                            {minimized ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
                        </button>
                        <button onClick={() => setOpen(false)}
                            className="h-7 w-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-400 hover:text-white transition-all">
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </div>
                )}
            </div>

            {!minimized && (
                <>
                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 max-h-[420px]">
                        {messages.length === 0 && (
                            <div className="space-y-4">
                                <div className="text-center py-6">
                                    <div className="h-14 w-14 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-3">
                                        <Sparkles className="h-7 w-7 text-indigo-500" />
                                    </div>
                                    <p className="text-sm font-black text-slate-900 italic">¡Hola! Soy GVM AI</p>
                                    <p className="text-[11px] text-slate-400 font-medium mt-1">
                                        Pregúntame sobre tus finanzas, nómina o inventario.
                                    </p>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {QUICK_QUESTIONS.map(q => (
                                        <button key={q} onClick={() => handleQuick(q)}
                                            className="text-left p-2.5 rounded-xl bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-[10px] font-bold text-slate-600 transition-all leading-tight">
                                            {q}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {messages.map((m) => {
                            const text = getMessageText(m);
                            if (!text) return null;
                            return (
                                <div key={m.id} className={cn('flex gap-2.5', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                                    {m.role === 'assistant' && (
                                        <div className="h-7 w-7 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0 mt-0.5">
                                            <Bot className="h-3.5 w-3.5 text-indigo-600" />
                                        </div>
                                    )}
                                    <div className={cn(
                                        'max-w-[80%] rounded-2xl px-4 py-3 text-[12px] leading-relaxed font-medium',
                                        m.role === 'user'
                                            ? 'bg-slate-900 text-white rounded-br-sm'
                                            : 'bg-slate-50 text-slate-800 rounded-bl-sm'
                                    )}>
                                        <p className="whitespace-pre-wrap">{text}</p>
                                    </div>
                                    {m.role === 'user' && (
                                        <div className="h-7 w-7 rounded-lg bg-slate-900 flex items-center justify-center shrink-0 mt-0.5">
                                            <User className="h-3.5 w-3.5 text-white" />
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {isLoading && (
                            <div className="flex gap-2.5">
                                <div className="h-7 w-7 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                                    <Loader2 className="h-3.5 w-3.5 text-indigo-600 animate-spin" />
                                </div>
                                <div className="bg-slate-50 rounded-2xl rounded-bl-sm px-4 py-3">
                                    <div className="flex gap-1.5 items-center h-4">
                                        <div className="h-1.5 w-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <div className="h-1.5 w-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <div className="h-1.5 w-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={bottomRef} />
                    </div>

                    {/* Input */}
                    <div className="p-4 border-t border-slate-50">
                        {messages.length > 0 && (
                            <button onClick={() => setMessages([])}
                                className="flex items-center gap-1.5 text-[9px] font-black text-slate-300 hover:text-slate-500 uppercase tracking-widest mb-3 transition-colors">
                                <RefreshCw className="h-3 w-3" /> Nueva conversación
                            </button>
                        )}
                        <div className="flex gap-2">
                            <input
                                value={inputText}
                                onChange={e => setInputText(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Pregunta sobre tus finanzas..."
                                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-[12px] font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                disabled={isLoading}
                            />
                            <button onClick={handleSend} disabled={isLoading || !inputText.trim()}
                                className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center text-white hover:bg-indigo-600 transition-all disabled:opacity-40">
                                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            </button>
                        </div>
                        <p className="text-[9px] text-slate-300 text-center mt-2 font-medium">
                            Powered by Claude · Datos en tiempo real
                        </p>
                    </div>
                </>
            )}
        </div>
    );

    if (mode === 'inline') return chatContent;

    return (
        <>
            {/* Floating Button */}
            {!open && (
                <button
                    onClick={() => setOpen(true)}
                    className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-2xl bg-slate-900 shadow-[0_4px_24px_rgba(0,0,0,0.2)] flex items-center justify-center hover:bg-indigo-600 hover:scale-110 transition-all group print:hidden"
                >
                    <Sparkles className="h-6 w-6 text-white group-hover:rotate-12 transition-transform" />
                    <div className="absolute -top-1 -right-1 h-4 w-4 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                        <div className="h-1.5 w-1.5 bg-white rounded-full animate-pulse" />
                    </div>
                </button>
            )}

            {/* Chat Window */}
            {open && !minimized && (
                <div className="fixed bottom-6 right-6 z-50 print:hidden">
                    {chatContent}
                </div>
            )}

            {/* Minimized pill */}
            {open && minimized && (
                <div className="fixed bottom-6 right-6 z-50">
                    <button onClick={() => setMinimized(false)}
                        className="flex items-center gap-3 px-5 py-3 bg-slate-900 rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.2)] text-white hover:bg-indigo-600 transition-all print:hidden">
                        <Sparkles className="h-4 w-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">GVM AI</span>
                        <ChevronDown className="h-3.5 w-3.5 rotate-180" />
                    </button>
                </div>
            )}
        </>
    );
}
