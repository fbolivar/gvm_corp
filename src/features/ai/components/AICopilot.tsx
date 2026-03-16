"use client"

import { useState, useRef, useEffect, useMemo, FormEvent } from "react"
import { useChat } from "@ai-sdk/react"
import { TextStreamChatTransport } from "ai"
import { usePathname } from "next/navigation"
import { Button } from "@/shared/components/ui/button"
import { cn } from "@/shared/lib/utils"
import {
  X,
  Send,
  Loader2,
  Minimize2,
  Maximize2,
  User as UserIcon,
} from "lucide-react"

/** Chicken/hen SVG icon used as AI GVM avatar */
function ChickenIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Comb */}
      <path d="M30 8c0-3 2-5 4-5s3 2 3 4c1-2 3-3 5-2s2 3 1 5c2-1 4 0 4 2s-2 3-4 3H30c-2 0-3-2-3-4s2-3 3-3z" fill="#E53935" />
      {/* Head */}
      <ellipse cx="34" cy="20" rx="10" ry="9" fill="#FFF8E1" />
      {/* Eye */}
      <circle cx="37" cy="18" r="2" fill="#1a1a1a" />
      <circle cx="37.7" cy="17.3" r="0.6" fill="white" />
      {/* Beak */}
      <path d="M44 21l6 2-6 2z" fill="#FF9800" />
      {/* Wattle */}
      <path d="M38 26c0 0 1 4-1 5s-4 1-4-1 2-4 2-4h3z" fill="#E53935" />
      {/* Body */}
      <ellipse cx="30" cy="42" rx="16" ry="14" fill="#FFF8E1" />
      {/* Wing */}
      <path d="M18 36c-4 2-6 8-4 12s8 4 10 2c-2-2-4-6-3-10z" fill="#FFE0B2" />
      {/* Tail feathers */}
      <path d="M44 34c4-4 8-2 8 2s-2 6-4 6" fill="#FFCC80" />
      <path d="M42 32c3-5 7-4 8 0s-1 7-3 7" fill="#FFE0B2" />
      {/* Legs */}
      <path d="M26 54v6M26 60l-3 2M26 60l3 2" stroke="#FF9800" strokeWidth="2" strokeLinecap="round" />
      <path d="M34 54v6M34 60l-3 2M34 60l3 2" stroke="#FF9800" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function AICopilot() {
  const [open, setOpen] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const [inputValue, setInputValue] = useState("")
  const pathname = usePathname()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const transport = useMemo(
    () => new TextStreamChatTransport({ api: "/api/ai/chat", body: { context: pathname } }),
    [pathname]
  )

  const { messages, sendMessage, status, setMessages } = useChat({
    id: "ai-gvm",
    transport,
  })

  const isLoading = status === "streaming" || status === "submitted"

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSuggestion = (text: string) => {
    setInputValue(text)
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || isLoading) return
    sendMessage({ text: inputValue.trim() })
    setInputValue("")
  }

  const getMessageText = (msg: typeof messages[number]): string => {
    if (msg.parts) {
      return msg.parts
        .filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map(p => p.text)
        .join("")
    }
    return ""
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center group"
        title="AI GVM"
        aria-label="Abrir AI GVM"
      >
        <ChickenIcon className="h-8 w-8 group-hover:rotate-12 transition-transform" />
      </button>
    )
  }

  return (
    <div
      className={cn(
        "fixed z-50 bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden transition-all",
        minimized
          ? "bottom-6 right-6 w-72 h-14"
          : "bottom-6 right-6 w-96 h-[32rem]"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white shrink-0">
        <div className="flex items-center gap-2">
          <ChickenIcon className="h-5 w-5" />
          <span className="text-xs font-black uppercase tracking-widest">AI GVM</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMinimized(!minimized)}
            className="h-7 w-7 rounded-lg hover:bg-white/20 flex items-center justify-center transition-colors"
            aria-label={minimized ? "Expandir" : "Minimizar"}
          >
            {minimized ? (
              <Maximize2 className="h-3.5 w-3.5" />
            ) : (
              <Minimize2 className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            onClick={() => { setOpen(false); setMessages([]) }}
            className="h-7 w-7 rounded-lg hover:bg-white/20 flex items-center justify-center transition-colors"
            aria-label="Cerrar AI GVM"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {!minimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <ChickenIcon className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-xs font-bold text-slate-400">Soy AI GVM, en que puedo ayudarte?</p>
                <div className="flex flex-wrap gap-2 mt-4 justify-center">
                  {['Analizar ventas', 'Revisar inventario', 'Sugerir mejoras'].map((q) => (
                    <button
                      key={q}
                      onClick={() => handleSuggestion(q)}
                      className="text-[10px] font-bold px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m) => {
              const text = getMessageText(m)
              if (!text) return null
              return (
                <div
                  key={m.id}
                  className={cn("flex gap-3", m.role === 'user' ? 'justify-end' : '')}
                >
                  {m.role === 'assistant' && (
                    <div className="h-7 w-7 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                      <ChickenIcon className="h-5 w-5" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[80%] px-3 py-2 rounded-xl text-sm leading-relaxed",
                      m.role === 'user'
                        ? 'bg-orange-600 text-white rounded-br-none'
                        : 'bg-slate-100 text-slate-700 rounded-bl-none'
                    )}
                  >
                    <p className="whitespace-pre-wrap text-xs">{text}</p>
                  </div>
                  {m.role === 'user' && (
                    <div className="h-7 w-7 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
                      <UserIcon className="h-4 w-4 text-orange-600" />
                    </div>
                  )}
                </div>
              )
            })}

            {isLoading && (
              <div className="flex gap-3">
                <div className="h-7 w-7 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                  <Loader2 className="h-4 w-4 text-amber-600 animate-spin" />
                </div>
                <div className="bg-slate-100 rounded-xl rounded-bl-none px-3 py-2">
                  <p className="text-xs text-slate-400">Pensando...</p>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="p-3 border-t border-slate-100 flex gap-2 shrink-0"
          >
            <input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Escribe tu pregunta..."
              className="flex-1 h-9 px-3 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-300"
              disabled={isLoading}
              aria-label="Mensaje para AI GVM"
            />
            <Button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              size="icon"
              className="h-9 w-9 rounded-lg bg-amber-600 hover:bg-amber-700 text-white shrink-0"
              aria-label="Enviar mensaje"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </form>
        </>
      )}
    </div>
  )
}
